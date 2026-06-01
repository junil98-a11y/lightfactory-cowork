// ============================================================
//  토스페이먼츠 결제 확인 유틸리티
//  흐름: 프론트 결제완료 → paymentKey 서버 전송 → confirm API 호출 → 주문 확정
// ============================================================

const TOSS_SECRET = process.env.TOSS_SECRET_KEY!

/** 결제 confirm (서버에서 반드시 호출해야 실제 결제 확정) */
export async function confirmTossPayment(
  paymentKey: string,
  orderId:    string,
  amount:     number
) {
  const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${Buffer.from(TOSS_SECRET + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  })

  const data = await res.json()

  if (!res.ok) {
    // 토스 에러 코드 처리
    throw new Error(`[토스페이먼츠] ${data.code}: ${data.message}`)
  }
  return data  // { paymentKey, orderId, totalAmount, status, ... }
}

/** 결제 취소 */
export async function cancelTossPayment(paymentKey: string, reason: string) {
  const res = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${Buffer.from(TOSS_SECRET + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cancelReason: reason }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`[취소 실패] ${data.message}`)
  return data
}
