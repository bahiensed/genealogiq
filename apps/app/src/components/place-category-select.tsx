"use client"

import { useTranslations } from "next-intl"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PLACE_CATEGORY_GROUPS } from "@/consts/place-categories"

interface Props {
  value: string[]
  onChange: (next: string[]) => void
}

// Grouped multi-select (checkbox-style) for place categories. No external search
// dependency — the list is short and grouped by life stage.
export function PlaceCategorySelect({ value, onChange }: Props) {
  const t = useTranslations("Places")
  const selected = new Set(value)

  function toggle(category: string) {
    const next = new Set(selected)
    if (next.has(category)) next.delete(category)
    else next.add(category)
    onChange([...next])
  }

  return (
    <div className="space-y-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
          >
            <span className={cn(value.length === 0 && "text-muted-foreground")}>
              {value.length === 0
                ? t("categoriesPlaceholder")
                : t("countMetric", { count: value.length })}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="max-h-72 overflow-y-auto py-1">
            {PLACE_CATEGORY_GROUPS.map((g) => (
              <div key={g.group} className="py-1">
                <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(`catgroup_${g.group}`)}
                </p>
                {g.categories.map((cat) => {
                  const isSelected = selected.has(cat)
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggle(cat)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-accent transition"
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border",
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </span>
                      {t(`cat_${cat}`)}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((cat) => (
            <Badge key={cat} variant="secondary" className="gap-1 pr-1">
              {t(`cat_${cat}`)}
              <button
                type="button"
                onClick={() => toggle(cat)}
                aria-label={t("removePhoto")}
                className="rounded-full hover:bg-background/60 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
