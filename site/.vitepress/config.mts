import { defineConfig } from 'vitepress';

export default defineConfig({
  base: '/v/',
  lang: 'zh-CN',
  title: '@af-mobile/ui',
  description: 'AI-first mobile Web Components 组件库',
  head: [
    ['link', { rel: 'icon', href: '/v/favicon.svg' }],
  ],
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/quick-start' },
      { text: 'Demo', link: '/demo/index.html' },
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
          ],
        },
      ],
    },
  },
});