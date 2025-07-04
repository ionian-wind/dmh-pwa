<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import FloatActionButton from './common/FloatActionButton.vue';
import { IconDice5, IconX } from '@tabler/icons-vue';

import DiceBox from '@3d-dice/dice-box';
// import { AdvancedRoller } from '@3d-dice/dice-ui'

import { debug } from '@/utils/debug';

const showFabs = ref(false);
const fabContainerRef = ref<HTMLElement | null>(null);

let diceBox: DiceBox;

function toggleFabs() {
  showFabs.value = !showFabs.value;

  if (!showFabs.value && diceBox) {
    diceBox.clear();
  }
}

function onDiceClick(dice: any) {
  diceBox.add(dice.notation);
}

const fabButtons = [
  { label: 'd4', notation: '1d4' },
  { label: 'd6', notation: '1d6' },
  { label: 'd8', notation: '1d8' },
  { label: 'd10', notation: '1d10' },
  { label: 'd12', notation: '1d12' },
  { label: 'd20', notation: '1d20' },
  { label: 'd100', notation: '2d10' },
  { label: 'd2', notation: '1d2' },
];

function getFabStyle(index: number, total: number, visible: boolean) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const radius = 60; // px (adjust as needed)
  const center = 100; // px, half of container size (200x200)
  const x = center + Math.cos(angle) * radius;
  const y = center + Math.sin(angle) * radius;
  return {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    transform: visible
      ? 'translate(-50%, -50%) scale(1)'
      : 'translate(-50%, -50%) scale(0.2)',
    opacity: visible ? 1 : 0,
    transition:
      'transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.4s cubic-bezier(0.4,0,0.2,1)',
    zIndex: 999,
    pointerEvents: visible ? 'auto' : 'none',
  };
}

onMounted(async () => {
  diceBox = new DiceBox({
    container: '#dice-roller',
    assetPath: '/dmh-pwa/assets/dice-box/',
    theme: 'default-extras',
    preloadThemes: ['default-extras'],
    onThemeConfigLoaded: (themeData) => {
      debug('Theme loaded:', themeData);
    },
  });

  await diceBox.init();
});

onUnmounted(() => diceBox.clear());
</script>

<template>
  <div class="fab-roll-group">
    <div class="fab-children-container" ref="fabContainerRef">
      <FloatActionButton
        class="roll-fab-main"
        size="medium"
        variant="primary"
        :style="{
          position: 'absolute',
          left: '100px',
          top: '100px',
          transform: 'translate(-50%, -50%)',
        }"
        @click="toggleFabs"
        :title="'Roll'"
      >
        <IconX v-if="showFabs" />
        <IconDice5 v-else />
      </FloatActionButton>
      <FloatActionButton
        v-for="(fab, i) in fabButtons"
        :key="fab.label"
        class="roll-fab-child"
        size="small"
        variant="secondary"
        @click="onDiceClick(fab)"
        :style="getFabStyle(i, fabButtons.length, showFabs)"
      >
        {{ fab.label }}
      </FloatActionButton>
    </div>
  </div>
</template>

<style scoped>
.fab-roll-group {
  position: fixed;
  bottom: 10px;
  right: 10px;
  z-index: 1000;
}
.fab-children-container {
  position: relative;
  width: 180px;
  height: 180px;
}
.roll-fab-main {
  z-index: 1001;
}
.roll-fab-child {
  pointer-events: auto;
}
</style>
