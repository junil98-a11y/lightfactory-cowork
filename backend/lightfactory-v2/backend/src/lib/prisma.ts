// Prisma 클라이언트 싱글턴 — Next.js 핫리로드 시 중복 연결 방지
import { PrismaClient } from '@prisma/client'
const g = globalThis as any
export const prisma: PrismaClient = g._prisma ?? (g._prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error','warn'] : ['error'],
}))
