import { Skeleton } from "@/components/ui/skeleton"

// Mirrors the messages inbox: a heading, then a list of message cards.
export default function Loading() {
  return (
    <div className="flex w-full flex-col gap-4 p-6">
      <Skeleton className="h-7 w-40" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
