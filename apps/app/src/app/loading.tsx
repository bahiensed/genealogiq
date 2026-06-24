import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex w-full flex-col gap-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  )
}
