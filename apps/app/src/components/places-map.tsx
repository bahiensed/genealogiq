"use client"

import { useMemo, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { groupOfCategory, type PlaceCategoryGroup } from "@/consts/place-categories"
import { SignupDialog } from "@/components/auth/signup-dialog"
import type { GeoPlaceMapPin } from "@/queries/places"

// Pin color per life-stage group, so the map reads at a glance.
const GROUP_COLOR: Record<PlaceCategoryGroup, string> = {
  origins:       "#616198",
  education:     "#2563eb",
  relationships: "#db2777",
  family:        "#059669",
  work:          "#d97706",
  leisure:       "#0891b2",
  milestones:    "#7c3aed",
  final:         "#475569",
}

function pinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 24 14 24s14-14.5 14-24C28 6.27 21.73 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>`,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -34],
  })
}

function colorOf(pin: GeoPlaceMapPin): string {
  const group = pin.categories.length ? groupOfCategory(pin.categories[0]) : null
  return group ? GROUP_COLOR[group] : "#616198"
}

function FitBounds({ pins }: { pins: GeoPlaceMapPin[] }) {
  const map = useMap()
  useMemo(() => {
    if (pins.length === 0) return
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lon], 13)
      return
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lon] as [number, number]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 })
  }, [map, pins])
  return null
}

interface Props {
  pins: GeoPlaceMapPin[]
  // Anonymous visitors: clicking a pin opens the sign-up dialog instead of
  // the normal photo+title popup, matching the list/detail pages' gating.
  gated?: boolean
}

export function PlacesMap({ pins, gated = false }: Props) {
  const [wallOpen, setWallOpen] = useState(false)
  const valid = pins.filter((p) => p.lat !== 0 || p.lon !== 0)
  const center: [number, number] = valid.length
    ? [valid[0].lat, valid[0].lon]
    : [-22.959167, -43.188333]

  return (
    <>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full"
        style={{ background: "hsl(var(--muted))" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup chunkedLoading>
          {valid.map((p) => (
            <Marker
              key={p.id}
              position={[p.lat, p.lon]}
              icon={pinIcon(colorOf(p))}
              eventHandlers={gated ? { click: () => setWallOpen(true) } : undefined}
            >
              {!gated && (
                <Popup>
                  <div className="space-y-1">
                    {p.photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo} alt={p.title} className="w-40 h-24 object-cover rounded" />
                    )}
                    <p className="font-semibold text-sm">{p.title}</p>
                  </div>
                </Popup>
              )}
            </Marker>
          ))}
        </MarkerClusterGroup>
        <FitBounds pins={valid} />
      </MapContainer>

      {gated && <SignupDialog open={wallOpen} onOpenChange={setWallOpen} dismissible />}
    </>
  )
}
