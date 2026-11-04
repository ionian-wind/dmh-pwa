import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconAffiliate, IconEye } from '@tabler/icons-vue';

export function useEntityViewTabs() {
  const { t } = useI18n();

  return computed(() => [
    { id: 'main', label: t('common.view'), icon: IconEye },
    { id: 'links', label: t('common.linkedEntities'), icon: IconAffiliate },
  ]);
}
