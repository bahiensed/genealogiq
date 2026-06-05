export type AvatarColor = "bg-rose-400" | "bg-amber-400" | "bg-indigo-400" | "bg-emerald-400"

const COLORS: AvatarColor[] = ["bg-rose-400", "bg-amber-400", "bg-indigo-400", "bg-emerald-400"]

function hashId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffff
  return hash
}

export function getAvatarColor(id: string): AvatarColor {
  return COLORS[hashId(id) % COLORS.length]
}

// ── ProfileMiniCard gradients ────────────────────────────────────────────────

export type AvatarGradient = "rose" | "amber" | "emerald" | "indigo" | "violet" | "sky" | "brand"

const PROFILE_GRADIENTS: AvatarGradient[] = ["brand", "indigo", "violet", "sky", "rose", "amber", "emerald"]

export function getProfileGradient(id: string): AvatarGradient {
  return PROFILE_GRADIENTS[hashId(id) % PROFILE_GRADIENTS.length]
}

// ── Inline avatar gradients (Tailwind classes, used in card-previews) ────────

const TAILWIND_GRADIENTS = [
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-indigo-400 to-violet-500",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
  "from-fuchsia-400 to-purple-500",
] as const

export function getAvatarGradient(id: string): string {
  return TAILWIND_GRADIENTS[hashId(id) % TAILWIND_GRADIENTS.length]
}
