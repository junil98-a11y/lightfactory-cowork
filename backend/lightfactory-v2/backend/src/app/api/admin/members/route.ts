// ============================================================
//  /api/admin/members — 회원 목록 + 사업자 승인/거절
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma }          from '@/lib/prisma'
import { withAuth }        from '@/lib/middleware'
import { notifyBizApproved } from '@/lib/notify'

// GET — 회원 목록 (소비자 / 사업자 탭)
export const GET = withAuth(async (req) => {
  const role = req.nextUrl.searchParams.get('role') || 'consumer'

  if (role === 'business') {
    const members = await prisma.user.findMany({
      where:   { role: 'business' },
      orderBy: { createdAt:'desc' },
      include: { businessProfile: true }
    })
    return NextResponse.json({ members: members.map(m => ({
      id: m.id, name: m.name, email: m.email, phone: m.phone, createdAt: m.createdAt,
      status: m.status, profile: m.businessProfile
    })) })
  }

  const consumers = await prisma.user.findMany({
    where:   { role: 'consumer' },
    orderBy: { createdAt:'desc' },
    take:    100,
    select:  { id:true, name:true, email:true, phone:true, status:true, createdAt:true }
  })
  return NextResponse.json({ members: consumers })
}, ['admin'])

// PATCH — 사업자 승인/거절 + tier 배정
export const PATCH = withAuth(async (req, { user }) => {
  const { userId, action, priceTier, rejectReason } = await req.json()
  // action: 'approve' | 'reject' | 'change_tier'

  const bizUser = await prisma.user.findUnique({
    where: { id: userId }, include: { businessProfile: true }
  })
  if (!bizUser) return NextResponse.json({ error:'없음' }, { status: 404 })

  if (action === 'approve' && priceTier) {
    await prisma.businessProfile.update({
      where: { userId },
      data:  { approvalStatus:'approved', priceTier, approvedById: user.sub, approvedAt: new Date() }
    })
    // 알림 발송
    const discounts = { T1:30, T2:22, T3:12 }
    if (bizUser.phone) {
      notifyBizApproved({
        phone: bizUser.phone, email: bizUser.email,
        companyName: bizUser.businessProfile?.companyName || bizUser.name,
        tier: priceTier, discount: discounts[priceTier as keyof typeof discounts] || 0,
      }).catch(console.error)
    }
  } else if (action === 'reject') {
    await prisma.businessProfile.update({
      where: { userId },
      data:  { approvalStatus:'rejected', rejectReason }
    })
  } else if (action === 'change_tier' && priceTier) {
    await prisma.businessProfile.update({
      where: { userId }, data: { priceTier }
    })
  }

  return NextResponse.json({ message:'처리 완료' })
}, ['admin'])
