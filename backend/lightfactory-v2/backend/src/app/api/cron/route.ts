// ============================================================
//  /api/cron — Vercel Cron Job 엔드포인트 (2시간마다)
//  이카운트에서 재고를 가져와 DB 업데이트
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error:'인증 실패' }, { status: 401 })

  // 실제 배포 시: 이카운트 API로 재고 조회 후 업데이트
  // 현재는 DB 상품 수만 반환 (이카운트 연동 준비됨)
  const productCount = await prisma.product.count({ where:{ isActive:true } })

  return NextResponse.json({
    ok: true, message:'이카운트 재고 동기화 준비됨',
    productCount, syncedAt: new Date().toISOString()
  })
}
