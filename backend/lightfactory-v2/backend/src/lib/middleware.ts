// ============================================================
//  인증 미들웨어 — API 라우트를 감싸는 고차 함수
//  사용: export const GET = withAuth(handler, ['admin'])
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { verifyAccess, type TokenPayload } from './auth'

type AuthContext = { user: TokenPayload }
type Handler     = (req: NextRequest, ctx: AuthContext) => Promise<NextResponse>

export function withAuth(handler: Handler, allowedRoles: string[] = []) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const header = req.headers.get('authorization')
    if (!header?.startsWith('Bearer '))
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

    let user: TokenPayload
    try   { user = verifyAccess(header.slice(7)) }
    catch { return NextResponse.json({ error: '인증이 만료됐습니다' }, { status: 401 }) }

    if (allowedRoles.length && !allowedRoles.includes(user.role))
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

    return handler(req, { user })
  }
}
