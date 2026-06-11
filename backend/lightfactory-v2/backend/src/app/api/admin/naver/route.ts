// ============================================================
//  /api/admin/naver — 네이버 스마트스토어 연동 API
//
//  엔드포인트:
//    POST   /api/admin/naver/test      — 연결 상태 확인
//    POST   /api/admin/naver/products  — 상품 등록 (단일 또는 복수)
//    PUT    /api/admin/naver/products  — 상품 수정 (재고/가격 동기화)
//    DELETE /api/admin/naver/products  — 상품 삭제
//    GET    /api/admin/naver/categories — 네이버 카테고리 조회
//    GET    /api/admin/naver/products  — 연동 상품 목록 조회
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma }         from '@/lib/prisma'
import { withAuth }       from '@/lib/middleware'
import {
  registerNaverProduct,
  updateNaverProduct,
  deleteNaverProduct,
  testNaverConnection,
  getNaverCategories,
  updateNaverStock,
  NAVER_CATEGORY_MAP,
  type NaverProductInput,
} from '@/lib/naver'

// API 라우트는 빌드 시 정적 프리렌더 금지(런타임 DB 조회) — 2026-06-11
export const dynamic = 'force-dynamic'

// ── GET — 연동된 상품 목록 / 카테고리 조회 ───────────────────
export const GET = withAuth(async (req) => {
  const type = req.nextUrl.searchParams.get('type')

  // 네이버 카테고리 트리 조회 (매핑 작업용)
  if (type === 'categories') {
    const parentId = req.nextUrl.searchParams.get('parentId') || undefined
    const cats = await getNaverCategories(parentId)
    return NextResponse.json({ categories: cats })
  }

  // 스마트스토어에 등록된 상품 목록
  const products = await prisma.product.findMany({
    where:   { naverProductNo: { not: null } },
    orderBy: { naverSyncedAt: 'desc' },
    select: {
      id: true, name: true, sku: true, brand: true,
      basePrice: true, stockQty: true, isActive: true,
      naverProductNo:  true,
      naverCategoryId: true,
      naverSyncStatus: true,
      naverSyncedAt:   true,
      naverSyncMsg:    true,
      images: { where:{ isPrimary:true }, take:1, select:{ url:true } },
    }
  })

  return NextResponse.json({ products })
}, ['admin'])

// ── POST — 상품 등록 / 연결 테스트 ──────────────────────────
export const POST = withAuth(async (req) => {
  const url = req.nextUrl.pathname

  // 연결 상태 확인 (API 키 설정 테스트)
  if (url.endsWith('/test')) {
    const result = await testNaverConnection()
    return NextResponse.json(result)
  }

  // 상품 등록
  const { productIds, naverCategoryId } = await req.json()

  if (!productIds?.length) {
    return NextResponse.json({ error: '등록할 상품을 선택해 주세요' }, { status: 400 })
  }

  // 라이트팩토리 상품 정보 조회
  const products = await prisma.product.findMany({
    where:   { id: { in: productIds }, isActive: true },
    include: {
      images:   { orderBy:{ sortOrder:'asc' } },
      prices:   { where:{ effectiveTo:null, tierCode:'consumer' } },
      category: { select:{ slug:true, name:true } },
    }
  })

  const results = []

  for (const p of products) {
    try {
      // 네이버 카테고리 코드 결정
      // 1. 요청에서 직접 지정된 값 우선
      // 2. 카테고리 매핑 테이블에서 자동 매핑
      // 3. 둘 다 없으면 오류
      const categoryId = naverCategoryId
        || NAVER_CATEGORY_MAP[p.category.slug]

      if (!categoryId) {
        results.push({
          productId: p.id, name: p.name,
          ok: false,
          errorMsg: `카테고리 매핑 없음 (slug: ${p.category.slug}). 관리자에서 네이버 카테고리를 직접 지정해 주세요.`
        })
        continue
      }

      // 이미지 URL 준비
      const primaryImage = p.images.find(i => i.isPrimary)?.url || p.images[0]?.url
      if (!primaryImage) {
        results.push({
          productId: p.id, name: p.name,
          ok: false, errorMsg: '대표 이미지가 없습니다. 상품 이미지를 먼저 등록해 주세요.'
        })
        continue
      }

      // 소비자가 (네이버에는 소비자가 기준으로 등록)
      const salePrice = Number(p.prices[0]?.price ?? p.basePrice)

      // 네이버 상품 입력값 구성
      const input: NaverProductInput = {
        name:                p.name,
        detailContent:       p.detailHtml || p.description || p.name,
        salePrice,
        stockQuantity:       p.stockQty,
        categoryId,
        representativeImage: primaryImage,
        optionalImages:      p.images.filter(i => !i.isPrimary).map(i => i.url),
        deliveryFee:         3000,
        deliveryFreeCondition: 50000,  // 5만원 이상 무료 배송
      }

      // 이미 네이버에 등록된 상품이면 수정, 없으면 신규 등록
      let result
      if (p.naverProductNo) {
        result = await updateNaverProduct(p.naverProductNo, input)
      } else {
        result = await registerNaverProduct(input)
      }

      // DB에 네이버 연동 정보 저장
      await prisma.product.update({
        where: { id: p.id },
        data: {
          naverProductNo:  result.ok ? result.naverProductNo : p.naverProductNo,
          naverCategoryId: categoryId,
          naverSyncStatus: result.ok ? 'synced' : 'failed',
          naverSyncedAt:   new Date(),
          naverSyncMsg:    result.ok ? null : result.errorMsg,
        }
      })

      results.push({
        productId: p.id, name: p.name,
        ok:              result.ok,
        naverProductNo:  result.naverProductNo,
        errorMsg:        result.errorMsg,
      })

    } catch (err: any) {
      // 예상치 못한 오류 처리
      await prisma.product.update({
        where: { id: p.id },
        data:  { naverSyncStatus:'failed', naverSyncMsg: err.message, naverSyncedAt: new Date() }
      })
      results.push({ productId: p.id, name: p.name, ok: false, errorMsg: err.message })
    }
  }

  const successCount = results.filter(r => r.ok).length
  return NextResponse.json({
    message:  `${successCount}/${results.length}개 상품 스마트스토어 등록 완료`,
    results,
  })
}, ['admin'])

// ── PUT — 재고/가격 동기화 ───────────────────────────────────
export const PUT = withAuth(async (req) => {
  const { productId } = await req.json()

  const product = await prisma.product.findUnique({
    where:   { id: productId },
    include: { prices: { where:{ effectiveTo:null, tierCode:'consumer' } } }
  })

  if (!product?.naverProductNo) {
    return NextResponse.json({ error: '스마트스토어에 등록되지 않은 상품입니다' }, { status: 400 })
  }

  // 재고 수량 동기화
  const result = await updateNaverStock(product.naverProductNo, product.stockQty)

  await prisma.product.update({
    where: { id: productId },
    data:  {
      naverSyncStatus: result.ok ? 'synced' : 'failed',
      naverSyncedAt:   new Date(),
      naverSyncMsg:    result.ok ? null : result.errorMsg,
    }
  })

  return NextResponse.json(result)
}, ['admin'])

// ── DELETE — 스마트스토어 상품 삭제 ─────────────────────────
export const DELETE = withAuth(async (req) => {
  const { productId } = await req.json()

  const product = await prisma.product.findUnique({ where:{ id: productId } })
  if (!product?.naverProductNo) {
    return NextResponse.json({ error: '스마트스토어에 등록되지 않은 상품입니다' }, { status: 400 })
  }

  const result = await deleteNaverProduct(product.naverProductNo)

  // 삭제 성공 시 DB에서 네이버 연동 정보 초기화
  if (result.ok) {
    await prisma.product.update({
      where: { id: productId },
      data:  { naverProductNo:null, naverSyncStatus:'none', naverSyncedAt: new Date() }
    })
  }

  return NextResponse.json(result)
}, ['admin'])
