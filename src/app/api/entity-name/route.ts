import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

const ENTITY_TYPES = ['users', 'customers', 'suppliers', 'licenses', 'packages', 'supplier-categories', 'customer-categories'] as const
type EntityType = (typeof ENTITY_TYPES)[number]

async function resolveName(type: EntityType, id: string): Promise<string | null> {
  if (type === 'users') {
    const record = await prisma.user.findUnique({ where: { id }, select: { firstName: true, lastName: true } })
    if (!record) return null
    return `${record.firstName} ${record.lastName}`.trim() || null
  }
  if (type === 'customers') {
    const record = await prisma.customer.findUnique({ where: { id }, select: { name: true } })
    return record?.name ?? null
  }
  if (type === 'suppliers') {
    const record = await prisma.supplier.findUnique({ where: { id }, select: { name: true } })
    return record?.name ?? null
  }
  if (type === 'licenses') {
    const record = await prisma.license.findUnique({ where: { id }, select: { component: true } })
    return record?.component ?? null
  }
  if (type === 'packages') {
    const record = await prisma.package.findUnique({ where: { id }, select: { name: true } })
    return record?.name ?? null
  }
  if (type === 'supplier-categories') {
    const record = await prisma.supplierCategory.findUnique({ where: { id }, select: { name: true } })
    return record?.name ?? null
  }
  if (type === 'customer-categories') {
    const record = await prisma.customerCategory.findUnique({ where: { id }, select: { name: true } })
    return record?.name ?? null
  }
  return null
}

export async function GET(req: NextRequest) {
  await verifySession()

  const { searchParams } = req.nextUrl
  const type = searchParams.get('type') as EntityType | null
  const id   = searchParams.get('id')

  if (!type || !id || !ENTITY_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const name = await resolveName(type, id)
  if (!name) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ name })
}
