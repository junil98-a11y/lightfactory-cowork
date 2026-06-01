// ============================================================
//  /api/orders — 내 주문 목록 / 상세 조회
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma }   from '@/lib/prisma'
import { withAuth } from '@/lib/middleware'

// GET /api/orders — 내 주문 목록
export const GET = withAuth(async (req, { user }) => {
  const page  = parseInt(req.nextUrl.searchParams.get('page') || '1')
  const limit = 10

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where:   { userId: user.sub },
      orderBy: { orderedAt:'desc' },
      skip:    (page-1)*limit, take: limit,
      include: { items:{ include:{ product:{ include:{ images:{ where:{ isPrimary:true }, take:1 } } } } } }
    }),
    prisma.order.count({ where:{ userId: user.sub } })
  ])

  return NextResponse.json({
    orders: orders.map(o => ({
      id:          o.id,
      orderNumber: o.orderNumber,
      status:      o.status,
      finalAmount: Number(o.finalAmount),
      orderedAt:   o.orderedAt,
      trackingNo:  o.trackingNo,
      courier:     o.courier,
      items: o.items.map(i => ({
        name:     i.productName,
        sku:      i.productSku,
        quantity: i.quantity,
        price:    Number(i.unitPrice),
        thumb:    i.product.images[0]?.url ?? null,
      }))
    })),
    total, page, totalPages: Math.ceil(total/limit)
  })
})
