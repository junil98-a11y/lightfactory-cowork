// ============================================================
//  prisma/seed.ts — 라이트팩토리 초기 데이터
//
//  실행: npm run db:seed
//
//  삽입 순서:
//    1. 단가 등급 (price_tiers)
//    2. 관리자 계정 + 테스트 계정 (users)
//    3. 테스트 사업자 계정 (business_profiles)
//    4. 카테고리 트리 (categories)
//    5. 상품 + 이미지 + 단가 4종 (products, product_images, product_prices)
//    6. 배너 슬롯 초기값 (banners)
// ============================================================

import { PrismaClient, PriceTierCode } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// 비밀번호 해시 (bcrypt rounds: 12)
async function hash(pw: string) {
  return bcrypt.hash(pw, 12)
}

// 소비자가 → tier별 단가 계산 헬퍼
function calcPrices(base: number, rates: Record<PriceTierCode, number>) {
  return {
    consumer: base,
    T1: Math.floor(base * (1 - rates.T1)),
    T2: Math.floor(base * (1 - rates.T2)),
    T3: Math.floor(base * (1 - rates.T3)),
  }
}

async function main() {
  console.log('🌱 시드 데이터 삽입 시작...')

  // ── 1. 단가 등급 ──────────────────────────────────────────
  const RATES = { consumer: 0, T1: 0.30, T2: 0.22, T3: 0.12 }

  await prisma.priceTier.upsert({
    where: { tierCode: 'T1' },
    update: {},
    create: { tierCode: 'T1', tierName: '1단가 (대형 업체)', discountRate: 0.30, description: '연간 거래액 1억 원 이상' }
  })
  await prisma.priceTier.upsert({
    where: { tierCode: 'T2' },
    update: {},
    create: { tierCode: 'T2', tierName: '2단가 (중형 업체)', discountRate: 0.22, description: '연간 거래액 3천만~1억 원' }
  })
  await prisma.priceTier.upsert({
    where: { tierCode: 'T3' },
    update: {},
    create: { tierCode: 'T3', tierName: '3단가 (소형 업체)', discountRate: 0.12, description: '연간 거래액 3천만 원 미만' }
  })
  await prisma.priceTier.upsert({
    where: { tierCode: 'consumer' },
    update: {},
    create: { tierCode: 'consumer', tierName: '소비자가', discountRate: 0, description: '일반 소비자 정가' }
  })
  console.log('✓ 단가 등급 완료')

  // ── 2. 관리자 + 테스트 계정 ──────────────────────────────
  const adminPw = await hash(process.env.ADMIN_PW || 'Lightfactory2025!')
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lightfactory.co.kr' },
    update: {},
    create: {
      email: 'admin@lightfactory.co.kr',
      passwordHash: adminPw,
      name: '라이트팩토리 관리자',
      role: 'admin',
      phone: '02-1234-5678',
    }
  })

  const testConsumerPw = await hash('Test1234!')
  const testConsumer = await prisma.user.upsert({
    where: { email: 'test@lightfactory.co.kr' },
    update: {},
    create: {
      email: 'test@lightfactory.co.kr',
      passwordHash: testConsumerPw,
      name: '테스트 소비자',
      role: 'consumer',
      phone: '010-1234-5678',
    }
  })
  console.log('✓ 관리자·소비자 계정 완료')

  // ── 3. 테스트 사업자 3개 (T1/T2/T3 각 1개) ───────────────
  const bizData = [
    { email: 'biz-t1@test.com', name: '김인테리어', company: '(주)루미인테리어', bno: '123-45-67890', tier: 'T1' as PriceTierCode, ind: '인테리어 시공' },
    { email: 'biz-t2@test.com', name: '박전기',     company: '박전기공사',       bno: '987-65-43210', tier: 'T2' as PriceTierCode, ind: '전기 공사업' },
    { email: 'biz-t3@test.com', name: '이소형',     company: '서울조명유통',     bno: '456-78-90123', tier: 'T3' as PriceTierCode, ind: '조명 유통업' },
  ]
  const bizPw = await hash('Biz12345!')
  for (const b of bizData) {
    const bizUser = await prisma.user.upsert({
      where: { email: b.email },
      update: {},
      create: { email: b.email, passwordHash: bizPw, name: b.name, role: 'business', phone: '010-0000-0000' }
    })
    await prisma.businessProfile.upsert({
      where: { userId: bizUser.id },
      update: {},
      create: {
        userId: bizUser.id,
        companyName: b.company,
        businessNumber: b.bno,
        industry: b.ind,
        approvalStatus: 'approved',
        priceTier: b.tier,
        approvedById: admin.id,
        approvedAt: new Date(),
      }
    })
  }
  console.log('✓ 사업자 계정 완료')

  // ── 4. 카테고리 트리 ──────────────────────────────────────
  async function upsertCat(slug: string, name: string, depth: number, sortOrder: number, parentId?: string) {
    return prisma.category.upsert({
      where: { slug },
      update: { name, sortOrder },
      create: { slug, name, depth, sortOrder, parentId, isActive: true }
    })
  }

  // 대분류
  const catFan   = await upsertCat('ceiling-fan',    '실링팬',     0, 0)
  const catSw    = await upsertCat('switch',         '스위치',     0, 1)
  const catRec   = await upsertCat('recessed-light', '매입등',     0, 2)
  const catRoom  = await upsertCat('room-light',     '세대등',     0, 3)
  const catOut   = await upsertCat('outlet',         '빌트인 콘센트', 0, 4)
  const catElec  = await upsertCat('electric',       '전기자재',   0, 5)
  const catIot   = await upsertCat('iot',            'IoT 조명',   0, 6)

  // 실링팬 하위
  await upsertCat('fan-luce',    '루씨에어',   1, 0, catFan.id)
  await upsertCat('fan-fnco',    '팬앤코',     1, 1, catFan.id)
  await upsertCat('fan-airoway', '에어로웨이', 1, 2, catFan.id)
  await upsertCat('fan-airblow', '에어블로우', 1, 3, catFan.id)
  await upsertCat('fan-rosler',  '로슬러',     1, 4, catFan.id)
  await upsertCat('fan-airlux',  '에어룩스',   1, 5, catFan.id)
  await upsertCat('fan-etc',     '기타',       1, 6, catFan.id)

  // 스위치 하위
  const catLg   = await upsertCat('switch-legrand', '르그랑 스위치', 1, 0, catSw.id)
  const catParts= await upsertCat('switch-parts',   '파츠 스위치',   1, 1, catSw.id)
  const catJung = await upsertCat('switch-jung',    '융 스위치',     1, 2, catSw.id)
  const catIotSw= await upsertCat('switch-iot',     'IoT 스위치',    1, 3, catSw.id)
  await upsertCat('switch-lg-apella', '아펠라',   2, 0, catLg.id)
  await upsertCat('switch-lg-arteor','아테오',    2, 1, catLg.id)
  await upsertCat('switch-iot-aqara', '아카라',   2, 0, catIotSw.id)

  // 매입등 하위
  await upsertCat('recessed-4inch', '4인치', 1, 0, catRec.id)
  await upsertCat('recessed-6inch', '6인치', 1, 1, catRec.id)

  // 세대등 하위
  await upsertCat('room-living',  '거실등',  1, 0, catRoom.id)
  await upsertCat('room-kitchen', '주방등',  1, 1, catRoom.id)
  await upsertCat('room-indirect','간접조명', 1, 2, catRoom.id)

  console.log('✓ 카테고리 완료')

  // ── 5. 상품 데이터 (카테고리별) ──────────────────────────
  // 카테고리 id 가져오기 헬퍼
  async function getCat(slug: string) {
    const c = await prisma.category.findUnique({ where: { slug } })
    if (!c) throw new Error(`카테고리 없음: ${slug}`)
    return c
  }

  // 상품 생성 헬퍼 (상품 + 이미지 + 4종 단가)
  async function createProduct(data: {
    categorySlug: string
    name: string
    sku: string
    description: string
    basePrice: number
    stockQty: number
    brand: string
    isFeatured?: boolean
    imageUrl?: string
  }) {
    const cat    = await getCat(data.categorySlug)
    const prices = calcPrices(data.basePrice, RATES as any)

    const existing = await prisma.product.findUnique({ where: { sku: data.sku } })
    if (existing) return existing

    const product = await prisma.product.create({
      data: {
        categoryId:  cat.id,
        name:        data.name,
        sku:         data.sku,
        description: data.description,
        basePrice:   data.basePrice,
        stockQty:    data.stockQty,
        brand:       data.brand,
        isFeatured:  data.isFeatured ?? false,
        isActive:    true,
        ...(data.imageUrl && {
          images: {
            create: {
              url:       data.imageUrl,
              altText:   data.name,
              sortOrder: 0,
              isPrimary: true,
            }
          }
        })
      }
    })

    // 4종 단가 생성
    for (const [tier, price] of Object.entries(prices)) {
      await prisma.productPrice.create({
        data: {
          productId:    product.id,
          tierCode:     tier as PriceTierCode,
          price,
          discountRate: RATES[tier as PriceTierCode],
          effectiveTo:  null,
          createdById:  admin.id,
        }
      })
    }
    return product
  }

  // 스위치 상품
  await createProduct({ categorySlug:'switch-lg-apella', name:'르그랑 아펠라 2구 화이트', sku:'SW-LG-AP-2W', description:'르그랑 아펠라 시리즈 2구 스위치 (화이트). 세련된 디자인과 높은 내구성. 250V/16A', basePrice:54000, stockQty:23, brand:'LEGRAND', isFeatured:true })
  await createProduct({ categorySlug:'switch-lg-apella', name:'르그랑 아펠라 3구 화이트', sku:'SW-LG-AP-3W', description:'르그랑 아펠라 시리즈 3구 스위치 (화이트). 거실·복도 조명 3회로 제어', basePrice:68000, stockQty:15, brand:'LEGRAND' })
  await createProduct({ categorySlug:'switch-parts',     name:'파츠 스위치 1구 화이트', sku:'SW-PARTS-1W', description:'파츠 기본형 1구 스위치. 현장 인테리어 표준형', basePrice:18000, stockQty:80, brand:'PARTS' })
  await createProduct({ categorySlug:'switch-parts',     name:'파츠 스위치 2구 화이트', sku:'SW-PARTS-2W', description:'파츠 기본형 2구 스위치. 무광 마감', basePrice:24000, stockQty:60, brand:'PARTS' })
  await createProduct({ categorySlug:'switch-jung',      name:'융 LS 1구 실버', sku:'SW-JG-1S', description:'독일 융(JUNG) LS 990 시리즈 1구. 메탈 마감, 장기 내구성', basePrice:89000, stockQty:30, brand:'JUNG' })
  await createProduct({ categorySlug:'switch-jung',      name:'융 LS 2구 알파인 화이트', sku:'SW-JG-2AW', description:'독일 융 LS 990 2구. 알파인 화이트 컬러', basePrice:112000, stockQty:12, brand:'JUNG' })
  await createProduct({ categorySlug:'switch-iot-aqara', name:'아카라 스마트 스위치 2구', sku:'SW-AQ-2', description:'Zigbee 기반 아카라 스마트 스위치. Apple Home·Google Home·Alexa 호환', basePrice:65000, stockQty:15, brand:'AQARA' })

  // 매입등 상품
  await createProduct({ categorySlug:'recessed-6inch', name:'6인치 LED 매입등 15W 주광색', sku:'RC-6IN-15W-D', description:'6인치 LED 매입등 15W 주광색(6500K). 확산형 빔 각도 120°. IP44', basePrice:22000, stockQty:0, brand:'LF', isFeatured:true })
  await createProduct({ categorySlug:'recessed-6inch', name:'6인치 LED 매입등 15W 전구색', sku:'RC-6IN-15W-W', description:'6인치 LED 매입등 15W 전구색(3000K). 따뜻한 분위기 연출', basePrice:22000, stockQty:34, brand:'LF' })
  await createProduct({ categorySlug:'recessed-4inch', name:'4인치 LED 매입등 7W', sku:'RC-4IN-7W', description:'4인치 소형 LED 매입등 7W. 협소 공간·포인트 조명', basePrice:14000, stockQty:3, brand:'LF' })

  // 세대등 상품
  await createProduct({ categorySlug:'room-living',  name:'LED 거실등 60W 원형', sku:'RL-CL-60W', description:'거실등 60W 원형. 색온도 4000K(자연색). 직경 600mm. 천장 직부형', basePrice:78000, stockQty:12, brand:'LF', isFeatured:true })
  await createProduct({ categorySlug:'room-indirect',name:'T5 간접등 1200mm', sku:'IL-T5-1200', description:'T5 간접등 1200mm. 붙박이장·천장 간접 조명용. 연결형 설치 가능', basePrice:42000, stockQty:5, brand:'LF' })

  // 전기자재 상품 (업체 전용 isBiz)
  await createProduct({ categorySlug:'electric', name:'전선관 CD 16mm 100m', sku:'EL-CD-16-100', description:'CD 전선관 16mm 100m 롤. 내충격성 우수. KS 인증', basePrice:28000, stockQty:200, brand:'KEC' })
  await createProduct({ categorySlug:'electric', name:'배선박스 4각 철제', sku:'EL-BOX-4', description:'4각 철제 배선박스. 콘크리트 매입형. 두께 1.2mm', basePrice:1800, stockQty:8, brand:'KEC' })

  // 빌트인 콘센트
  await createProduct({ categorySlug:'outlet', name:'빌트인 멀티 콘센트 3구', sku:'OT-MULTI-3', description:'빌트인 매립형 3구 콘센트. USB-A 2포트 포함. 안전 셔터 내장', basePrice:31000, stockQty:44, brand:'LF' })

  console.log('✓ 상품 완료')

  // ── 6. 배너 슬롯 초기값 ──────────────────────────────────
  const bannerSlots = ['main', 'mid1', 'mid2', 'bottom']
  for (const slot of bannerSlots) {
    await prisma.banner.upsert({
      where:  { slotKey: slot },
      update: {},
      create: { slotKey: slot, isActive: false }
    })
  }
  console.log('✓ 배너 슬롯 완료')

  console.log('\n✅ 시드 완료!')
  console.log('─────────────────────────────────────────')
  console.log('관리자:    admin@lightfactory.co.kr / Lightfactory2025!')
  console.log('소비자:    test@lightfactory.co.kr  / Test1234!')
  console.log('사업자T1:  biz-t1@test.com           / Biz12345!')
  console.log('사업자T2:  biz-t2@test.com           / Biz12345!')
  console.log('사업자T3:  biz-t3@test.com           / Biz12345!')
  console.log('─────────────────────────────────────────')
}

main()
  .catch(e => { console.error('시드 실패:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
