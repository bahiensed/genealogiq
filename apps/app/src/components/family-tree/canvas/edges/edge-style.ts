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
  if (subtype === "widowed")  return { stroke: grey, width: 1.5, dashArray: "1 6 4 6" }
  return { stroke: rose, width: 1.5 }
}

export function siblingStyle(subtype: string): Style {
  // `--muted-foreground` is already a full `hsl(...)` function (shadcn
  // convention), unlike the `--brand-*` tokens above which store raw H S% L%
  // triples — wrapping it in another hsl() (as this used to do) is invalid
  // CSS that silently falls back to `stroke: none`. color-mix() applies the
  // alpha without assuming the token's internal color function.
  const muted = "color-mix(in srgb, var(--muted-foreground) 50%, transparent)"
  if (subtype === "half")    return { stroke: muted, width: 1.5, dashArray: "5 4" }
  if (subtype === "adopted") return { stroke: muted, width: 1.5, dashArray: "1 3" }
  if (subtype === "step")    return { stroke: muted, width: 1.5, dashArray: "2 4" }
  return { stroke: muted, width: 1.5 }
}

/** Overrides any subtype styling for an edge on the relationship-path
 *  compare tool's highlighted path — deliberately ignores dash patterns so
 *  the whole path reads as one continuous, solid line regardless of the
 *  mix of blood/step/adopted relations it crosses. */
export function highlightStyle(): Style {
  // `--primary` is already a full `hsl(...)` function — see the comment on
  // siblingStyle()'s `muted` above. Wrapping it again here made every
  // highlighted edge resolve to invalid CSS (`stroke: none`), which is why
  // compare-tool paths appeared to vanish instead of turning highlighted.
  return { stroke: "var(--primary)", width: 3 }
}
