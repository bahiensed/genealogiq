'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddRelativeDialog } from "@/components/family-tree/add-relative-dialog"

interface Props {
  rootId: string
  label?: string
}

export function AddFirstRelativeButton({ rootId, label = "Add relative" }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        {label}
      </Button>
      <AddRelativeDialog
        open={open}
        onClose={() => setOpen(false)}
        anchorId={rootId}
        rootId={rootId}
        onSuccess={router.refresh}
      />
    </>
  )
}
