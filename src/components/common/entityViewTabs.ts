import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

export function useEntityViewTabs() {
  const { t } = useI18n();

  return computed(() => [
    { id: 'main', label: t('common.overview') },
    { id: 'links', label: t('common.linkedEntities') },
  ]);
}
