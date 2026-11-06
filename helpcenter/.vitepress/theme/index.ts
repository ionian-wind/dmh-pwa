import DefaultTheme from 'vitepress/theme';
import { useRoute } from 'vitepress';
import { h, nextTick, onMounted, watch } from 'vue';
import type { SetupContext } from 'vue';
import type { Theme } from 'vitepress';

type Locale = 'en' | 'ru';

const labels: Record<
  Locale,
  {
    nav: string;
    sidebar: string;
    pager: string;
    mobileNav: string;
    toggleSection: string;
  }
> = {
  en: {
    nav: 'Main Navigation',
    sidebar: 'Sidebar Navigation',
    pager: 'Pager',
    mobileNav: 'Mobile navigation',
    toggleSection: 'Toggle section',
  },
  ru: {
    nav: 'Основная навигация',
    sidebar: 'Навигация по разделам',
    pager: 'Навигация по страницам',
    mobileNav: 'Мобильная навигация',
    toggleSection: 'Развернуть раздел',
  },
};

function currentLocale(): Locale {
  return document.documentElement.lang.toLowerCase().startsWith('ru')
    ? 'ru'
    : 'en';
}

function setHiddenText(id: string, text: string) {
  const element = document.getElementById(id);
  if (element && element.textContent !== text) {
    element.textContent = text;
  }
}

function setAriaLabel(selector: string, text: string) {
  document.querySelectorAll(selector).forEach((element) => {
    if (element.getAttribute('aria-label') !== text) {
      element.setAttribute('aria-label', text);
    }
  });
}

/**
 * VitePress 1.x hardcodes a few screen-reader-only labels in English. The
 * visible theme strings are localized in config.mts; this fills the remaining
 * gaps without forking the default theme.
 */
function localizeTemplateLabels() {
  const locale = labels[currentLocale()];
  setHiddenText('main-nav-aria-label', locale.nav);
  setHiddenText('sidebar-aria-label', locale.sidebar);
  setHiddenText('doc-footer-aria-label', locale.pager);
  setAriaLabel('[aria-label="mobile navigation"]', locale.mobileNav);
  setAriaLabel('[aria-label="toggle section"]', locale.toggleSection);
}

const Layout = {
  name: 'LocalizedDefaultLayout',
  setup(_: Record<string, unknown>, { slots }: SetupContext) {
    const route = useRoute();

    const sync = () => {
      nextTick(localizeTemplateLabels);
    };

    onMounted(sync);
    watch(() => route.path, sync);

    return () => h(DefaultTheme.Layout, null, slots);
  },
};

export default {
  extends: DefaultTheme,
  Layout,
} satisfies Theme;
