# 이카운트 오후 2시 자동 전송 — 백엔드(서버) 이관 (2026-06-11)

대상: `backend/lightfactory-v2/backend/` (Next.js + Prisma + Vercel Cron)

## 요청
프론트(클라이언트) 오후 2시 자동 전송을 **백엔드 서버로 이관** → 브라우저가 닫혀 있어도 무인 실행.

## 배경
- 프론트(`shop/index.html`)의 스케줄러는 관리자 화면 열림 시에만 동작(정적 앱 한계).
- 백엔드에 이미 **Vercel Cron 인프라**(`CRON_SECRET`)와 Order 모델(`ecountStatus` pending/sent/failed, `ecountOrderNo`, `orderedAt`)이 준비돼 있어 깔끔히 이관 가능.

## 변경 파일
| 파일 | 내용 |
|------|------|
| `src/lib/ecount.ts` (신규) | 이카운트 OAPI 클라이언트 — `login()`(세션 캐시), `registerSale()`(Sale/SaveSale, 키 미설정 시 시뮬레이션), `kstCutoffToday()`(KST↔UTC), **`runEcountAutoSend()`**(일괄 전송 공통 로직) |
| `src/app/api/cron/ecount-send/route.ts` (신규) | 크론 GET 핸들러 — `CRON_SECRET` 인증, `?all=1` 전체 재전송 |
| `src/app/api/admin/ecount/send/route.ts` (신규) | 관리자 수동 전송 POST(`withAuth(['admin'])`, `{all?}`) |
| `vercel.json` | 크론 추가 `{ "/api/cron/ecount-send", "0 5 * * *" }` |
| `.env.example` | `ECOUNT_*` 환경변수 + CRON_SECRET 용도 |
| `README.md` | 스케줄/엔드포인트 문서 |

## 동작
- **매일 14:00 KST**(=05:00 UTC, cron `0 5 * * *`) → `runEcountAutoSend()`:
  - `ecountStatus='pending'` & `status NOT IN (cancelled, refunded)` & `orderedAt <= 오늘14:00(KST)` 주문 조회
  - 각 주문 → `registerSale()`(이카운트 판매입력) → 성공 시 `ecountStatus='sent'` + `ecountOrderNo=전표번호`, 실패 시 `'failed'`
  - 결과 요약(sent/failed/details) 반환
- **수동 전체 전송**: `GET /api/cron/ecount-send?all=1` 또는 `POST /api/admin/ecount/send {"all":true}`.
- **키 미설정**: 실제 호출 없이 전표번호 시뮬 발번(프론트 데모와 동일). `.env`의 `ECOUNT_*` 설정 시 실제 OAPI 호출.

## 검증
- **tsc 0 에러** (기존 생성 Prisma 클라이언트 타입 기준 전체 컴파일).
- **KST↔UTC 시각 변환 독립 검증**: `kstCutoffToday(14)` → KST 14:00 / UTC 05:00(cron과 일치) ✅
- **전표번호 형식** `EC-YYYYMMDD-XXXXX` ✅
- vercel.json 유효 JSON + 크론 path↔라우트 파일 경로 일치 + export(GET/POST) 확인 ✅
- (DB/네트워크 필요한 `runEcountAutoSend` 실행 검증은 Vercel+Supabase 배포 환경에서 수행)

## 배포 시 할 일 (사용자)
1. `backend/` Vercel 연결 + Supabase `DATABASE_URL`/`DIRECT_URL` 설정, `npx prisma db push`.
2. 환경변수: `CRON_SECRET`, `ECOUNT_COM_CODE/USER_ID/API_CERT_KEY/ZONE/API_MODE/CUST_CODE`.
3. Vercel이 `vercel.json`의 크론을 자동 등록 → 매일 14:00 KST 실행.
4. (선택) 프론트 관리자 「지금 일괄 전송」 버튼을 `POST /api/admin/ecount/send` 로 연결.

> ⚠️ `Sale/SaveSale`의 `PROD_CD`(품목코드=SKU 가정)·`CUST`(거래처)·`WH_CD`(창고)는 이카운트 마스터 코드와 일치해야 함. 상이하면 매핑 보정 필요.
