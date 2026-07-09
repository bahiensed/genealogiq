import type { MetadataRoute } from "next"

// Brand tokens from src/styles/globals.css (--brand-indigo / light --background),
// converted to hex — kept in sync manually since CSS custom properties aren't
// readable at this (build-time, non-DOM) layer.
const THEME_COLOR = "#616198"
const BACKGROUND_COLOR = "#d1dbe5"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Genealogiq",
    short_name: "Genealogiq",
    description: "Genealogiq — family trees and memorial profiles.",
    start_url: "/",
    display: "standalone",
    theme_color: THEME_COLOR,
    background_color: BACKGROUND_COLOR,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
