const COLORS = ["bg-rose-400", "bg-amber-400", "bg-indigo-400", "bg-emerald-400"] as const
export type AvatarColor = (typeof COLORS)[number]

export function getAvatarColor(id: string): AvatarColor {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffff
  }
  return COLORS[hash % COLORS.length]
}

const GRADIENTS = [
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-indigo-400 to-violet-500",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
  "from-fuchsia-400 to-purple-500",
] as const

export function getAvatarGradient(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffff
  }
  return GRADIENTS[hash % GRADIENTS.length]
}
