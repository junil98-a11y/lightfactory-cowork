// ============================================================
//  /api/categories — 카테고리 트리 전체 조회 (공개 API)
//  프론트엔드 사이드바 / 모바일 탭에 사용
// ============================================================
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 평탄 배열을 트리 구조로 변환
function buildTree(cats: any[], parentId: string | null = null): any[] {
  return cats
    .filter(c => c.parentId === parentId)
    .sort((a,b) => a.sortOrder - b.sortOrder)
    .map(c => ({ ...c, children: buildTree(cats, c.id) }))
}

export async function GET() {
  const cats = await prisma.category.findMany({
    where:   { isActive: true },
    orderBy: [{ depth:'asc' }, { sortOrder:'asc' }],
    select:  { id:true, parentId:true, name:true, slug:true, depth:true, sortOrder:true }
  })
  return NextResponse.json(buildTree(cats))
}
