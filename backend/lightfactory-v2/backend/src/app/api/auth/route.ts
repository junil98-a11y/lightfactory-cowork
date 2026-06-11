// ============================================================
//  /api/auth — 회원가입 / 로그인 / 로그아웃 / 토큰갱신 / 내정보
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma }         from '@/lib/prisma'
import { signAccess, signRefresh, verifyRefresh, hashPw, verifyPw } from '@/lib/auth'
import { withAuth }       from '@/lib/middleware'
import { z }              from 'zod'

// API 라우트는 빌드 시 정적 프리렌더 금지(런타임 DB 조회) — 2026-06-11
export const dynamic = 'force-dynamic'

const COOKIE = 'lf_refresh'
const cookieOpts = { httpOnly:true, secure: process.env.NODE_ENV==='production', sameSite:'strict' as const, path:'/', maxAge: 7*24*3600 }

// POST /api/auth/register
export async function POST(req: NextRequest) {
  const url = req.nextUrl.pathname
  if (url.endsWith('/register')) return register(req)
  if (url.endsWith('/login'))    return login(req)
  if (url.endsWith('/logout'))   return logout()
  if (url.endsWith('/refresh'))  return refresh(req)
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
export const GET = withAuth(async (_req, { user }) => {
  const u = await prisma.user.findUnique({ where:{ id: user.sub }, include:{ businessProfile: true } })
  if (!u) return NextResponse.json({ error: '없음' }, { status: 404 })
  return NextResponse.json({ id:u.id, name:u.name, email:u.email, role:u.role, tier:user.tier, phone:u.phone, businessProfile:u.businessProfile })
})

const regSchema = z.object({
  name: z.string().min(2), email: z.string().email(), password: z.string().min(8),
  isBiz: z.boolean().optional(),
  companyName: z.string().optional(), businessNumber: z.string().optional(), industry: z.string().optional(),
})

async function register(req: NextRequest) {
  const body = regSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  const { name, email, password, isBiz, companyName, businessNumber, industry } = body.data
  if (await prisma.user.findUnique({ where:{ email } }))
    return NextResponse.json({ error: '이미 사용 중인 이메일' }, { status: 409 })

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPw(password), role: isBiz ? 'business' : 'consumer',
      ...(isBiz && companyName && businessNumber && {
        businessProfile: { create:{ companyName, businessNumber, industry: industry||'기타' } }
      })
    }
  })
  return NextResponse.json({ message: '가입 완료', id: user.id }, { status: 201 })
}

async function login(req: NextRequest) {
  const { email, password } = await req.json()
  const user = await prisma.user.findUnique({ where:{ email }, include:{ businessProfile:true } })
  if (!user || !(await verifyPw(password, user.passwordHash)))
    return NextResponse.json({ error: '이메일 또는 비밀번호 오류' }, { status: 401 })
  if (user.status === 'inactive')
    return NextResponse.json({ error: '비활성화된 계정' }, { status: 403 })

  const tier = user.role === 'business'
    ? (user.businessProfile?.approvalStatus === 'approved' ? user.businessProfile.priceTier ?? 'consumer' : 'pending')
    : user.role

  const payload = { sub: user.id, role: user.role, tier: String(tier) }
  const accessToken = signAccess(payload)
  const refreshToken = signRefresh(payload)
  await prisma.user.update({ where:{ id:user.id }, data:{ refreshToken } })

  const res = NextResponse.json({ accessToken, user:{ id:user.id, name:user.name, email:user.email, role:user.role, tier } })
  res.cookies.set(COOKIE, refreshToken, cookieOpts)
  return res
}

function logout() {
  const res = NextResponse.json({ message: '로그아웃 완료' })
  res.cookies.set(COOKIE, '', { ...cookieOpts, maxAge: 0 })
  return res
}

async function refresh(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value
  if (!token) return NextResponse.json({ error: '재로그인 필요' }, { status: 401 })
  try {
    const payload  = verifyRefresh(token)
    const newAccess = signAccess({ sub: payload.sub, role: payload.role, tier: payload.tier })
    return NextResponse.json({ accessToken: newAccess })
  } catch {
    return NextResponse.json({ error: '세션 만료' }, { status: 401 })
  }
}
