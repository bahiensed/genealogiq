"use client"

import dynamic from "next/dynamic"
import { useTranslations } from "next-intl"
import type { GeoPlaceMapPin } from "@/queries/places"

// Leaflet touches `window` at import time, so the map must never render on the
// server — load it client-only.
const PlacesMap = dynamic(() => import("@/components/places-map").then((m) => m.PlacesMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-muted" />,
})

export function PlacesMapLoader({ pins, gated = false }: { pins: GeoPlaceMapPin[]; gated?: boolean }) {
  const t = useTranslations("Places")
  if (pins.filter((p) => p.lat !== 0 || p.lon !== 0).length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
        {t("mapEmpty")}
      </div>
    )
  }
  return <PlacesMap pins={pins} gated={gated} />
}
