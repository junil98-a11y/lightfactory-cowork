// ============================================================
//  JWT 인증 유틸리티
//  Access Token (15분) + Refresh Token (7일) 이중 토큰 방식
// ============================================================
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

export type TokenPayload = {
  sub:  string   // 유저 UUID
  role: string   // consumer | business | admin
  tier: string   // consumer | T1 | T2 | T3 | pending
}

export const signAccess   = (p: TokenPayload) => jwt.sign(p, ACCESS_SECRET,  { expiresIn: '15m' })
export const signRefresh  = (p: TokenPayload) => jwt.sign(p, REFRESH_SECRET, { expiresIn: '7d'  })
export const verifyAccess = (t: string)        => jwt.verify(t, ACCESS_SECRET)  as TokenPayload
export const verifyRefresh= (t: string)        => jwt.verify(t, REFRESH_SECRET) as TokenPayload
export const hashPw       = (plain: string)    => bcrypt.hash(plain, 12)
export const verifyPw     = (plain: string, hash: string) => bcrypt.compare(plain, hash)
