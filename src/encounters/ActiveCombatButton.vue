<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconSwords } from '@tabler/icons-vue';
import { useCombatStore } from '@/stores/combats';
import { useVisibleActiveCombats } from '@/encounters/useVisibleActiveCombats';
import ActiveCombatsPanel from '@/encounters/ActiveCombatsPanel.vue';

const { t } = useI18n();
const combatStore = useCombatStore();
const { visibleActiveCombats } = useVisibleActiveCombats();
const isPanelOpen = ref(false);

function togglePanel() {
  isPanelOpen.value = !isPanelOpen.value;
}

onMounted(() => {
  if (!combatStore.isLoaded) void combatStore.load();
});
</script>

<template>
  <QBtn
    v-if="visibleActiveCombats.length"
    color="warning"
    class="active-combats-button"
    :title="t('combat.activeEncounters')"
    :aria-label="t('combat.activeEncounters')"
    @click="togglePanel"
  >
    <IconSwords />
  </QBtn>

  <div v-if="isPanelOpen" class="active-combats-floating">
    <ActiveCombatsPanel />
  </div>
</template>

<style scoped>
.active-combats-floating {
  position: fixed;
  top: 59px;
  right: 12px;
  bottom: 12px;
  z-index: 2500;
  display: flex;
  width: min(350px, calc(100vw - 24px));
  min-height: 0;
  overflow: hidden;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-lg);
}

.active-combats-floating > * {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
