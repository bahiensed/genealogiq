'use client'

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ImagePlus, X, Save, RotateCcw, Trash2, LocateFixed } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { saveGeolocation, deleteGeolocation } from "@/actions/geolocation"
import type { GeolocationRow } from "@/queries/geolocation"

const MAX_NOTES = 500
const MAX_PHOTOS = 3

interface GeoState {
  placeName: string
  address: string
  city: string
  state: string
  country: string
  section: string
  lat: string
  lon: string
  notes: string
  photos: (string | null)[]
}

function toState(existing: GeolocationRow | null): GeoState {
  if (!existing) {
    return { placeName: "", address: "", city: "", state: "", country: "", section: "", lat: "0", lon: "0", notes: "", photos: [null, null, null] }
  }
  return {
    placeName: existing.placeName,
    address: existing.address ?? "",
    city: existing.city ?? "",
    state: existing.state ?? "",
    country: existing.country ?? "",
    section: existing.section ?? "",
    lat: String(existing.lat),
    lon: String(existing.lon),
    notes: existing.notes ?? "",
    photos: [existing.photo1 ?? null, existing.photo2 ?? null, existing.photo3 ?? null],
  }
}

interface Props {
  profileId: string
  existing: GeolocationRow | null
}

export function GeolocationEditForm({ profileId, existing }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = !!existing
  const initialState = toState(existing)
  const [geo, setGeo] = useState<GeoState>(initialState)
  const [uploading, setUploading] = useState<boolean[]>([false, false, false])
  const fileRef = useRef<HTMLInputElement>(null)

  const update = (key: keyof GeoState, value: string) => setGeo((prev) => ({ ...prev, [key]: value }))

  const handleAddPhoto = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    const slot = geo.photos.indexOf(null)
    if (slot === -1) return
    const preview = URL.createObjectURL(file)
    setGeo((prev) => { const p = [...prev.photos]; p[slot] = preview; return { ...prev, photos: p } })
    setUploading((prev) => { const u = [...prev]; u[slot] = true; return u })
    try {
      const res = await fetch(`/api/geolocation/upload?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: file,
      })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed")
      setGeo((prev) => { const p = [...prev.photos]; p[slot] = data.url!; return { ...prev, photos: p } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo.")
      setGeo((prev) => { const p = [...prev.photos]; p[slot] = null; return { ...prev, photos: p } })
    } finally {
      setUploading((prev) => { const u = [...prev]; u[slot] = false; return u })
    }
  }

  const removePhoto = (slot: number) => {
    setGeo((prev) => {
      const p = [...prev.photos]
      p[slot] = null
      const filled = p.filter(Boolean)
      return { ...prev, photos: [filled[0] ?? null, filled[1] ?? null, filled[2] ?? null] }
    })
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported by this browser."); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo((prev) => ({ ...prev, lat: String(pos.coords.latitude.toFixed(6)), lon: String(pos.coords.longitude.toFixed(6)) }))
        toast.success("Location detected.")
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location access denied. Enable it in your browser settings.")
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          toast.error("Location unavailable. Check your GPS signal.")
        } else {
          toast.error("Location request timed out. Try again.")
        }
      },
      { timeout: 10000, maximumAge: 60000 },
    )
  }

  const handleSave = () => {
    if (uploading.some(Boolean)) { toast.warning("Please wait for photos to finish uploading."); return }
    startTransition(async () => {
      const lat = parseFloat(geo.lat)
      const lon = parseFloat(geo.lon)
      if (isNaN(lat) || isNaN(lon)) { toast.error("Invalid coordinates."); return }
      const result = await saveGeolocation(profileId, {
        placeName: geo.placeName,
        address: geo.address || undefined,
        city: geo.city || undefined,
        state: geo.state || undefined,
        country: geo.country || undefined,
        section: geo.section || undefined,
        lat,
        lon,
        notes: geo.notes || undefined,
        photo1: geo.photos[0] || null,
        photo2: geo.photos[1] || null,
        photo3: geo.photos[2] || null,
      })
      if (result?.error) { toast.error(result.error); return }
      toast.success("Geolocation saved.")
      router.push(`/profile/${profileId}/geolocation`)
    })
  }

  const handleReset = () => {
    setGeo(toState(existing))
    toast("Changes reset.")
  }

  const handleDelete = () => {
    startTransition(async () => {
      await deleteGeolocation(profileId)
      toast.success("Geolocation deleted.")
      router.push(`/profile/${profileId}/geolocation`)
    })
  }

  return (
    <div className="glass-card no-sheen p-6 md:p-8 space-y-8 animate-fade-in" style={{ animationDelay: "80ms" }}>
      {/* Photos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">Photos</Label>
          <span className="text-xs text-muted-foreground">{geo.photos.filter(Boolean).length}/{MAX_PHOTOS}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {geo.photos.map((photo, slot) =>
            photo ? (
              <div key={slot} className="relative group aspect-square rounded-xl overflow-hidden border border-border/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt={`Photo ${slot + 1}`} className="h-full w-full object-cover" />
                {uploading[slot] && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                )}
                {!uploading[slot] && (
                  <button
                    type="button"
                    onClick={() => removePhoto(slot)}
                    className="absolute top-1.5 right-1.5 h-7 w-7 inline-flex items-center justify-center rounded-full bg-background/80 backdrop-blur-md border border-border/60 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition"
                    aria-label="Remove photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : null
          )}
          {geo.photos.filter(Boolean).length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-border/70 hover:border-primary hover:bg-accent/40 transition flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs font-medium">Add Image</span>
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { handleAddPhoto(e.target.files); e.target.value = "" }}
        />
      </div>

      {/* Place name */}
      <div className="space-y-2">
        <Label htmlFor="geo-place" className="text-base">Place name</Label>
        <Input id="geo-place" value={geo.placeName} onChange={(e) => update("placeName", e.target.value)} placeholder="e.g. São Francisco Cemetery" maxLength={120} />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="geo-address" className="text-base">Address</Label>
        <Input id="geo-address" value={geo.address} onChange={(e) => update("address", e.target.value)} placeholder="Street, number" maxLength={200} />
      </div>

      {/* City / State / Country */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="geo-city" className="text-base">City</Label>
          <Input id="geo-city" value={geo.city} onChange={(e) => update("city", e.target.value)} maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="geo-state" className="text-base">State</Label>
          <Input id="geo-state" value={geo.state} onChange={(e) => update("state", e.target.value)} maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="geo-country" className="text-base">Country</Label>
          <Input id="geo-country" value={geo.country} onChange={(e) => update("country", e.target.value)} maxLength={100} />
        </div>
      </div>

      {/* Section / plot */}
      <div className="space-y-2">
        <Label htmlFor="geo-section" className="text-base">Section / plot <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Input id="geo-section" value={geo.section} onChange={(e) => update("section", e.target.value)} placeholder="e.g. Garden of Peace, Plot 42" maxLength={200} />
      </div>

      {/* Coordinates */}
      <div className="space-y-2">
        <Label className="text-base">Coordinates</Label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1">
            <Label htmlFor="geo-lat" className="text-xs text-muted-foreground">Latitude</Label>
            <Input id="geo-lat" type="number" step="any" min={-90} max={90} value={geo.lat} onChange={(e) => update("lat", e.target.value)} placeholder="-25.4284" />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="geo-lon" className="text-xs text-muted-foreground">Longitude</Label>
            <Input id="geo-lon" type="number" step="any" min={-180} max={180} value={geo.lon} onChange={(e) => update("lon", e.target.value)} placeholder="-49.2733" />
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={handleUseMyLocation} className="gap-2 w-full sm:w-auto">
              <LocateFixed className="h-4 w-4" />
              Use my location
            </Button>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="geo-notes" className="text-base">Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <span className="text-xs text-muted-foreground">{geo.notes.length}/{MAX_NOTES}</span>
        </div>
        <Textarea
          id="geo-notes"
          value={geo.notes}
          maxLength={MAX_NOTES}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Visiting hours, how to find the spot, anything that helps…"
          className="min-h-[140px] text-base leading-relaxed"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse md:flex-row md:justify-between md:items-center gap-3 pt-2 border-t border-border/60">
        {isEditing ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2 md:w-auto w-full" disabled={isPending}>
                <Trash2 className="h-4 w-4" />Delete location
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete geolocation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the place, photos and coordinates.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <div />
        )}
        <div className="flex flex-col-reverse sm:flex-row gap-2 md:gap-3">
          <Button variant="outline" onClick={handleReset} className="gap-2" disabled={isPending}>
            <RotateCcw className="h-4 w-4" />Reset
          </Button>
          <Button onClick={handleSave} className="gap-2" disabled={isPending || uploading.some(Boolean)}>
            <Save className="h-4 w-4" />Save
          </Button>
        </div>
      </div>
    </div>
  )
}
