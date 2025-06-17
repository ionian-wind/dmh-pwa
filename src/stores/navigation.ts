import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useNavigationStore = defineStore('navigation', () => {
  const lastOpenedPage = ref(localStorage.getItem('lastOpenedPage') || '/');

  function setLastOpenedPage(path: string) {
    lastOpenedPage.value = path;
    localStorage.setItem('lastOpenedPage', path);
  }

  return {
    lastOpenedPage,
    setLastOpenedPage
  };
}); 