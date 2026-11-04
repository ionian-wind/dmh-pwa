import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconAffiliate, IconForms } from '@tabler/icons-vue';

export function useEntityViewTabs() {
  const { t } = useI18n();

  return computed(() => [
    { id: 'main', label: t('common.mainEditor'), icon: IconForms },
    { id: 'links', label: t('common.linkedEntities'), icon: IconAffiliate },
  ]);
}
