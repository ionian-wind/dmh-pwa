import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useNavigationStore = defineStore('navigation', () => {
  const lastOpenedPage = ref('/');

  function setLastOpenedPage(path: string) {
    lastOpenedPage.value = path;
  }

  return {
    lastOpenedPage,
    setLastOpenedPage
  };
}); 