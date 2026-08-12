// AIFlow UI —— af-data ref 注册表（纯 Map，零依赖）
// 从 bind.js 拆出，让 af-data 不再拖入 page.js（definePage 体系）
// aiflow-ui/page 子包的 bind.js 复用此注册表，主包与子包共享同一 Map
const _dataRefs = new Map();       // refName → () => data object

/** af-data 注册 ref，供 :bind 引用 */
export function registerDataRef(name, getData) {
  _dataRefs.set(name, getData);
}

/** af-data 卸载时取消注册 */
export function unregisterDataRef(name) {
  _dataRefs.delete(name);
}

/** :bind 解析 refName.field 时读取（bind.js 内部用） */
export function getDataRef(name) {
  return _dataRefs.get(name);
}

/** 测试用：重置内部状态 */
export function _resetDataRefs() {
  _dataRefs.clear();
}
