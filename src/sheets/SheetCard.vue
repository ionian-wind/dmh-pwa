<template>
  <BaseCard
    :title="sheet.name"
    :show-view="true"
    :show-edit="!!onEdit"
    :show-delete="!!onDelete"
    @view="onView"
    @edit="onEdit"
    @delete="onDelete"
  >
    <div class="row items-start no-wrap q-mb-sm">
      <div class="col">
        <div class="text-subtitle2 text-grey">{{ gameSystemLabel }}</div>
        <div class="text-caption text-grey q-mt-sm" v-if="sheet.notes">
          {{ truncatedNotes }}
        </div>
      </div>
    </div>

    <div
      v-if="sheet.layout && sheet.layout.length > 0"
      class="row items-center text-caption text-grey"
    >
      <QIcon name="dashboard" class="q-mr-xs" />
      <span
        >{{ sheet.layout.length }}
        {{ t('sheets.components', sheet.layout.length) }}</span
      >
    </div>

    <template #actions>
      <QBtn
        flat
        color="info"
        size="small"
        @click="handleEditLayout"
        :title="t('sheets.editLayout')"
      >
        <QIcon name="dashboard_customize" />
      </QBtn>
    </template>
  </BaseCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BaseCard from '@/components/common/BaseCard.vue';
import type { Sheet } from '@/sheets/types/sheet.types';

interface Props {
  sheet: Sheet;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const props = defineProps<Props>();
const router = useRouter();
const { t } = useI18n();

const truncatedNotes = computed(() => {
  if (!props.sheet.notes) return '';
  return props.sheet.notes.length > 100
    ? props.sheet.notes.substring(0, 100) + '...'
    : props.sheet.notes;
});

const gameSystemLabel = computed(() => {
  const gameSystemMap: Record<string, string> = {
    dnd5e: 'D&D 5e',
    pathfinder: 'Pathfinder',
    gurps: 'GURPS',
    fate: 'FATE',
    custom: 'Custom System',
  };

  return gameSystemMap[props.sheet.gameSystem] || props.sheet.gameSystem;
});

function handleEditLayout() {
  // Navigate to the sheet view with query parameter to open visual editor automatically
  router.push(`/sheets/${props.sheet.id}?visualEditor=true`);
}
</script>
