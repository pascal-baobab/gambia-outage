// image.ts — on-device image optimisation. Downscales a picked photo to a sane longest-edge and
// re-encodes as JPEG so phone photos comfortably clear the 5MB server cap before upload. Shared by the
// community-link composer and the Talk board composer. All work happens in the browser (canvas) — the
// original full-resolution file never leaves the device.
export async function downscaleImage(file: File, name = 'photo.jpg', max = 1280): Promise<File> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(new Error('read failed'))
    fr.readAsDataURL(file)
  })
  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('decode failed'))
    i.src = dataUrl
  })
  const scale = Math.min(1, max / Math.max(img.width, img.height))
  if (scale === 1 && file.size <= 4_500_000) return file // already small enough
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
  if (!blob) return file
  return new File([blob], name, { type: 'image/jpeg' })
}
