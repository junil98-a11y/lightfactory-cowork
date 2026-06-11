// ============================================================
//  /api/admin/ecount/send — 관리자 수동 이카운트 전송
//  주문 관리의 「지금 전송대기 일괄 전송」 버튼이 호출한다.
//  body: { all?: boolean }
//    all=true  → 전송대기 전체(시각 무관)
//    기본       → 오후 2시(KST)까지 등록된 전송대기 주문만
// ============================================================
import { NextResponse } from 'next/server'
import { withAuth }            from '@/lib/middleware'
import { runEcountAutoSend }   from '@/lib/ecount'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async (req) => {
  const body = await req.json().catch(() => ({} as any))
  const all  = !!body?.all
  try {
    const result = await runEcountAutoSend({ all })
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}, ['admin'])
