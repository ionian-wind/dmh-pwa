<script setup lang="ts">
import type { Encounter } from '@/types';
import BaseCard from '@/components/common/BaseCard.vue';
import { computed } from 'vue';
import Button from '@/components/form/Button.vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ encounter: Encounter }>();
const emit = defineEmits(['view', 'edit', 'delete', 'run-combat', 'copy']);
const { t } = useI18n();

const pawnsCount = computed(() => {
  const pawns = props.encounter.pawns || {};

  // Handle different possible data structures
  let kinds = 0;
  let total = 0;

  if (typeof pawns === 'object' && pawns !== null) {
    const keys = Object.keys(pawns);
    kinds = keys.length;

    // Sum up all the values, ensuring they're numbers
    total = Object.values(pawns).reduce((sum, value) => {
      const count = typeof value === 'number' ? value : 0;
      return sum + count;
    }, 0);
  }

  return `${kinds} (${total})`;
});

function handleView() {
  emit('view', props.encounter);
}
function handleEdit() {
  emit('edit', props.encounter);
}
function handleDelete() {
  emit('delete', props.encounter);
}
function handleRunCombat() {
  emit('run-combat', props.encounter);
}
function handleCopy() {
  emit('copy', props.encounter);
}
</script>
<template>
  <BaseCard
    showEdit
    showDelete
    showView
    showCopy
    @view="handleView"
    @edit="handleEdit"
    @delete="handleDelete"
    @copy="handleCopy"
    :title="encounter.name"
    :drag-entity="{
      kind: 'encounter',
      id: encounter.id,
      title: encounter.name,
    }"
  >
    <p v-if="encounter.description" class="description">
      {{ encounter.description }}
    </p>
    <div class="pawns-summary">
      <span class="label">{{ t('encounterCard.pawns') }}</span>
      <span class="value">{{ pawnsCount }}</span>
    </div>
    <template #actions>
      <QBtn
        flat
        :color="'warning'"
        @click="handleRunCombat"
        :title="t('common.runCombat')"
      >
        <QIcon name="tabler-swords" />
      </QBtn>
    </template>
  </BaseCard>
</template>
