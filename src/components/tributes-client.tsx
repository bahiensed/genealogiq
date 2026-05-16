'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Send, SquarePen, Flower2, ArrowDownUp, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteTribute } from "@/actions/tribute"
import type { ApprovedTributeRow } from "@/queries/tribute"

const PAGE_SIZE = 10
type SortDir = "newest" | "oldest"

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("")

interface Props {
  items: ApprovedTributeRow[]
  profileId: string
  sessionUserId: string
  canWrite: boolean
  hasPendingFromMe?: boolean
}

export function TributesClient({ items, profileId, sessionUserId, canWrite, hasPendingFromMe }: Props) {
  const router = useRouter()
  const [isDeleting, startDelete] = useTransition()
  const myTribute = items.find((t) => t.authorId === sessionUserId)
  const [sort, setSort] = useState<SortDir>("newest")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const listTopRef = useRef<HTMLDivElement | null>(null)
  const didMountRef = useRef(false)

  const handleDelete = () => {
    startDelete(async () => {
      await deleteTribute(profileId)
      toast.success("Tribute deleted.")
      router.refresh()
    })
  }

  const sorted = useMemo(() => {
    return [...items].sort((a, b) =>
      sort === "newest"
        ? b.createdAt.getTime() - a.createdAt.getTime()
        : a.createdAt.getTime() - b.createdAt.getTime(),
    )
  }, [items, sort])

  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return }
    setVisibleCount(PAGE_SIZE)
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [sort])

  useEffect(() => {
    if (visibleCount >= sorted.length) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisibleCount((c) => Math.min(c + PAGE_SIZE, sorted.length)) },
      { rootMargin: "300px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visibleCount, sorted.length])

  const visible = sorted.slice(0, visibleCount)
  const writeHref = `/profile/${profileId}/tributes/edit`

  return (
    <>
      <section className="mb-8 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 animate-fade-in">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-muted-foreground italic">
            Words left behind: small flames carried by those who remember
          </p>
          {hasPendingFromMe && (
            <p className="text-xs text-muted-foreground">
              Your tribute is awaiting moderation.{" "}
              <Link href={writeHref} className="text-primary hover:underline">
                Click here to edit your tribute.
              </Link>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
          {!items.length ? null : (
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
          {canWrite && (
            <Button asChild className="gap-2">
              <Link href={writeHref}>
                {myTribute ? <SquarePen className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                {myTribute ? "Edit your tribute" : "Send a tribute"}
              </Link>
            </Button>
          )}
        </div>
      </section>

      <div ref={listTopRef} />

      {items.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
          <Flower2 className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No tributes yet.</p>
          {canWrite && (
            <Button asChild className="gap-2">
              <Link href={writeHref}><Send className="h-4 w-4" />Send a tribute</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 animate-fade-in" style={{ animationDelay: "80ms" }}>
            {visible.map((t) => {
              const isMine = t.authorId === sessionUserId
              const authorName = `${t.author.firstName} ${t.author.lastName}`
              return (
                <article key={t.id} className="mb-4 break-inside-avoid glass-card no-sheen overflow-hidden">
                  {t.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.imageUrl} alt={`Tribute by ${authorName}`} loading="lazy" className="w-full h-auto block" />
                  )}
                  <div className="p-5 space-y-4">
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{t.text}</p>
                    <div className="flex items-center gap-3 pt-1 border-t border-border/60">
                      <Avatar className="h-8 w-8">
                        {t.author.avatarUrl && <AvatarImage src={t.author.avatarUrl} alt={authorName} />}
                        <AvatarFallback className="text-xs bg-secondary">{initials(authorName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{authorName}</span>
                          {isMine && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Yours</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</div>
                      </div>
                      {isMine && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                              aria-label="Delete your tribute"
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete your tribute?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This cannot be undone. The tribute and its image will be removed from this profile.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {isDeleting ? "Deleting…" : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {visibleCount < sorted.length ? (
            <div ref={sentinelRef} className="py-10 flex justify-center">
              <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-muted-foreground">End of tributes</div>
          )}
        </>
      )}
    </>
  )
}
