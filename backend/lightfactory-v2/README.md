# 라이트팩토리 (Light Factory) v2.0

조명·스위치 전문 B2C + B2B 쇼핑몰 — 프론트/백엔드 분리 구조

```
lightfactory-v2/
├── backend/     ← Next.js API 서버 (Vercel 배포)
│   ├── prisma/  ← DB 스키마 + 시드 데이터
│   └── src/app/api/  ← API 라우트
└── frontend/    ← 정적 HTML (Netlify 배포)
    ├── public/index.html  ← 쇼핑몰 전체
    └── src/api.js         ← API 클라이언트
```

## 배포 순서

### 1단계: Supabase DB 설정
1. supabase.com → New project 생성
2. Settings > Database > Connection string 복사
3. backend/.env 에 DATABASE_URL, DIRECT_URL 입력

### 2단계: 백엔드 (Vercel)
```bash
cd backend
npm install
npx prisma db push          # DB 테이블 생성
npm run db:seed             # 초기 데이터 삽입
# GitHub에 push → Vercel 연결 → 환경변수 입력
```

### 3단계: 프론트엔드 (Netlify)
1. frontend/src/config.js 에서 API_BASE를 Vercel URL로 변경
2. Netlify Drop에 frontend/ 폴더 업로드

## 로컬 개발

```bash
# 백엔드
cd backend && npm install && npm run dev   # http://localhost:4000

# 프론트엔드 (별도 터미널)
cd frontend && npx serve public -p 3000   # http://localhost:3000
```

## 테스트 계정 (시드 데이터)

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 관리자 | admin@lightfactory.co.kr | Lightfactory2025! |
| 소비자 | test@lightfactory.co.kr  | Test1234! |
| 사업자T1 | biz-t1@test.com | Biz12345! |
| 사업자T2 | biz-t2@test.com | Biz12345! |
| 사업자T3 | biz-t3@test.com | Biz12345! |

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /api/auth/login | 로그인 |
| POST | /api/auth/register | 회원가입 |
| GET  | /api/products | 상품 목록 |
| GET  | /api/categories | 카테고리 트리 |
| GET  | /api/cart | 장바구니 조회 |
| POST | /api/cart | 장바구니 추가 |
| POST | /api/checkout/prepare | 주문 생성 |
| POST | /api/checkout/confirm | 결제 확인 (토스) |
| GET  | /api/orders | 내 주문 목록 |
| GET  | /api/admin/orders | (관리자) 전체 주문 |
| PATCH| /api/admin/orders | (관리자) 상태/운송장 |
| GET  | /api/admin/products | (관리자) 상품 관리 |
| POST | /api/admin/products | (관리자) 상품 등록 |
| GET  | /api/admin/members | (관리자) 회원 목록 |
| PATCH| /api/admin/members | (관리자) 사업자 승인 |
| POST | /api/admin/kakao/promo | (관리자) 홍보 발송 |
| POST | /api/admin/ecount/send | (관리자) 이카운트 수동 일괄 전송 (`{all?}`) |
| POST | /api/upload | (관리자) 이미지 업로드 |

## 스케줄 (Vercel Cron)

| 경로 | 스케줄(UTC) | KST | 설명 |
|------|-------------|-----|------|
| /api/cron/sync-stock   | `0 */2 * * *` | 2시간마다 | 이카운트 재고 동기화 |
| /api/cron/ecount-send  | `0 5 * * *`   | **매일 14:00** | 그 시각까지 등록된 전송대기 주문을 이카운트 판매입력(매출전표)으로 자동 등록 |

- **인증**: Vercel Cron이 `Authorization: Bearer ${CRON_SECRET}` 헤더를 자동 첨부. 수동 호출 시에도 동일 헤더 필요.
- **시간대 주의**: Vercel Cron은 UTC 기준 → "오후 2시 KST"는 `0 5 * * *`(05:00 UTC). 코드의 `kstCutoffToday(14)`가 KST 14:00의 절대시각을 계산해 `orderedAt <= cutoff` 로 "2시까지 등록분"만 전송한다.
- **전체 재전송**(시각 무관): `GET /api/cron/ecount-send?all=1` 또는 관리자 `POST /api/admin/ecount/send {"all":true}`.
- **이카운트 키 미설정 시**: 실제 OAPI 호출 없이 시뮬레이션으로 전표번호(`EC-YYYYMMDD-XXXXX`)만 발번(프론트 데모와 동일). 운영 시 `.env`의 `ECOUNT_*` 채우면 실제 `Sale/SaveSale` 호출.
- 핵심 로직은 `src/lib/ecount.ts`의 `runEcountAutoSend()` — 크론과 관리자 수동 전송이 공통 사용.

> 프론트(`shop/index.html`)의 클라이언트측 오후 2시 스케줄러는 **단독 데모용**(관리자 화면 열림 시에만 동작). 백엔드 배포 후에는 이 크론이 무인(24/7) 자동 전송의 단일 소스가 된다.
