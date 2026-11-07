import { ref } from 'vue';

export const calculatorOpen = ref(false);

export function toggleCalculator(): void {
  calculatorOpen.value = !calculatorOpen.value;
}
