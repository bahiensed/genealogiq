import { test, expect } from "@playwright/test"
import { t, openRowMenu, searchTable } from "./helpers"

const NS = t.DiscountCoupons

// Coupons can't be deleted (only toggled), and the table filters the `code`
// column. Everything but the code is pre-filled with valid defaults
// (percent / value 10 / once), so a create only needs the code.
test.describe("BMS · discount coupons", () => {
  test("create then deactivate a coupon", async ({ page }) => {
    const code = `E2E${Date.now()}` // uppercase letters + digits only (regex), 3–32 chars

    // CREATE
    await page.goto("/sales/discount-coupons/new")
    await page.locator('input[name="code"]').fill(code)
    await page.locator('button[type="submit"]').click()

    await page.waitForURL(/\/sales\/discount-coupons$/)
    await searchTable(page, code, NS.table.searchByCode)
    await expect(page.getByText(code)).toBeVisible()

    // DEACTIVATE (coupons are toggled, not deleted)
    await openRowMenu(page, code, NS.actions.openMenu)
    await page.getByRole("menuitem", { name: NS.actions.deactivate }).click()
    await expect(page.getByText(NS.toasts.deactivated)).toBeVisible()
  })
})
