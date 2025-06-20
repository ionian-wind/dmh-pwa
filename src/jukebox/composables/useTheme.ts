import { ref, watch } from 'vue'

export function useTheme() {
  const theme = ref<'light' | 'dark'>('light')

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme.value)
  }

  // Optionally sync with global theme
  watch(theme, (val) => {
    document.documentElement.setAttribute('data-theme', val)
  })

  return {
    theme,
    toggleTheme,
  }
} 