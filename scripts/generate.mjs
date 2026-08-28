// af-mobile UI —— 端到端生成闭环（生成 → lint → 修正 → 再生 一键）
// 复用 ai-fix.mjs 的 runAiFixLoop，封装"调 LLM 生成 → 跑 ai-fix 闭环"
// 用法：
//   node scripts/generate.mjs "列表页：商品列表带图"               # 默认走手动模式（输出 prompt）
//   AFMOBILE_AI_API_URL=... node scripts/generate.mjs "需求描述" -o out.html  # 自动生成+修正
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAiFixLoop } from './ai-fix.mjs';
import { recordRun, detectTool } from '../eval/telemetry.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = join(ROOT, '.cache/generate');

// 调用 LLM 生成首版代码（标准 OpenAI 兼容协议，与 ai-fix.mjs 的 callLLM 同步）
async function callLLM(systemPrompt, userPrompt) {
  const url = process.env.AFMOBILE_AI_API_URL;
  const key = process.env.AFMOBILE_AI_API_KEY;
  const model = process.env.AFMOBILE_AI_MODEL || 'gpt-4o';
  if (!url) return null;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      top_p: 0.5,
    }),
  });
  if (!res.ok) throw new Error(`LLM API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content || data.choices?.[0]?.message?.content || data.text || '';
}

// 提取代码块（```...``` 围栏），去掉围栏
function stripCodeFence(text) {
  if (!text) return text;
  const m = text.match(/```(?:html|javascript|js)?\n([\s\S]*?)```/);
  return m ? m[1].replace(/\n+$/, '') : text;
}

// 端到端生成闭环
// 输入：需求描述字符串 + { outputPath, promptMode }
// promptMode: 'full'（全量，读 system-prompt.md 快照）| 'tailored'（buildPrompt 按需求裁剪，默认）
//           | 'blocks'（tailored + L3.5 Block 表/优先指引，A/B 实验处理组）
//           | 'no-fewshot'（tailored 剥离内联组件教材段，教材效果 A/B 对照组）
// 输出：{ ok, code, rounds, exitCode, lastErrors, outputPath }
export async function generate(userPrompt, opts = {}) {
  const outputPath = opts.outputPath || join(CACHE_DIR, `gen-${Date.now()}.html`);
  mkdirSync(dirname(outputPath), { recursive: true });

  // 按需构建 system prompt：tailored 用 buildPrompt({ userPrompt }) 自动检索 few-shot + 组件 API
  const { buildPrompt, detectSceneDemand } = await import('./build-prompt.mjs');
  const { resolveAsset } = await import('./resolve-asset.mjs');
  const snapshot = resolveAsset('prompt/system-prompt.md');
  const systemPrompt = opts.promptMode === 'full'
    ? (existsSync(snapshot)
        ? readFileSync(snapshot, 'utf8')
        : '(System Prompt 未构建，请先运行 npm run prompt)')
    : buildPrompt({ userPrompt, blocks: opts.promptMode === 'blocks' });

  // 教材效果 A/B：对照组剥离「命中组件的用法教材」段（保留其余裁剪逻辑，单变量对照）
  let finalPrompt = systemPrompt;
  if (opts.promptMode === 'no-fewshot') {
    const start = finalPrompt.indexOf('## 命中组件的用法教材');
    if (start !== -1) {
      const next = finalPrompt.indexOf('\n# ', start + 1);
      finalPrompt = finalPrompt.slice(0, start) + (next === -1 ? '' : finalPrompt.slice(next + 1));
    }
  }

  // 需求分布遥测（kind='prompt'）：只记命中的场景包 key（封闭集），不落需求原文（隐私红线）
  recordRun({
    source: 'cli',
    tool: detectTool(),
    file: '(get_prompt)',
    kind: 'prompt',
    passed: true,
    violations: [],
    scene: detectSceneDemand(userPrompt),
  });

  // Step 1: 调 LLM 生成首版
  let firstCode;
  try {
    firstCode = await callLLM(systemPrompt, userPrompt);
  } catch (e) {
    return { ok: false, code: '', exitCode: 3, error: e.message, outputPath };
  }
  if (firstCode === null) {
    // 未配置 LLM → 手动模式
    return {
      ok: false, code: '', exitCode: 2,
      systemPrompt, userPrompt, outputPath,
      error: '未配置 AFMOBILE_AI_API_URL，进入手动模式',
    };
  }
  if (!firstCode || !firstCode.trim()) {
    return { ok: false, code: '', exitCode: 3, error: 'LLM 返回空内容', outputPath };
  }
  firstCode = stripCodeFence(firstCode);
  writeFileSync(outputPath, firstCode);

  // Step 2-4: 复用 ai-fix 闭环（lint → 修正 → 再生，最多 3 轮）
  const fixResult = await runAiFixLoop(outputPath, callLLM, finalPrompt, opts.eslintOpts || {});
  const finalCode = readFileSync(outputPath, 'utf8');

  return {
    ok: fixResult.ok,
    code: finalCode,
    rounds: fixResult.rounds,
    exitCode: fixResult.exitCode,
    lastErrors: fixResult.lastErrors || [],
    outputPath,
  };
}

// CLI 直接运行
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  let userPrompt = '';
  let outputPath = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-o' || args[i] === '--output') outputPath = args[++i];
    else if (args[i] === '-h' || args[i] === '--help') {
      console.error('Usage: generate.mjs "需求描述" [-o out.html]');
      console.error('Env: AFMOBILE_AI_API_URL (LLM endpoint, optional)');
      process.exit(0);
    } else userPrompt += (userPrompt ? ' ' : '') + args[i];
  }
  if (!userPrompt) {
    console.error('✗ 缺少需求描述');
    console.error('Usage: generate.mjs "需求描述" [-o out.html]');
    process.exit(2);
  }

  generate(userPrompt, { outputPath }).then(r => {
    if (r.exitCode === 2) {
      console.error('\n⚠ 未配置 AFMOBILE_AI_API_URL，进入手动模式');
      console.error('  请把以下 System Prompt + User Prompt 复制到 LLM，把输出写回文件后跑 ai-fix：\n');
      process.stdout.write('=== SYSTEM ===\n' + r.systemPrompt + '\n');
      process.stdout.write('=== USER ===\n' + r.userPrompt + '\n');
      process.exit(2);
    }
    if (r.ok) {
      console.error(`✓ 生成成功（${r.rounds} 轮，含修正）→ ${r.outputPath}`);
      process.exit(0);
    }
    console.error(`✗ 生成失败（exitCode=${r.exitCode}, rounds=${r.rounds}）`);
    if (r.error) console.error('  error: ' + r.error);
    if (r.lastErrors.length) {
      const byRule = {};
      for (const e of r.lastErrors) byRule[e.rule] = (byRule[e.rule] || 0) + 1;
      for (const [rule, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
        console.error(`  ${rule}: ${n} 次`);
      }
    }
    process.exit(r.exitCode);
  }).catch(e => { console.error(e); process.exit(2); });
}
