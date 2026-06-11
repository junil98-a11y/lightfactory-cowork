// ============================================================
//  /api/admin/kakao/promo — 도매사업자 카카오 홍보 발송
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma }         from '@/lib/prisma'
import { withAuth }       from '@/lib/middleware'
import { sendPromoKakao } from '@/lib/notify'

// API 라우트는 빌드 시 정적 프리렌더 금지(런타임 DB 조회) — 2026-06-11
export const dynamic = 'force-dynamic'

export const POST = withAuth(async (req) => {
  const { productId, recipientUserIds, customMsg, tierFilter } = await req.json()

  const product = await prisma.product.findUnique({
    where:   { id: productId },
    include: { prices:{ where:{ effectiveTo:null } } }
  })
  if (!product) return NextResponse.json({ error:'상품 없음' }, { status: 404 })

  const bizProfiles = await prisma.businessProfile.findMany({
    where: {
      approvalStatus: 'approved',
      ...(tierFilter && tierFilter !== 'all' && { priceTier: tierFilter }),
      ...(recipientUserIds?.length && { userId:{ in: recipientUserIds } }),
    },
    include: { user:{ select:{ phone:true } } }
  })

  const phones = bizProfiles.map(b => b.user.phone).filter(Boolean) as string[]
  if (!phones.length) return NextResponse.json({ error:'수신자 없음' }, { status: 400 })

  const priceMap = Object.fromEntries(product.prices.map(p => [p.tierCode, Number(p.price)]))
  const result   = await sendPromoKakao(phones, {
    productName: product.name, basePrice: Number(product.basePrice),
    tierPrice:   priceMap['T1'] || Number(product.basePrice), customMsg,
  })

  return NextResponse.json({ message:'발송 완료', ...result })
}, ['admin'])
