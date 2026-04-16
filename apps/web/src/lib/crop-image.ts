export async function cropMobbinFromBottom(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const cropPx = 120
  const width = bitmap.width
  const height = Math.max(bitmap.height - cropPx, 1)

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    bitmap.close()
    throw new Error("Canvas 2D context not available")
  }
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  const type = file.type || "image/png"
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type)
  })
  if (!blob) throw new Error("Canvas export failed")

  return new File([blob], file.name, { type: blob.type, lastModified: file.lastModified })
}
