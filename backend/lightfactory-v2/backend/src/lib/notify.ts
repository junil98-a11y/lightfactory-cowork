// ============================================================
//  알림 발송 — 카카오 알림톡(알리고) + 이메일(Resend)
//  모든 발송 결과는 notification_logs 테이블에 저장됩니다.
// ============================================================
import { prisma } from './prisma'

// ── 카카오 알림톡 (알리고 API) ─────────────────────────────
async function sendKakao(to: string, templateCode: string, vars: Record<string, string>) {
  try {
    const msg = buildMsg(templateCode, vars)
    const body = new URLSearchParams({
      apikey:    process.env.KAKAO_API_KEY!,
      userid:    process.env.KAKAO_USER_ID!,
      senderkey: process.env.KAKAO_SENDER_KEY!,
      tpl_code:  templateCode,
      sender:    process.env.KAKAO_SENDER_PHONE!,
      receiver_1:to,
      message_1: msg,
      subject_1: templateCode,
      failover:  'Y',   // 알림톡 실패 시 SMS 대체 발송
    })
    const res  = await fetch('https://kakaoapi.aligo.in/akv10/alimtalk/send/', { method:'POST', body })
    const data = await res.json()
    const ok   = data.result_code === '1'

    // 발송 이력 저장
    await prisma.notificationLog.create({
      data: { type:'kakao', recipient:to, template:templateCode, status: ok?'sent':'failed', errorMsg: ok?null:data.message }
    })
    return { ok }
  } catch(e: any) {
    await prisma.notificationLog.create({
      data: { type:'kakao', recipient:to, template:templateCode, status:'failed', errorMsg:e.message }
    })
    return { ok: false }
  }
}

// ── 이메일 (Resend) ─────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  try {
    const res  = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html }),
    })
    const ok = res.ok
    await prisma.notificationLog.create({
      data: { type:'email', recipient:to, template:subject, status: ok?'sent':'failed' }
    })
    return { ok }
  } catch(e: any) {
    await prisma.notificationLog.create({
      data: { type:'email', recipient:to, template:subject, status:'failed', errorMsg:e.message }
    })
    return { ok: false }
  }
}

// ── 알림톡 템플릿 메시지 빌더 ──────────────────────────────
function buildMsg(code: string, v: Record<string,string>) {
  const tpl: Record<string,string> = {
    ORDER_COMPLETE:
      `안녕하세요, 라이트팩토리입니다.\n주문이 완료됐습니다.\n\n주문번호: ${v.orderNumber}\n상품: ${v.orderName}\n결제금액: ${v.amount}원\n\n배송 시작 시 알려드리겠습니다.`,
    SHIPPING_START:
      `[라이트팩토리] 주문하신 상품이 출고됐습니다.\n\n주문번호: ${v.orderNumber}\n택배사: ${v.courier}\n운송장: ${v.trackingNo}`,
    BIZ_APPROVED:
      `안녕하세요, ${v.companyName}님.\n사업자 회원 승인이 완료됐습니다.\n\n배정 단가: ${v.tier} (${v.discount}% 할인)\n\nlightfactory.co.kr 에서 사업자 단가로 주문하실 수 있습니다.`,
    BIZ_REJECTED:
      `안녕하세요, ${v.companyName}님.\n사업자 회원 신청이 반려됐습니다.\n\n사유: ${v.reason}\n\n추가 문의는 고객센터로 연락해 주세요.`,
    PROMO:
      `[라이트팩토리 신상품 안내]\n\n${v.productName}\n\n소비자가: ${v.basePrice}원\n내 단가: ${v.tierPrice}원\n\n${v.customMsg || ''}`,
  }
  return tpl[code] ?? JSON.stringify(v)
}

// ── 공개 발송 함수들 ────────────────────────────────────────

/** 주문 완료 알림 (알림톡 + 이메일 동시) */
export async function notifyOrderComplete(p: {
  phone: string; email: string; name: string
  orderNumber: string; orderName: string; amount: number
}) {
  const amt = p.amount.toLocaleString()
  await Promise.allSettled([
    sendKakao(p.phone, 'ORDER_COMPLETE', { orderNumber: p.orderNumber, orderName: p.orderName, amount: amt }),
    sendEmail(p.email, `[라이트팩토리] 주문 완료 — ${p.orderNumber}`,
      `<p>${p.name}님, 주문이 완료됐습니다.</p><p>주문번호: <strong>${p.orderNumber}</strong></p><p>결제금액: ${amt}원</p>`
    ),
  ])
}

/** 배송 시작 알림 */
export async function notifyShipping(p: {
  phone: string; email: string; name: string
  orderNumber: string; courier: string; trackingNo: string
}) {
  await Promise.allSettled([
    sendKakao(p.phone, 'SHIPPING_START', { orderNumber: p.orderNumber, courier: p.courier, trackingNo: p.trackingNo }),
    sendEmail(p.email, `[라이트팩토리] 배송 시작 — ${p.orderNumber}`,
      `<p>${p.name}님, 상품이 출고됐습니다.</p><p>${p.courier} ${p.trackingNo}</p>`
    ),
  ])
}

/** 사업자 승인 알림 */
export async function notifyBizApproved(p: {
  phone: string; email: string; companyName: string; tier: string; discount: number
}) {
  await Promise.allSettled([
    sendKakao(p.phone, 'BIZ_APPROVED', { companyName: p.companyName, tier: p.tier, discount: String(p.discount) }),
    sendEmail(p.email, '[라이트팩토리] 사업자 승인 완료',
      `<p>${p.companyName}님, 사업자 승인이 완료됐습니다. 단가: ${p.tier} (${p.discount}% 할인)</p>`
    ),
  ])
}

/** 카카오 홍보 발송 (관리자 → 사업자 단체 발송) */
export async function sendPromoKakao(phones: string[], productData: {
  productName: string; basePrice: number; tierPrice: number; customMsg?: string
}) {
  const results = await Promise.allSettled(
    phones.map(phone =>
      sendKakao(phone, 'PROMO', {
        productName: productData.productName,
        basePrice:   productData.basePrice.toLocaleString(),
        tierPrice:   productData.tierPrice.toLocaleString(),
        customMsg:   productData.customMsg || '',
      })
    )
  )
  const success = results.filter(r => r.status === 'fulfilled' && (r.value as any).ok).length
  return { total: phones.length, success, failed: phones.length - success }
}
