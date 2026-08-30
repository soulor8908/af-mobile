import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitepress';

// 扫描 site/components/ 下的 af-*.md，自动生成组件侧边栏
function componentSidebar() {
  const dir = fileURLToPath(new URL('../components', import.meta.url));
  return readdirSync(dir).filter((f) => f.endsWith('.md')).sort().map((f) => {
    const tag = f.replace(/\.md$/, '');
    return { text: tag, link: `/components/${tag}` };
  });
}

export default defineConfig({
  base: '/af-mobile/',
  lang: 'zh-CN',
  title: '@af-mobile/ui',
  description: 'AI-first mobile Web Components 组件库',
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/quick-start' },
      { text: '组件', link: '/components/af-dialog' },
      { text: 'Demo', link: 'https://soulor8908.github.io/af-mobile/demo/index.html' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '架构理念', link: '/guide/architecture' },
            { text: '主题定制', link: '/guide/theming' },
            { text: 'AI 协作', link: '/guide/ai-collaboration' },
            { text: '应用配方', link: '/guide/app-recipe' },
            { text: '实战教程', link: '/guide/tutorial-todo-app' },
          ],
        },
      ],
      '/components/': [{ text: '组件', items: componentSidebar() }],
    },
  },
});