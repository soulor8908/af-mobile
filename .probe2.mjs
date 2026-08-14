import { build } from 'esbuild';
import { gzipSync } from 'zlib';

const reactComp = `import { useState, useRef, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
function C(){ const [n,setN]=useState(0); const r=useRef(0); useEffect(()=>{},[]); const m=useMemo(()=>n,[]); return <div onClick={()=>setN(n+1)}>{n}{r.current}{m}</div>; }
const root=createRoot(document.getElementById('r')); root.render(<C/>);`;

const preactComp = `import { useState, useRef, useEffect, useMemo, StrictMode } from 'preact/compat';
import { createRoot } from 'preact/compat/client';
function C(){ const [n,setN]=useState(0); const r=useRef(0); useEffect(()=>{},[]); const m=useMemo(()=>n,[]); return <div onClick={()=>setN(n+1)}>{n}{r.current}{m}</div>; }
const root=createRoot(document.getElementById('r')); root.render(<StrictMode><C/></StrictMode>);`;

const preactPure = `import { useState, useRef, useEffect, useMemo, render } from 'preact';
function C(){ const [n,setN]=useState(0); const r=useRef(0); useEffect(()=>{},[]); const m=useMemo(()=>n,[]); return <div onClick={()=>setN(n+1)}>{n}{r.current}{m}</div>; }
render(<C/>, document.getElementById('r'));`;

const cases = [
  ['react+react-dom (当前)', reactComp, '/workspace/accounting-ai'],
  ['preact/compat (drop-in)', preactComp, '/workspace/accounting-ai'],
  ['preact 原生', preactPure, '/workspace/accounting-ai'],
];

for (const [name, code, resolveDir] of cases) {
  try {
    const r = await build({
      stdin: { contents: code, resolveDir, sourcefile: 'probe.jsx', loader: 'jsx' },
      bundle: true, minify: true, format: 'esm', target: 'es2020', write: false, jsx: 'automatic', jsxImportSource: name.includes('preact') ? 'preact' : 'react',
    });
    const out = r.outputFiles[0];
    const gz = gzipSync(out.contents);
    console.log(`${name.padEnd(24)} ${(out.contents.length/1024).toFixed(1).padStart(6)} KB  gzip ${(gz.length/1024).toFixed(1).padStart(5)} KB`);
  } catch (e) {
    console.log(`${name} FAILED: ${String(e.message).split('\n')[0]}`);
  }
}
