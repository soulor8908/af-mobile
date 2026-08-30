// store.js —— localStorage 待办仓库：最小 CRUD + 订阅。AI 工具（chat 页 defineTool）直接操作这份数据
const KEY = 'ai-todo.todos';
const subs = new Set();

function seed() {
  return [
    { id: crypto.randomUUID(), title: '体验：点 AI 助手让 AI 帮你加待办', due: '', done: false },
    { id: crypto.randomUUID(), title: '体验：右滑删除这条', due: '', done: false },
  ];
}
let todos;
try { todos = JSON.parse(localStorage.getItem(KEY)) ?? seed(); } catch { todos = seed(); }

const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(todos)); } catch { /* 隐私模式忽略 */ } };
const notify = () => subs.forEach((fn) => fn(todos));

export const store = {
  todos,
  add(title, due = '') {
    todos.unshift({ id: crypto.randomUUID(), title, due, done: false });
    persist(); notify();
  },
  toggle(id) {
    const t = todos.find((x) => x.id === id);
    if (t) { t.done = !t.done; persist(); notify(); }
  },
  remove(id) {
    const i = todos.findIndex((x) => x.id === id);
    if (i >= 0) { todos.splice(i, 1); persist(); notify(); }
  },
  completeByTitle(title) {
    const t = todos.find((x) => !x.done && x.title.includes(title));
    if (t) { t.done = true; persist(); notify(); }
    return t ?? null;
  },
  subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
};
