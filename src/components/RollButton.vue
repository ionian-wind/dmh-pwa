<script setup lang="ts">
import { useAttrs, ref, watch, nextTick } from 'vue';
import FloatActionButton from './common/FloatActionButton.vue';
import BaseModal from './common/BaseModal.vue';

import DiceBox from '@3d-dice/dice-box';
import { AdvancedRoller } from '@3d-dice/dice-ui'
import { debug } from '@/utils/debug';

const isModalOpen = ref(false);
const attrs = useAttrs();

function openModal() {
  isModalOpen.value = true;
}
function closeModal() {
  isModalOpen.value = false;
}


watch(isModalOpen, () =>
  nextTick(async () => {
    if (isModalOpen.value) {
      const diceBox = new DiceBox({
          container: '#dice-roller',
          assetPath: '/assets/dice-box/',
          theme: 'default',
          onThemeConfigLoaded: (themeData) => {
            debug('Theme loaded:', themeData);
          }
        });
        await diceBox.init();
        // Try rolling once to force render
        const Roller = new AdvancedRoller({
          target: '#dice-roller',
          onSubmit: (notation) => {
            diceBox.roll(notation)
          }
        });
    }
  })
);
</script>

<script lang="ts">
export default {
  inheritAttrs: false
};
</script>

<template>
  <FloatActionButton
    v-bind="attrs"
    size="medium"
    variant="primary"
    @click="openModal"
  >
    🎲
  </FloatActionButton>
  <BaseModal
    :isOpen="isModalOpen"
    :showExpand="true"
    :showCancel="true"
    :isExpanded="true"
    cancelLabel="Close"
    modalId="roll-dice-modal"
    @cancel="closeModal"
  >
  <div id="dice-roller"></div>
  </BaseModal>
</template>

<style>
#dice-roller {
  position: relative;
}
#dice-roller canvas {
  height: 100%;
  width: 100%;
  pointer-events: none;
  z-index: 100;
  inset: 0;
}
</style>
