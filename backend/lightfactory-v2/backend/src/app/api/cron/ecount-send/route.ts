// ============================================================
//  /api/cron/ecount-send — Vercel Cron Job
//  매일 오후 2시(KST)에 "그 시각까지 등록된" 전송대기 주문을
//  이카운트 판매입력(매출전표)으로 자동 등록한다.
//
//  스케줄(vercel.json): "0 5 * * *"  ← 05:00 UTC = 14:00 KST
//  인증: Authorization: Bearer ${CRON_SECRET}
//  수동/전체 재전송: GET /api/cron/ecount-send?all=1 (시각 무관 전체 전송대기)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { runEcountAutoSend } from '@/lib/ecount'

export const dynamic     = 'force-dynamic'  // 캐시 금지(매번 실행)
export const maxDuration = 60               // 일괄 처리 여유(초)

export async function GET(req: NextRequest) {
  // 크론 시크릿 인증 (Vercel Cron이 자동으로 헤더 첨부)
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })

  const all = req.nextUrl.searchParams.get('all') === '1'

  try {
    const result = await runEcountAutoSend({ all })
    return NextResponse.json({ ...result, ranAt: new Date().toISOString() })
  } catch (e: any) {
    console.error('[cron/ecount-send] 실패:', e)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
