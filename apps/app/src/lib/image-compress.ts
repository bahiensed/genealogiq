"use client"

interface CompressOptions {
  /** Max dimension on either axis (the smaller of width/height after fit-inside). */
  maxDim: number
  /** JPEG/WebP quality 0..1; ignored for PNG. Defaults to 0.85. */
  quality?: number
}

/**
 * Client-side image compression via Canvas.
 *
 * - PNG → re-encoded as PNG at the smaller size (preserves transparency)
 * - GIF → passed through untouched (animated GIFs would lose their animation)
 * - Everything else (JPEG, WebP, HEIC-as-JPEG, …) → encoded as JPEG at `quality`
 *
 * If the image is already within `maxDim`, the original file is returned
 * untouched — small uploads skip the canvas round-trip entirely.
 */
export async function compressImage(file: File, options: CompressOptions): Promise<File> {
  const { maxDim, quality = 0.85 } = options

  if (file.type === "image/gif") return file

  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const { width, height } = img

    if (width <= maxDim && height <= maxDim && file.type !== "image/png") {
      // Already small enough and not a PNG we'd want to re-encode for size.
      return file
    }

    const scale = Math.min(1, maxDim / Math.max(width, height))
    const targetWidth  = Math.round(width  * scale)
    const targetHeight = Math.round(height * scale)

    const canvas = document.createElement("canvas")
    canvas.width  = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return file

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg"
    const blob = await canvasToBlob(canvas, outputType, quality)
    if (!blob) return file

    const dot = file.name.lastIndexOf(".")
    const baseName = dot >= 0 ? file.name.slice(0, dot) : file.name
    const ext = outputType === "image/png" ? "png" : "jpg"

    return new File([blob], `${baseName}.${ext}`, {
      type:         outputType,
      lastModified: file.lastModified,
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error("Could not load image"))
    img.src     = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}
