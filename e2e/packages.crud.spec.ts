import { test, expect } from "@playwright/test"
import { t, openRowMenu, confirmDelete } from "./helpers"

const NS = t.Packages

// Packages have a masked CurrencyInput for price, so we fill price via its label
// and assert on the (unique) name rather than the formatted value.
test.describe("BMS · packages CRUD", () => {
  test("create then delete a package", async ({ page }) => {
    const stamp = Date.now()
    const name = `E2E Package ${stamp}`

    // CREATE
    await page.goto("/packages/new")
    await page.locator('input[name="name"]').fill(name)
    await page.locator('input[name="quantity"]').fill("10")
    await page.getByLabel(NS.fields.price).fill("100")
    await page.locator('button[type="submit"]').click()

    await page.goto("/packages")
    await expect(page.getByText(name)).toBeVisible()

    // DELETE
    await openRowMenu(page, name, NS.actions.openMenu)
    await page.getByRole("menuitem", { name: NS.actions.delete }).click()
    await confirmDelete(page)

    await expect(page.getByText(name)).toHaveCount(0)
  })
})
