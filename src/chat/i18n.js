// af-mobile UI —— chat 子库 i18n 字典（ct.* 键）
// 独立于主库字典：不放 src/lib/i18n.js（避免核心运行时体积膨胀），随 @af-mobile/ui/chat 入口注册
// 深路径导入 af-chat.js 的消费端需自行 import './i18n.js'（推荐走入口 registerChat）
import { addMessages } from '../lib/i18n.js';

addMessages('zh-CN', {
  'ct.ph': '输入消息…',
  'ct.send': '发送',
  'ct.stop': '停止',
  'ct.rt': '重试',
  'ct.tl': '回到底部',
  'ct.cf': '确认',
  'ct.cn': '取消',
  'ct.em': '开始对话',
  'ct.cc': '复制代码',
  'ct.cp': '复制',
  'ct.rg': '重新生成',
  'ct.tk': '思考中…',
  'ct.tkd': '已思考',
});

addMessages('en-US', {
  'ct.ph': 'Type a message…',
  'ct.send': 'Send',
  'ct.stop': 'Stop',
  'ct.rt': 'Retry',
  'ct.tl': 'Jump to latest',
  'ct.cf': 'Confirm',
  'ct.cn': 'Cancel',
  'ct.em': 'Start a conversation',
  'ct.cc': 'Copy code',
  'ct.cp': 'Copy',
  'ct.rg': 'Regenerate',
  'ct.tk': 'Thinking…',
  'ct.tkd': 'Thought',
});
