import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

const connectionString = `${process.env.DATABASE_URL}`

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Re-export the generated Prisma namespace, model types and enums so apps can
// `import { Prisma, Role, type Supplier } from '@genealogiq/db'` instead of
// reaching into a per-app generated folder.
export * from './generated/prisma/client'
