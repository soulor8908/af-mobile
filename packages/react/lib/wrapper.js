// AIFlow UI —— React 包装层
// 通用工厂：把 aiflow-ui Web Component 包装成 React 函数组件（纯 createElement，无 JSX）
// 职责：
//   1. 自动注册自定义元素（SSR/Node 环境自动跳过）
//   2. props → element property 同步（defineProp setter 内部同步 attribute，支持所有类型）
//   3. `af-{组件}:{动作}` 自定义事件 → React `on{Action}` 回调（如 af-list:itemclick → onItemclick，payload 为 e.detail）
//   4. 其余 props（className/style/id/data-*/aria-* 等）作为普通 attribute 透传
import { createElement, useEffect, useRef } from 'react';

// 注册自定义元素：仅在浏览器环境（customElements 存在）执行，SSR 安全
export function define(tag, Ctor) {
  if (typeof customElements !== 'undefined' && !customElements.get(tag)) customElements.define(tag, Ctor);
}

const toHandler = (ev) => 'on' + ev.split(':')[1].charAt(0).toUpperCase() + ev.split(':')[1].slice(1);
const toPascal = (tag) => 'Af' + tag.replace(/^af-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());

// tag: 自定义元素标签（af-list）；Ctor: 组件类（用于注册）
// meta: { props, events }
//   props  —— 组件公开属性（camelCase 名称，以 property 方式同步）
//   events —— 组件派发的自定义事件名（af-*:*），映射为 on{Action} 回调
// 额外 prop：elRef —— 回调，每次渲染后收到组件原生元素实例（用于挂载宿主级监听）
export function createWrapper(tag, Ctor, { props = [], events = [] } = {}) {
  define(tag, Ctor);
  const handlerKeys = new Set(events.map(toHandler));
  const displayName = toPascal(tag);

  function Wrapper({ children, ...rest }) {
    const ref = useRef(null);
    const restRef = useRef(rest);
    restRef.current = rest; // 每次渲染更新，事件回调读取最新 props，避免闭包过期

    // 事件监听：仅挂载时绑定一次
    useEffect(() => {
      const node = ref.current;
      const handlers = [];
      for (const ev of events) {
        const fn = (e) => restRef.current[toHandler(ev)]?.(e.detail);
        node.addEventListener(ev, fn);
        handlers.push([ev, fn]);
      }
      return () => { for (const [ev, fn] of handlers) node.removeEventListener(ev, fn); };
    }, []);

    // 属性同步：每次渲染后应用到 element property（幂等）
    useEffect(() => {
      const node = ref.current;
      for (const name of props) {
        if (rest[name] !== undefined) node[name] = rest[name];
      }
      restRef.current.elRef?.(node); // 暴露原生元素实例
    });

    // 非 prop 非 handler 的 props 作为普通 attribute 透传（className/style/id/data-*/aria-* 等）
    const attrs = {};
    for (const key in rest) {
      if (key !== 'elRef' && !props.includes(key) && !handlerKeys.has(key)) attrs[key] = rest[key];
    }
    // React 18 对自定义元素不把 className 映射为 class（React 19 才修复），此处显式转换
    if (attrs.className !== undefined) {
      attrs.class = attrs.className;
      delete attrs.className;
    }

    return createElement(tag, { ref, ...attrs }, children);
  }

  Wrapper.displayName = displayName;
  return Wrapper;
}
