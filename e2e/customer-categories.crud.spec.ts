import { test, expect } from "@playwright/test"
import { t, openRowMenu, confirmDelete, searchTable } from "./helpers"

const NS = t.CustomerCategories

// Full create → edit → delete against the Neon `development` branch.
// Self-cleaning: the row it creates is the row it deletes.
test.describe("BMS · customer categories CRUD", () => {
  test("create, edit, then delete a category", async ({ page }) => {
    const stamp = Date.now()
    const name = `E2E ${stamp}` // name is min 8 / max 24 chars
    const description = `E2E desc ${stamp}` // min 12 / max 48

    // CREATE
    await page.goto("/categories/customers/new")
    await page.locator('input[name="name"]').fill(name)
    await page.locator('textarea[name="description"]').fill(description)
    await page.locator('button[type="submit"]').click()

    // The form router.push()es to the list on success — wait for that, don't race it.
    await page.waitForURL(/\/categories\/customers$/)
    await searchTable(page, name)
    await expect(page.getByText(name)).toBeVisible()

    // EDIT (change the description via the row's action menu → edit page)
    await openRowMenu(page, name, NS.actions.openMenu)
    await page.getByRole("menuitem", { name: NS.actions.edit }).click()
    await expect(page.locator('input[name="name"]')).toHaveValue(name)
    await page.locator('textarea[name="description"]').fill(`E2E edit ${stamp}`)
    await page.locator('button[type="submit"]').click()

    // DELETE
    await page.goto("/categories/customers")
    await searchTable(page, name)
    await openRowMenu(page, name, NS.actions.openMenu)
    await page.getByRole("menuitem", { name: NS.actions.delete }).click()
    await confirmDelete(page)

    await expect(page.getByText(name)).toHaveCount(0)
  })
})
