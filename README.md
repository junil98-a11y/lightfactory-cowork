# 라이트팩토리 Cowork 프로젝트

조명·전기자재 **B2C + B2B 도매** 쇼핑몰. 5팀장 협업 검증 체계로 운영합니다.

> Claude는 작업 시 `CLAUDE.md`를 먼저 읽습니다. 사람이 먼저 읽는 문서는 이 파일(README)이며, 자세한 설계 의도와 워크플로우는 `CLAUDE.md`를 참조하세요.

---

## 🚀 빠른 시작

| 작업 | 방법 |
|---|---|
| 쇼핑몰 실행 | `shop/index.html` 더블클릭 |
| 관리자 진입 | 로고 더블클릭 → 이메일/비밀번호 |
| 비밀번호 변경 | 브라우저 콘솔에서 `await changeAdminPassword('새비번')` |
| 테스트 계정 | `test@test.com` / `12345678` (localhost에서만 자동입력 노출) |
| Netlify 배포 | `shop/lightfactory-netlify.tar.gz` 압축해제 → app.netlify.com/drop |
| 5팀장 검증 | `agent/lightfactory-team-review-agent.jsx` → Claude.ai Artifact |

---

## 📁 프로젝트 구조

```
lightfactory-cowork/
├── CLAUDE.md                ← Claude가 먼저 읽는 가이드 (5팀장 철학·워크플로우)
├── README.md                ← 이 파일 (사람이 먼저 읽는 진입점)
├── CHANGELOG.md             ← 변경 이력
├── shop/                    ← 쇼핑몰 본체
├── backend/                 ← Next.js 백엔드 (이관 대기)
├── agent/                   ← Claude.ai 검증 에이전트 2종
├── docs/                    ← 변경 리포트·로드맵 (INDEX.md 참고)
└── _archive/                ← 백업 (무시)
```

---

## ✅ 현재 상태

- **카테고리** 11개 · **품목** 36개 (1,800원~560,000원)
- 4단 role (소비자/승인대기/T1~T3/관리자) · 도매단가 R 정책
- B2B 세금계산서 (신청·발행·취소·미리보기·PDF 저장)
- 토스페이먼츠 결제 + idempotency + 재고검증
- 카카오 우편번호 · 알림톡 · 네이버 스마트스토어 연동
- localStorage + IndexedDB 영속성
- 평문 비밀번호 해시화 · XSS 방어 · 권한상승 차단 (2026-05-25 P0 패치)

자세한 변경 이력은 [`CHANGELOG.md`](CHANGELOG.md), 모든 문서 색인은 [`docs/INDEX.md`](docs/INDEX.md)를 참고하세요.

---

## 🛠 배포 전 필수 작업

1. 관리자 비밀번호 변경: `await changeAdminPassword('운영용비번')`
2. 토스페이먼츠 클라이언트 키 입력 (관리자 화면)
3. 백엔드 이관 권장 (`backend/lightfactory-v2-naver.tar.gz` → Next.js API)
4. 단일 HTML 청크 분리 (admin/shop) + CSP/HTTPS/gitleaks

---

## 👥 5팀장 협업 체계

| 역할 | 책임 |
|---|---|
| 기획팀장 | 사용자 스토리·비즈니스 로직·B2B 운영 사이클 |
| 개발팀장 | 아키텍처·보안·성능·코드 품질·결제 안정성 |
| 품질팀장 | 엣지케이스·권한경계·테스트 자동화 |
| 디자인팀장 | 시각적 일관성·모바일·접근성·심플함 유지 |
| 영업팀장 | 품목 등록·시장조사·가격 정책·신상품 발굴 |

5팀장 검증은 `agent/lightfactory-team-review-agent.jsx`를 Claude.ai에 띄워서 실행. "전체 검증 실행" 버튼 한 번이면 5명 동시 병렬 검토 + 교차 요청 매트릭스 + 통합 리포트.

---

## 📄 핵심 문서

- [`docs/team-review-2026-05-25.md`](docs/team-review-2026-05-25.md) — 4팀장 최초 통합 리뷰
- [`docs/security-patch-2026-05-25.md`](docs/security-patch-2026-05-25.md) — P0 보안 패치
- [`docs/tax-invoice-feature-2026-05-25.md`](docs/tax-invoice-feature-2026-05-25.md) — 세금계산서 구현
- [`docs/sales-lineup-2026-05-25.md`](docs/sales-lineup-2026-05-25.md) — visrova 분석·라인업
- [`docs/INDEX.md`](docs/INDEX.md) — 전체 문서 색인 + 로드맵
