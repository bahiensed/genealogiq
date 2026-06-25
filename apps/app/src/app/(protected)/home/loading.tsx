import { Skeleton } from "@/components/ui/skeleton"

// Mirrors the home screen: greeting line, then the profile card grid.
export default function Loading() {
  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
