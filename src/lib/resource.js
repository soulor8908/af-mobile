// af-mobile UI —— createResource 原语
// 数据源（signal/函数/常量）变化时自动重新拉取；应在 createPage.setup 中调用，
// effect 自动注册到当前 owner，页面 unmount() 时级联清理
// 返回 { data, isLoading, error, isError } 均为 signal（函数式读取）
import { signal, computed, effect } from './state.js';

export function createResource(source, fetcher, options = {}) {
  const data = signal(options.initialValue ?? null);
  const isLoading = signal(false);
  const error = signal(null);
  const isError = computed(() => error() !== null);

  // 请求序号：仅最后一次请求的结果生效，防竞态（慢响应覆盖新数据）
  let seq = 0;
  effect(() => {
    const key = typeof source === 'function' ? source() : source;
    if (key == null) return;
    const id = ++seq;
    isLoading.set(true);
    error.set(null);
    fetcher(key)
      .then(d => { if (id === seq) { data.set(d); isLoading.set(false); } })
      .catch(e => { if (id === seq) { error.set(e); isLoading.set(false); } });
  });

  return { data, isLoading, error, isError };
}
