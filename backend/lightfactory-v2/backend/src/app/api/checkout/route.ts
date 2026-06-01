// ============================================================
//  /api/checkout — 주문 생성 + 토스페이먼츠 결제 확인
//
//  POST /api/checkout/prepare  — 주문 생성 (결제 전)
//  POST /api/checkout/confirm  — 결제 확인 (토스 콜백 후)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma }                    from '@/lib/prisma'
import { withAuth }                  from '@/lib/middleware'
import { confirmTossPayment }        from '@/lib/toss'
import { notifyOrderComplete }       from '@/lib/notify'
import { z }                         from 'zod'

// ── 주문 준비 (결제창 열기 전 주문번호 생성) ─────────────────
const prepareSchema = z.object({
  items:        z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive() })).min(1),
  shippingName:  z.string().min(1),
  shippingPhone: z.string().min(10),
  shippingAddr:  z.string().min(5),
  shippingMemo:  z.string().optional(),
  payMethod:     z.string().optional(),
})

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const url = req.nextUrl.pathname

  // ── 주문 준비 ───────────────────────────────────────────
  if (url.endsWith('/prepare')) {
    const body = prepareSchema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
    const { items, shippingName, shippingPhone, shippingAddr, shippingMemo, payMethod } = body.data

    // 상품 + 단가 조회
    const products = await prisma.product.findMany({
      where:   { id:{ in: items.map(i => i.productId) }, isActive:true },
      include: { prices:{ where:{ tierCode: user.tier as any, effectiveTo:null } } }
    })
    if (products.length !== items.length) return NextResponse.json({ error:'존재하지 않는 상품 포함' }, { status: 400 })

    // 2026-06-01 거래처별 단가 커스터마이즈 — 등급 단가보다 우선 적용
    const customerPrices = await prisma.customerPrice.findMany({
      where: { userId: user.sub, productId: { in: items.map(i => i.productId) } }
    })
    const customRateOf = (productId: string) => {
      const cp = customerPrices.find(c => c.productId === productId)
      return cp ? Number(cp.discountRate) : null
    }

    // 금액 계산 (단가 우선순위: 거래처별 customerPrice > 등급 ProductPrice > basePrice)
    let totalAmount = 0
    const orderItems = items.map(item => {
      const p    = products.find(x => x.id === item.productId)!
      const rate = customRateOf(p.id)
      const price = rate != null
        ? Math.floor(Number(p.basePrice) * (1 - rate))   // 거래처 협상 단가
        : Number(p.prices[0]?.price ?? p.basePrice)      // 등급 단가 / 기본가
      const sub   = price * item.quantity
      totalAmount += sub
      return { prodId:p.id, name:p.name, sku:p.sku, price, qty:item.quantity, sub }
    })

    const shippingCost = totalAmount >= 50000 ? 0 : 3000
    const finalAmount  = totalAmount + shippingCost
    const orderNumber  = `LF-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Date.now().toString().slice(-5)}`

    // 주문 DB 저장 (pending 상태)
    const order = await prisma.order.create({
      data: {
        userId: user.sub, orderNumber,
        appliedTier: user.tier as any,
        totalAmount, shippingCost, finalAmount,
        status: 'pending',
        shippingName, shippingPhone, shippingAddr,
        shippingMemo, payMethod,
        items: {
          create: orderItems.map(i => ({
            productId:   i.prodId, productName: i.name, productSku: i.sku,
            quantity:    i.qty,   unitPrice:   i.price,
            appliedTier: user.tier as any, subtotal: i.sub,
          }))
        }
      }
    })

    return NextResponse.json({ orderNumber, orderId: order.id, totalAmount, shippingCost, finalAmount })
  }

  // ── 결제 확인 (토스페이먼츠 successUrl 콜백) ─────────────
  if (url.endsWith('/confirm')) {
    const { paymentKey, orderId, amount } = await req.json()
    if (!paymentKey || !orderId || !amount)
      return NextResponse.json({ error:'파라미터 누락' }, { status: 400 })

    const order = await prisma.order.findUnique({ where:{ orderNumber: orderId } })
    if (!order) return NextResponse.json({ error:'주문 없음' }, { status: 404 })

    // 금액 위변조 방지: 서버 저장 금액과 비교
    if (Number(order.finalAmount) !== amount)
      return NextResponse.json({ error:'금액 불일치' }, { status: 400 })

    // 토스 결제 confirm
    await confirmTossPayment(paymentKey, orderId, amount)

    // 주문 상태 → paid
    await prisma.order.update({
      where: { id: order.id },
      data:  { status:'paid', payKey: paymentKey, ecountStatus:'pending' }
    })

    // 장바구니 비우기
    await prisma.cartItem.deleteMany({ where:{ userId: user.sub } })

    // 알림 발송 (비동기)
    const userInfo = await prisma.user.findUnique({ where:{ id: user.sub } })
    if (userInfo?.phone && userInfo?.email) {
      const orderItems = await prisma.orderItem.findMany({ where:{ orderId: order.id } })
      const orderName  = orderItems[0]?.productName + (orderItems.length>1 ? ` 외 ${orderItems.length-1}건` : '')
      notifyOrderComplete({
        phone: userInfo.phone, email: userInfo.email, name: userInfo.name,
        orderNumber: orderId, orderName, amount,
      }).catch(console.error)
    }

    return NextResponse.json({ message:'결제 완료', orderNumber: orderId })
  }

  return NextResponse.json({ error:'Not found' }, { status: 404 })
})
