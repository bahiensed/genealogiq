import type { MetadataRoute } from "next"
import { DEFAULT_LOCALE } from "@genealogiq/i18n"

// Brand tokens from src/styles/globals.css (--brand-indigo / light --background),
// converted to hex — kept in sync manually since CSS custom properties aren't
// readable at this (build-time, non-DOM) layer.
const THEME_COLOR = "#616198"
const BACKGROUND_COLOR = "#d1dbe5"

// The manifest is a single static document in the default locale: browsers
// fetch it without cookies (spec credentials mode "omit"), so the cookie-based
// locale used by the rest of the app can't localize it reliably.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Genealogiq",
    short_name: "Genealogiq",
    description: "Genealogiq — family trees and memorial profiles.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: DEFAULT_LOCALE,
    dir: "ltr",
    categories: ["social", "lifestyle"],
    theme_color: THEME_COLOR,
    background_color: BACKGROUND_COLOR,
    // Protected routes: a logged-out user is bounced to /sign-in, which is
    // acceptable for shortcuts on an installed-app surface. (No "/tree"
    // shortcut — auth.config lists it as protected but no such page exists.)
    shortcuts: [
      { name: "Home", url: "/home" },
      { name: "Messages", url: "/messages" },
    ],
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
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
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
