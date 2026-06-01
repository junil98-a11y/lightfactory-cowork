# 변경 이력 (CHANGELOG)

라이트팩토리 Cowork 프로젝트의 모든 변경 사항을 시간순으로 기록합니다.

---

## [2026-06-01] — B2B 로드맵 일괄 구현

### Fixed — 주문 시 재고 차감 누락 (재고 정합)
- 주문 확정 후 `p.stock`을 차감하지 않아 오버셀·재고 미감소 + RMA 복원 시 재고 부풀림이 발생하던 문제 수정. 3개 주문 경로(proceedToOrder/데모/토스)에 `decrementStockFor(orderItems)` 추가 → 주문 시 차감, RMA 취소·반품 승인 시 복원으로 정합. 헤드리스로 23→20(주문)→23(RMA복원) 검증.

### Added — 카테고리 상품 수 배지 (PC 사이드바 + 모바일 카테고리 바)
- 데스크톱 사이드바 각 대분류 옆에 상품 수(하위 트리 포함, 현재 role 노출 기준) 배지 표시(`catProdCount`). 도매전용 상품은 소비자에겐 제외 카운트.
- 모바일 상단 카테고리 바(`renderMCats`)에도 동일 배지 + "전체" 탭에 전체 노출 수 표시.

### Changed — 사이드바 대분류 클릭 시 하위 포함 전체 상품 표시
- 데스크톱 사이드바의 대분류 헤더 클릭 시 펼치기만 하던 동작을, **펼치기 + 대분류 전체 상품 필터**로 변경(`majorCat`). 펼치기/접기는 우측 chevron으로 분리.
- `matchCat`이 카테고리 하위 트리(`catSubtreeNames`)까지 매칭 → 하위 카테고리명으로 분류된 상품도 상위 대분류 필터에서 노출. 다른 대분류와는 격리.

### Changed — 상품 분류에 대분류 직접 지정 허용
- 등록/수정 폼의 대표 카테고리 드롭다운에서 **대분류(상위 카테고리)** 선택 차단(disabled)을 해제 → 대분류로도 상품 분류 가능. 추가 카테고리 체크박스에도 대분류(📁) 포함.
- 대분류로 분류한 상품은 해당 대분류 필터에서 노출됨(검증 완료).

### Added — 상품 옵션별 단가 (등록·수정·판매·장바구니·결제)
- 상품에 **옵션 그룹/옵션값**을 동적으로 추가·삭제. 옵션값마다 **추가금액(addPrice)** 지정 → 판매 단가 = 상품 단가 + Σ선택 추가금액. 데이터: `product.options = [{name, values:[{label, addPrice}]}]`.
- **등록/수정 폼**: 옵션 설정 카드(그룹/값 무제한 추가·삭제, 추가금액 입력). 저장 시 `options` 반영(`collectOptions`).
- **판매 화면**(데스크톱 모달·모바일 바텀시트): 옵션 그룹별 드롭다운 + "선택 단가" 실시간 표시(`renderProdOptions`/`updateOptPrice`).
- **장바구니**: 옵션 조합별 별도 라인(`optKey` 병합), 옵션·추가금액 표시, 인덱스 기반 수량/삭제로 전환.
- **결제/주문**: 요약·주문 라인에 옵션 라벨 + 추가금액 반영. 재주문 시 옵션 보존.
- 헤드리스로 등록→판매(가격계산)→장바구니(옵션별 분리)→결제 요약→수정 로드까지 검증.

### Changed — 모달 닫힘 동작: 바깥 클릭 닫기 제거(X 버튼만)
- 모든 모달 오버레이(18개)에서 `onclick="if(event.target===this)closeXxx()"`(바깥 클릭 시 닫힘)를 제거 → 실수 클릭으로 닫히지 않고 **X(또는 취소) 버튼으로만 닫힘**. 카테고리 삭제 확인창도 동일 적용.
- 모바일 바텀시트도 동일 적용: 배경 탭 닫힘 제거 → 우상단 **X 버튼**(신규) 또는 상단 핸들 탭으로만 닫힘.

### Added — 전사 티어 할인율 팝업 + 기본 추종 모델
- 상품 목록 우상단에 **"티어 할인율"** 팝업(`openTierRatePopup`) 추가 — 전역 R(T1/T2/T3 %)을 편집·즉시 적용(`saveRates`). T1>T2>T3 검증, 100,000원 기준 미리보기.
- **기본 추종 모델**: 신규 등록/기존 수정 시 입력 할인율이 전사 R과 같으면 상품에 `tierRates`를 저장하지 않음 → 전사 할인율 변경 시 자동 추종. 다른 티어만 상품별 오버라이드로 저장.
- 등록 폼 진입 시 할인율 칸을 현재 전사 R 값으로 프리필(`initRegCatSelect`) → "그대로 두면 추종"이 직관적으로 동작.
- 상품 목록 표의 T1/T2/T3 단가를 `tierRateFor`(상품별>품목군>전사) 기준으로 표시.

### Fixed — 상품 목록 수정/비활성/스마트스토어 버튼 무반응
- 액션 버튼들이 `onclick="openProdEdit(p.id)"`처럼 템플릿 보간 없이 리터럴 `p.id`로 출력돼 클릭 시 `p is not defined`로 무반응이던 버그 수정 → `${p.id}`로 보간(`openProdEdit`/`openNaverModal`/`toggleProdActive`).

### Added — 상품 수정 화면에 추가 카테고리 + 티어 할인율 편집
- 상품 수정 모달(`openProdEdit`)에도 등록 화면과 동일한 ① 추가 카테고리(다중 노출) 체크박스 ② 티어별 할인율(%) 직접 편집(단가 양방향 계산, "기본 할인율" 리셋)을 추가. 저장 시 `extraCats`/`tierRates` 반영. 헤드리스로 로드·편집·저장·적용·필터노출 검증.

### Added — 모바일 바텀시트 즐겨찾기(☆) 버튼
- 데스크톱 상세 모달에만 있던 즐겨찾기 토글을 모바일 바텀시트 "장바구니 담기" 옆에도 추가(일관성). `updateDmFavBtn`이 `dm-fav-btn`·`bs-fav-btn` 양쪽 상태를 갱신. 헤드리스(390×844)로 토글·영속 검증.

### Fixed — 상품 상세 모달 레이아웃 깨짐 (썸네일만 있는 상품)
- 상세이미지가 없어 좌측 썸네일 열(`dm-thumbs-col`)을 `display:none` 하면 CSS Grid 항목이 한 칸씩 앞으로 밀려, 메인 이미지가 72px 칸에 끼이고 정보가 가운데로 와 레이아웃이 깨지던 문제 수정. 썸네일 유무에 따라 `dm-body-top`의 grid 열을 `72px 1fr 340px`(다중 이미지) / `1fr 340px`(썸네일·아이콘만)로 토글. 헤드리스 Chrome 스크린샷으로 3개 케이스(아이콘만/썸네일만/다중이미지) 검증.

### Fixed — 핵심 무한재귀 버그(기존 잠복 버그, 브라우저 검증으로 발견)
- 오버라이드 패턴 `const _origX=X; function X(){ _origX() }`가 중복 함수선언 호이스팅으로 **자기 자신을 호출(RangeError: Maximum call stack size exceeded)** 하던 문제 수정. 영향: 상품 그리드·검색·정렬·상품상세·결제 열기·일반/사업자 로그인·로그아웃.
- 대상 6곳을 함수 표현식 할당(`X = function(){...}`)으로 변경: `renderGrid`/`openProd`/`doSearch`/`openCheckout`/`submitLogin`/`gnbLogout`.
- `renderGrid` 오버라이드의 미정의 전역 `filteredProds` 참조 → base와 동일 필터로직(카테고리/검색/권한/활성)으로 직접 계산하도록 교체.
- 헤드리스 Chrome(CDP)로 검증: 그리드 12개 렌더·검색·상품상세·정렬·관리자 로그인 모두 예외 없이 정상.


### Added — High Priority B2B 기능
- **다중 배송지(주소록)**: 마이페이지 주소록 탭(추가/수정/삭제/기본지정) + 주문서 배송지 드롭다운·새 주소 버튼. `user.addresses[]` 영속.
- **재구매·발주서**: 주문내역 재주문 버튼, 상품 즐겨찾기(☆) + 즐겨찾기 탭, CSV 발주서 업로드(SKU,수량) → 장바구니 자동 채움, 양식 다운로드.
- **거래처별 단가 커스터마이즈**: 단가 우선순위 customRates→PRICE_POLICY→R. `sp(base,prod)`/`unitPrice`/`effRate` 공용화. 관리자 회원목록에 거래처 단가 매트릭스 편집.
- **RMA(취소·반품·교환)**: 고객 요청 폼 + 관리자 처리 메뉴(승인 시 재고 복원·주문상태 취소). `RMAS[]` 영속, 사이드바 배지.

### Added — 영업(Sales)
- 품목군 단가정책 `PRICE_POLICY`(실링팬·IoT T1 15/T2 10/T3 8%, 마그네틱 20/15/10).
- 도매 전용관 페이지(사업자/관리자, biz 품목만).
- 36개 품목 상세설명 자동 주입(`PROD_DESC_MAP`, 관리자 수정본 보존).

### Changed — Design Sprint
- 체크아웃 3-step 스텝퍼, toast `aria-live`, `--hint` 대비 상향(#A8A7A2→#767570, ~4.5:1), 상품 본문 텍스트 11px, 결제 SSL·토스 안전결제 배지, "내 단가 절약 ₩" 강조.

### Added — 백엔드 이관 준비
- `backend/lightfactory-v2-naver.tar.gz` 압축 해제.
- Prisma 스키마 확장: `ShippingAddress`/`Favorite`/`CustomerPrice`/`Rma`+`RmaItem` 모델 + enum.
- `/api/checkout/prepare`에 거래처별 단가(CustomerPrice) 우선 적용. confirm 금액 검증은 기구현 확인.

### Notes
- 제외: 후불결제·여신한도(사용자 요청). 보류: 단일 HTML 청크 분리(즉시 확인 흐름 유지 위해 백엔드 이관과 함께 진행 권장).
- 백업: `_archive/index.html.backup-2026-06-01`. 리포트: `docs/b2b-features-2026-06-01.md`, `docs/backend-migration-2026-06-01.md`.

---

## [2026-05-26]

### Added — 영업팀장 등록 + visrova 라인업
- **신규 카테고리 4개**: 마그네틱조명(M20/M15/M10/M5/직부형), 펜던트(LED일체형/리니어/갓·돔/샹들리에/원목), 벽등·직부·센서(실내/외부/원형직부/센서등/천연석), 리빙(도어락/방문손잡이)
- **신규 품목 24개** (ID 13~36, 가격대 4,500원~560,000원)
  - 매입등 인치 세분화 4개 (2/3/실린더/멀티 10구)
  - 마그네틱 3개 (M20 레일·스포트, M10 슬림)
  - Matter IOT 3개 (다운라이트·컨트롤러·무선스위치)
  - 라인·레일 3개, 홈조명 2개
  - 펜던트·벽등·실링팬 5개 (원목 펜던트, 천연석 벽등, 132cm DC팬, IOT 137cm 팬)
  - 스위치·리빙 보강 4개 (르그랑 갈리온, 팝업 콘센트, CCT 비교기, 디지털 도어락)
- **5팀장 협업 에이전트**에 영업팀장(Sales Lead) 페르소나 추가 (`agent/lightfactory-team-review-agent.jsx`)
- 통계: 카테고리 7→11개, 품목 12→36개(3배), 가격 천장 89,000원→560,000원(6.3배)
- 리포트: `docs/sales-lineup-2026-05-25.md`

### Added — Cowork 프로젝트 정리
- `CLAUDE.md` 5팀장 철학 + 폴더 구조 + 워크플로우 + 다음 작업 로드맵으로 재작성
- `README.md` 진입점 문서로 재구성
- `CHANGELOG.md` (이 파일) 신규
- `docs/INDEX.md` 신규 — 문서 색인 + 로드맵
- 백업 파일을 `_archive/`로 이동

---

## [2026-05-25] — 메인 패치 일

### Added — B2B 세금계산서 기능
- 신규 데이터 레이어: `TAX_INVOICES` 배열, `TAX_SUPPLIER` 객체, localStorage 키 2개
- 핵심 함수: `requestTaxInvoice` · `issueTaxInvoice` · `cancelTaxInvoice` · `openTaxPreview`
- **마이페이지 세금계산서 탭** (사업자 전용): 공급받는자 정보 등록 + 신청 이력 + 사후 신청
- **주문서 세금계산서 옵션**: 사업자 로그인 시 체크박스 노출 + 자동 채움 + 회사 정보 저장 옵션
- **관리자 세금계산서 관리 메뉴**: 사이드바 배지, 통계, 필터/검색, 발행/취소 처리, 공급자 정보 수정
- **미리보기 모달**: 국세청 양식 모방, 발행완료 워터마크, 모바일 반응형, `@media print` 인쇄/PDF 저장
- 리포트: `docs/tax-invoice-feature-2026-05-25.md`

### Security — P0 보안 패치 (개발팀장 Critical 이슈 해결)
- **DEV_MODE 영구 비활성화** + `localhost/127.0.0.1` 외 자동 차단 가드
- **평문 비밀번호 SHA-256(pw+salt) 해시화**
  - `ADMIN_CREDENTIALS`: `pwHash` + `salt` 구조로 변경
  - `USERS` 테스트 계정 해시 마이그레이션
  - `registerUser`/`loginUser` async + 해시 비교
  - 앱 시작 시 `migrateLegacyPasswords()` 자동 실행
  - 운영자용 `changeAdminPassword(newPw)` 제공
- **권한 상승 차단**: `setRole()` 운영환경에서 인증된 호출자만 admin/T1~T3 허용
- **XSS 방어**: `escapeHTML()` 유틸 도입 + 주문관리/사업자승인/회원관리/카테고리/PW재설정 적용
- 비밀번호 재설정 임시 PW도 해시 저장
- README 평문 자격증명 제거

### Fixed — 결제 안정성 (품질팀장 P0)
- 결제 sessionStorage 플래그 + 동일 orderNo idempotency
- 결제 직전 cart 재고/음수수량 검증
- 사업자번호 중복 가입 차단
- 로그인 중복 클릭 방지

### Fixed — 비즈니스 로직 (기획팀장)
- 단가 하드코딩(0.7/0.78/0.88) 5곳 → `R[]` 상수 동기화
- 주문에 `supplyAmt`/`vatAmt`/`taxInvoiceRequested` 필드 추가 (B2B 회계)
- 사업자 거절 시 7일 cooldown 도입 (무한 재신청 차단)

### Added — 4팀장 통합 리뷰 시스템
- `agent/lightfactory-team-review-agent.jsx` 신규 — 기획·개발·품질·디자인 4팀장 동시 검증
- 리포트: `docs/team-review-2026-05-25.md` — 점수, 교차 요청 매트릭스, 2주 로드맵
- 초기 점수: 기획 62, 개발 42, 품질 58, 디자인 72 (평균 58.5)
- 리포트: `docs/security-patch-2026-05-25.md`

---

## [2026-05-25 이전] — 기존 구현

기존 라이트팩토리 쇼핑몰 본체:
- 4단 role 분기 (consumer/pending/t1~t3/admin)
- 회원가입·로그인·사업자 승인 워크플로우
- 장바구니·주문서·토스페이먼츠 결제
- 카카오 우편번호 · 알림톡 · 네이버 스마트스토어
- 마이페이지·주문내역·비밀번호 강도·찾기
- 최근 본 상품·상품 정렬·더보기
- 관리자: 상품/카테고리/주문/배너/단가/사업자승인
- localStorage 영속성 + IndexedDB 이미지 저장
- 3페르소나 QA 테스트 에이전트
- 견적서 PDF 샘플
