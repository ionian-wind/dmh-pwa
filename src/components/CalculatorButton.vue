<script setup lang="ts">
import { ref } from 'vue';
import Button from './form/Button.vue';
import PopoverPanel from './common/PopoverPanel.vue';
import CalculatorView from '@/views/CalculatorView.vue';
import { IconCalculator } from '@tabler/icons-vue';

// Props for left menu integration
const props = defineProps<{
  leftMenuMinimized?: boolean;
}>();

const isPopoverOpen = ref(false);

const handleClick = () => {
  isPopoverOpen.value = !isPopoverOpen.value;
};
</script>

<template>
  <PopoverPanel
    :is-open="isPopoverOpen"
    @close="isPopoverOpen = false"
    placement="right-end"
    :disable-internal-trigger="true"
  >
    <template #trigger>
      <Button 
        variant="primary" 
        @click.stop="handleClick" 
        :title="'Calculator'"
        :class="['menu-item']"
      >
        <IconCalculator class="menu-icon" />
        <span v-if="!props.leftMenuMinimized" class="menu-label">Calculator</span>
      </Button>
    </template>
    <div class="calculator-popover-content">
     <CalculatorView />
    </div>
  </PopoverPanel>
</template>

<style scoped>
.calculator-popover-content {
  position: relative;
}
</style>
