import { Skeleton } from "@genealogiq/ui/skeleton"

// Mirrors the records DataTable: a toolbar row, a header, then several body rows.
export default function Loading() {
  return (
    <div className="flex w-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-10 w-full max-w-sm" />
      <div className="rounded-md border">
        <Skeleton className="h-11 w-full rounded-b-none" />
        <div className="space-y-px p-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
