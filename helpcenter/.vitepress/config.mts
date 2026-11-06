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

const enTheme = {
  outline: { level: [2, 3], label: 'On this page' },
  docFooter: { prev: 'Previous page', next: 'Next page' },
  darkModeSwitchLabel: 'Appearance',
  lightModeSwitchTitle: 'Switch to light theme',
  darkModeSwitchTitle: 'Switch to dark theme',
  sidebarMenuLabel: 'Menu',
  returnToTopLabel: 'Return to top',
  langMenuLabel: 'Change language',
  skipToContentLabel: 'Skip to content',
  notFound: {
    title: 'Page not found',
    quote: 'The page may have moved, or the address may contain a typo.',
    linkLabel: 'Go to the help center home page',
    linkText: 'Take me home',
  },
  search: {
    provider: 'local',
    options: {
      translations: {
        button: {
          buttonText: 'Search',
          buttonAriaLabel: 'Search',
        },
        modal: {
          displayDetails: 'Display detailed list',
          resetButtonTitle: 'Reset search',
          backButtonTitle: 'Close search',
          noResultsText: 'No results for',
          footer: {
            selectText: 'to select',
            selectKeyAriaLabel: 'enter',
            navigateText: 'to navigate',
            navigateUpKeyAriaLabel: 'up arrow',
            navigateDownKeyAriaLabel: 'down arrow',
            closeText: 'to close',
            closeKeyAriaLabel: 'escape',
          },
        },
      },
    },
  },
};

const ruTheme = {
  outline: { level: [2, 3], label: 'На этой странице' },
  docFooter: {
    prev: 'Предыдущая страница',
    next: 'Следующая страница',
  },
  darkModeSwitchLabel: 'Внешний вид',
  lightModeSwitchTitle: 'Светлая тема',
  darkModeSwitchTitle: 'Тёмная тема',
  sidebarMenuLabel: 'Меню',
  returnToTopLabel: 'Вернуться наверх',
  langMenuLabel: 'Изменить язык',
  skipToContentLabel: 'Перейти к содержимому',
  notFound: {
    title: 'Страница не найдена',
    quote: 'Возможно, страница переехала или в адресе есть опечатка.',
    linkLabel: 'Перейти на главную страницу справки',
    linkText: 'На главную',
  },
  search: {
    provider: 'local',
    options: {
      translations: {
        button: {
          buttonText: 'Поиск',
          buttonAriaLabel: 'Поиск',
        },
        modal: {
          displayDetails: 'Показать подробный список',
          resetButtonTitle: 'Сбросить поиск',
          backButtonTitle: 'Закрыть поиск',
          noResultsText: 'Ничего не найдено для',
          footer: {
            selectText: 'выбрать',
            selectKeyAriaLabel: 'enter',
            navigateText: 'перейти',
            navigateUpKeyAriaLabel: 'стрелка вверх',
            navigateDownKeyAriaLabel: 'стрелка вниз',
            closeText: 'закрыть',
            closeKeyAriaLabel: 'escape',
          },
        },
      },
    },
  },
};

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
      title: 'Help center',
      description: 'Guides for installing and using Owlbear’s DMH.',
      themeConfig: {
        nav: [{ text: 'Open app', link: '/dmh-pwa/' }],
        sidebar: enSidebar,
        ...enTheme,
      },
    },
    ru: {
      label: 'Русский',
      lang: 'ru',
      link: '/ru/',
      title: 'Справочный центр',
      description: 'Руководства по установке и использованию Owlbear’s DMH.',
      themeConfig: {
        nav: [{ text: 'Открыть приложение', link: '/dmh-pwa/' }],
        sidebar: ruSidebar,
        ...ruTheme,
      },
    },
  },
  themeConfig: enTheme,
});
