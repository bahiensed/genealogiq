'use client'

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ImagePlus, X, Save, RotateCcw, Trash2 } from "lucide-react"
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
import { saveBio, deleteBio } from "@/actions/bio"
import { isAllowedImage, IMAGE_FORMATS_LABEL } from "@/lib/upload-validation"
import type { BioRow } from "@/queries/bio"

const MAX_QUOTE = 128

type Aspect = "square" | "portrait" | "landscape"

interface ImageEntry {
  id?: string
  url: string
  aspect: Aspect
  uploading?: boolean
}

interface Props {
  initial: BioRow | null
  profileId: string
  maxChars: number
  maxImages: number
}

export function BioEditForm({ initial, profileId, maxChars, maxImages }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isCreating = !initial

  const [quote, setQuote] = useState(initial?.quote ?? "")
  const [text, setText] = useState(initial?.text ?? "")
  const [images, setImages] = useState<ImageEntry[]>(
    initial?.images.map((img) => ({
      id: img.id,
      url: img.url,
      aspect: (img.aspect as Aspect) ?? "square",
    })) ?? [],
  )

  const handleAddImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const all = Array.from(files)
    const valid = all.filter(isAllowedImage)
    if (valid.length < all.length) {
      toast.warning(`${all.length - valid.length} file(s) skipped. Use ${IMAGE_FORMATS_LABEL}.`)
    }
    if (valid.length === 0) return
    const remaining = maxImages - images.length
    const upgradeAction = { label: "Upgrade plan", onClick: () => router.push("/plans") }
    if (remaining <= 0) {
      toast.warning(`Maximum of ${maxImages} images reached.`, { action: upgradeAction })
      return
    }
    const toProcess = valid.slice(0, remaining)
    if (valid.length > remaining) {
      toast.warning(`Only ${remaining} image(s) added — limit is ${maxImages}.`, { action: upgradeAction })
    }

    const placeholders: ImageEntry[] = toProcess.map((f) => ({
      url: URL.createObjectURL(f),
      aspect: "square",
      uploading: true,
    }))
    setImages((prev) => [...prev, ...placeholders])

    for (let i = 0; i < toProcess.length; i++) {
      const file = toProcess[i]
      try {
        const res = await fetch(`/api/bio/upload?filename=${encodeURIComponent(file.name)}`, {
          method: "POST",
          body: file,
        })
        const data = await res.json() as { url?: string; error?: string }
        if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed")
        setImages((prev) => {
          const next = [...prev]
          const idx = next.findIndex((img) => img.uploading && img.url === placeholders[i].url)
          if (idx !== -1) next[idx] = { url: data.url!, aspect: "square" }
          return next
        })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Failed to upload ${file.name}`)
        setImages((prev) => prev.filter((img) => img.url !== placeholders[i].url))
      }
    }
  }

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSave = () => {
    if (images.some((img) => img.uploading)) {
      toast.warning("Please wait for all images to finish uploading.")
      return
    }
    startTransition(async () => {
      const result = await saveBio(profileId, {
        quote: quote || undefined,
        text: text || undefined,
        images: images.map((img, i) => ({
          id: img.id,
          url: img.url,
          aspect: img.aspect,
          order: i,
        })),
      })
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Biography saved.")
        router.push(`/profile/${profileId}/bio`)
      }
    })
  }

  const handleReset = () => {
    setQuote(initial?.quote ?? "")
    setText(initial?.text ?? "")
    setImages(
      initial?.images.map((img) => ({
        id: img.id,
        url: img.url,
        aspect: (img.aspect as Aspect) ?? "square",
      })) ?? [],
    )
    toast("Changes reset.")
  }

  const handleDelete = () => {
    startTransition(async () => {
      await deleteBio(profileId)
      toast.success("Biography deleted.")
      router.push(`/profile/${profileId}/bio`)
    })
  }

  return (
    <div className="glass-card no-sheen p-6 md:p-8 space-y-8 animate-fade-in" style={{ animationDelay: "80ms" }}>
      {/* Images */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">Photos</Label>
          <span className="text-xs text-muted-foreground">{images.length}/{maxImages}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {images.map((img, idx) => (
            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-border/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="Preview" className="h-full w-full object-cover" />
              {img.uploading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              )}
              {!img.uploading && (
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1.5 right-1.5 h-7 w-7 inline-flex items-center justify-center rounded-full bg-background/80 backdrop-blur-md border border-border/60 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition"
                  aria-label="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

          {images.length < maxImages && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-border/70 hover:border-primary hover:bg-accent/40 transition flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs font-medium">Add image</span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => {
            handleAddImages(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {/* Quote */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="bio-quote" className="text-base">Memorable quote</Label>
          <span className="text-xs text-muted-foreground">{quote.length}/{MAX_QUOTE}</span>
        </div>
        <Input
          id="bio-quote"
          value={quote}
          maxLength={MAX_QUOTE}
          onChange={(e) => setQuote(e.target.value)}
          placeholder="A defining motto or quote..."
        />
      </div>

      {/* Bio text */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="bio-text" className="text-base">Biography</Label>
          <span className="text-xs text-muted-foreground">{text.length}/{maxChars}</span>
        </div>
        <Textarea
          id="bio-text"
          value={text}
          maxLength={maxChars}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write biography..."
          className="min-h-[260px] text-base leading-relaxed"
        />
        <p className="text-xs text-muted-foreground">Use blank lines to separate paragraphs.</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse md:flex-row md:justify-between md:items-center gap-3 pt-2 border-t border-border/60">
        {!isCreating && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete bio
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete biography?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the photos, quote and biography text. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 md:gap-3 md:ml-auto">
          {!isCreating && (
            <Button variant="outline" onClick={handleReset} className="gap-2" disabled={isPending}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
          <Button onClick={handleSave} className="gap-2" disabled={isPending}>
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
