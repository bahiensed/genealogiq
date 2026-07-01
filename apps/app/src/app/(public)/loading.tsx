import { Skeleton } from "@/components/ui/skeleton"

// Mirrors the memorial profile page: the banner block, then the bento card grid
// (tree spans 4, bio spans 2, the rest span 3), so the fallback matches real content.
const CARD_SPANS = ["lg:col-span-4", "lg:col-span-2", "lg:col-span-3", "lg:col-span-3", "lg:col-span-3", "lg:col-span-3"]

export default function Loading() {
  return (
    <main className="container relative pt-24 pb-32">
      <Skeleton className="h-56 w-full rounded-3xl" />
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 md:gap-5">
        {CARD_SPANS.map((span, i) => (
          <Skeleton key={i} className={`h-72 rounded-3xl sm:col-span-1 ${span}`} />
        ))}
      </div>
    </main>
  )
}
