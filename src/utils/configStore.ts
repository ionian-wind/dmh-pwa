import { defineStore } from "pinia";
import { ref } from "vue";

export const useConfigStore = defineStore('config', () => {
  // Define your state here
  const currentModuleFilter = ref<string | null>(null);
  const lastOpenedPage = ref<string>('/');
  
  // Jukebox state
  const lastTrackId = ref<string | null>(null);
  const lastTrackProgress = ref<number>(0);
  const lastVolume = ref<number>(1);

  return {
    currentModuleFilter,
    lastOpenedPage,
    lastTrackId,
    lastTrackProgress,
    lastVolume,
  };
}, {
  persist: true,
}); 