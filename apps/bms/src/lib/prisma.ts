// The Prisma client + singleton now live in @genealogiq/db (single shared schema).
// Re-exported here so existing `@/lib/prisma` imports keep working unchanged.
export { prisma } from '@genealogiq/db'
