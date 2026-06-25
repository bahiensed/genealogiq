import { test, expect } from "@playwright/test"
import { t, openRowMenu, confirmDelete } from "./helpers"

const NS = t.SupplierCategories

test.describe("BMS · supplier categories CRUD", () => {
  test("create, edit, then delete a supplier category", async ({ page }) => {
    const stamp = Date.now()
    const name = `E2E Supplier Cat ${stamp}`
    const description = `Created by the e2e suite at ${stamp}`

    // CREATE
    await page.goto("/categories/suppliers/new")
    await page.locator('input[name="name"]').fill(name)
    await page.locator('textarea[name="description"]').fill(description)
    await page.locator('button[type="submit"]').click()

    await page.goto("/categories/suppliers")
    await expect(page.getByText(name)).toBeVisible()

    // EDIT
    await openRowMenu(page, name, NS.actions.openMenu)
    await page.getByRole("menuitem", { name: NS.actions.edit }).click()
    await expect(page.locator('input[name="name"]')).toHaveValue(name)
    await page.locator('textarea[name="description"]').fill(`Edited by the e2e suite at ${stamp}`)
    await page.locator('button[type="submit"]').click()

    // DELETE
    await page.goto("/categories/suppliers")
    await openRowMenu(page, name, NS.actions.openMenu)
    await page.getByRole("menuitem", { name: NS.actions.delete }).click()
    await confirmDelete(page)

    await expect(page.getByText(name)).toHaveCount(0)
  })
})
