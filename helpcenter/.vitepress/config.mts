import { defineConfig } from 'vitepress';
import { fileURLToPath } from 'node:url';

const outDir = fileURLToPath(new URL('../../dist/help', import.meta.url));

const enSidebar = [
  {
    text: 'Getting started',
    items: [
      {
        text: 'Install the app',
        link: '/en/getting-started/install.html',
      },
    ],
  },
  {
    text: 'Troubleshooting',
    items: [
      {
        text: 'Persistent storage',
        link: '/en/troubleshooting/persistent-storage.html',
      },
    ],
  },
  {
    text: 'Reference',
    items: [
      {
        text: 'Browser notes',
        link: '/en/reference/browsers.html',
      },
    ],
  },
];

const ruSidebar = [
  {
    text: 'Начало работы',
    items: [
      {
        text: 'Установка приложения',
        link: '/ru/getting-started/install.html',
      },
    ],
  },
  {
    text: 'Решение проблем',
    items: [
      {
        text: 'Постоянное хранилище',
        link: '/ru/troubleshooting/persistent-storage.html',
      },
    ],
  },
];

export default defineConfig({
  base: '/dmh-pwa/help/',
  outDir,
  cleanUrls: false,
  title: 'Help center',
  description: 'Guides for installing and using Owlbear’s DMH.',
  lang: 'en',
  head: [['meta', { name: 'theme-color', content: '#1e1e2e' }]],
  locales: {
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      themeConfig: {
        nav: [{ text: 'Open app', link: '/dmh-pwa/' }],
        sidebar: enSidebar,
      },
    },
    ru: {
      label: 'Русский',
      lang: 'ru',
      link: '/ru/',
      themeConfig: {
        nav: [{ text: 'Открыть приложение', link: '/dmh-pwa/' }],
        sidebar: ruSidebar,
      },
    },
  },
  themeConfig: {
    search: { provider: 'local' },
    outline: { level: [2, 3] },
    docFooter: { prev: 'Previous', next: 'Next' },
  },
});
