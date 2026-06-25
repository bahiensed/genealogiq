import { test, expect } from "@playwright/test"
import { t, openRowMenu, confirmDelete, searchTable } from "./helpers"

const NS = t.Suppliers
const VALID_CNPJ = "11222333000181" // passes validateCnpj (same fixture the unit tests use)

test.describe("BMS · suppliers CRUD", () => {
  test("create, edit, then delete a supplier", async ({ page }) => {
    const stamp = Date.now()
    const name = `E2E Supplier ${stamp}`

    // CREATE — entityType defaults to COMPANY, so the CNPJ taxId field is shown.
    await page.goto("/suppliers/new")
    await page.locator('input[name="name"]').fill(name)
    await page.locator('input[name="tradeName"]').fill(`E2E Trade ${stamp}`)
    // taxId is a MaskedInput (no name/label assoc) — reach it via its CNPJ label
    await page.getByText(NS.fields.cnpj, { exact: true }).locator("xpath=following::input[1]").fill(VALID_CNPJ)
    await page.locator('input[name="email"]').fill(`e2e-sup-${stamp}@test.local`)
    // phone is also a MaskedInput — reach it via its label
    await page.getByText(NS.fields.phone, { exact: true }).locator("xpath=following::input[1]").fill("11999999999")
    // required category Select (Radix): open it and pick the first available option
    await page.getByText(NS.placeholders.category).click()
    await page.getByRole("option").first().click()
    await page.locator('button[type="submit"]').click()

    await page.waitForURL(/\/suppliers$/)
    await searchTable(page, name)
    await expect(page.getByText(name)).toBeVisible()

    // EDIT
    await openRowMenu(page, name, NS.actions.openMenu)
    await page.getByRole("menuitem", { name: NS.actions.edit }).click()
    await expect(page.locator('input[name="name"]')).toHaveValue(name)
    await page.locator('input[name="tradeName"]').fill(`E2E Trade edit ${stamp}`)
    await page.locator('button[type="submit"]').click()

    // DELETE
    await page.goto("/suppliers")
    await searchTable(page, name)
    await openRowMenu(page, name, NS.actions.openMenu)
    await page.getByRole("menuitem", { name: NS.actions.delete }).click()
    await confirmDelete(page)
    await expect(page.getByText(name)).toHaveCount(0)
  })
})
