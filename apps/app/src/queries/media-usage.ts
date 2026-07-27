import { prisma } from "@/lib/prisma"

export interface MediaUsage {
  images: number
  videos: number
}

// The combined photo/video pool a plan's mediaMaxImages/mediaMaxVideos caps —
// summed across every module a profile can upload media into today: Bio's
// own image, Gallery's images/videos, and every GeoPlace's photos array.
// Memoriais/Pets don't have their own media yet (Pets has no model at all;
// a guardian's OTHER memorials are separate profiles with their own pool,
// not summed into this one) — this is per-profile, not per-guardian.
export async function getCombinedMediaUsage(profileId: string): Promise<MediaUsage> {
  const [galleryGroups, bioImageCount, places] = await Promise.all([
    prisma.galleryItem.groupBy({
      by:     ["kind"],
      where:  { userId: profileId },
      _count: { _all: true },
    }),
    prisma.bioImage.count({ where: { bio: { userId: profileId } } }),
    prisma.geoPlace.findMany({ where: { userId: profileId }, select: { photos: true } }),
  ])

  const galleryImages = galleryGroups.find((g) => g.kind === "image")?._count._all ?? 0
  const galleryVideos = galleryGroups.find((g) => g.kind === "video")?._count._all ?? 0
  const geoPhotos = places.reduce((sum, p) => sum + p.photos.length, 0)

  return {
    images: galleryImages + bioImageCount + geoPhotos,
    videos: galleryVideos,
  }
}
