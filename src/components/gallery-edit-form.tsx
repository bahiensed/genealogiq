'use client'

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ImagePlus, Film, X, Save, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { saveGallery, deleteGallery } from "@/actions/gallery"
import type { GalleryItemRow } from "@/queries/gallery"

const MAX_VIDEO_SECONDS = 600

type MediaKind = "image" | "video"

interface MediaEntry {
  id?: string
  kind: MediaKind
  url: string
  poster?: string
  durationSec?: number
  takenAt?: string
  location?: string
  description?: string
  uploading?: boolean
}

const probeVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(video.duration) }
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read video metadata")) }
    video.src = url
  })

const formatDuration = (sec: number) => {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function MetaFields({ item, onChange }: { item: MediaEntry; idx: number; onChange: (patch: Partial<MediaEntry>) => void }) {
  return (
    <div className="p-3 space-y-2 border-t border-border/60 bg-card/30">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Date taken</Label>
          <Input type="date" value={item.takenAt ?? ""} onChange={(e) => onChange({ takenAt: e.target.value })} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Location</Label>
          <Input type="text" placeholder="City, Country" value={item.location ?? ""} onChange={(e) => onChange({ location: e.target.value })} className="h-8 text-sm" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Description</Label>
        <Textarea rows={2} maxLength={280} placeholder="A short note about this moment…" value={item.description ?? ""} onChange={(e) => onChange({ description: e.target.value })} className="min-h-[56px] text-sm resize-none" />
      </div>
    </div>
  )
}

interface Props {
  initial: GalleryItemRow[]
  profileId: string
  maxImages: number
  maxVideos: number
}

export function GalleryEditForm({ initial, profileId, maxImages, maxVideos }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const imgInputRef = useRef<HTMLInputElement>(null)
  const vidInputRef = useRef<HTMLInputElement>(null)

  const toEntry = (row: GalleryItemRow): MediaEntry => ({
    id: row.id,
    kind: row.kind as MediaKind,
    url: row.url,
    poster: row.poster ?? undefined,
    durationSec: row.durationSec ?? undefined,
    takenAt: row.takenAt ?? undefined,
    location: row.location ?? undefined,
    description: row.description ?? undefined,
  })

  const [items, setItems] = useState<MediaEntry[]>(initial.map(toEntry))
  const initialRef = useRef<MediaEntry[]>(initial.map(toEntry))

  const images = items.filter((i) => i.kind === "image")
  const videos = items.filter((i) => i.kind === "video")
  const isCreating = initial.length === 0

  const updateMeta = (idx: number, patch: Partial<MediaEntry>) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)))
  }

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))

  const handleAddImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const remaining = maxImages - images.length
    if (remaining <= 0) { toast.warning(`Maximum of ${maxImages} images reached.`); return }
    const toProcess = Array.from(files).slice(0, remaining)
    if (files.length > remaining) toast.warning(`Only ${remaining} image(s) added — limit is ${maxImages}.`)

    const placeholders: MediaEntry[] = toProcess.map((f) => ({
      kind: "image",
      url: URL.createObjectURL(f),
      uploading: true,
    }))
    setItems((prev) => [...prev, ...placeholders])

    for (let i = 0; i < toProcess.length; i++) {
      const file = toProcess[i]
      const localUrl = placeholders[i].url
      try {
        const res = await fetch(`/api/gallery/upload?filename=${encodeURIComponent(file.name)}`, {
          method: "POST",
          body: file,
        })
        const data = await res.json() as { url?: string; error?: string }
        if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed")
        setItems((prev) => {
          const next = [...prev]
          const idx = next.findIndex((item) => item.uploading && item.url === localUrl)
          if (idx !== -1) next[idx] = { kind: "image", url: data.url! }
          return next
        })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Failed to upload ${file.name}`)
        setItems((prev) => prev.filter((item) => item.url !== localUrl))
      }
    }
  }

  const handleAddVideos = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const remaining = maxVideos - videos.length
    if (remaining <= 0) { toast.warning(`Maximum of ${maxVideos} videos reached.`); return }
    const candidates = Array.from(files).slice(0, remaining)
    if (files.length > remaining) toast.warning(`Only ${remaining} video(s) processed — limit is ${maxVideos}.`)

    for (const file of candidates) {
      let durationSec: number
      try {
        durationSec = await probeVideoDuration(file)
        if (durationSec > MAX_VIDEO_SECONDS) { toast.error(`"${file.name}" exceeds 10 minutes.`); continue }
      } catch {
        toast.error(`Could not read "${file.name}".`); continue
      }

      const localUrl = URL.createObjectURL(file)
      const placeholder: MediaEntry = { kind: "video", url: localUrl, durationSec, uploading: true }
      setItems((prev) => [...prev, placeholder])

      try {
        const res = await fetch(`/api/gallery/upload?filename=${encodeURIComponent(file.name)}`, {
          method: "POST",
          body: file,
        })
        const data = await res.json() as { url?: string; error?: string }
        if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed")
        setItems((prev) => {
          const next = [...prev]
          const idx = next.findIndex((item) => item.uploading && item.url === localUrl)
          if (idx !== -1) next[idx] = { kind: "video", url: data.url!, durationSec }
          return next
        })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Failed to upload ${file.name}`)
        setItems((prev) => prev.filter((item) => item.url !== localUrl))
      }
    }
  }

  const handleSave = () => {
    if (items.some((i) => i.uploading)) { toast.warning("Please wait for all uploads to finish."); return }
    startTransition(async () => {
      const result = await saveGallery(profileId, {
        items: items.map((item, i) => ({
          id: item.id,
          kind: item.kind,
          url: item.url,
          poster: item.poster,
          durationSec: item.durationSec,
          takenAt: item.takenAt || undefined,
          location: item.location || undefined,
          description: item.description || undefined,
          order: i,
        })),
      })
      if (result?.error) { toast.error(result.error) } else { toast.success("Gallery saved."); router.push(`/profile/${profileId}/gallery`) }
    })
  }

  const handleReset = () => { setItems(initialRef.current.map((i) => ({ ...i }))); toast("Changes reset.") }

  const handleDelete = () => {
    startTransition(async () => {
      await deleteGallery(profileId)
      toast.success("Gallery deleted.")
      router.push(`/profile/${profileId}/gallery`)
    })
  }

  const allItems = items

  return (
    <div className="glass-card no-sheen p-6 md:p-8 space-y-10 animate-fade-in" style={{ animationDelay: "80ms" }}>
      {/* Photos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">Photos</Label>
          <span className="text-xs text-muted-foreground">{images.length}/{maxImages}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {allItems.map((item, idx) => item.kind !== "image" ? null : (
            <div key={idx} className="relative group rounded-xl overflow-hidden border border-border/60 bg-card/40 flex flex-col">
              <div className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="Preview" className="h-full w-full object-cover" />
                {item.uploading && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                )}
                {!item.uploading && (
                  <button type="button" onClick={() => removeItem(idx)} className="absolute top-1.5 right-1.5 h-7 w-7 inline-flex items-center justify-center rounded-full bg-background/80 backdrop-blur-md border border-border/60 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition" aria-label="Remove">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {!item.uploading && <MetaFields item={item} idx={idx} onChange={(patch) => updateMeta(idx, patch)} />}
            </div>
          ))}

          {images.length < maxImages && (
            <button type="button" onClick={() => imgInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-border/70 hover:border-primary hover:bg-accent/40 transition flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground">
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs font-medium">Add image</span>
            </button>
          )}
        </div>
        <input ref={imgInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={(e) => { handleAddImages(e.target.files); e.target.value = "" }} />
      </div>

      {/* Videos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">Videos</Label>
          <span className="text-xs text-muted-foreground">{videos.length}/{maxVideos} · max 10 min each</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {allItems.map((item, idx) => item.kind !== "video" ? null : (
            <div key={idx} className="relative group rounded-xl overflow-hidden border border-border/60 bg-card/40 flex flex-col">
              <div className="relative">
                <video src={item.url} controls preload="metadata" className="w-full aspect-video object-cover bg-black" />
                {item.durationSec != null && (
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-xs font-medium bg-background/80 backdrop-blur-md border border-border/60">{formatDuration(item.durationSec)}</span>
                )}
                {item.uploading && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                )}
                {!item.uploading && (
                  <button type="button" onClick={() => removeItem(idx)} className="absolute top-1.5 right-1.5 h-7 w-7 inline-flex items-center justify-center rounded-full bg-background/80 backdrop-blur-md border border-border/60 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition" aria-label="Remove">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {!item.uploading && <MetaFields item={item} idx={idx} onChange={(patch) => updateMeta(idx, patch)} />}
            </div>
          ))}

          {videos.length < maxVideos && (
            <button type="button" onClick={() => vidInputRef.current?.click()} className="aspect-video rounded-xl border-2 border-dashed border-border/70 hover:border-primary hover:bg-accent/40 transition flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground">
              <Film className="h-6 w-6" />
              <span className="text-xs font-medium">Add video</span>
            </button>
          )}
        </div>
        <input ref={vidInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" multiple className="hidden" onChange={(e) => { handleAddVideos(e.target.files); e.target.value = "" }} />
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse md:flex-row md:justify-between md:items-center gap-3 pt-2 border-t border-border/60">
        {!isCreating && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2 md:w-auto w-full"><Trash2 className="h-4 w-4" />Delete gallery</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete gallery?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently remove all photos and videos. This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <div className="flex flex-col-reverse sm:flex-row gap-2 md:gap-3 md:ml-auto">
          {!isCreating && (
            <Button variant="outline" onClick={handleReset} className="gap-2" disabled={isPending}><RotateCcw className="h-4 w-4" />Reset</Button>
          )}
          <Button onClick={handleSave} className="gap-2" disabled={isPending}><Save className="h-4 w-4" />Save</Button>
        </div>
      </div>
    </div>
  )
}
