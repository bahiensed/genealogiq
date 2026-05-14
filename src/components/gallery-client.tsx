'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { Play, X, ChevronLeft, ChevronRight, Images, ImagePlus, ArrowDownUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { GalleryItemRow } from "@/queries/gallery"

const PAGE_SIZE = 12
type SortDir = "newest" | "oldest"

const formatDate = (iso?: string | null) => {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

const formatDuration = (sec: number) => {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

interface Props {
  items: GalleryItemRow[]
  editHref?: string
  isOwn?: boolean
  upgradeHint?: ReactNode
}

export function GalleryClient({ items: rawItems, editHref, isOwn, upgradeHint }: Props) {
  const isEmpty = rawItems.length === 0

  const [sort, setSort] = useState<SortDir>("newest")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const listTopRef = useRef<HTMLDivElement | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const items = useMemo(() => {
    return [...rawItems].sort((a, b) => {
      // Use takenAt when available, fall back to createdAt (upload date)
      const da = new Date(a.takenAt ?? a.createdAt).getTime()
      const db = new Date(b.takenAt ?? b.createdAt).getTime()
      return sort === "newest" ? db - da : da - db
    })
  }, [rawItems, sort])

  const isOpen = lightboxIndex !== null
  const currentItem = isOpen ? items[lightboxIndex!] : null

  const goPrev = () => setLightboxIndex((i) => (i === null ? null : (i - 1 + items.length) % items.length))
  const goNext = () => setLightboxIndex((i) => (i === null ? null : (i + 1) % items.length))

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(PAGE_SIZE)
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [sort])

  useEffect(() => {
    if (visibleCount >= items.length) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisibleCount((c) => Math.min(c + PAGE_SIZE, items.length)) },
      { rootMargin: "300px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visibleCount, items.length])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev()
      else if (e.key === "ArrowRight") goNext()
      else if (e.key === "Escape") setLightboxIndex(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const visible = items.slice(0, visibleCount)
  const hasMeta = (m: GalleryItemRow | null) => !!m && (!!m.takenAt || !!m.location || !!m.description)

  return (
    <>
      <section className="mb-8 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 animate-fade-in">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-muted-foreground italic">Frozen moments: light, laughter and the quiet in between</p>
          {upgradeHint}
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
          {!isEmpty && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ArrowDownUp className="h-4 w-4" />
                  {sort === "newest" ? "Newest first" : "Oldest first"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSort("newest")}>Newest first</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSort("oldest")}>Oldest first</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {isOwn && editHref && (
            <Button asChild className="gap-2">
              <Link href={editHref}>
                {isEmpty ? <ImagePlus className="h-4 w-4" /> : <Images className="h-4 w-4" />}
                {isEmpty ? "Add media" : "Edit"}
              </Link>
            </Button>
          )}
        </div>
      </section>

      <div ref={listTopRef} />

      {isEmpty ? (
        <div className="glass-card flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
          <Images className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No media yet.</p>
          {isOwn && editHref && (
            <Button asChild className="gap-2">
              <Link href={editHref}>
                <ImagePlus className="h-4 w-4" />
                Add media
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 animate-fade-in" style={{ animationDelay: "80ms" }}>
            {visible.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLightboxIndex(idx)}
                className="mb-4 break-inside-avoid w-full block group rounded-2xl overflow-hidden border border-border/60 bg-card/40 transition-transform hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="Gallery item" loading="lazy" className="w-full h-auto block" />
                ) : (
                  <div className="relative">
                    {item.poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.poster} alt="Video thumbnail" loading="lazy" className="w-full h-auto block" />
                    ) : (
                      <video src={item.url} preload="metadata" className="w-full h-auto block" muted />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
                      <div className="h-14 w-14 rounded-full bg-background/80 backdrop-blur-md border border-border/60 flex items-center justify-center">
                        <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                    {item.durationSec != null && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-xs font-medium bg-background/80 backdrop-blur-md border border-border/60">
                        {formatDuration(item.durationSec)}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>

          {visibleCount < items.length ? (
            <div ref={sentinelRef} className="py-10 flex justify-center">
              <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-muted-foreground">End of gallery</div>
          )}
        </>
      )}

      {/* Lightbox */}
      <Dialog open={isOpen} onOpenChange={(o) => !o && setLightboxIndex(null)}>
        <DialogContent className="max-w-[100vw] w-screen h-screen sm:max-w-[95vw] sm:h-[90vh] p-0 bg-background/95 backdrop-blur-xl border-border/60 [&>button]:hidden">
          <DialogTitle className="sr-only">Gallery item viewer</DialogTitle>
          {currentItem && (
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="relative inline-block max-h-full max-w-full group/media">
                {currentItem.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={currentItem.id}
                    src={currentItem.url}
                    alt="Gallery item"
                    className="max-h-[90vh] sm:max-h-[85vh] max-w-full object-contain block"
                  />
                ) : (
                  <video
                    key={currentItem.id}
                    src={currentItem.url}
                    controls
                    autoPlay
                    className="max-h-[90vh] sm:max-h-[85vh] max-w-full block"
                  />
                )}

                {hasMeta(currentItem) && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 sm:p-6 text-white transition-opacity duration-300 opacity-100 sm:opacity-0 sm:group-hover/media:opacity-100">
                    {(currentItem.takenAt || currentItem.location) && (
                      <div className="text-xs sm:text-sm opacity-90">
                        {[formatDate(currentItem.takenAt), currentItem.location].filter(Boolean).join(" · ")}
                      </div>
                    )}
                    {currentItem.description && (
                      <p className="mt-1 text-sm sm:text-base leading-snug max-w-3xl">{currentItem.description}</p>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="absolute top-4 right-4 h-10 w-10 inline-flex items-center justify-center rounded-full bg-background/80 backdrop-blur-md border border-border/60 hover:bg-accent transition"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              {items.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    className="hidden md:inline-flex absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 items-center justify-center rounded-full bg-background/80 backdrop-blur-md border border-border/60 hover:bg-accent transition"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="hidden md:inline-flex absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 items-center justify-center rounded-full bg-background/80 backdrop-blur-md border border-border/60 hover:bg-accent transition"
                    aria-label="Next"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium bg-background/80 backdrop-blur-md border border-border/60">
                    {lightboxIndex! + 1} / {items.length}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
