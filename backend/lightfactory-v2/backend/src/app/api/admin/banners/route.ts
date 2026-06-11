// ============================================================
//  /api/admin/banners — 배너 관리 (조회/수정)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma }   from '@/lib/prisma'
import { withAuth } from '@/lib/middleware'

// API 라우트는 빌드 시 정적 프리렌더 금지(런타임 DB 조회) — 2026-06-11
export const dynamic = 'force-dynamic'

export const GET = withAuth(async () => {
  const banners = await prisma.banner.findMany({ orderBy:{ slotKey:'asc' } })
  return NextResponse.json({ banners })
}, ['admin'])

export const PATCH = withAuth(async (req) => {
  const { slotKey, imageUrl, linkUrl, altText, isActive } = await req.json()
  const banner = await prisma.banner.upsert({
    where:  { slotKey },
    update: { imageUrl, linkUrl, altText, isActive },
    create: { slotKey, imageUrl, linkUrl, altText, isActive: isActive ?? false }
  })
  return NextResponse.json({ banner })
}, ['admin'])
