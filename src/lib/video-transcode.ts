"use client"

import type { FFmpeg } from "@ffmpeg/ffmpeg"

export interface VideoMeta {
  width: number
  height: number
  durationSec: number
}

export function inspectVideo(file: File): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => {
      const meta: VideoMeta = {
        width: video.videoWidth,
        height: video.videoHeight,
        durationSec: video.duration,
      }
      URL.revokeObjectURL(url)
      resolve(meta)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Could not read video metadata"))
    }
    video.src = url
  })
}

const APPLE_MIME = new Set(["video/quicktime", "video/x-m4v"])
const APPLE_EXT = new Set([".mov", ".m4v"])

export function needsTranscode(file: File, meta: VideoMeta): boolean {
  if (APPLE_MIME.has(file.type)) return true
  const dot = file.name.lastIndexOf(".")
  if (dot >= 0 && APPLE_EXT.has(file.name.slice(dot).toLowerCase())) return true
  if (meta.width > 1920 || meta.height > 1080) return true
  return false
}

const CORE_VERSION = "0.12.10"
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`

let ffmpegInstance: FFmpeg | null = null
let loadPromise: Promise<FFmpeg> | null = null

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg")
    const { toBlobURL } = await import("@ffmpeg/util")
    const ff = new FFmpeg()
    await ff.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    })
    ffmpegInstance = ff
    return ff
  })()
  return loadPromise
}

export async function transcodeToHD(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<File> {
  const ffmpeg = await getFFmpeg()
  const { fetchFile } = await import("@ffmpeg/util")

  const dot = file.name.lastIndexOf(".")
  const ext = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : "mp4"
  const inputName = `input.${ext}`
  const outputName = "output.mp4"

  const progressHandler = ({ progress }: { progress: number }) => {
    if (progress >= 0 && progress <= 1) onProgress?.(progress)
  }
  // Collect ffmpeg log lines so we can include them in any thrown error — a
  // silent 100% failure used to surface as just "transcode failed".
  const logLines: string[] = []
  const logHandler = (entry: { message: string }) => {
    logLines.push(entry.message)
    if (logLines.length > 200) logLines.splice(0, logLines.length - 200)
  }
  ffmpeg.on("progress", progressHandler)
  ffmpeg.on("log", logHandler)

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file))
    // Lightest sensible config for memorial-gallery videos:
    //  - cap at 1280 wide (plenty for in-page viewing, much faster than 1080p)
    //  - ultrafast preset (lowest CPU)
    //  - yuv420p (universal playback, normalises HEVC 10-bit Apple sources)
    //  - CRF 28 (good enough at 1280p, dramatically smaller file)
    //  - stereo audio (avoids weird 5.1 layouts re-encode quirks)
    await ffmpeg.exec([
      "-i", inputName,
      "-vf", "scale='min(1280,iw)':'-2'",
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-pix_fmt", "yuv420p",
      "-crf", "28",
      "-c:a", "aac",
      "-ac", "2",
      "-movflags", "+faststart",
      "-y", outputName,
    ])
    const data = await ffmpeg.readFile(outputName)
    const bytes = (data as Uint8Array).slice()
    const blob = new Blob([bytes], { type: "video/mp4" })
    const baseName = dot >= 0 ? file.name.slice(0, dot) : file.name
    return new File([blob], `${baseName}.mp4`, { type: "video/mp4" })
  } catch (err) {
    const tail = logLines.slice(-30).join("\n")
    console.error("[video-transcode] failed", err, "\nffmpeg log:\n", tail)
    const message = err instanceof Error ? err.message : "Video transcode failed"
    throw new Error(`${message}${tail ? `\n${tail}` : ""}`)
  } finally {
    ffmpeg.off("progress", progressHandler)
    ffmpeg.off("log", logHandler)
    try { await ffmpeg.deleteFile(inputName) } catch {}
    try { await ffmpeg.deleteFile(outputName) } catch {}
  }
}
