# 카테고리 관리 — 저장(드래프트) 모델 전환 (2026-06-11)

대상: `shop/index.html` 관리자 카테고리 관리

## 요청
카테고리 편집 후 **「저장」을 눌러야** 실제 쇼핑몰에 반영되도록 변경.

## 변경 전 동작
이름수정·하위추가·대분류추가·순서이동·삭제 각 편집마다 즉시
`syncCatsFromCatData()`(라이브 스토어 반영) + `saveCats()`(localStorage 저장) 호출 → **즉시 반영**.

## 변경 후 동작 (드래프트 → 저장)
- 편집은 작업본 `catData` 에만 임시 반영 + 관리자 트리(`renderCatTree`)만 갱신. `markCatDirty()` 로 미저장 표시.
- 「저장」(`saveCatChanges`): `syncCatsFromCatData` + `renderSidebar`/`renderMCats`/`initRegCatSelect` + `saveCats` 일괄 실행 → 이때만 쇼핑몰·localStorage 반영. baseline 갱신.
- 「되돌리기」(`discardCatChanges`): 마지막 저장 시점(`catBaseline`) 으로 작업본 복원.
- 미저장 표시: 카드 우측 상단 「저장되지 않은 변경」 + 「저장」/「되돌리기」 버튼(미변경 시 비활성).
- 미저장 상태에서 새로고침/창닫기 시 `beforeunload` 경고.

## 구현 포인트
- 신규 상태 `catDirty`, `catBaseline` / 신규 함수 `markCatDirty`, `updateCatSaveBar`, `saveCatChanges`, `discardCatChanges`, `cloneCats`.
- `renderCatTree`: 최초 진입 시 baseline 스냅샷 + 저장바 상태 갱신.
- 편집 함수 5종(`saveEdit`/`addChildCat`/`addRootCat`/`moveCat`/`doDeleteCat`)에서 즉시 `sync`+`saveCats` 제거 → `markCatDirty` 로 대체.

## 검증 (Playwright + 시스템 Chrome)
- 진입 시 baseline 스냅샷·dirty=false ✅
- 편집 시 dirty + 저장버튼 활성 + 미저장 표시 ✅
- **저장 전 라이브 스토어(CATS)·localStorage 미반영** ✅
- 저장 후 CATS·localStorage 반영, dirty 해제 ✅
- 되돌리기 시 미저장분 제거, 저장된 항목 유지 ✅
