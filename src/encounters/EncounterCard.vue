<script setup lang="ts">
import type { Encounter } from '@/types';
import BaseCard from '@/components/common/BaseCard.vue';
import { computed, onMounted } from 'vue';
import Button from '@/components/form/Button.vue';
import { useModuleStore } from '@/stores/modules';
import { useI18n } from 'vue-i18n';
import { IconSwords } from '@tabler/icons-vue';

const props = defineProps<{ encounter: Encounter }>();
const emit = defineEmits(['view', 'edit', 'delete', 'run-combat', 'copy']);
const moduleStore = useModuleStore();
const { t } = useI18n();

const moduleName = computed(() => {
  if (!props.encounter.moduleId) return 'No Module';
  const module = moduleStore.items.find(
    (m) => m.id === props.encounter.moduleId,
  );
  return module ? module.name : 'Unknown Module';
});

const monstersCount = computed(() => {
  const monsters = props.encounter.monsters || {};

  // Handle different possible data structures
  let kinds = 0;
  let total = 0;

  if (typeof monsters === 'object' && monsters !== null) {
    const keys = Object.keys(monsters);
    kinds = keys.length;

    // Sum up all the values, ensuring they're numbers
    total = Object.values(monsters).reduce((sum, value) => {
      const count = typeof value === 'number' ? value : 0;
      return sum + count;
    }, 0);
  }

  return `${kinds} (${total})`;
});

onMounted(async () => {
  await moduleStore.load();
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
    @view="handleView"
    @edit="handleEdit"
    @delete="handleDelete"
    @copy="handleCopy"
    :title="encounter.name"
  >
    <div class="encounter-meta">
      <span class="meta-item"
        ><span class="label">{{ t('encounterCard.module') }}</span>
        <span class="value">{{ moduleName }}</span></span
      >
    </div>
    <p v-if="encounter.description" class="description">
      {{ encounter.description }}
    </p>
    <div class="monsters-summary">
      <span class="label">{{ t('encounterCard.monsters') }}</span>
      <span class="value">{{ monstersCount }}</span>
    </div>
    <template #actions>
      <QBtn
        flat
        :color="'warning'"
        @click="handleRunCombat"
        :title="t('common.runCombat')"
      >
        <IconSwords />
      </QBtn>
    </template>
  </BaseCard>
</template>
