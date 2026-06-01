// ============================================================
//  /api/products — 상품 목록 조회 (공개 API)
//  쿼리 파라미터:
//    category  — 카테고리 slug
//    search    — 검색어 (상품명·브랜드·SKU)
//    featured  — 'true' 이면 인기상품만
//    page      — 페이지 번호 (기본 1)
//    limit     — 페이지당 수 (기본 20, 최대 100)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const p        = req.nextUrl.searchParams
  const search   = p.get('search')   || ''
  const catSlug  = p.get('category') || ''
  const featured = p.get('featured') === 'true'
  const page     = Math.max(1, parseInt(p.get('page')  || '1'))
  const limit    = Math.min(100, parseInt(p.get('limit') || '20'))

  // 카테고리 필터: slug로 category id 조회 (하위 카테고리 포함)
  let categoryIds: string[] | undefined
  if (catSlug) {
    const cat = await prisma.category.findUnique({ where:{ slug: catSlug } })
    if (cat) {
      // 하위 카테고리 id도 포함
      const children = await prisma.category.findMany({
        where: { OR: [{ slug: catSlug }, { parentId: cat.id }] },
        select: { id: true }
      })
      categoryIds = children.map(c => c.id)
    }
  }

  const where = {
    isActive: true,
    ...(featured     && { isFeatured: true }),
    ...(categoryIds  && { categoryId: { in: categoryIds } }),
    ...(search && {
      OR: [
        { name:  { contains: search, mode: 'insensitive' as const } },
        { brand: { contains: search, mode: 'insensitive' as const } },
        { sku:   { contains: search, mode: 'insensitive' as const } },
      ]
    }),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where, skip: (page-1)*limit, take: limit,
      orderBy: [{ isFeatured:'desc' }, { createdAt:'desc' }],
      include: {
        category: { select:{ id:true, name:true, slug:true } },
        images:   { where:{ isPrimary:true }, take:1, select:{ url:true } },
        prices:   { where:{ effectiveTo: null }, select:{ tierCode:true, price:true } },
      }
    }),
    prisma.product.count({ where }),
  ])

  // 응답 포맷: 프론트엔드가 사용하기 쉬운 형태로 변환
  const items = products.map(p => ({
    id:         p.id,
    name:       p.name,
    sku:        p.sku,
    brand:      p.brand,
    category:   p.category,
    basePrice:  Number(p.basePrice),
    stockQty:   p.stockQty,
    isFeatured: p.isFeatured,
    isActive:   p.isActive,
    thumb:      p.images[0]?.url ?? null,
    prices:     Object.fromEntries(p.prices.map(pr => [pr.tierCode, Number(pr.price)])),
  }))

  return NextResponse.json({ items, total, page, limit, totalPages: Math.ceil(total/limit) })
}
