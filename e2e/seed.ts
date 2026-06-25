// Seeds the e2e admin into the Neon `development` branch. Run:
//
//   pnpm seed:e2e
//
// Loads .env.e2e BEFORE importing @genealogiq/db (which reads DATABASE_URL at
// module init), so it always targets the dev branch — never prod. Idempotent
// (upserts by email). The dev branch already carries the schema (copy of prod),
// so no migration is needed here.
import { config } from "dotenv"
import bcrypt from "bcryptjs"
import { E2E_USER } from "./test-user"

config({ path: ".env.e2e" })

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set — create .env.e2e from .env.e2e.example first.")
  }
  // Dynamic import so the dotenv config above lands before the client connects.
  const { prisma } = await import("@genealogiq/db")

  const password = await bcrypt.hash(E2E_USER.password, 10)
  const common = {
    role: E2E_USER.role,
    isActive: true,
    emailVerified: new Date(),
    failedLoginAttempts: 0,
    lockedUntil: null,
    password,
  }
  const user = await prisma.user.upsert({
    where: { email: E2E_USER.email },
    update: common,
    create: {
      email: E2E_USER.email,
      firstName: E2E_USER.firstName,
      lastName: E2E_USER.lastName,
      ...common,
    },
    select: { id: true, email: true, role: true },
  })
  console.log("[e2e seed] upserted admin:", user)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[e2e seed] failed:", e)
    process.exit(1)
  })
