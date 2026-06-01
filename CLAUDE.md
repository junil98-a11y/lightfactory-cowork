# 라이트팩토리 Cowork 프로젝트

조명·전기자재 B2C+B2B 도매 쇼핑몰. 5팀장 협업 검증 체계로 운영.

---

## 5팀장 협업 철학

이 프로젝트는 5명의 팀장 역할이 동시에 작업·검증·수정에 참여합니다. 작업 요청을 받으면 해당 영역의 팀장 시각으로 우선 검토한 뒤, 필요한 경우 다른 팀장에게 협업을 요청합니다.

### 기획팀장 (PM/PO)
- 필요한 기능 발굴, UI/UX 개선 요청
- 사용자 스토리·비즈니스 로직·B2B 운영 사이클·법적 요건 검증
- 모든 기능에 대한 개선 필요사항 확인

### 개발팀장 (Tech Lead)
- 프론트엔드·백엔드 구분하여 개발
- 데이터베이스 설계 시 확장 가능하게 설계
- 한글 주석 자세히 달기
- 기능 개발 시 해당 기능을 사용하는 프론트엔드 동시 업데이트
- 아키텍처·보안·성능·결제 안정성 검토

### 품질팀장 (QA Lead)
- 관리자 관점·도매사업자 관점·소비자 관점에서 모든 단계 검증
- 개선이 필요한 부분은 제안
- 모든 기능에 대해서 검증 (엣지케이스·권한경계·회귀 안정성·자동화)

### 디자인/UX팀장
- 가능한 심플한 디자인 유지
- 시각적 일관성·정보 위계·모바일 대응·접근성(WCAG AA)·퍼널 시각화

### 영업팀장 (Sales Lead)
- 품목 등록·시장조사·경쟁사 분석
- 카테고리 트리 구성·가격 정책·B2B 단가 보호
- 인기상품 큐레이션·신상품 발굴

---

## 폴더 구조

```
lightfactory-cowork/
├── CLAUDE.md                          ← 이 파일. 프로젝트 가이드 (Claude가 먼저 읽음)
├── README.md                          ← 사람이 먼저 읽는 진입점 문서
├── CHANGELOG.md                       ← 변경 이력 시간순
├── shop/
│   ├── index.html                     ← 쇼핑몰 본체 (단일 HTML, ~7866라인)
│   └── lightfactory-netlify.tar.gz    ← Netlify 배포용 패키지
├── backend/
│   └── lightfactory-v2-naver.tar.gz   ← Next.js API + 네이버 스마트스토어 (백엔드 이관용)
├── agent/
│   ├── lightfactory-test-agent.jsx        ← 3페르소나(관리자·소비자·도매) QA 에이전트
│   └── lightfactory-team-review-agent.jsx ← 5팀장 협업 검증 에이전트
├── docs/
│   ├── INDEX.md                                ← 문서 색인 + 로드맵
│   ├── team-review-2026-05-25.md               ← 4팀장 최초 통합 리뷰 (점수·교차요청)
│   ├── security-patch-2026-05-25.md            ← P0 보안·로직 패치 리포트
│   ├── tax-invoice-feature-2026-05-25.md       ← B2B 세금계산서 구현 리포트
│   ├── sales-lineup-2026-05-25.md              ← 영업팀장 visrova 분석·라인업 등록
│   └── lightfactory-quotation.pdf              ← 견적서 PDF 샘플
└── _archive/                          ← 백업·구버전 (현재 작업과 무관, 무시)
    └── index.html.backup-2026-05-25
```

---

## 현 구현 상태 (2026-05-26 기준)

### 완성된 기능
- 4단 role 분기: consumer / pending / t1·t2·t3 / admin
- 회원가입·로그인·사업자 승인 워크플로우 + 거절 7일 cooldown
- 장바구니·주문서·토스페이먼츠 결제 (idempotency·재고검증·중복결제 차단)
- 카카오 우편번호 주소검색
- 마이페이지: 프로필·주문내역·**세금계산서**·보안 4개 탭
- 최근 본 상품·상품 정렬·더보기·인기상품 섹션
- 관리자: 상품/카테고리/주문/배너/단가/사업자승인/회원관리/**세금계산서**/이카운트
- 네이버 스마트스토어 연동 (API 키 필요)
- 카카오 알림톡 (API 키 필요)
- localStorage 영속성 + IndexedDB 이미지 저장
- QA 테스트 에이전트 (3페르소나) + 5팀장 검증 에이전트
- B2B 세금계산서: 신청·발행·취소·미리보기·인쇄(PDF 저장)·국세청 양식 모방

### 데이터 통계
- 카테고리: 11개 (실링팬/스위치/빌트인 콘센트/매입등/세대등/식탁등/IoT 조명/마그네틱조명/펜던트/벽등·직부·센서/리빙/전기자재)
- 품목: 36개 (가격대 1,800원 ~ 560,000원)
- 인기상품(featured): 9개, 쇼츠(yt): 7개, 도매전용(biz): 4개

### 보안 패치 적용 (2026-05-25)
- DEV_MODE 영구 비활성화 + localhost 외 자동 차단
- 평문 비밀번호 SHA-256(pw+salt) 해시화 + 자동 마이그레이션
- 권한 상승(setRole) 운영환경 차단
- 결제 idempotency + 재고 검증 + 중복결제 방지
- XSS escapeHTML 유틸 (주문관리·사업자승인·회원관리·카테고리·PW재설정 적용)
- 단가 하드코딩 → R[] 상수 동기화 (5곳)
- VAT 분리 저장(supplyAmt·vatAmt), 거절 7일 cooldown
- README 자격증명 제거, 운영자용 `changeAdminPassword()` 함수 제공

---

## 작업 워크플로우

### 신규 기능 요청을 받았을 때
1. **기획팀장 시각**: 사용자 스토리·B2B 실무 적합성 검토
2. **개발팀장 시각**: 보안·아키텍처·확장성 영향도 평가
3. **품질팀장 시각**: 엣지케이스·권한경계 시나리오 식별
4. **디자인팀장 시각**: 모바일·접근성·심플함 유지
5. **영업팀장 시각**: 시장 수요·가격 정책 영향
6. 구현 → 백업본 생성(`_archive/`) → 변경 → 변경 리포트(`docs/`) 작성

### 코드 수정 시 주의사항
- `shop/index.html`은 단일 HTML 8,000라인+. 부분 read/grep 활용
- 한글 주석 충분히, 변경 일자 명시 (예: `// 2026-05-25 P0 보안 패치`)
- 사용자 입력이 들어가는 `innerHTML`은 반드시 `escapeHTML()` 적용
- 비밀번호 비교는 `hashPassword(pw, salt)` 사용 (평문 비교 금지)
- 결제·민감 데이터 처리는 idempotency key 필수
- 단가 계산은 `R[]` 상수 사용 (하드코딩 금지)

### 데이터 추가 시 주의사항
- `PRODS` 배열의 `cat` 필드는 `catData` 트리의 `name`과 정확히 일치해야 함
- 신규 카테고리 추가 시 `catData`에 먼저 정의 후 PRODS 등록
- `featured: true`는 메인 인기상품 섹션 노출
- `yt: true`는 쇼츠 배지 표시 (실제 영상은 별도)
- `biz: true`는 도매 전용 — 일반 소비자에게는 비공개

---

## 다음 작업 우선순위 (로드맵)

상세는 `docs/INDEX.md` 참고. 핵심:

### High (B2B 핵심 기능)
- 후불결제 · 여신한도 (T1 시공업체 핵심)
- 다중 배송지(현장별)
- 재구매 · 발주서 업로드
- 거래처별 단가 커스터마이즈 (현재 R 일괄)
- 주문 취소 · 반품 · 교환 RMA

### Mid (운영 보강)
- 백엔드 이관 (`backend/lightfactory-v2-naver.tar.gz` 압축해제 → Next.js API)
- 결제 confirm 서버 측 금액 재검증
- 단일 HTML → admin/shop 청크 분리

### Design Sprint
- 체크아웃 모달 3-step 스텝퍼
- 모바일 하단탭바 실제 구현 또는 폐기
- toast `aria-live` 추가
- `--hint #A8A7A2` 대비비 상향 (WCAG AA)
- 9~10.5px 폰트 11px↑ 상향

---

## 검증 에이전트 사용법

### 3페르소나 QA 에이전트 (`agent/lightfactory-test-agent.jsx`)
관리자·소비자·도매사업자 3개 페르소나가 시나리오별 테스트. Claude.ai Artifact에 붙여넣고 사용.

### 5팀장 협업 검증 에이전트 (`agent/lightfactory-team-review-agent.jsx`)
기획·개발·품질·디자인·영업 5명이 동시 병렬 검증 → 교차 요청 매트릭스 → 통합 리포트. Claude.ai Artifact에 붙여넣고 "전체 검증 실행" 클릭.

---

## 빠른 시작

- 쇼핑몰 실행: `shop/index.html`을 브라우저로 열기
- 관리자 진입: 로고 더블클릭 → 등록된 관리자 이메일/비밀번호
- 비밀번호 변경: 개발자 콘솔에서 `await changeAdminPassword('새비번')`
- 토스페이먼츠 키 입력: 관리자 페이지에서 입력 (localStorage 저장)
- Netlify 배포: `shop/lightfactory-netlify.tar.gz` 압축 해제 후 app.netlify.com/drop
