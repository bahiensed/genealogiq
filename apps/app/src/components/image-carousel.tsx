'use client'

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

interface Props {
  images: Array<{ id: string; url: string }>
  altText: (index: number) => string
  prevLabel: string
  nextLabel: string
}

export function ImageCarousel({ images, altText, prevLabel, nextLabel }: Props) {
  if (images.length === 0) return null

  return (
    <Carousel opts={{ loop: images.length > 1 }} className="px-2 lg:px-14">
      <CarouselContent>
        {images.map((img, i) => (
          <CarouselItem key={img.id} className="basis-1/2 md:basis-1/3">
            <div className="glass-card no-sheen p-2">
              <div className="overflow-hidden rounded-2xl bg-muted/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={altText(i)} className="block w-full h-auto" loading="lazy" />
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      {images.length > 1 && (
        <>
          <CarouselPrevious aria-label={prevLabel} className="hidden lg:flex" />
          <CarouselNext aria-label={nextLabel} className="hidden lg:flex" />
        </>
      )}
    </Carousel>
  )
}
