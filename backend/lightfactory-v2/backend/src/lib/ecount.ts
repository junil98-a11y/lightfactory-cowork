// ============================================================
//  src/lib/ecount.ts
//  이카운트 ERP OAPI 연동 — 판매(매출) 자동 등록
//
//  흐름:
//    1) Zone 확인(또는 .env ECOUNT_ZONE) → 로그인(OAPILogin) → SESSION_ID 발급
//    2) SESSION_ID 로 Sale/SaveSale 호출 → 판매전표(매출) 등록
//    3) 응답의 전표번호(SlipNo)를 주문에 저장
//
//  매일 오후 2시 크론(/api/cron/ecount-send)과 관리자 수동 전송
//  (/api/admin/ecount/send)이 공통으로 runEcountAutoSend()를 호출한다.
//
//  사전 준비(.env):
//    ECOUNT_COM_CODE      회사 코드
//    ECOUNT_USER_ID       OAPI 사용자 ID
//    ECOUNT_API_CERT_KEY  API 인증키 (이카운트 > 셀프서비스 > API 인증)
//    ECOUNT_ZONE          접속 ZONE (예: CA, CB ... — 로그인 응답/이카운트에서 확인)
//    ECOUNT_API_MODE      'test'(기본, 평가판 sboapi) | 'live'(운영 oapi)
//    ECOUNT_CUST_CODE     매출 거래처 코드(기본 거래처) — 이카운트 거래처 마스터와 일치 필요
//    ECOUNT_WH_CODE       출고 창고 코드 (선택)
//
//  ⚠️ 키 미설정 시: 실제 호출 없이 시뮬레이션으로 전표번호를 발번한다
//     (프론트 데모와 동일 동작). 운영 전 위 환경변수를 채우세요.
// ============================================================
import { prisma } from './prisma'

const COM_CODE     = process.env.ECOUNT_COM_CODE     || ''
const USER_ID      = process.env.ECOUNT_USER_ID      || ''
const API_CERT_KEY = process.env.ECOUNT_API_CERT_KEY || ''
const ZONE         = process.env.ECOUNT_ZONE         || ''
const IS_LIVE      = (process.env.ECOUNT_API_MODE || 'test') === 'live'
const CUST_CODE    = process.env.ECOUNT_CUST_CODE    || ''
const WH_CODE      = process.env.ECOUNT_WH_CODE      || ''

// 운영(oapi) / 평가판(sboapi) 호스트 — ZONE 별 서브도메인
function host(): string {
  const sub = IS_LIVE ? 'oapi' : 'sboapi'
  return `https://${sub}${ZONE}.ecount.com`
}

// 실 연동 설정 여부 (미설정이면 시뮬레이션)
function configured(): boolean {
  return !!(COM_CODE && USER_ID && API_CERT_KEY && ZONE)
}

// ── 세션 캐시 (서버 메모리, 핫리로드 대비 globalThis) ─────────
const g = globalThis as any
if (!g._ecountSession) g._ecountSession = { id: null as string | null, expiry: 0 }

// 로그인 → SESSION_ID (약 1시간 유효 → 50분 캐시)
async function login(): Promise<string> {
  const cache = g._ecountSession
  if (cache.id && Date.now() < cache.expiry) return cache.id

  const res = await fetch(`${host()}/OAPI/V2/OAPILogin`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ COM_CODE, USER_ID, API_CERT_KEY, LAN_TYPE: 'ko-KR', ZONE }),
  })
  const data = await res.json()
  const sid = data?.Data?.Datas?.SESSION_ID
  if (!sid) throw new Error('[이카운트] 로그인 실패: ' + JSON.stringify(data?.Errors || data?.Error || data))

  cache.id     = sid
  cache.expiry = Date.now() + 50 * 60 * 1000
  return sid
}

// ── 날짜 → YYYYMMDD (KST 기준) ───────────────────────────────
function ymdKST(d: Date): string {
  const k = new Date(d.getTime() + 9 * 3600 * 1000)
  return k.toISOString().slice(0, 10).replace(/-/g, '')
}

// 시뮬레이션 전표번호 (키 미설정 시)
let _simSeq = 0
function simVoucher(d: Date): string {
  _simSeq = (_simSeq + 1) % 100000
  const seq = String((Date.now() + _simSeq) % 100000).padStart(5, '0')
  return 'EC-' + ymdKST(d) + '-' + seq
}

export type EcountSaleResult = { ok: boolean; voucherNo?: string; error?: string }

// 주문에 들어오는 최소 형태 (Prisma Order + items)
type OrderForEcount = {
  orderNumber: string
  orderedAt:   Date
  totalAmount: any
  finalAmount: any
  items: Array<{ productSku: string; productName: string; quantity: number; unitPrice: any; subtotal: any }>
}

// ── 단일 주문 → 이카운트 판매입력(SaveSale) ──────────────────
export async function registerSale(order: OrderForEcount): Promise<EcountSaleResult> {
  // 키 미설정 → 시뮬레이션 발번 (실제 호출 없음)
  if (!configured()) {
    return { ok: true, voucherNo: simVoucher(order.orderedAt) }
  }

  try {
    const sid = await login()
    const ioDate = ymdKST(order.orderedAt)

    // 이카운트 SaveSale 본문 — 품목별 1 라인.
    //  ⚠️ PROD_CD(품목코드)·CUST(거래처)·WH_CD(창고)는 이카운트 마스터 코드와
    //     정확히 일치해야 함. SKU=품목코드 가정(상이하면 매핑 테이블 필요).
    const supplyOf = (sub: number) => Math.round(sub - sub / 11) // 공급가(부가세 별도 환산)
    const vatOf    = (sub: number) => Math.round(sub / 11)

    const body = {
      SaleList: order.items.map((it, i) => {
        const sub = Number(it.subtotal)
        return {
          Line: String(i + 1),
          BulkDatas: {
            IO_DATE:    ioDate,                 // 거래일자
            CUST:       CUST_CODE,              // 거래처 코드
            ...(WH_CODE && { WH_CD: WH_CODE }), // 출고 창고
            PROD_CD:    it.productSku,          // 품목 코드(SKU)
            QTY:        it.quantity,
            PRICE:      Number(it.unitPrice),
            SUPPLY_AMT: supplyOf(sub),
            VAT_AMT:    vatOf(sub),
            REMARKS:    order.orderNumber,      // 적요(주문번호 추적)
            U_MEMO1:    order.orderNumber,
          },
        }
      }),
    }

    const res = await fetch(`${host()}/OAPI/V2/Sale/SaveSale?SESSION_ID=${sid}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()

    // 응답 파싱 — 전표번호(SlipNo) 추출 (응답 스키마 방어적 처리)
    const detail   = data?.Data?.ResultDetails?.[0] || data?.Data?.Datas?.[0]
    const slipNo   = detail?.SlipNos?.[0] || detail?.SLIP_NO || data?.Data?.SlipNos?.[0]
    const failCnt  = Number(data?.Data?.FailCnt ?? (detail?.IsSuccess === false ? 1 : 0))
    const isOk     = (data?.Status === '200' || res.ok) && failCnt === 0

    if (!isOk) {
      return { ok: false, error: JSON.stringify(detail?.TotalError || data?.Errors || data) }
    }
    return { ok: true, voucherNo: slipNo || order.orderNumber }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

// ── 오늘(KST) hour시 0분의 UTC 시각 — 크론 cutoff 계산 ────────
// Vercel 크론은 UTC로 동작 → "오후 2시 KST" = 05:00 UTC.
// 이 함수는 그 시각의 절대 시점(Date)을 반환해 orderedAt 비교에 사용한다.
export function kstCutoffToday(hour: number): Date {
  const nowKst = new Date(Date.now() + 9 * 3600 * 1000)
  const y = nowKst.getUTCFullYear(), m = nowKst.getUTCMonth(), d = nowKst.getUTCDate()
  return new Date(Date.UTC(y, m, d, hour, 0, 0) - 9 * 3600 * 1000)
}

export type EcountBatchResult = {
  ok: boolean
  sent: number
  failed: number
  cutoff: string | null
  details: Array<{ orderNumber: string; ok: boolean; voucherNo?: string; error?: string }>
}

// ── 일괄 전송 — 크론/관리자 수동 공통 ────────────────────────
//  opts.all=true  → 전송대기 전체(시각 무관)
//  opts.all!=true → '오후 2시(KST)까지 등록된' 전송대기 주문만 (orderedAt <= cutoff)
export async function runEcountAutoSend(opts?: { all?: boolean; cutoff?: Date }): Promise<EcountBatchResult> {
  const cutoff = opts?.all ? null : (opts?.cutoff ?? kstCutoffToday(14))

  const orders = await prisma.order.findMany({
    where: {
      ecountStatus: 'pending',
      status: { notIn: ['cancelled', 'refunded'] },
      ...(cutoff && { orderedAt: { lte: cutoff } }),
    },
    include: { items: true },
    orderBy: { orderedAt: 'asc' },
  })

  let sent = 0, failed = 0
  const details: EcountBatchResult['details'] = []

  for (const o of orders) {
    const r = await registerSale(o as any)
    if (r.ok) {
      await prisma.order.update({
        where: { id: o.id },
        data:  { ecountStatus: 'sent', ecountOrderNo: r.voucherNo },
      })
      sent++
    } else {
      await prisma.order.update({ where: { id: o.id }, data: { ecountStatus: 'failed' } })
      failed++
    }
    details.push({ orderNumber: o.orderNumber, ok: r.ok, voucherNo: r.voucherNo, error: r.error })
  }

  console.log(`[이카운트] 일괄 전송 — 성공 ${sent} · 실패 ${failed} · cutoff ${cutoff?.toISOString() || '전체'} · ${configured() ? '실 API' : '시뮬레이션'}`)
  return { ok: true, sent, failed, cutoff: cutoff ? cutoff.toISOString() : null, details }
}
