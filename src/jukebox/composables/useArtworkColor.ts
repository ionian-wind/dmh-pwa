import { ref } from 'vue'
import ColorThief from 'color-thief-browser'

export function useArtworkColor() {
  const color = ref<string | null>(null)

  async function extractColor(artworkUrl: string | null) {
    if (!artworkUrl) {
      color.value = null
      return
    }
    const img = new window.Image()
    img.crossOrigin = 'Anonymous'
    img.src = artworkUrl
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })
    try {
      const rgb = ColorThief.getColor(img)
      color.value = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
    } catch {
      color.value = null
    }
  }

  return {
    color,
    extractColor,
  }
} 