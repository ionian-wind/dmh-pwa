import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconAffiliate, IconForms } from '@tabler/icons-vue';
import type { Component } from 'vue';

export interface EntityEditorTab {
  name: string;
  title: string;
  icon: Component;
}

export function useEntityEditorTabs() {
  const { t } = useI18n();

  return computed<EntityEditorTab[]>(() => [
    { name: 'main', title: t('common.mainEditor'), icon: IconForms },
    { name: 'links', title: t('common.linkedEntities'), icon: IconAffiliate },
  ]);
}
