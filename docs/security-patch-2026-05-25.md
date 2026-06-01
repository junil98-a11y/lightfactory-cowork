# 라이트팩토리 P0 보안·로직 패치 리포트

**적용일**: 2026-05-25
**대상**: `shop/index.html`, `README.md`
**백업**: `shop/index.html.backup-2026-05-25`
**라인 수 변화**: 8,254 → 8,178 (-76줄, 통합 정리)

---

## 1. 개발팀장 지적 — 보안 (P0 Critical)

### 1-1. DEV_MODE 인증 우회 차단
- `DEV_MODE = true` → `false` 영구 비활성화
- 추가 안전장치: `localhost/127.0.0.1` 외 호스트에서는 DEV 우회 자체 차단 (`_DEV_BYPASS_OK` 가드)
- DEV 패널의 `setRole()` 호출도 운영환경에서 권한상승(admin/T1~T3) 차단 — 호출 스택 검증

### 1-2. 관리자 비밀번호 평문 제거
- `ADMIN_CREDENTIALS`: `pw: '12345678'` → `pwHash` + `salt` 구조
- `doAdminLogin`: 입력 PW를 동일 salt로 해시 후 정시간(timing-safe) 비교
- 사용자 열거 방지: 존재하지 않는 ID에도 동일 350ms 지연
- 운영자용 함수 `changeAdminPassword(newPw)` 추가 → localStorage `lf_admin_creds`에 새 해시 저장

### 1-3. 회원 비밀번호 SHA-256(pw + salt) 해시
- `USERS` 테스트 계정: `pw` 필드 제거, `pwHash` + `salt: 'lf_user_salt_v1'` 사용
- `registerUser`: async로 변환, 회원가입 시 즉시 per-user random salt 생성 + 해시
- `loginUser`: async로 변환, 입력 PW를 해당 user의 salt로 해시 후 pwHash 비교
- `migrateLegacyPasswords()`: 앱 시작 시 localStorage에 평문 `pw`만 있는 사용자를 자동 해시 마이그레이션
- 호출자(`submitJoin`, `submitLogin`, `_origSubmitLogin` wrapper) 모두 async로 정합성 맞춤
- 임시 비밀번호 발급도 해시로 저장 (`user.pw = tempPw` 제거)

### 1-4. XSS escapeHTML 도입
- 보안 유틸 `escapeHTML(str)` 추가 (`&<>"'` 변환)
- 가장 위험한 5개 영역(사용자 입력 → 관리자 화면)에 적용:
  - **주문관리 테이블**: `o.userName`, `o.userEmail`, `itemLabel`, `item.name`, `item.sku`, `item.icon`
  - **사업자 승인 대기 목록**: `u.name`, `u.email`, `u.biz`, `u.bno`, `u.ind`, `u.id`
  - **회원관리(소비자·도매 탭)**: `m.name`, `m.email`, `m.phone`, `m.contact`, `m.ind`, `m.tier`
  - **카테고리 트리**: `node.name`, `node.id`
  - **비밀번호 재설정 화면**: `email`, `tempPw`
- 주문완료 화면: `recvName`, `fullAddr`, `email`, `orderNo` 모두 escape

### 1-5. README 자격증명 제거
- 평문 `junil98@gmail.com / 12345678` 노출 제거
- 보안 패치 섹션 추가, 배포 가이드를 `changeAdminPassword('새비번')` 안내로 교체

---

## 2. 품질팀장 지적 — 엣지케이스/안정성

### 2-1. 결제 중복 클릭/새로고침 방어
- `sessionStorage.lf_checkout_in_progress` 플래그 도입
- 결제 진입 시 플래그 설정, 성공/취소/오류 시 해제
- 동일 `orderNo` 이미 존재하면 `ORDERS.push` 차단 (idempotency)
- `orderNo`에 `Math.random()` 5자 suffix 추가 — 동시 클릭 충돌 완화

### 2-2. 재고 검증
- 결제 직전 cart 순회 시: 음수/0 수량 차단, 재고=0 차단, 재고 초과 차단
- 차단 시 명확한 에러 메시지 (예: "T5 간접등 1200mm: 재고 5개 (요청 8개)")

### 2-3. 로그인 중복 클릭 방지
- `submitLogin` 진입 즉시 버튼 `disabled = true`, `finally`에서 해제

### 2-4. 사업자번호 중복 검사
- `registerUser`: 동일 `bizInfo.bno`로 가입 시도 시 즉시 차단

### 2-5. 권한 상승 시도 차단
- `setRole()` 운영환경에서는 인증된 호출자(loginUser/doAdminLogin/approve 등)에서만 admin/T1~T3 허용
- DevTools에서 `setRole('admin')` 직접 호출 시 `[보안] 권한 상승 시도 차단됨` 경고 + 무력화

---

## 3. 기획팀장 지적 — 비즈니스 로직 정합성

### 3-1. 단가 하드코딩 → R[] 동기화
- 5곳의 `0.7/0.78/0.88` 하드코딩을 모두 `(1 - R.t1/.t2/.t3)`로 교체:
  - `renderProdTable()` L3697
  - `calcTierPrices()` L3813
  - `updatePmTierPreview()` L5300 (포함 T1 배지 텍스트도 R.t1 기반으로 동적 변경)
  - 상품 상세 새 창 L5424-5426
  - `updatePemTierPrices()` L6475-6477
- 이제 관리자가 단가그룹에서 30/22/12% 변경하면 전체 상품 테이블에 즉시 반영됨

### 3-2. VAT 분리 표시 (B2B 회계 정합성)
- 주문 객체에 `supplyAmt`(공급가), `vatAmt`(부가세 10%), `taxInvoiceRequested` 추가
- 사업자(T1~T3) 주문 완료 화면에 공급가/부가세 분리 표시
- 세금계산서 신청은 마이페이지에서 (후속 작업)

### 3-3. 사업자 거절 cooldown 7일
- 새 글로벌 변수 `rejectedBizCooldown = {email: rejectedAt}`
- `approve(..., 'deny')`: 거절 시점에 email 기록 + localStorage `lf_reject_cooldown` 저장
- `registerUser`: 재가입 시도 시 7일 이내면 차단 ("이전 신청이 거절되어 N일 후 재신청 가능합니다")
- `migrateLegacyPasswords()`에서 cooldown 복원

---

## 4. 잔존 작업 (다음 스프린트)

### 백엔드 이관 필수
- 클라이언트 해싱은 평문 노출 차단의 임시 조치 — bcrypt/argon2 서버 측 인증으로 이관 필요
- 결제 confirm 서버 측 금액 재검증 (orderId → DB 금액 대조)
- `backend/lightfactory-v2-naver.tar.gz` 압축 해제 후 Next.js API 작업

### XSS 잔존 영역 (위험도 낮음, 후속 일괄 처리)
- 상품 카드 `${p.name}` 등 90+ 위치 — 관리자가 입력하는 데이터라 위험도 낮음
- 일괄 적용 권장: 모든 `${...}` → `${escapeHTML(...)}` 자동 변환 스크립트

### B2B 핵심 누락 기능 (기획팀 요청)
- 세금계산서 발행 신청 화면 (`taxInvoiceRequested` 필드는 이미 추가됨)
- 후불결제 · 여신한도
- 거래처별 단가 커스터마이즈
- 다중 배송지(현장별)
- 재구매 · 발주서 업로드
- 주문 취소 · 반품 · 교환 RMA

### 디자인팀장 요청 (별도 스프린트)
- 체크아웃 모달에 3-step 스텝퍼 (`.qm-step-bar` 이식)
- 모바일 하단탭바 실제 구현 또는 스펙 폐기
- `.toast`에 `role="status" aria-live="polite"`
- `--hint #A8A7A2` 대비비 상향 (WCAG AA)
- 9~10.5px 폰트 → 11px↑

---

## 5. 점수 변화 예상 (재검증 시)

| 역할 | 이전 | 예상 | 변화 요인 |
|---|---|---|---|
| 기획팀장 | 62 | 70+ | 단가 동기화·VAT·cooldown 해결 |
| 개발팀장 | 42 | 65+ | DEV_MODE·해시·XSS·idempotency·권한가드 |
| 품질팀장 | 58 | 72+ | 중복결제·재고검증·사업자번호·중복클릭 |
| 디자인팀장 | 72 | 72 | 변경 없음 (별도 스프린트 대상) |
| **평균** | **58.5** | **~70** | **운영 직전 단계 진입** |

다음 단계로 백엔드 이관 또는 디자인팀 액션 아이템 진행을 권장합니다.
