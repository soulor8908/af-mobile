import { startServer } from './visual.mjs';
const { server, port } = await startServer();
for (const p of ['/aiflow-ui.css', '/aiflow-ui.js', '/001-k0.html']) {
  const r = await fetch(`http://127.0.0.1:${port}${p}`);
  console.log(p, '->', r.status, (await r.text()).slice(0, 60).replace(/\s+/g,' '));
}
server.close();
