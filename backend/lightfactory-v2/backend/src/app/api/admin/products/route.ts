// ============================================================
//  /api/admin/products — 관리자 상품 CRUD
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma }   from '@/lib/prisma'
import { withAuth } from '@/lib/middleware'
import { z }        from 'zod'

// API 라우트는 빌드 시 정적 프리렌더 금지(런타임 DB 조회) — 2026-06-11
export const dynamic = 'force-dynamic'

// GET — 상품 목록 (관리자용, 비활성 포함)
export const GET = withAuth(async (req) => {
  const p      = req.nextUrl.searchParams
  const search = p.get('search') || ''
  const page   = parseInt(p.get('page') || '1')
  const limit  = 30

  const products = await prisma.product.findMany({
    where: search ? { OR: [
      { name:  { contains: search, mode:'insensitive' } },
      { sku:   { contains: search, mode:'insensitive' } },
      { brand: { contains: search, mode:'insensitive' } },
    ]} : {},
    orderBy: { createdAt:'desc' },
    skip: (page-1)*limit, take: limit,
    include: {
      category: { select:{ name:true, slug:true } },
      images:   { where:{ isPrimary:true }, take:1 },
      prices:   { where:{ effectiveTo:null } },
    }
  })

  return NextResponse.json({ products: products.map(p => ({
    id: p.id, name: p.name, sku: p.sku, brand: p.brand,
    category: p.category, basePrice: Number(p.basePrice),
    stockQty: p.stockQty, isFeatured: p.isFeatured, isActive: p.isActive,
    thumb: p.images[0]?.url ?? null,
    prices: Object.fromEntries(p.prices.map(pr => [pr.tierCode, Number(pr.price)])),
  })) })
}, ['admin'])

const prodSchema = z.object({
  name:         z.string().min(1),
  sku:          z.string().min(1),
  categoryId:   z.string().uuid(),
  basePrice:    z.number().positive(),
  stockQty:     z.number().int().min(0).optional(),
  brand:        z.string().optional(),
  description:  z.string().optional(),
  detailHtml:   z.string().optional(),
  isFeatured:   z.boolean().optional(),
  imageUrls:    z.array(z.string().url()).optional(),
})

// POST — 상품 등록
export const POST = withAuth(async (req, { user }) => {
  const body = prodSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  const d = body.data

  // 단가 계산
  const tiers = await prisma.priceTier.findMany()
  const rates = Object.fromEntries(tiers.map(t => [t.tierCode, Number(t.discountRate)]))

  const product = await prisma.product.create({
    data: {
      ...d, isActive: true,
      ...(d.imageUrls?.length && {
        images: { create: d.imageUrls.map((url, i) => ({ url, sortOrder:i, isPrimary: i===0 })) }
      }),
      prices: {
        create: (['consumer','T1','T2','T3'] as const).map(tier => ({
          tierCode:    tier,
          price:       Math.floor(d.basePrice * (1 - (rates[tier] || 0))),
          discountRate: rates[tier] || 0,
          effectiveTo: null,
          createdById: user.sub,
        }))
      }
    }
  })
  return NextResponse.json({ product }, { status: 201 })
}, ['admin'])

// PATCH — 상품 수정
export const PATCH = withAuth(async (req, { user }) => {
  const { id, ...data } = await req.json()
  const product = await prisma.product.update({
    where: { id },
    data:  { ...data, updatedAt: new Date() }
  })

  // basePrice 변경 시 단가 재계산
  if (data.basePrice) {
    const tiers = await prisma.priceTier.findMany()
    const rates = Object.fromEntries(tiers.map(t => [t.tierCode, Number(t.discountRate)]))
    const now   = new Date()

    for (const tier of ['consumer','T1','T2','T3'] as const) {
      const newPrice = Math.floor(data.basePrice * (1 - (rates[tier] || 0)))
      // 기존 단가 종료
      await prisma.productPrice.updateMany({ where:{ productId:id, tierCode:tier, effectiveTo:null }, data:{ effectiveTo:now } })
      // 새 단가 생성
      await prisma.productPrice.create({ data:{ productId:id, tierCode:tier, price:newPrice, discountRate: rates[tier]||0, effectiveTo:null, createdById:user.sub } })
    }
  }
  return NextResponse.json({ product })
}, ['admin'])
