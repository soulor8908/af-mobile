// af-mobile UI —— af-upload Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-upload',
  name: '文件上传',
  scenarios: [
    {
      name: '图片上传',
      html: `
        <section class="card">
          <p class="body">图片多选 · 限制 3 张 · 单张 ≤ 2MB</p>
          <af-upload id="upload" accept="image/*" multiple max-count="3" max-size="2097152"></af-upload>
          <div class="actions">
            <button class="btn btn-ghost" type="button" onclick="document.getElementById('upload').clear()">清空</button>
          </div>
        </section>
        <p class="caption" id="up-log">选择文件后显示结果</p>
      `,
      main: { selector: '#upload' },
      props: [
        { prop: 'accept', label: 'accept', type: 'string' },
        { prop: 'multiple', label: '多选', type: 'boolean' },
        { prop: 'maxCount', label: '最大数量', type: 'number' },
        { prop: 'maxSize', label: '单文件最大字节', type: 'number' },
      ],
      events: ['af-upload:change', 'af-upload:error'],
      init: () => {
        const upload = document.getElementById('upload');
        const log = document.getElementById('up-log');
        upload.addEventListener('af-upload:change', (e) => {
          if (log) log.textContent = `已选 ${e.detail.files.length} 个，错误 ${e.detail.errors.length} 个`;
        });
        upload.addEventListener('af-upload:error', (e) => {
          if (log) log.textContent = `错误：${e.detail.errors.map(err => err.name + ':' + err.reason).join(', ')}`;
        });
      },
    },
  ],
};
