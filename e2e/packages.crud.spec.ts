import { test, expect } from "@playwright/test"
import { t, openRowMenu, confirmDelete, searchTable } from "./helpers"

const NS = t.Packages

// Packages have a masked CurrencyInput for price (no name/label), so we fill it via
// its inputmode and assert on the (unique) name rather than the formatted value.
test.describe("BMS · packages CRUD", () => {
  test("create then delete a package", async ({ page }) => {
    const stamp = Date.now()
    const name = `E2E ${stamp}` // name is min 4 / max 32 chars

    // CREATE
    await page.goto("/packages/new")
    await page.locator('input[name="name"]').fill(name)
    await page.locator('input[name="quantity"]').fill("10")
    // CurrencyInput renders a masked text input (no name/label); it's the only inputmode=numeric field
    await page.locator('input[inputmode="numeric"]').fill("100")
    await page.locator('textarea[name="description"]').fill(`E2E package ${stamp}`) // min 12
    await page.locator('button[type="submit"]').click()

    // The form router.push()es to /packages on success — wait for that, don't race it.
    await page.waitForURL(/\/packages$/)
    await searchTable(page, name)
    await expect(page.getByText(name)).toBeVisible()

    // DELETE
    await openRowMenu(page, name, NS.actions.openMenu)
    await page.getByRole("menuitem", { name: NS.actions.delete }).click()
    await confirmDelete(page)

    await expect(page.getByText(name)).toHaveCount(0)
  })
})
