// ============================================================
//  /api/admin/categories — 카테고리 CRUD (관리자)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma }   from '@/lib/prisma'
import { withAuth } from '@/lib/middleware'
import { z }        from 'zod'

// API 라우트는 빌드 시 정적 프리렌더 금지(런타임 DB 조회) — 2026-06-11
export const dynamic = 'force-dynamic'

export const GET = withAuth(async () => {
  const cats = await prisma.category.findMany({ orderBy:[{depth:'asc'},{sortOrder:'asc'}] })
  return NextResponse.json(cats)
}, ['admin'])

const catSchema = z.object({
  name: z.string().min(1), parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional(),
})

export const POST = withAuth(async (req) => {
  const body = catSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

  const parent = body.data.parentId
    ? await prisma.category.findUnique({ where:{ id: body.data.parentId } })
    : null
  const depth  = parent ? parent.depth + 1 : 0
  const slug   = `${body.data.name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-가-힣]/g,'')}-${Date.now()}`

  const cat = await prisma.category.create({
    data: { name: body.data.name, slug, depth, parentId: body.data.parentId ?? null, sortOrder: body.data.sortOrder ?? 0 }
  })
  return NextResponse.json({ category: cat }, { status: 201 })
}, ['admin'])

export const PATCH = withAuth(async (req) => {
  const { id, ...data } = await req.json()
  const cat = await prisma.category.update({ where:{ id }, data })
  return NextResponse.json({ category: cat })
}, ['admin'])

export const DELETE = withAuth(async (req) => {
  const { id } = await req.json()
  const hasProducts = await prisma.product.count({ where:{ categoryId: id } })
  if (hasProducts > 0) return NextResponse.json({ error:'상품이 연결된 카테고리는 삭제할 수 없습니다' }, { status: 400 })
  await prisma.category.delete({ where:{ id } })
  return NextResponse.json({ message:'삭제 완료' })
}, ['admin'])
