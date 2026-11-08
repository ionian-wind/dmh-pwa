<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconSwords } from '@tabler/icons-vue';
import { useCombatStore } from '@/stores/combats';
import { useLayout, useRightDrawer } from '@/composables/useLayout';
import { useVisibleActiveCombats } from '@/encounters/useVisibleActiveCombats';
import ActiveCombatsPanel from '@/encounters/ActiveCombatsPanel.vue';

const { t } = useI18n();
const combatStore = useCombatStore();
const layout = useLayout();
const rightDrawer = useRightDrawer();
const { visibleActiveCombats } = useVisibleActiveCombats();

function openPanel() {
  rightDrawer.set({
    component: ActiveCombatsPanel,
    props: { onClose: rightDrawer.clear },
  });
  layout.rightDrawerOpen.value = true;
}

onMounted(() => {
  if (!combatStore.isLoaded) void combatStore.load();
});
</script>

<template>
  <QBtn
    v-if="visibleActiveCombats.length"
    flat
    dense
    color="warning"
    class="active-combats-button"
    :title="t('combat.activeEncounters')"
    :aria-label="t('combat.activeEncounters')"
    @click="openPanel"
  >
    <IconSwords :size="22" />
  </QBtn>
</template>
