import * as React from "react"

import { cn } from "../lib/utils"

// Form pages across BMS and SEQ each hardcoded their own `mx-auto max-w-*`,
// and drifted: 3xl, 2xl and lg all appeared, often set INSIDE the form
// component so the page could not override it. This is the one place that
// decides how wide a form page is.
//
// Widths are named by intent, not by size, so changing what "standard" means
// is a single edit here rather than a sweep across every page. Keep the set
// small — a fourth name usually means a page wants something bespoke, and that
// belongs in `className` on that page.
const WIDTHS = {
  /** Short forms — a handful of fields, no sections. */
  compact: "max-w-lg",
  /** The default: most record forms. */
  standard: "max-w-4xl",
  /** Edge to edge — tables and dashboards that should use the whole viewport. */
  wide: "",
} as const

export type FormShellWidth = keyof typeof WIDTHS

function FormShell({
  width = "standard",
  className,
  ...props
}: React.ComponentProps<"div"> & { width?: FormShellWidth }) {
  return (
    <div
      data-slot="form-shell"
      className={cn("mx-auto w-full", WIDTHS[width], className)}
      {...props}
    />
  )
}

export { FormShell, WIDTHS as FORM_SHELL_WIDTHS }
