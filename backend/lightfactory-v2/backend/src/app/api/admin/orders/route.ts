// ============================================================
//  /api/admin/orders — 관리자 주문 목록 / 상태변경 / 운송장
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma }         from '@/lib/prisma'
import { withAuth }       from '@/lib/middleware'
import { notifyShipping } from '@/lib/notify'

// GET /api/admin/orders — 전체 주문 목록
export const GET = withAuth(async (req) => {
  const p      = req.nextUrl.searchParams
  const page   = parseInt(p.get('page')   || '1')
  const status = p.get('status')   || ''
  const search = p.get('search')   || ''
  const limit  = 20

  const where: any = {
    ...(status && { status }),
    ...(search && {
      OR: [
        { orderNumber:  { contains: search } },
        { shippingName: { contains: search } },
      ]
    })
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where, orderBy:{ orderedAt:'desc' },
      skip: (page-1)*limit, take: limit,
      include: {
        user:  { select:{ name:true, email:true, phone:true } },
        items: { take:1, select:{ productName:true } },
        _count:{ select:{ items:true } }
      }
    }),
    prisma.order.count({ where })
  ])

  return NextResponse.json({
    orders: orders.map(o => ({
      id: o.id, orderNumber: o.orderNumber, status: o.status,
      finalAmount: Number(o.finalAmount), orderedAt: o.orderedAt,
      appliedTier: o.appliedTier, ecountStatus: o.ecountStatus,
      shippingName: o.shippingName, trackingNo: o.trackingNo, courier: o.courier,
      userName: o.user.name, userEmail: o.user.email,
      firstItem: o.items[0]?.productName, itemCount: o._count.items,
    })),
    total, page, totalPages: Math.ceil(total/limit)
  })
}, ['admin'])

// PATCH /api/admin/orders — 상태 변경 + 운송장 입력
export const PATCH = withAuth(async (req) => {
  const { orderId, status, trackingNo, courier } = await req.json()
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { user: true }
  })
  if (!order) return NextResponse.json({ error:'없음' }, { status: 404 })

  const updated = await prisma.order.update({
    where: { id: orderId },
    data:  { ...(status && { status }), ...(trackingNo && { trackingNo }), ...(courier && { courier }) }
  })

  // 배송 시작 → 알림 발송
  if (status === 'shipped' && trackingNo && order.user.phone && order.user.email) {
    notifyShipping({
      phone: order.user.phone!, email: order.user.email,
      name: order.user.name, orderNumber: order.orderNumber,
      courier: courier || order.courier || '', trackingNo,
    }).catch(console.error)
  }

  return NextResponse.json({ order: updated })
}, ['admin'])
