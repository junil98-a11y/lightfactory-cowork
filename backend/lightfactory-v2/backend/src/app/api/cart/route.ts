// ============================================================
//  /api/cart — 장바구니 CRUD (로그인 필수)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma }   from '@/lib/prisma'
import { withAuth } from '@/lib/middleware'
import { z }        from 'zod'

// API 라우트는 빌드 시 정적 프리렌더 금지(런타임 DB 조회) — 2026-06-11
export const dynamic = 'force-dynamic'

// GET /api/cart — 장바구니 조회
export const GET = withAuth(async (_req, { user }) => {
  const items = await prisma.cartItem.findMany({
    where: { userId: user.sub },
    include: {
      product: {
        include: {
          images: { where:{ isPrimary:true }, take:1 },
          prices: { where:{ effectiveTo:null, tierCode: user.tier as any } },
        }
      }
    },
    orderBy: { createdAt:'asc' }
  })

  const result = items.map(item => {
    const price = Number(item.product.prices[0]?.price ?? item.product.basePrice)
    return {
      id:           item.id,
      productId:    item.productId,
      name:         item.product.name,
      sku:          item.product.sku,
      thumb:        item.product.images[0]?.url ?? null,
      basePrice:    Number(item.product.basePrice),
      sellingPrice: price,
      quantity:     item.quantity,
      subtotal:     price * item.quantity,
      stockQty:     item.product.stockQty,
    }
  })

  const total = result.reduce((s,i) => s + i.subtotal, 0)
  return NextResponse.json({ items: result, total, tier: user.tier })
})

// POST /api/cart — 상품 추가
const addSchema = z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(999) })

export const POST = withAuth(async (req, { user }) => {
  const body = addSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

  const { productId, quantity } = body.data
  const product = await prisma.product.findUnique({ where:{ id:productId, isActive:true } })
  if (!product) return NextResponse.json({ error: '상품 없음' }, { status: 404 })
  if (product.stockQty < quantity) return NextResponse.json({ error:'재고 부족', stockQty: product.stockQty }, { status: 409 })

  const existing = await prisma.cartItem.findUnique({ where:{ userId_productId:{ userId:user.sub, productId } } })
  const cartItem = existing
    ? await prisma.cartItem.update({ where:{ id:existing.id }, data:{ quantity: existing.quantity + quantity } })
    : await prisma.cartItem.create({ data:{ userId:user.sub, productId, quantity } })

  return NextResponse.json({ message:'장바구니에 담겼습니다', cartItem }, { status: 201 })
})

// PATCH /api/cart/[id] — 수량 변경 / DELETE — 삭제
export const PATCH = withAuth(async (req, { user }) => {
  const id = req.nextUrl.pathname.split('/').at(-1)!
  const { quantity } = await req.json()
  const item = await prisma.cartItem.findFirst({ where:{ id, userId:user.sub }, include:{ product:{ select:{ stockQty:true } } } })
  if (!item) return NextResponse.json({ error:'없음' }, { status: 404 })
  if (item.product.stockQty < quantity) return NextResponse.json({ error:'재고 부족' }, { status: 409 })
  const updated = await prisma.cartItem.update({ where:{ id }, data:{ quantity } })
  return NextResponse.json({ cartItem: updated })
})

export const DELETE = withAuth(async (req, { user }) => {
  const id = req.nextUrl.pathname.split('/').at(-1)!
  if (id === 'cart') {
    await prisma.cartItem.deleteMany({ where:{ userId: user.sub } })
  } else {
    await prisma.cartItem.deleteMany({ where:{ id, userId: user.sub } })
  }
  return NextResponse.json({ message:'삭제 완료' })
})
