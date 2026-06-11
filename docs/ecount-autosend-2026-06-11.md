# 이카운트 매일 오후 2시 자동 전송 (2026-06-11)

대상: `shop/index.html` 관리자 이카운트 ERP

## 요청
매일 오후 2시가 되면, 그 시각까지 등록된 주문을 자동으로 이카운트에 등록.

## ⚠️ 핵심 제약 (개발/기획팀장)
현재 배포본은 **백엔드 없는 정적 클라이언트 앱**(localStorage). 서버가 없어 **브라우저가 닫혀 있어도 실행되는 무인 스케줄은 불가**. 따라서:
- **관리자 화면이 열려 있는 동안** 매일 오후 2시에 자동 전송(1분 주기 체크).
- 오후 2시 이후 접속 시 **당일분 캐치업** 전송.
- 완전 무인 스케줄은 백엔드(`backend/lightfactory-v2/`) 연동 시 cron/job 으로 이관 필요. (UI에 제약 명시)

## 구현
### 전송 로직 리팩터링
- `_ecountRegister(o)`: 단일 주문 → 이카운트 판매입력(매출전표) 등록 핵심(동기). 전표번호 발번 + 전송완료 처리.
- `nextVoucherNo()`: `EC-YYYYMMDD-XXXXX` 발번 + 시퀀스(`_ecountSeq`)로 동일시각 다건 충돌 방지.
- `sendToEcount(orderId)`: 단건(상세 버튼) — 로딩 후 `_ecountRegister` 사용.

### 일괄/스케줄
- `autoSendEcountBatch({cutoffTs, auto, silent})`: 전송대기·미취소 주문 일괄 전송. `cutoffTs` 지정 시 그 시각까지 등록분(`orderedTs<=cutoff`)만, 미지정 시 전체. (orderedTs 없는 레거시는 포함)
- `ecountAutoSchedulerTick()`: 1분 주기. **활성 + 관리자세션 + 오후2시 경과 + 오늘 미실행** 시 `autoSendEcountBatch({cutoffTs: 오늘14:00, auto:true})` 실행 후 `lastrun=오늘` 기록(재실행 방지).
- `setInterval(tick, 60s)` 가동. `aNav('ecount')` 진입 시 즉시 캐치업 체크.
- `toggleEcountAutoSend`, `renderEcountSchedule`(다음/마지막 실행·대기건수 표시).
- 신규 주문에 `orderedTs: Date.now()` 기록(캐치업 시 "2시까지" 정밀 필터).

### UI
- 이카운트 ERP 페이지에 **「주문 자동 전송 스케줄」 카드**: ON/OFF 토글, 다음/마지막 자동전송·대기건수, **「지금 전송대기 일괄 전송」** 버튼, 제약 안내문.
- localStorage 키: `lf_ecount_autosend`(ON/OFF), `lf_ecount_autosend_lastrun`(YYYY-MM-DD).

## 검증 (Playwright + 시스템 Chrome) — 7건
- 오후2시 일괄: 2시 이전 등록분 전송 / 2시 이후 등록분 보류 ✅
- 전표번호 고유·형식, 무제한 일괄 잔여분 전송 ✅
- 토글 OFF/ON 영속화 ✅
- 스케줄러 비관리자 미동작 / 관리자+2시경과 자동전송+lastrun 기록 ✅
- 전체 49건 전수 통과.
