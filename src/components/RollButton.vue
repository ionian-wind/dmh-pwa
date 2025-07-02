<script setup lang="ts">
import { ref, computed } from 'vue';
import FloatActionButton from './common/FloatActionButton.vue';
import { IconDice5, IconDice1, IconDice2, IconDice3, IconDice4, IconDice6, IconPlus, IconMinus, IconX, IconCheck, IconCross } from '@tabler/icons-vue';

const showFabs = ref(false);

function toggleFabs() {
  showFabs.value = !showFabs.value;
}

const fabButtons = [
  { icon: IconDice1, label: '1' },
  { icon: IconDice2, label: '2' },
  { icon: IconDice3, label: '3' },
  { icon: IconDice4, label: '4' },
  { icon: IconDice5, label: '5' },
  { icon: IconDice6, label: '6' },
  { icon: IconPlus, label: '+' },
  { icon: IconMinus, label: '-' },
];

function getFabStyle(index: number, total: number, visible: boolean) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const radius = 80; // px
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: visible
      ? `translate(-50%, -50%) translate(${x}px, ${y}px) scale(1)`
      : 'translate(-50%, -50%) scale(0.2)',
    opacity: visible ? 1 : 0,
    transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.4s cubic-bezier(0.4,0,0.2,1)',
    zIndex: 999,
    pointerEvents: visible ? 'auto' : 'none',
  };
}
</script>

<template>
  <div class="fab-roll-group">
    <FloatActionButton
      size="medium"
      variant="primary"
      class="roll-fab-main"
      @click="toggleFabs"
      :title="'Roll'"
    >
      <IconX v-if="showFabs" />
      <IconDice5 v-else />
    </FloatActionButton>
    <div>
      <FloatActionButton
        v-for="(fab, i) in fabButtons"
        :key="fab.label"
        class="roll-fab-child"
        size="medium"
        variant="secondary"
        :style="getFabStyle(i, fabButtons.length, showFabs)"
      >
        <component :is="fab.icon" />
      </FloatActionButton>
    </div>
  </div>
</template>

<style scoped>
.roll-fab-child {
  pointer-events: auto;
}
</style>
