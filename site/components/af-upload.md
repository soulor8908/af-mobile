# af-upload

> v1.4.0 · 文件上传

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| accept | `string` | 'image/*' | accept 文件类型（透传到原生 input） |
| multiple | `boolean` | true | 是否多选 |
| maxSize | `number` | 0 | 单文件大小上限（字节，0=不限） |
| maxCount | `number` | 0 | 文件数量上限（0=不限） |
| buttonText | `string` | null | 触发按钮文案 |
| ariaLabelText | `string` | '{ attr: 'aria-label', type: String, default: null }' | 触发按钮 aria-label |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-upload:change` | 触发时：组件内 emit 调用 |
| `af-upload:error` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `clear(): void` | 清空已选文件 |
<!-- gen:end:api -->
