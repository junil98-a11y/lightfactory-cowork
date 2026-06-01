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
| POST | /api/upload | (관리자) 이미지 업로드 |
