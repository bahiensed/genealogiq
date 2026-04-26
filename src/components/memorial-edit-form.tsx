'use client'

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { CalendarIcon, Image as ImageIcon, Trash2, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { cn } from "@/lib/utils"
import { updateMemorial, deleteMemorial } from "@/actions/memorial"
import { updateProfile } from "@/actions/profile"
import { getAvatarColor } from "@/lib/avatar-color"
import { COUNTRIES } from "@/consts/countries"
import type { ProfileRow } from "@/queries/profile"

interface FormState {
  firstName: string
  lastName: string
  gender: "MALE" | "FEMALE" | "OTHER" | ""
  avatarUrl: string
  birthDate: Date | undefined
  birthPlace: string
  birthCountry: string
  deathDate: Date | undefined
  deathPlace: string
  deathCountry: string
}

const DateField = ({ id, label, value, onChange, disabled, disabledDays }: {
  id: string; label: string; value: Date | undefined
  onChange: (d: Date | undefined) => void; disabled?: boolean
  disabledDays?: (d: Date) => boolean
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between h-5">
      <Label htmlFor={id}>{label}</Label>
      {value && !disabled && (
        <button type="button" onClick={() => onChange(undefined)} className="text-xs text-muted-foreground hover:text-foreground">
          Clear
        </button>
      )}
    </div>
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          captionLayout="dropdown"
          startMonth={new Date(1900, 0)}
          endMonth={new Date()}
          disabled={disabledDays ?? ((d) => d > new Date())}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  </div>
)

interface Props {
  profileId: string
  initial: ProfileRow
  isMemorialized?: boolean
}

export function MemorialEditForm({ profileId, initial, isMemorialized = true }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState<FormState>({
    firstName: initial.firstName,
    lastName: initial.lastName,
    gender: (initial.gender as "MALE" | "FEMALE" | "OTHER" | "") ?? "",
    avatarUrl: initial.avatarUrl ?? "",
    birthDate: initial.birthDate ?? undefined,
    birthPlace: initial.birthPlace ?? "",
    birthCountry: initial.birthCountry ?? "",
    deathDate: initial.deathDate ?? undefined,
    deathPlace: initial.deathPlace ?? "",
    deathCountry: initial.deathCountry ?? "",
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }))

  const initials = [form.firstName[0], form.lastName[0]].filter(Boolean).join("").toUpperCase() || "?"
  const avatarColor = getAvatarColor(initial.id)

  const handleAvatarChange = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setUploading(true)
    update("avatarUrl", URL.createObjectURL(file))
    try {
      const res = await fetch(`/api/bio/upload?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: file,
      })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed")
      update("avatarUrl", data.url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload avatar.")
      update("avatarUrl", initial.avatarUrl ?? "")
    } finally {
      setUploading(false)
    }
  }

  const handleSave = () => {
    if (uploading) { toast.warning("Please wait for the avatar to finish uploading."); return }
    startTransition(async () => {
      const payload = isMemorialized
        ? {
            firstName: form.firstName,
            lastName: form.lastName,
            gender: form.gender || null,
            birthDate: form.birthDate,
            birthPlace: form.birthPlace || undefined,
            birthCountry: form.birthCountry || undefined,
            deathDate: form.deathDate ?? null,
            deathPlace: form.deathPlace || undefined,
            deathCountry: form.deathCountry || undefined,
            avatarUrl: form.avatarUrl || null,
          }
        : {
            firstName: form.firstName,
            lastName: form.lastName,
            gender: form.gender || null,
            birthDate: form.birthDate ?? null,
            birthPlace: form.birthPlace || undefined,
            birthCountry: form.birthCountry || undefined,
            avatarUrl: form.avatarUrl || null,
          }
      const result = isMemorialized
        ? await updateMemorial(profileId, payload)
        : await updateProfile(payload)
      if (result?.error) { toast.error(result.error); return }
      toast.success("Profile updated.")
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteMemorial(profileId)
      if (result?.error) { toast.error(result.error); return }
      toast.success("Profile deleted.")
      router.push("/profile")
    })
  }

  return (
    <div className="glass-card no-sheen p-6 md:p-8 space-y-8 animate-fade-in" style={{ animationDelay: "80ms" }}>
      {/* Avatar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        <Avatar className="h-28 w-28 ring-4 ring-background shadow-[var(--shadow-glass)]">
          {form.avatarUrl && <AvatarImage src={form.avatarUrl} alt={`${form.firstName} ${form.lastName}`} />}
          <AvatarFallback className={cn("text-xl text-white font-semibold relative", avatarColor)}>
            {initials}
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center">
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            )}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <ImageIcon className="h-4 w-4" />Change image
          </Button>
          {form.avatarUrl && (
            <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => update("avatarUrl", "")}>
              <Trash2 className="h-4 w-4" />Remove
            </Button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { handleAvatarChange(e.target.files); e.target.value = "" }} />
        </div>
      </div>

      {/* Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first-name">First name</Label>
          <Input id="first-name" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="Name" maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Family name</Label>
          <Input id="last-name" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder="Family name" maxLength={100} />
        </div>
      </div>

      {/* Gender */}
      <div className="space-y-2">
        <Label htmlFor="gender">Gender <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Select value={form.gender} onValueChange={(v) => update("gender", v as FormState["gender"])}>
          <SelectTrigger id="gender"><SelectValue placeholder="Not specified" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="MALE">Male</SelectItem>
            <SelectItem value="FEMALE">Female</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Birth */}
      <div className="space-y-3">
        <Label className="text-base">Birth</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DateField id="birth-date" label="Date" value={form.birthDate} onChange={(d) => update("birthDate", d)} />
          <div className="space-y-2">
            <Label htmlFor="birth-place">City</Label>
            <Input id="birth-place" value={form.birthPlace} onChange={(e) => update("birthPlace", e.target.value)} placeholder="City" maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birth-country">Country</Label>
            <Select value={form.birthCountry} onValueChange={(v) => update("birthCountry", v)}>
              <SelectTrigger id="birth-country"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Death — memorialized profiles only */}
      {isMemorialized && (
        <div className="space-y-3">
          <Label className="text-base">Death</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DateField
              id="death-date" label="Date"
              value={form.deathDate}
              onChange={(d) => { update("deathDate", d); if (!d) { update("deathPlace", ""); update("deathCountry", "") } }}
              disabledDays={(d) => (form.birthDate ? d < form.birthDate : false) || d > new Date()}
            />
            <div className="space-y-2">
              <Label htmlFor="death-place">City</Label>
              <Input id="death-place" value={form.deathPlace} onChange={(e) => update("deathPlace", e.target.value)} placeholder="City" disabled={!form.deathDate} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="death-country">Country</Label>
              <Select value={form.deathCountry} onValueChange={(v) => update("deathCountry", v)} disabled={!form.deathDate}>
                <SelectTrigger id="death-country"><SelectValue placeholder="Country" /></SelectTrigger>
                <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse md:flex-row md:justify-between md:items-center gap-3 pt-2 border-t border-border/60">
        {isMemorialized && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2 md:w-auto w-full" disabled={isPending}>
                <Trash2 className="h-4 w-4" />Delete profile
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this profile?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove {form.firstName} {form.lastName}&apos;s profile, biography, gallery, tributes and geolocation. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <div className="flex flex-col-reverse sm:flex-row gap-2 md:gap-3 md:ml-auto">
          <Button variant="ghost" onClick={() => router.back()} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending || uploading} className="gap-2">
            <Save className="h-4 w-4" />Save
          </Button>
        </div>
      </div>
    </div>
  )
}
