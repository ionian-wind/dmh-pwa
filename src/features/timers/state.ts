import { ref } from 'vue';

export const timersOpen = ref(false);

export function toggleTimers(): void {
  timersOpen.value = !timersOpen.value;
}
