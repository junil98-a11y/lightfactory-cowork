// ============================================================
//  src/lib/naver.ts
//  네이버 커머스 API 연동 라이브러리
//
//  네이버 스마트스토어 상품 등록/수정/삭제를 담당합니다.
//
//  인증 방식:
//    Client Credentials 방식 (서버-서버 통신)
//    1. Application ID + Secret → Access Token 발급
//    2. Access Token을 Authorization 헤더에 담아 API 호출
//    3. Token 만료(기본 1시간) 시 자동 재발급
//
//  사전 준비:
//    1. 스마트스토어 개설 (sell.smartstore.naver.com)
//    2. 네이버 커머스 API 센터에서 애플리케이션 등록
//       (apicenter.commerce.naver.com → 내 스토어 애플리케이션)
//    3. Application ID / Secret 발급
//    4. 서버 IP를 API 호출 허용 IP에 등록 (최대 3개)
//    5. .env에 NAVER_COMMERCE_CLIENT_ID, NAVER_COMMERCE_CLIENT_SECRET 설정
//
//  ⚠️ 주의: 인증 기한이 약 2주로 설정됩니다.
//    만료 전 커머스 API 센터에서 수동 인증 갱신 필요
//    만료 시 자동으로 휴면 처리됩니다.
// ============================================================

// ── 환경 변수 ─────────────────────────────────────────────────
const CLIENT_ID     = process.env.NAVER_COMMERCE_CLIENT_ID!
const CLIENT_SECRET = process.env.NAVER_COMMERCE_CLIENT_SECRET!
const STORE_ID      = process.env.NAVER_STORE_ID!  // 스마트스토어 채널 ID (숫자)

// 네이버 커머스 API 기본 URL
const API_BASE = 'https://api.commerce.naver.com/external'

// ── Access Token 캐시 (서버 메모리) ───────────────────────────
// Next.js 핫리로드 시에도 유지되도록 globalThis 사용
const g = globalThis as any
if (!g._naverToken) g._naverToken = { token: null, expiry: 0 }

// ── Access Token 발급 / 재사용 ────────────────────────────────
// 캐시된 토큰이 유효하면 재사용, 만료되면 새로 발급
async function getAccessToken(): Promise<string> {
  const cache = g._naverToken

  // 만료 5분 전에 미리 갱신 (여유 시간 확보)
  if (cache.token && Date.now() < cache.expiry - 5 * 60 * 1000) {
    return cache.token
  }

  // Client Credentials 방식으로 토큰 발급
  // timestamp + client_id를 SHA-256으로 서명한 client_secret_sign 필요
  const timestamp   = Date.now().toString()
  const password    = await makeClientSecretSign(CLIENT_ID, CLIENT_SECRET, timestamp)

  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     CLIENT_ID,
      timestamp,
      client_secret_sign: password,
      type:          'SELF',  // 내 스토어 (SELF) / 위탁 스토어 (SELLER)
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`[네이버] 토큰 발급 실패: ${JSON.stringify(err)}`)
  }

  const data = await res.json()
  // 토큰 캐시 저장 (expires_in: 초 단위)
  cache.token  = data.access_token
  cache.expiry = Date.now() + (data.expires_in - 60) * 1000
  return cache.token
}

// ── Client Secret 서명 생성 ────────────────────────────────────
// HMAC-SHA256(client_id + '_' + timestamp, client_secret) → Base64
async function makeClientSecretSign(
  clientId:     string,
  clientSecret: string,
  timestamp:    string,
): Promise<string> {
  const message = `${clientId}_${timestamp}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(clientSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Buffer.from(sig).toString('base64')
}

// ── 공통 API 호출 함수 ────────────────────────────────────────
async function naverFetch<T>(
  path:    string,
  method:  'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?:   object,
): Promise<T> {
  const token = await getAccessToken()

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body && { body: JSON.stringify(body) }),
  })

  const data = await res.json()

  if (!res.ok) {
    // 네이버 API 에러 형식: { title, status, traceId, ... }
    throw new Error(`[네이버 API ${res.status}] ${data.title || JSON.stringify(data)}`)
  }

  return data
}

// ============================================================
//  타입 정의
// ============================================================

// 네이버 상품 등록 입력값
export type NaverProductInput = {
  // 상품 기본 정보
  name:           string    // 상품명 (최대 100자)
  detailContent:  string    // 상품 상세 설명 (HTML 가능)
  salePrice:      number    // 판매가 (원)
  stockQuantity:  number    // 재고 수량

  // 카테고리 (네이버 카테고리 코드)
  // 예: 50003412 = 가구/인테리어 > 조명 > 스위치
  categoryId:     string

  // 이미지 (R2 공개 URL 사용)
  representativeImage: string  // 대표 이미지 URL
  optionalImages?:     string[] // 추가 이미지 (최대 9장)

  // 배송 정보
  deliveryFee?:   number    // 배송비 (기본: 3000, 무료: 0)
  deliveryFreeCondition?: number  // 무료 배송 조건 금액 (예: 50000)
}

// 네이버 상품 등록/수정 결과
export type NaverSyncResult = {
  ok:              boolean
  naverProductNo?: string   // 등록 성공 시 네이버 상품번호
  naverProductId?: string   // 내부 상품 ID (수정/삭제에 사용)
  errorMsg?:       string   // 실패 시 오류 메시지
}

// ============================================================
//  카테고리 매핑 테이블
//  라이트팩토리 카테고리 slug → 네이버 카테고리 코드
//
//  네이버 카테고리 코드 조회:
//    GET /v2/categories/roots         → 최상위 카테고리
//    GET /v2/categories/{id}/children → 하위 카테고리
//    또는 스마트스토어 관리자 > 상품관리 > 카테고리 조회
//
//  ⚠️ 카테고리 코드는 아래 API로 실제 코드를 확인 후 수정하세요:
//    getNaverCategories() 함수 호출 결과를 참고
// ============================================================
export const NAVER_CATEGORY_MAP: Record<string, string> = {
  // 실링팬
  'ceiling-fan':    '50005765',  // 가구/인테리어 > 조명 > 실링팬 (예시 코드)
  'fan-luce':       '50005765',
  'fan-fnco':       '50005765',
  'fan-airoway':    '50005765',
  'fan-airblow':    '50005765',
  'fan-rosler':     '50005765',
  'fan-airlux':     '50005765',
  'fan-etc':        '50005765',

  // 스위치
  'switch':           '50003412',  // 가구/인테리어 > 조명 > 스위치
  'switch-legrand':   '50003412',
  'switch-parts':     '50003412',
  'switch-jung':      '50003412',
  'switch-iot':       '50003412',
  'switch-lg-apella': '50003412',
  'switch-lg-arteor': '50003412',
  'switch-iot-aqara': '50003412',

  // 매입등
  'recessed-light':   '50003411',  // 가구/인테리어 > 조명 > 매입등
  'recessed-4inch':   '50003411',
  'recessed-6inch':   '50003411',

  // 세대등
  'room-light':       '50003409',  // 가구/인테리어 > 조명 > 실내등
  'room-living':      '50003409',
  'room-kitchen':     '50003409',
  'room-indirect':    '50003409',

  // 빌트인 콘센트
  'outlet':           '50003414',  // 가구/인테리어 > 조명 > 콘센트/스위치

  // 전기자재
  'electric':         '60000060',  // 문구/사무용품 > 공구 > 전기자재 (예시)

  // IoT 조명
  'iot':              '50003412',  // 스위치로 분류
}

// ============================================================
//  공개 함수들
// ============================================================

// ── 네이버 카테고리 목록 조회 ─────────────────────────────────
// 매핑 테이블 작성 시 참고용으로 사용
// 터미널에서: curl -H "Authorization: Bearer {token}" \
//   https://api.commerce.naver.com/external/v2/categories/roots
export async function getNaverCategories(parentId?: string) {
  const path = parentId
    ? `/v2/categories/${parentId}/children`
    : '/v2/categories/roots'
  return naverFetch<any[]>(path)
}

// ── 상품 등록 (스마트스토어에 새 상품 생성) ──────────────────
export async function registerNaverProduct(
  input: NaverProductInput,
): Promise<NaverSyncResult> {
  try {
    // 네이버 상품 등록 요청 바디 구성
    // 공식 문서: https://apicenter.commerce.naver.com/ko/basic/commerce-api
    const body = {
      originProduct: {
        statusType: 'SALE',           // SALE: 판매중 / OUTOFSTOCK: 품절
        saleType:   'NEW',            // NEW: 새상품 / USED: 중고
        leafCategoryId: input.categoryId,

        name: input.name,

        // 상품 이미지
        images: {
          representativeImage: { url: input.representativeImage },
          optionalImages: (input.optionalImages || []).map(url => ({ url })),
        },

        // 판매 정보
        salePrice:     input.salePrice,
        stockQuantity: input.stockQuantity,

        // 배송 정보
        deliveryInfo: {
          deliveryType:         'DELIVERY',  // 택배 배송
          deliveryAttributeType:'NORMAL',
          deliveryFee: {
            deliveryFeeType: input.deliveryFee === 0 ? 'FREE' : 'CHARGE',
            baseFee:          input.deliveryFee ?? 3000,
            // 조건부 무료 배송 설정
            ...(input.deliveryFreeCondition && {
              deliveryFeeByArea: null,
              freeConditionalAmount: input.deliveryFreeCondition,
            }),
          },
          // 반품 주소 (스마트스토어 기본 설정 사용)
          returnDeliveryFee: 3000,
          exchangeDeliveryFee: 3000,
        },

        // 상품 상세 설명 (HTML)
        detailContent: input.detailContent || input.name,

        // 제조사/브랜드 정보 (선택)
        productLogistics: [],
      },

      // 스마트스토어 채널 설정
      smartstoreChannelProduct: {
        channelProductDisplayStatusType: 'ON',  // 쇼핑몰에 즉시 진열
        storeProductNo: null,  // 자체 상품번호 (선택)
      },
    }

    const result = await naverFetch<any>(
      '/v2/products',
      'POST',
      body,
    )

    return {
      ok:              true,
      naverProductNo:  String(result.originProductNo),
      naverProductId:  String(result.id),
    }
  } catch (err: any) {
    return { ok: false, errorMsg: err.message }
  }
}

// ── 상품 수정 (기존 네이버 상품 업데이트) ─────────────────────
export async function updateNaverProduct(
  naverProductId: string,
  input:          Partial<NaverProductInput>,
): Promise<NaverSyncResult> {
  try {
    // 먼저 현재 상품 정보를 조회 (전체 업데이트 방식이므로 기존 값 유지)
    const current = await naverFetch<any>(`/v2/products/${naverProductId}`)

    // 변경된 필드만 덮어쓰기
    const body = {
      ...current,
      originProduct: {
        ...current.originProduct,
        ...(input.name         && { name: input.name }),
        ...(input.salePrice    && { salePrice: input.salePrice }),
        ...(input.stockQuantity !== undefined && { stockQuantity: input.stockQuantity }),
        ...(input.categoryId   && { leafCategoryId: input.categoryId }),
      },
    }

    await naverFetch(`/v2/products/${naverProductId}`, 'PUT', body)
    return { ok: true, naverProductId }
  } catch (err: any) {
    return { ok: false, errorMsg: err.message }
  }
}

// ── 재고 수량만 빠르게 업데이트 ──────────────────────────────
export async function updateNaverStock(
  naverProductId: string,
  stockQuantity:  number,
): Promise<NaverSyncResult> {
  try {
    await naverFetch(
      `/v2/products/${naverProductId}/channel-products/stocks`,
      'PUT',
      { stockQuantity },
    )
    return { ok: true, naverProductId }
  } catch (err: any) {
    return { ok: false, errorMsg: err.message }
  }
}

// ── 판매 상태 변경 (판매중/품절/판매중지) ─────────────────────
export async function setNaverProductStatus(
  naverProductId: string,
  status:         'SALE' | 'OUTOFSTOCK' | 'SUSPENSION',
): Promise<NaverSyncResult> {
  try {
    await naverFetch(
      `/v2/products/${naverProductId}/channel-products/status`,
      'PUT',
      { statusType: status },
    )
    return { ok: true, naverProductId }
  } catch (err: any) {
    return { ok: false, errorMsg: err.message }
  }
}

// ── 상품 삭제 (스마트스토어에서 제거) ────────────────────────
export async function deleteNaverProduct(
  naverProductId: string,
): Promise<NaverSyncResult> {
  try {
    await naverFetch(`/v2/products/${naverProductId}`, 'DELETE')
    return { ok: true, naverProductId }
  } catch (err: any) {
    return { ok: false, errorMsg: err.message }
  }
}

// ── API 연동 상태 확인 (설정 테스트용) ───────────────────────
export async function testNaverConnection(): Promise<{
  ok:        boolean
  storeId?:  string
  storeName?: string
  errorMsg?: string
}> {
  try {
    const token = await getAccessToken()
    if (!token) throw new Error('토큰 발급 실패')

    // 스토어 정보 조회로 연결 확인
    const info = await naverFetch<any>('/v1/seller/channels')
    return {
      ok:        true,
      storeId:   info?.[0]?.channelNo,
      storeName: info?.[0]?.channelName,
    }
  } catch (err: any) {
    return { ok: false, errorMsg: err.message }
  }
}
