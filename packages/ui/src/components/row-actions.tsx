"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { Button } from "./button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu"
import { ConfirmDeleteDialog } from "./confirm-delete-dialog"

// Structural shape of @genealogiq/core's ActionResult — kept inline so this
// package doesn't depend on core. The component only reads ok + message.
type Result = { ok: boolean; message?: string }

export type RowActionItem =
  /** A navigation item (e.g. "Edit"). */
  | { kind: "link"; label: string; href: string }
  /** An item that calls a server action and toasts the outcome. `successMessage`
   *  overrides the action's own message (e.g. the toggle's "Deactivated."). */
  | {
      kind: "action"
      label: string
      run: () => Promise<Result>
      successMessage?: string
      destructive?: boolean
    }

export interface RowActionsProps {
  /** sr-only label for the trigger button (the entity's actions.openMenu). */
  menuLabel: string
  items: RowActionItem[]
  /** Delete-with-confirmation. Omit to hide it (e.g. when the caller's permission
   *  boolean is false) — the caller decides, not this component. */
  remove?: {
    label: string
    run: () => Promise<Result>
    confirmDescription: string
    successMessage: string
  }
}

/**
 * The canonical data-table row-actions cell: a "⋯" dropdown of link/action items
 * plus an optional confirm-guarded delete. Centralizes the useTransition + toast
 * boilerplate that every entity's columns.tsx used to repeat.
 */
export function RowActions({ menuLabel, items, remove }: RowActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [deleteOpen, setDeleteOpen] = useState(false)

  function run(action: () => Promise<Result>, successMessage?: string, onDone?: () => void) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      const message = successMessage ?? result.message
      if (message) toast.success(message)
      onDone?.()
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{menuLabel}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {items.map((item, i) =>
            item.kind === "link" ? (
              <DropdownMenuItem key={i} asChild>
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                key={i}
                className={item.destructive ? "text-destructive focus:text-destructive" : undefined}
                onClick={() => run(item.run, item.successMessage)}
              >
                {item.label}
              </DropdownMenuItem>
            ),
          )}
          {remove && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              {remove.label}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {remove && (
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          isPending={isPending}
          description={remove.confirmDescription}
          onConfirm={() => run(remove.run, remove.successMessage, () => setDeleteOpen(false))}
        />
      )}
    </>
  )
}
