# 백엔드 이관 가이드 (2026-06-01)

대상: `backend/lightfactory-v2/backend` (Next.js App Router + Prisma + PostgreSQL)

`backend/lightfactory-v2-naver.tar.gz`를 `backend/lightfactory-v2/`로 압축 해제했습니다. 프론트(`shop/index.html`)에서 localStorage로 구현한 기능을 서버로 옮기기 위한 매핑과, 이번에 적용한 백엔드 변경을 정리합니다.

---

## 1. 이번에 적용한 백엔드 변경

### 1-1. 결제 confirm 서버 측 금액 검증 — **이미 구현되어 있음**
`src/app/api/checkout/route.ts`의 `/confirm` 분기에 서버 저장 금액과 클라이언트 전달 금액 대조가 이미 존재합니다.

```ts
// 금액 위변조 방지: 서버 저장 금액과 비교
if (Number(order.finalAmount) !== amount)
  return NextResponse.json({ error:'금액 불일치' }, { status: 400 })
await confirmTossPayment(paymentKey, orderId, amount)
```

→ 로드맵 Mid "결제 confirm 서버 검증"은 백엔드 기준 **충족**. 프론트 단독(데모)에서는 서버가 없어 클라이언트 `final`을 그대로 토스로 전달하므로, **실제 운영은 반드시 이 백엔드 `/api/checkout/confirm`을 경유**해야 합니다.

### 1-2. 거래처별 단가 → 결제 prepare 반영 (신규)
`/prepare`에서 단가 우선순위를 **거래처별 `CustomerPrice` > 등급 `ProductPrice` > `basePrice`**로 변경. 프론트의 `effRate()` 우선순위와 동일하게 맞췄습니다.

### 1-3. Prisma 스키마 확장 (신규)
`prisma/schema.prisma`에 4개 기능 모델 추가:

| 모델 | 프론트 대응 | 비고 |
|---|---|---|
| `ShippingAddress` | `user.addresses[]` | 현장별 다중 배송지 |
| `Favorite` | `user.favorites[]` | 즐겨찾기 SKU (user+product unique) |
| `CustomerPrice` | `bizInfo.customRates` / `lf_custom_rates` | 거래처별 할인율 |
| `Rma` + `RmaItem` | `RMAS[]` | 취소·반품·교환 + 품목 |

enum `RmaType{cancel return exchange}`, `RmaStatus{requested approved done rejected}` 추가. `User`/`Product`/`Order`에 역참조 연결.

---

## 2. 이관 절차

```bash
cd backend/lightfactory-v2/backend
npm install
cp .env.example .env          # DATABASE_URL / DIRECT_URL / JWT / TOSS_SECRET_KEY 입력
npx prisma migrate dev -n b2b_features_2026_06_01   # 신규 모델 마이그레이션
npx prisma db seed
npm run dev
```

프론트(`shop/index.html`)의 `api.js`/`config.js` 베이스 URL을 백엔드 주소로 지정하면 localStorage 대신 서버 API를 사용하도록 전환할 수 있습니다.

---

## 3. 남은 백엔드 작업 (신규 기능 엔드포인트)
스키마는 준비됐고, 라우트는 아래만 추가하면 됩니다(패턴은 기존 `withAuth` 라우트 동일).

- `GET/POST/PATCH/DELETE /api/addresses` — 주소록 CRUD
- `GET/POST/DELETE /api/favorites` — 즐겨찾기
- `GET/POST/PATCH /api/admin/customer-prices` — 거래처 단가 매트릭스
- `POST /api/rma`, `GET/PATCH /api/admin/rma` — RMA 접수/처리(승인 시 `stockQty` 복원 트랜잭션)
- 발주서 CSV는 프론트 파싱 후 `/api/cart` 벌크 추가로 처리(서버 SKU 검증 권장)

---

## 4. 단일 HTML 청크 분리 — 의도적 보류
로드맵 Mid "단일 HTML → admin/shop 청크 분리"는 이번 범위에서 **보류**했습니다.

- **사유**: 현재 검증 방식이 "`shop/index.html`을 브라우저로 직접 열기"이며, 번들 분리(Vite/ESBuild)는 빌드 산출물·정적 서버를 전제로 해 이 즉시 확인 흐름을 깨뜨립니다. 또한 위 기능 구현과 직접 충돌(동일 파일 대규모 재배치)하여 회귀 위험이 큽니다.
- **권장 시점**: 백엔드 이관과 함께 진행. 그 시점엔 어차피 정적 호스팅/빌드 파이프라인이 생기므로 분리 비용이 자연스럽게 회수됩니다.
