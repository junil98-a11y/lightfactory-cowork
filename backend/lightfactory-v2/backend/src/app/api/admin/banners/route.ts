// ============================================================
//  /api/admin/banners — 배너 관리 (조회/수정)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma }   from '@/lib/prisma'
import { withAuth } from '@/lib/middleware'

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
