'use client'

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
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

// SPOUSE always needs a value (married is the implicit default), so we don't
// expose a "standard" option. For PARENT_OF and SIBLING, null = blood-relation
// default; users can mark adopted/step/half instead.
const STANDARD = "__standard"

export function EditRelationDialog({ open, onClose, rootId, relation, onSuccess }: Props) {
  const t = useTranslations("FamilyTree")
  const tc = useTranslations("Common")
  const [isPending, startTransition] = useTransition()
  const [subtype, setSubtype] = useState<string>(
    relation.subtype ?? (relation.type === "SPOUSE" ? "married" : STANDARD),
  )
  const [startDate, setStartDate] = useState(toInputDate(relation.startDate))
  const [endDate, setEndDate]     = useState(toInputDate(relation.endDate))

  const subtypes: readonly string[] =
    relation.type === "SPOUSE"  ? SPOUSE_SUBTYPES :
    relation.type === "SIBLING" ? SIBLING_SUBTYPES :
    PARENT_OF_SUBTYPES

  const allowStandard = relation.type !== "SPOUSE"

  const showEndDate = relation.type === "SPOUSE" && (subtype === "divorced" || subtype === "widowed")
  const showStartDate = relation.type === "SPOUSE" || (relation.type === "PARENT_OF" && (subtype === "adopted" || subtype === "step"))

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateRelation(rootId, relation.id, {
        subtype:   subtype === STANDARD ? null : subtype,
        startDate: startDate || null,
        endDate:   endDate || null,
      })
      if (result?.error) { toast.error(result.error); return }
      toast.success(t("toasts.relationUpdated"))
      onClose()
      onSuccess?.()
    })
  }

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeRelation(rootId, relation.id)
      if (result?.error) { toast.error(result.error); return }
      toast.success(t("toasts.relationRemoved"))
      onClose()
      onSuccess?.()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editRelation.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>{t("editRelation.typeLabel")}</Label>
            <Select value={subtype} onValueChange={setSubtype}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allowStandard && (
                  <SelectItem value={STANDARD}>{t("subtypes.standard")}</SelectItem>
                )}
                {subtypes.map((s) => (
                  <SelectItem key={s} value={s}>{t(`subtypes.${s}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(showStartDate || showEndDate) && (
            <div className="grid grid-cols-2 gap-2">
              {showStartDate && (
                <div className="space-y-1.5">
                  <Label htmlFor="r-start">{relation.type === "SPOUSE" ? t("editRelation.married") : t("editRelation.started")}</Label>
                  <Input id="r-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
              )}
              {showEndDate && (
                <div className="space-y-1.5">
                  <Label htmlFor="r-end">{subtype === "widowed" ? t("editRelation.widowed") : t("editRelation.ended")}</Label>
                  <Input id="r-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="destructive" onClick={handleRemove} disabled={isPending}>{t("editRelation.removeRelation")}</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>{tc("cancel")}</Button>
            <Button onClick={handleSave} disabled={isPending}>{isPending ? tc("saving") : tc("save")}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
