'use client'

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch, Controller, type Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import {
  User, Calendar, Flower2, Phone, MapPin, Globe, FileText,
  CalendarIcon, Image as ImageIcon, Trash2, Save, RotateCcw,
} from "lucide-react"
import { toast } from "sonner"
import { upload } from "@vercel/blob/client"
import { compressImage } from "@/lib/image-compress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
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
import { AddressSection } from "@/components/address/address-section"
import { profileEditSchema, type ProfileEditValues } from "@/schemas/profile"
import { addressDefaultValues } from "@/schemas/address.schema"
import { updateProfile } from "@/actions/profile"
import { updateMemorial, deleteMemorial } from "@/actions/memorial"
import { getAvatarColor } from "@/lib/avatar-color"
import { isAllowedImage, IMAGE_FORMATS_LABEL } from "@/lib/upload-validation"
import { useLocale } from "next-intl"
import { getLocalizedCountries } from "@/consts/countries-data"
import { cn } from "@/lib/utils"
import type { EditProfileRow } from "@/queries/profile"

// ─── Date picker helper ───────────────────────────────────────────────────────

function DateField({
  name, label, control, setValue, disabled, minDate,
}: {
  name: string; label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<ProfileEditValues>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: (name: any, value: any) => void
  disabled?: boolean; minDate?: Date
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value: Date | null = useWatch({ control: control as any, name }) ?? null
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between h-5">
        <Label>{label}</Label>
        {value && !disabled && (
          <button type="button" onClick={() => setValue(name, null)} className="text-xs text-muted-foreground hover:text-foreground">
            Clear
          </button>
        )}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarPicker
            mode="single"
            selected={value ?? undefined}
            onSelect={(d) => setValue(name, d ?? null)}
            captionLayout="dropdown"
            startMonth={new Date(1900, 0)}
            endMonth={new Date()}
            disabled={(d) => d > new Date() || (minDate ? d < minDate : false)}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ─── Section trigger ──────────────────────────────────────────────────────────

function SectionTrigger({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span>{label}</span>
    </div>
  )
}

// ─── Default values ───────────────────────────────────────────────────────────

function buildDefaults(initial: EditProfileRow): ProfileEditValues {
  return {
    firstName:        initial.firstName,
    lastName:         initial.lastName,
    maidenName:       initial.maidenName       ?? "",
    nickname:         initial.nickname         ?? "",
    gender:           (initial.gender as ProfileEditValues["gender"]) ?? null,
    nationalId:       initial.nationalId       ?? "",
    avatarUrl:        initial.avatarUrl        ?? null,
    birthDate:        initial.birthDate        ?? null,
    birthPlace:       initial.birthPlace       ?? "",
    birthState:       initial.birthState       ?? "",
    birthCountry:     initial.birthCountry     ?? "",
    deathDate:        initial.deathDate        ?? null,
    deathPlace:       initial.deathPlace       ?? "",
    deathState:       initial.deathState       ?? "",
    deathCountry:     initial.deathCountry     ?? "",
    deathCause:       initial.deathCause       ?? "",
    phoneCountryCode: initial.phoneCountryCode ?? "55",
    phone:            initial.phone            ?? "",
    website:          initial.website          ?? "",
    instagram:        initial.instagram        ?? "",
    linkedin:         initial.linkedin         ?? "",
    fb:               initial.fb               ?? "",
    x:                initial.x                ?? "",
    tiktok:           initial.tiktok           ?? "",
    youtube:          initial.youtube          ?? "",
    otherSocial:      initial.otherSocial      ?? "",
    notes:            initial.notes            ?? "",
    address: {
      zip:          initial.address?.zip          ?? addressDefaultValues.zip,
      street:       initial.address?.street       ?? addressDefaultValues.street,
      number:       initial.address?.number       ?? addressDefaultValues.number,
      complement:   initial.address?.complement   ?? addressDefaultValues.complement,
      neighborhood: initial.address?.neighborhood ?? addressDefaultValues.neighborhood,
      city:         initial.address?.city         ?? addressDefaultValues.city,
      state:        initial.address?.state        ?? addressDefaultValues.state,
      country:      initial.address?.country      ?? addressDefaultValues.country,
    },
  }
}

// ─── Main form ────────────────────────────────────────────────────────────────

interface Props {
  profileId: string
  initial: EditProfileRow
  isMemorialized?: boolean
}

export function MemorialEditForm({ profileId, initial, isMemorialized = true }: Props) {
  const locale        = useLocale()
  const countryOptions = getLocalizedCountries(locale)
  const router        = useRouter()
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading]    = useState(false)
  const fileInputRef  = useRef<HTMLInputElement>(null)

  const defaults = buildDefaults(initial)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { control, register, setValue, handleSubmit, reset, watch, formState: { errors } } =
    useForm<ProfileEditValues>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(profileEditSchema) as any,
      defaultValues: defaults,
    })

  const avatarUrl  = watch("avatarUrl")
  const firstName  = watch("firstName")
  const lastName   = watch("lastName")
  const deathDate  = watch("deathDate")
  const birthDate  = watch("birthDate")

  const initials    = [firstName?.[0], lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?"
  const avatarColor = getAvatarColor(initial.id)

  // ── Avatar upload ───────────────────────────────────────────────────────────

  const handleAvatarChange = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (!isAllowedImage(file)) { toast.error(`Unsupported file. Use ${IMAGE_FORMATS_LABEL}.`); return }
    setUploading(true)
    setValue("avatarUrl", URL.createObjectURL(file))
    try {
      const payload = await compressImage(file, { maxDim: 512 })
      const blob = await upload(`bio/${payload.name}`, payload, {
        access: "public",
        handleUploadUrl: "/api/bio/upload",
        contentType: payload.type,
        clientPayload: JSON.stringify({ profileId: initial.id }),
      })
      setValue("avatarUrl", blob.url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload avatar.")
      setValue("avatarUrl", initial.avatarUrl ?? null)
    } finally {
      setUploading(false)
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = (values: any) => {
    const typed = values as ProfileEditValues
    if (uploading) { toast.warning("Please wait for the avatar to finish uploading."); return }
    startTransition(async () => {
      const result = isMemorialized
        ? await updateMemorial(profileId, typed)
        : await updateProfile(typed)
      if (result?.error) { toast.error(result.error); return }
      toast.success("Profile saved.")
    })
  }

  const handleReset  = () => { reset(defaults); toast("Changes reset.") }

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteMemorial(profileId)
      if (result?.error) { toast.error(result.error); return }
      toast.success("Profile deleted.")
      router.push("/profile")
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit, () => toast.error("Please fix the highlighted fields."))} className="space-y-3 animate-fade-in" style={{ animationDelay: "80ms" }}>
      <Accordion type="multiple" defaultValue={["identity"]} className="space-y-3">

        {/* ── Identity ─────────────────────────────────────────── */}
        <AccordionItem value="identity" className="glass-card no-sheen border-0 rounded-2xl overflow-hidden">
          <AccordionTrigger className="px-6 py-4 text-base font-medium hover:no-underline [&[data-state=open]]:border-b [&[data-state=open]]:border-border/60">
            <SectionTrigger icon={User} label="Identity" />
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-6 pb-6 pt-4 space-y-6">
              {/* Avatar */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <Avatar className="h-28 w-28 ring-4 ring-background shadow-[var(--shadow-glass)]">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={`${firstName} ${lastName}`} />}
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
                  <Button type="button" variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <ImageIcon className="h-4 w-4" />Change image
                  </Button>
                  {avatarUrl && (
                    <Button type="button" variant="ghost" className="gap-2 text-muted-foreground" onClick={() => setValue("avatarUrl", null)}>
                      <Trash2 className="h-4 w-4" />Remove
                    </Button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { handleAvatarChange(e.target.files); e.target.value = "" }} />
                </div>
              </div>

              {/* Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First name <span className="text-destructive">*</span></Label>
                  <Input id="first-name" maxLength={100} placeholder="Name" {...register("firstName")} />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Family name <span className="text-destructive">*</span></Label>
                  <Input id="last-name" maxLength={100} placeholder="Family name" {...register("lastName")} />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                </div>
              </div>

              {/* Maiden name + Nickname */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maiden-name">Maiden name <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="maiden-name" maxLength={100} placeholder="Birth surname" {...register("maidenName")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nickname">Nickname <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="nickname" maxLength={100} placeholder="How they were known" {...register("nickname")} />
                </div>
              </div>

              {/* Gender + National ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || null)}>
                        <SelectTrigger id="gender"><SelectValue placeholder="Not specified" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="national-id">National ID <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="national-id" maxLength={50} placeholder="CPF, SSN, etc." {...register("nationalId")} />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Birth ────────────────────────────────────────────── */}
        <AccordionItem value="birth" className="glass-card no-sheen border-0 rounded-2xl overflow-hidden">
          <AccordionTrigger className="px-6 py-4 text-base font-medium hover:no-underline [&[data-state=open]]:border-b [&[data-state=open]]:border-border/60">
            <SectionTrigger icon={Calendar} label="Birth" />
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-6 pb-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DateField name="birthDate" label="Date" control={control} setValue={setValue} />
                <div className="space-y-2">
                  <Label htmlFor="birth-country">Country <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Controller
                    control={control}
                    name="birthCountry"
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger id="birth-country"><SelectValue placeholder="Country" /></SelectTrigger>
                        <SelectContent>{countryOptions.map((c) => <SelectItem key={c.iso} value={c.iso}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth-city">City <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="birth-city" maxLength={100} placeholder="City" {...register("birthPlace")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth-state">State / Province <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="birth-state" maxLength={100} placeholder="State or province" {...register("birthState")} />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Death (memorialized only) ─────────────────────────── */}
        {isMemorialized && (
          <AccordionItem value="death" className="glass-card no-sheen border-0 rounded-2xl overflow-hidden">
            <AccordionTrigger className="px-6 py-4 text-base font-medium hover:no-underline [&[data-state=open]]:border-b [&[data-state=open]]:border-border/60">
              <SectionTrigger icon={Flower2} label="Death" />
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-6 pb-6 pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DateField
                    name="deathDate" label="Date" control={control}
                    setValue={(n, v) => {
                      setValue(n as keyof ProfileEditValues, v)
                      if (!v) {
                        setValue("deathPlace", "")
                        setValue("deathState", "")
                        setValue("deathCountry", "")
                        setValue("deathCause", "")
                      }
                    }}
                    minDate={birthDate ?? undefined}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="death-country">Country <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Controller
                      control={control}
                      name="deathCountry"
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={!deathDate}>
                          <SelectTrigger id="death-country"><SelectValue placeholder="Country" /></SelectTrigger>
                          <SelectContent>{countryOptions.map((c) => <SelectItem key={c.iso} value={c.iso}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="death-city">City <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input id="death-city" maxLength={100} placeholder="City" disabled={!deathDate} {...register("deathPlace")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="death-state">State / Province <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input id="death-state" maxLength={100} placeholder="State or province" disabled={!deathDate} {...register("deathState")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="death-cause">Cause of death <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="death-cause" maxLength={200} placeholder="e.g. Heart failure" disabled={!deathDate} {...register("deathCause")} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* ── Contact ──────────────────────────────────────────── */}
        <AccordionItem value="contact" className="glass-card no-sheen border-0 rounded-2xl overflow-hidden">
          <AccordionTrigger className="px-6 py-4 text-base font-medium hover:no-underline [&[data-state=open]]:border-b [&[data-state=open]]:border-border/60">
            <SectionTrigger icon={Phone} label="Contact" />
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-6 pb-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <div className="flex gap-2">
                  <Input id="phone-cc" maxLength={5} placeholder="+55" className="w-20 shrink-0" {...register("phoneCountryCode")} />
                  <Input id="phone" maxLength={30} placeholder="(11) 99999-9999" className="flex-1" {...register("phone")} />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Address ──────────────────────────────────────────── */}
        <AccordionItem value="address" className="glass-card no-sheen border-0 rounded-2xl overflow-hidden">
          <AccordionTrigger className="px-6 py-4 text-base font-medium hover:no-underline [&[data-state=open]]:border-b [&[data-state=open]]:border-border/60">
            <SectionTrigger icon={MapPin} label="Address" />
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-6 pb-6 pt-4">
              <AddressSection
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                control={control as any}
                setValue={setValue}
                errors={errors}
                prefix="address"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Social networks ───────────────────────────────────── */}
        <AccordionItem value="social" className="glass-card no-sheen border-0 rounded-2xl overflow-hidden">
          <AccordionTrigger className="px-6 py-4 text-base font-medium hover:no-underline [&[data-state=open]]:border-b [&[data-state=open]]:border-border/60">
            <SectionTrigger icon={Globe} label="Social networks" />
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-6 pb-6 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" maxLength={250} placeholder="https://example.com" {...register("website")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input id="instagram" maxLength={250} placeholder="@username or URL" {...register("instagram")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input id="linkedin" maxLength={250} placeholder="linkedin.com/in/..." {...register("linkedin")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input id="facebook" maxLength={250} placeholder="facebook.com/..." {...register("fb")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="x">X (Twitter)</Label>
                  <Input id="x" maxLength={250} placeholder="@username or URL" {...register("x")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok">TikTok</Label>
                  <Input id="tiktok" maxLength={250} placeholder="@username or URL" {...register("tiktok")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="youtube">YouTube</Label>
                  <Input id="youtube" maxLength={250} placeholder="youtube.com/..." {...register("youtube")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="other-social">Other</Label>
                  <Input id="other-social" maxLength={250} placeholder="Any other link" {...register("otherSocial")} />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Notes ────────────────────────────────────────────── */}
        <AccordionItem value="notes" className="glass-card no-sheen border-0 rounded-2xl overflow-hidden">
          <AccordionTrigger className="px-6 py-4 text-base font-medium hover:no-underline [&[data-state=open]]:border-b [&[data-state=open]]:border-border/60">
            <SectionTrigger icon={FileText} label="Notes" />
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-6 pb-6 pt-4 space-y-2">
              <Label htmlFor="notes" className="sr-only">Notes</Label>
              <Textarea
                id="notes"
                maxLength={1000}
                placeholder="Internal notes visible only to you…"
                className="min-h-[120px] text-base leading-relaxed resize-none"
                {...register("notes")}
              />
              <p className="text-xs text-muted-foreground">Not shown publicly.</p>
            </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>

      {/* ── Actions ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 pt-2 border-t border-border/60">
        <div className="order-1 md:order-2 md:ml-auto flex flex-col md:flex-row gap-2 md:gap-3">
          <Button type="submit" className="gap-2 w-full md:w-auto order-1 md:order-2" disabled={isPending || uploading}>
            <Save className="h-4 w-4" />Save
          </Button>
          <Button type="button" variant="outline" onClick={handleReset} className="gap-2 w-full md:w-auto order-2 md:order-1" disabled={isPending}>
            <RotateCcw className="h-4 w-4" />Reset
          </Button>
        </div>
        {isMemorialized && (
          <div className="order-2 md:order-1">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" className="gap-2 w-full md:w-auto" disabled={isPending}>
                  <Trash2 className="h-4 w-4" />Delete profile
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this profile?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove {firstName} {lastName}&apos;s profile, biography, gallery, tributes and geolocation. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </form>
  )
}
