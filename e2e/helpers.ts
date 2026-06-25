import { type Page, expect } from "@playwright/test"
import en from "../apps/bms/messages/en-US.json"

export const t = en // assert against the real en-US strings (locale defaults to en in dev)

/** A short unique suffix so each run's rows don't collide. Avoids Date/Math.random
 *  flakiness by using the worker-scoped test info timestamp passed in. */
export function uniqueName(prefix: string, stamp: number | string): string {
  return `${prefix} ${stamp}`
}

/**
 * Opens the row-actions dropdown for the data-table row that contains `rowText`,
 * scoping the "open menu" button to that row so it's unambiguous across pages.
 * `openMenuLabel` is the entity namespace's actions.openMenu string.
 */
export async function openRowMenu(page: Page, rowText: string, openMenuLabel: string) {
  const row = page.getByRole("row", { name: rowText })
  await expect(row).toBeVisible()
  await row.getByRole("button", { name: openMenuLabel }).click()
}

/** Confirms a ConfirmDeleteDialog (shared @genealogiq/ui dialog). */
export async function confirmDelete(page: Page) {
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: t.Common.delete.confirm }).click()
  await expect(dialog).toBeHidden()
}
