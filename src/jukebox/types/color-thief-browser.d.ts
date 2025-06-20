declare module 'color-thief-browser' {
  const ColorThief: {
    getColor(img: HTMLImageElement): [number, number, number]
  }
  export default ColorThief
} 