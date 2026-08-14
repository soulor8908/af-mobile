// AIFlow UI —— Vue 3 组件包装层
// 通用工厂：把 aiflow-ui Web Component 包装成 Vue 组件
// 职责：
//   1. 自动注册自定义元素（SSR/Node 环境自动跳过）
//   2. props → element property 同步（defineProp setter 内部同步 attribute，支持所有类型）
//   3. `af-{组件}:{动作}` 自定义事件 → Vue 短名事件（如 af-list:itemclick → @itemclick，payload 为 e.detail）
//   4. 表单类组件支持 v-model（modelValue ↔ update:modelValue 桥接）
import { defineComponent, h, ref, onMounted, onBeforeUnmount, watchEffect } from 'vue';

// 注册自定义元素：仅在浏览器环境（customElements 存在）执行，SSR 安全
export function define(tag, Ctor) {
  if (typeof customElements !== 'undefined' && !customElements.get(tag)) customElements.define(tag, Ctor);
}

const toPascal = (tag) => 'Af' + tag.replace(/^af-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());

// tag: 自定义元素标签（af-list）；Ctor: 组件类（用于注册）
// meta: { props, events, model }
//   props  —— 组件公开属性（camelCase 名称，wrapper prop 同名）
//   events —— 组件派发的自定义事件名（af-*:*）
//   model  —— { event, key, target }：v-model 桥接（可选）
export function createWrapper(tag, Ctor, { props: propNames = [], events = [], model = null } = {}) {
  define(tag, Ctor);
  const propMap = Object.fromEntries(propNames.map((p) => [p, null]));
  if (model) propMap.modelValue = null;
  const eventNames = events.map((e) => e.split(':').pop());
  if (model) eventNames.push('update:modelValue');

  return defineComponent({
    name: toPascal(tag),
    inheritAttrs: false,
    props: propMap,
    emits: eventNames,
    setup(props, { attrs, slots, emit }) {
      const el = ref(null);
      const listeners = [];

      // props → element property 同步（watchEffect 追踪 props 变化 + el 挂载）
      watchEffect(() => {
        const node = el.value;
        if (!node) return;
        for (const name of propNames) {
          if (props[name] !== undefined) node[name] = props[name];
        }
        if (model && props.modelValue !== undefined) node[model.target] = props.modelValue;
      });

      onMounted(() => {
        const node = el.value;
        const bind = (ev, fn) => { node.addEventListener(ev, fn); listeners.push([ev, fn]); };
        for (const ev of events) {
          bind(ev, (e) => emit(ev.split(':').pop(), e.detail));
        }
        if (model) bind(model.event, (e) => emit('update:modelValue', e.detail[model.key]));
      });
      onBeforeUnmount(() => {
        for (const [ev, fn] of listeners) el.value?.removeEventListener(ev, fn);
      });

      // slots 原样透传：命名 slot 渲染为 slot="name" 子节点，供 Web Component <slot> 消费
      return () => h(tag, { ref: el, ...attrs }, slots);
    },
  });
}
