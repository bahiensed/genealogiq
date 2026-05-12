'use client'

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateRelation, removeRelation } from "@/actions/family-tree"
import {
  PARENT_OF_SUBTYPES,
  SPOUSE_SUBTYPES,
  SIBLING_SUBTYPES,
} from "@/schemas/family-tree"
import type { TreeRelation } from "@/queries/family-tree"

interface Props {
  open:      boolean
  onClose:   () => void
  rootId:    string
  relation:  TreeRelation
  onSuccess?: () => void
}

const toInputDate = (d: Date | null) => d ? new Date(d).toISOString().slice(0, 10) : ""

export function EditRelationDialog({ open, onClose, rootId, relation, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition()
  const [subtype, setSubtype] = useState(relation.subtype ?? "blood")
  const [startDate, setStartDate] = useState(toInputDate(relation.startDate))
  const [endDate, setEndDate]     = useState(toInputDate(relation.endDate))

  const subtypes: readonly string[] =
    relation.type === "SPOUSE"  ? SPOUSE_SUBTYPES :
    relation.type === "SIBLING" ? SIBLING_SUBTYPES :
    PARENT_OF_SUBTYPES

  const showEndDate = relation.type === "SPOUSE" && (subtype === "divorced" || subtype === "widowed")
  const showStartDate = relation.type === "SPOUSE" || (relation.type === "PARENT_OF" && (subtype === "adopted" || subtype === "step"))

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateRelation(rootId, relation.id, {
        subtype,
        startDate: startDate || null,
        endDate:   endDate || null,
      })
      if (result?.error) { toast.error(result.error); return }
      toast.success("Relation updated.")
      onClose()
      onSuccess?.()
    })
  }

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeRelation(rootId, relation.id)
      if (result?.error) { toast.error(result.error); return }
      toast.success("Relation removed.")
      onClose()
      onSuccess?.()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit relation</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={subtype} onValueChange={setSubtype}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {subtypes.map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(showStartDate || showEndDate) && (
            <div className="grid grid-cols-2 gap-2">
              {showStartDate && (
                <div className="space-y-1.5">
                  <Label htmlFor="r-start">{relation.type === "SPOUSE" ? "Married" : "Started"}</Label>
                  <Input id="r-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
              )}
              {showEndDate && (
                <div className="space-y-1.5">
                  <Label htmlFor="r-end">{subtype === "widowed" ? "Widowed" : "Ended"}</Label>
                  <Input id="r-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="destructive" onClick={handleRemove} disabled={isPending}>Remove relation</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending}>{isPending ? "Saving…" : "Save"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
