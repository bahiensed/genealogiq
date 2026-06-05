export type ParentSubtype  = "blood" | "adopted" | "step"
export type SpouseSubtype  = "married" | "divorced" | "partner" | "widowed"
export type SiblingSubtype = "blood" | "half" | "adopted" | "step"

interface Style {
  stroke:        string
  dashArray?:    string
  width:         number
}

export function parentStyle(subtype: string): Style {
  const stroke = "hsl(var(--brand-indigo) / 0.55)"
  if (subtype === "adopted") return { stroke, width: 1.5, dashArray: "5 4" }
  if (subtype === "step")    return { stroke, width: 1.5, dashArray: "2 4" }
  return { stroke, width: 1.5 }
}

export function spouseStyle(subtype: string): Style {
  const rose  = "hsl(350 70% 65% / 0.65)"
  const grey  = "hsl(0 0% 65% / 0.55)"
  if (subtype === "divorced") return { stroke: grey, width: 1.5, dashArray: "5 4" }
  if (subtype === "partner")  return { stroke: grey, width: 1.5, dashArray: "1 4" }
  if (subtype === "widowed")  return { stroke: grey, width: 1.5, dashArray: "5 4" }
  return { stroke: rose, width: 1.5 }
}

export function siblingStyle(subtype: string): Style {
  const muted = "hsl(var(--muted-foreground) / 0.5)"
  if (subtype === "half")    return { stroke: muted, width: 1.5, dashArray: "5 4" }
  if (subtype === "adopted") return { stroke: muted, width: 1.5, dashArray: "5 4" }
  if (subtype === "step")    return { stroke: muted, width: 1.5, dashArray: "2 4" }
  return { stroke: muted, width: 1.5 }
}
