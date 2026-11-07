<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { IconHelpCircle } from '@tabler/icons-vue';
import { getHelpLocale, helpHref } from '@/helpcenter/links';

const { t, locale } = useI18n();
</script>

<template>
  <QItem
    tag="a"
    clickable
    data-test="open-help"
    :href="helpHref('', getHelpLocale(locale))"
    target="_blank"
    rel="noopener noreferrer"
    :title="t('navigation.help')"
    :aria-label="t('navigation.help')"
  >
    <QItemSection side><IconHelpCircle /></QItemSection>
    <QItemSection>{{ t('navigation.help') }}</QItemSection>
  </QItem>
</template>
