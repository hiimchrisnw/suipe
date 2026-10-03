// The colour at a favicon's top-left corner, so its circle can carry the icon's own background
// out to the edge. Transparent corners (or a canvas the browser won't let us read) return null,
// and the circle keeps its default fill.
export function readIconBackground(img: HTMLImageElement): string | null {
  try {
    const canvas = document.createElement("canvas")
    canvas.width = 16
    canvas.height = 16
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, 16, 16)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    if (a === undefined || a < 200) return null
    return `rgb(${r} ${g} ${b})`
  } catch {
    return null
  }
}
