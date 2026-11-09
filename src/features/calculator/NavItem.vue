<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import { toggleCalculator } from './state';

const { t } = useI18n();
</script>

<template>
  <QItem
    clickable
    v-ripple
    :active="false"
    :title="t('app.calculator')"
    :aria-label="t('app.calculator')"
    @click="toggleCalculator"
  >
    <QItemSection side><QIcon name="tabler-calculator" /></QItemSection>
    <QItemSection>{{ t('app.calculator') }}</QItemSection>
  </QItem>
</template>
