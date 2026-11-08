import { ref } from 'vue';

export const soundControlOpen = ref(false);

export function toggleSoundControl(): void {
  soundControlOpen.value = !soundControlOpen.value;
}
