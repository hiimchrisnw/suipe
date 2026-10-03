const SIZE = 16

function close(data: Uint8ClampedArray, i: number, r: number, g: number, b: number): boolean {
  const dr = Math.abs((data[i] ?? 0) - r)
  const dg = Math.abs((data[i + 1] ?? 0) - g)
  const db = Math.abs((data[i + 2] ?? 0) - b)
  return dr + dg + db < 48
}

// The colour at a favicon's top-left corner, so its circle can carry the icon's own background
// out to the edge. Returns null, keeping the circle's default fill, when the corner is transparent,
// when the browser won't let us read the pixels, or when the icon is one solid colour. That last
// case is a mark rather than a background (Recent's black block): filling the circle with it would
// leave a plain disc with nothing visible inside.
export function readIconBackground(img: HTMLImageElement): string | null {
  try {
    const canvas = document.createElement("canvas")
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, SIZE, SIZE)
    const { data } = ctx.getImageData(0, 0, SIZE, SIZE)

    const [r = 0, g = 0, b = 0, a = 0] = data
    if (a < 200) return null

    let opaque = 0
    let different = 0
    for (let i = 0; i < data.length; i += 4) {
      if ((data[i + 3] ?? 0) < 128) continue
      opaque++
      if (!close(data, i, r, g, b)) different++
    }
    if (opaque === 0 || different / opaque < 0.08) return null

    return `rgb(${r} ${g} ${b})`
  } catch {
    return null
  }
}
