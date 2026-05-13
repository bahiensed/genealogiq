'use client'

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Props {
  images: Array<{ id: string; url: string }>
}

export function BioImageCarousel({ images }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const evalArrows = () => {
    const el = ref.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    evalArrows()
    const el = ref.current
    if (!el) return
    el.addEventListener("scroll", evalArrows, { passive: true })
    window.addEventListener("resize", evalArrows)
    return () => {
      el.removeEventListener("scroll", evalArrows)
      window.removeEventListener("resize", evalArrows)
    }
  }, [images.length])

  const scrollBy = (dir: -1 | 1) => {
    const el = ref.current
    if (!el) return
    // Half the visible width — one "slide" of 2 images, advances by 1.
    const step = el.clientWidth / 2
    el.scrollBy({ left: dir * step, behavior: "smooth" })
  }

  const showArrows = images.length > 2

  const arrowClass =
    "hidden lg:inline-flex shrink-0 h-10 w-10 rounded-full bg-background/90 border border-border/60 shadow-md items-center justify-center hover:bg-background transition-opacity disabled:opacity-30 disabled:cursor-default"

  return (
    <div className="flex items-center gap-2">
      {showArrows && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          disabled={!canPrev}
          aria-label="Previous"
          className={arrowClass}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      <div
        ref={ref}
        className="flex-1 flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth items-start pb-2 -mx-2 px-2 [scrollbar-width:thin]"
      >
        {images.map((img) => (
          <div
            key={img.id}
            className="snap-start shrink-0 basis-[calc(50%-0.5rem)] glass-card no-sheen p-2"
          >
            <div className="overflow-hidden rounded-2xl bg-muted/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt="Biography photo"
                className="block w-full h-auto"
                loading="lazy"
              />
            </div>
          </div>
        ))}
      </div>

      {showArrows && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          disabled={!canNext}
          aria-label="Next"
          className={arrowClass}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
