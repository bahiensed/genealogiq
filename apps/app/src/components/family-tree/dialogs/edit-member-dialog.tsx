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
import { updateMember } from "@/actions/family-tree.actions"
import type { TreePerson } from "@/queries/family-tree"

interface Props {
  open:      boolean
  onClose:   () => void
  rootId:    string
  person:    TreePerson
  onSuccess?: () => void
}

const toInputDate = (d: Date | null) => d ? new Date(d).toISOString().slice(0, 10) : ""

export function EditMemberDialog({ open, onClose, rootId, person, onSuccess }: Props) {
  const t = useTranslations("FamilyTree")
  const tc = useTranslations("Common")
  const [isPending, startTransition] = useTransition()
  const [firstName, setFirstName] = useState(person.firstName)
  const [lastName,  setLastName]  = useState(person.lastName)
  const [maidenName, setMaidenName] = useState(person.maidenName ?? "")
  const [nickname,   setNickname]   = useState(person.nickname ?? "")
  const [gender,     setGender]     = useState<"MALE" | "FEMALE" | "OTHER" | "">((person.gender as "MALE" | "FEMALE" | "OTHER" | null) ?? "")
  const [birthDate,  setBirthDate]  = useState(toInputDate(person.birthDate))
  const [deathDate,  setDeathDate]  = useState(toInputDate(person.deathDate))

  const handleSave = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error(t("toasts.nameRequired"))
      return
    }
    startTransition(async () => {
      const result = await updateMember(rootId, person.id, {
        firstName, lastName,
        maidenName: maidenName || null,
        nickname:   nickname   || null,
        gender:     gender || null,
        birthDate:  birthDate || null,
        deathDate:  deathDate || null,
        avatarUrl:  person.avatarUrl,
      })
      if (!result.ok) { toast.error(result.message); return }
      toast.success(t("toasts.personUpdated"))
      onClose()
      onSuccess?.()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editMember.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="e-first">{t("fields.firstName")}</Label>
              <Input id="e-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={64} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-last">{t("fields.lastName")}</Label>
              <Input id="e-last" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={64} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="e-maiden">{t("fields.maidenName")}</Label>
              <Input id="e-maiden" value={maidenName} onChange={(e) => setMaidenName(e.target.value)} maxLength={64} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-nick">{t("fields.nickname")}</Label>
              <Input id="e-nick" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("fields.gender")}</Label>
            <Select value={gender} onValueChange={(v) => setGender(v as "MALE" | "FEMALE" | "OTHER")}>
              <SelectTrigger><SelectValue placeholder={t("fields.genderOptional")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FEMALE">{t("gender.female")}</SelectItem>
                <SelectItem value="MALE">{t("gender.male")}</SelectItem>
                <SelectItem value="OTHER">{t("gender.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="e-birth">{t("fields.birthDate")}</Label>
              <Input id="e-birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-death">{t("fields.deathDate")}</Label>
              <Input id="e-death" type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>{tc("cancel")}</Button>
          <Button onClick={handleSave} disabled={isPending}>{isPending ? tc("saving") : tc("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
