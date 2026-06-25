// Credentials for the seeded e2e admin. Shared by the seed (e2e/seed.ts) and the
// Playwright auth setup (e2e/auth.setup.ts). This user only ever exists in the
// Neon `development` branch — never in production.
export const E2E_USER = {
  email: "e2e-admin@genealogiq.test",
  password: "e2e-Password-123!",
  firstName: "E2E",
  lastName: "Admin",
  role: "SUPER_ADMIN" as const,
}
