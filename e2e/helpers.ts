import { type Page, expect } from "@playwright/test"
import en from "../apps/bms/messages/en-US.json"

export const t = en // assert against the real en-US strings (locale defaults to en in dev)

/** Types into the data-table search box so a single row is on screen regardless of
 *  pagination (the dev branch carries copied prod data, so lists span many pages).
 *  Some tables filter a non-default column and pass their own placeholder. */
export async function searchTable(page: Page, query: string, placeholder = t.Common.dataTable.searchPlaceholder) {
  await page.getByPlaceholder(placeholder).fill(query)
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
