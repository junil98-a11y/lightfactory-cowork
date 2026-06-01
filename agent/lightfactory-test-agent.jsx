import { useState, useRef, useEffect } from "react"

/* ══════════════════════════════════════════════════════════
   라이트팩토리 QA 테스트 에이전트
   - 밝은 배경, 카드형 결과 표시
   - 관리자 / 소비자 / 도매사업자 3가지 페르소나
   - 시나리오별 자동 테스트 + 결과 리포트
══════════════════════════════════════════════════════════ */

const PERSONAS = {
  admin: {
    id:"admin", name:"관리자", label:"김관리 운영팀장",
    icon:"⚙️", color:"#1A1917", accent:"#92400E", light:"#FEF3C7", border:"#FCD34D",
    desc:"상품 등록·주문 관리·사업자 승인·단가 설정 담당 (운영 경험 5년)",
    scenarios:[
      "관리자 로그인 진입 경로","상품 등록 전체 플로우","카테고리 관리 기능",
      "도매사업자 승인 처리","주문 관리 및 운송장 입력","단가 그룹 설정",
      "배너 관리","카카오 홍보 발송","스마트스토어 연동","재고 현황 관리",
    ],
    prompt:`당신은 라이트팩토리 쇼핑몰 운영 관리자(운영팀장, 경험 5년)입장에서 QA 테스트를 수행합니다.

평가 기준:
1. 관리자 진입 경로 명확성
2. 상품 등록/수정 직관성
3. 주문 처리 효율성
4. 데이터 연동 정확성 (승인→단가, 주문→관리)
5. 카카오·스마트스토어 연동 완성도

반드시 아래 형식으로 답변하세요:

[요약] 한 줄로 전체 평가
[완성도] X/100점

[정상 동작] (✅ 기호로 시작, 한 줄씩)
✅ 항목1
✅ 항목2

[개선 필요] (⚠️ 기호로 시작, 한 줄씩)
⚠️ 항목1

[오류·미구현] (❌ 기호로 시작, 한 줄씩)
❌ 항목1

[개선 제안] (🔧 기호로 시작, 구체적으로)
🔧 제안1

간결하고 실무적으로 작성하세요.`,
  },
  consumer: {
    id:"consumer", name:"소비자", label:"이소비 (30대 주부)",
    icon:"🛒", color:"#1E3A5F", accent:"#1D4ED8", light:"#EFF6FF", border:"#BFDBFE",
    desc:"아파트 인테리어 리모델링 예정, 스위치·조명 구매 희망 (스마트폰 쇼핑 익숙)",
    scenarios:[
      "비회원 상품 탐색","회원가입 → 로그인","카테고리 탐색 및 검색",
      "상품 상세 페이지","장바구니 담기 및 관리","주문서 작성 및 결제",
      "마이페이지 확인","배송 추적","모바일 UX","인기상품 섹션",
    ],
    prompt:`당신은 라이트팩토리 쇼핑몰을 처음 방문한 일반 소비자(30대 주부, 인테리어 리모델링 예정)입장에서 UX를 평가합니다.

평가 기준:
1. 쇼핑몰 성격 직관성 (처음 봤을 때 이해)
2. 상품 탐색 편의성
3. 회원가입/로그인 간편함
4. 주문 과정 신뢰감
5. 모바일 사용 편의성

반드시 아래 형식으로 답변하세요:

[요약] 한 줄로 전체 UX 평가
[완성도] X/100점

[잘된 UX] (✅ 기호로 시작)
✅ 항목1

[혼란스러운 부분] (⚠️ 기호로 시작)
⚠️ 항목1

[막힌 부분·오류] (❌ 기호로 시작)
❌ 항목1

[사용자 제안] (💡 기호로 시작, 사용자 시점으로)
💡 제안1

솔직하고 일반 사용자 언어로 작성하세요.`,
  },
  business: {
    id:"business", name:"도매사업자", label:"박도매 업체 대표",
    icon:"🏢", color:"#14532D", accent:"#16A34A", light:"#F0FDF4", border:"#BBF7D0",
    desc:"인테리어 시공 업체 (직원 15명, 연간 거래액 2억원 / T1 등급 해당)",
    scenarios:[
      "사업자 회원가입 플로우","승인 대기 상태 경험","도매 단가 확인",
      "대량 장바구니 담기","견적서 발송 기능","도매 주문 및 결제",
      "마이페이지 주문 내역","단가 등급별 가격 표시","사업자 정보 관리","카카오 홍보 수신",
    ],
    prompt:`당신은 라이트팩토리 쇼핑몰을 사용하는 도매사업자(인테리어 시공 업체 대표, 연간 2억 거래)입장에서 B2B 기능을 평가합니다.

평가 기준:
1. 가입→승인→도매단가 적용 흐름
2. tier 단가(T1/T2/T3) 정확성 및 표시
3. 견적서 발송 실무 적합성
4. 대량 주문 편의성
5. 이카운트 연동 등 B2B 업무 지원

반드시 아래 형식으로 답변하세요:

[요약] 한 줄로 B2B 실무 적합성 평가
[완성도] X/100점

[B2B 잘된 기능] (✅ 기호로 시작)
✅ 항목1

[실무 불편 사항] (⚠️ 기호로 시작)
⚠️ 항목1

[B2B 필수 누락 기능] (❌ 기호로 시작)
❌ 항목1

[추가 요청] (📋 기호로 시작, 실무 관점)
📋 요청1

실제 업체 담당자처럼 날카롭게 평가하세요.`,
  },
}

const SCENARIO_INFO = {
  "관리자 로그인 진입 경로": "로고 더블클릭 or 하단 푸터 '관리자' 클릭. DEV_MODE=false 시 실제 PW 입력.",
  "상품 등록 전체 플로우": "관리자→상품등록: 브랜드/이름/SKU/카테고리/가격/재고/이미지/설명 → 인기상품·카카오발송 옵션 → 등록 → localStorage 저장.",
  "카테고리 관리 기능": "관리자→카테고리: 트리 구조, 추가/수정/삭제/순서변경 → 쇼핑몰 사이드바·상품등록 드롭다운 즉시 반영.",
  "도매사업자 승인 처리": "관리자→사업자승인: 대기 목록 → T1/T2/T3 선택 승인 → BIZ_MEMBERS·BIZ_DIRECTORY·USERS 동기화. 거절 처리도 가능.",
  "주문 관리 및 운송장 입력": "관리자→주문관리: 실주문 목록(최신순) → 행 클릭 상세 → 상태변경(결제완료/준비중/배송중/배송완료) → 운송장 입력 → 알림톡 발송.",
  "단가 그룹 설정": "관리자→단가그룹: T1/T2/T3 할인율 입력 → 실시간 미리보기 → 저장 → 전체 상품 단가 즉시 재계산. T1>T2>T3 유효성 검사.",
  "배너 관리": "관리자→배너: 4개 슬롯(메인/중단1·2/하단) 이미지 업로드(IndexedDB) → 저장 → 쇼핑몰 즉시 반영.",
  "카카오 홍보 발송": "상품목록 체크박스 선택 → 카카오 홍보 발송 버튼 → tier 필터 → 수신자 선택 → 문구 편집 → 예약발송 옵션.",
  "스마트스토어 연동": "상품목록 N 버튼 → 카테고리 자동매핑 확인 → API 키 입력(localStorage) → 등록 → 결과 배지 표시.",
  "재고 현황 관리": "관리자→재고현황: 상품별 재고 테이블, 필터(전체/부족/품절) → 동기화 버튼(이카운트 시뮬레이션).",
  "비회원 상품 탐색": "메인 접속 → 좌측 카테고리(PC)/상단탭(모바일) → 상품 그리드 → 클릭 → 상세팝업(소비자가) → 장바구니 담기 시 로그인 유도.",
  "회원가입 → 로그인": "GNB 회원가입 → 이름/이메일/비밀번호/확인 → 유효성검사 → 가입 → 자동로그인. 로그인: 이메일+PW → JWT → GNB 변경.",
  "카테고리 탐색 및 검색": "PC 사이드바/모바일 상단탭 카테고리 클릭 → 상품 필터. GNB 검색창(PC)/하단탭 검색(모바일) → 실시간 결과.",
  "상품 상세 페이지": "상품 클릭 → 좌측썸네일·중앙메인이미지·우측정보(단가·재고·배지) → 하단 상세설명·이미지 탭 → 수량 → 장바구니.",
  "장바구니 담기 및 관리": "상품상세→장바구니담기 → GNB 배지 증가 → 장바구니 화면: 수량변경/삭제/금액계산/배송비(5만원 무료). 견적요청 버튼.",
  "주문서 작성 및 결제": "장바구니→주문하기(로그인 확인) → 주문자 자동입력 → 주소검색(카카오SDK) → 배송메모 → 결제수단 → 유효성검사 → 결제(토스SDK or 시뮬레이션).",
  "마이페이지 확인": "GNB 아바타 클릭 → 마이페이지 모달: 프로필탭(이름·연락처 수정) / 주문내역탭 / 보안탭(비밀번호변경).",
  "배송 추적": "마이페이지→주문내역 → 카드 클릭 → 주문상세 모달: 타임라인·운송장번호 확인.",
  "모바일 UX": "하단탭바(홈/카테고리/검색/장바구니/마이) → 검색 오버레이 → 바텀시트 상품상세 → role별 마이탭 분기.",
  "인기상품 섹션": "메인 배너 클릭 → 인기상품 섹션 펼침(스크롤) → 썸네일·품절배지·상품카드 → 클릭→상세.",
  "사업자 회원가입 플로우": "회원가입→사업자탭 → 상호명·사업자번호·업종 입력 → 가입 → pendingUsers 추가 → 관리자 승인배지 증가.",
  "승인 대기 상태 경험": "가입 후 GNB '승인 심사 중' → 상품탐색 가능하나 단가는 소비자가 → 관리자 승인 후 T1/T2/T3 배지·단가 즉시 변경.",
  "도매 단가 확인": "T1 로그인 → 상품상세팝업 우측 '내 단가(T1) XX원' 강조 표시 → 소비자가 대비 30% 할인 확인.",
  "대량 장바구니 담기": "여러 상품 수량 입력 → 장바구니 → 도매단가 합산 → 배송비(5만↑ 무료) → 주문하기.",
  "견적서 발송 기능": "장바구니→견적요청버튼 → 3단계: 견적확인(품목·공급가·VAT) / 사업자선택(BIZ_DIRECTORY) / 전송수단(이메일·카카오).",
  "도매 주문 및 결제": "장바구니→주문하기 → T1 단가 적용 주문서 → 배송지 → 결제 → ORDERS에 tier:'t1' 저장.",
  "마이페이지 주문 내역": "GNB→마이페이지→주문내역탭 → 본인 주문 카드(주문번호·상태·금액) → 클릭→주문상세모달.",
  "단가 등급별 가격 표시": "T1 로그인 시 상품 그리드·상세·장바구니·주문서 모든 곳에서 T1 단가 표시. T2·T3 각각 22%·12% 할인.",
  "사업자 정보 관리": "마이페이지→프로필탭 → 사업자 섹션(상호명 수정 가능, 사업자번호 readonly) → 저장 → USERS 업데이트.",
  "카카오 홍보 수신": "관리자 홍보발송 → 알리고 API → 수신자 전화번호로 알림톡 → 실제 배포 시만 동작, 데모는 시뮬레이션.",
}

// 결과 파싱
function parseResult(text) {
  const extract = (tag) => {
    const m = text.match(new RegExp(`\\[${tag}\\]([\\s\\S]*?)(?=\\[|$)`))
    return m ? m[1].trim() : ""
  }
  const parseItems = (section) =>
    section.split("\n").map(l => l.trim()).filter(l => l.match(/^[✅⚠️❌🔧💡📋]/))

  const summary = extract("요약")
  const scoreText = extract("완성도")
  const score = parseInt((scoreText.match(/\d+/) || ["0"])[0])

  return {
    summary,
    score,
    ok:      parseItems(extract("정상 동작") || extract("잘된 UX") || extract("B2B 잘된 기능")),
    warn:    parseItems(extract("개선 필요") || extract("혼란스러운 부분") || extract("실무 불편 사항")),
    error:   parseItems(extract("오류·미구현") || extract("막힌 부분·오류") || extract("B2B 필수 누락 기능")),
    suggest: parseItems(extract("개선 제안") || extract("사용자 제안") || extract("추가 요청")),
    raw:     text,
  }
}

// 점수 색상
function scoreColor(s) {
  if (s >= 80) return { bg:"#DCFCE7", text:"#166534", border:"#86EFAC" }
  if (s >= 60) return { bg:"#FEF3C7", text:"#92400E", border:"#FCD34D" }
  return { bg:"#FEE2E2", text:"#991B1B", border:"#FCA5A5" }
}

export default function App() {
  const [tab, setTab]           = useState("admin")
  const [loading, setLoading]   = useState(false)
  const [results, setResults]   = useState({ admin:{}, consumer:{}, business:{} })
  const [curScenario, setCur]   = useState("")
  const [view, setView]         = useState("scenarios") // "scenarios" | "results" | "report"
  const [report, setReport]     = useState(null)
  const [reportLoading, setRL]  = useState(false)

  const persona = PERSONAS[tab]
  const myResults = results[tab]
  const doneCount = Object.keys(myResults).length
  const totalCount = persona.scenarios.length
  const allDone = Object.values(results).flatMap(r => Object.values(r)).length

  async function runScenario(scenario) {
    if (loading) return
    setCur(scenario)
    setLoading(true)
    setView("results")

    const detail = SCENARIO_INFO[scenario] || ""
    const prompt = `[테스트 시나리오: ${scenario}]\n\n구현 상태 정보:\n${detail}\n\n위 시나리오를 테스트하고 평가해주세요.`

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: persona.prompt,
          messages: [{ role:"user", content: prompt }],
        }),
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || "응답 없음"
      const parsed = parseResult(text)
      setResults(prev => ({
        ...prev,
        [tab]: { ...prev[tab], [scenario]: parsed }
      }))
    } catch(e) {
      setResults(prev => ({
        ...prev,
        [tab]: { ...prev[tab], [scenario]: { summary:"오류: "+e.message, score:0, ok:[], warn:[], error:[], suggest:[], raw:"" } }
      }))
    }
    setLoading(false)
    setCur("")
  }

  async function runAll() {
    for (const sc of persona.scenarios) {
      if (!myResults[sc]) await runScenario(sc)
    }
  }

  async function generateReport() {
    setRL(true)
    setView("report")
    const summary = Object.entries(results).map(([pid, res]) => {
      const p = PERSONAS[pid]
      const items = Object.entries(res).map(([sc, r]) =>
        `  ${sc}: ${r.score}점 — ${r.summary}`
      ).join("\n")
      return `## ${p.name} (${p.label}) 테스트 결과\n${items}`
    }).join("\n\n")

    const avgScore = (() => {
      const all = Object.values(results).flatMap(r => Object.values(r).map(v => v.score)).filter(Boolean)
      return all.length ? Math.round(all.reduce((a,b)=>a+b,0)/all.length) : 0
    })()

    const prompt = `다음은 라이트팩토리 쇼핑몰 테스트 결과입니다:\n\n${summary}\n\n전체 평균 점수: ${avgScore}점\n\n아래 형식으로 종합 리포트를 작성하세요:\n\n[종합평가] 전체 완성도와 서비스 오픈 가능성\n[전체점수] X/100점\n\n[즉시수정] (🚨 기호)\n🚨 항목\n\n[우선개선] (🔴 기호)\n🔴 항목\n\n[권장개선] (🟡 기호)\n🟡 항목\n\n[잘된기능] (🟢 기호)\n🟢 항목\n\n[오픈체크] (☐/☑ 기호로 준비됨/미준비)\n☑ 항목\n☐ 항목\n\n[결론] 2-3문장으로 최종 의견`

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1500,
          system:"당신은 쇼핑몰 QA 전문가입니다. 테스트 결과를 종합해 명확한 리포트를 작성합니다.",
          messages:[{role:"user",content:prompt}],
        }),
      })
      const data = await res.json()
      setReport(data.content?.[0]?.text || "응답 없음")
    } catch(e) { setReport("리포트 생성 오류: "+e.message) }
    setRL(false)
  }

  // 리포트 파싱
  function parseReport(text) {
    if (!text) return null
    const ex = (tag) => { const m=text.match(new RegExp(`\\[${tag}\\]([\\s\\S]*?)(?=\\[|$)`)); return m?m[1].trim():"" }
    const items = (s) => s.split("\n").map(l=>l.trim()).filter(Boolean)
    return {
      summary: ex("종합평가"),
      score:   parseInt((ex("전체점수").match(/\d+/)||["0"])[0]),
      urgent:  items(ex("즉시수정")),
      high:    items(ex("우선개선")),
      mid:     items(ex("권장개선")),
      good:    items(ex("잘된기능")),
      check:   items(ex("오픈체크")),
      conclude:ex("결론"),
    }
  }

  const avgScoreAll = (() => {
    const all = Object.values(results).flatMap(r=>Object.values(r).map(v=>v.score)).filter(Boolean)
    return all.length ? Math.round(all.reduce((a,b)=>a+b,0)/all.length) : 0
  })()

  const S = { // 공통 스타일
    card: { background:"#fff", border:"1px solid #E5E7EB", borderRadius:"12px", padding:"16px" },
    label: { fontSize:"11px", fontWeight:"600", color:"#6B7280", letterSpacing:".06em", textTransform:"uppercase" },
    chip: (color) => ({ display:"inline-flex", alignItems:"center", gap:"5px", padding:"3px 10px", borderRadius:"20px", fontSize:"12px", fontWeight:"500", background:color }),
  }

  return (
    <div style={{ fontFamily:"'Noto Sans KR',system-ui,sans-serif", background:"#F9FAFB", minHeight:"100vh", color:"#111827" }}>

      {/* 헤더 */}
      <div style={{ background:"#1A1917", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <span style={{ fontSize:"16px", fontWeight:"700", color:"#fff", letterSpacing:".04em" }}>💡 라이트팩토리</span>
          <span style={{ fontSize:"11px", padding:"3px 9px", borderRadius:"4px", background:"rgba(201,168,76,.2)", color:"#C9A84C", border:"1px solid rgba(201,168,76,.3)", fontWeight:"500" }}>QA 에이전트</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          {avgScoreAll > 0 && (
            <span style={{ fontSize:"13px", color:"rgba(255,255,255,.6)" }}>
              평균 <strong style={{ color:"#C9A84C", fontSize:"16px" }}>{avgScoreAll}</strong>점
            </span>
          )}
          {allDone >= 5 && (
            <button onClick={generateReport} style={{
              padding:"6px 14px", borderRadius:"7px", border:"1px solid rgba(201,168,76,.4)",
              background:"rgba(201,168,76,.1)", color:"#C9A84C", fontSize:"12.5px",
              fontWeight:"500", cursor:"pointer", fontFamily:"inherit",
            }}>
              📊 전체 리포트
            </button>
          )}
        </div>
      </div>

      {/* 페르소나 탭 */}
      <div style={{ background:"#fff", borderBottom:"1px solid #E5E7EB", padding:"0 24px", display:"flex", gap:"0" }}>
        {Object.values(PERSONAS).map(p => {
          const cnt = Object.keys(results[p.id]).length
          const isActive = tab === p.id
          return (
            <button key={p.id} onClick={() => { setTab(p.id); setView("scenarios") }}
              style={{
                padding:"13px 20px", border:"none", borderBottom:`3px solid ${isActive?p.accent:"transparent"}`,
                background:"transparent", color:isActive?p.accent:"#6B7280",
                fontWeight:isActive?"600":"400", fontSize:"13.5px", cursor:"pointer",
                fontFamily:"inherit", display:"flex", alignItems:"center", gap:"7px", transition:"all .15s",
              }}>
              <span>{p.icon}</span>
              <span>{p.name}</span>
              {cnt > 0 && (
                <span style={{ fontSize:"11px", padding:"1px 7px", borderRadius:"10px",
                  background:isActive?p.accent:"#E5E7EB", color:isActive?"#fff":"#6B7280", fontWeight:"600" }}>
                  {cnt}/{p.scenarios.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"20px 24px" }}>

        {/* 페르소나 정보 카드 */}
        <div style={{ ...S.card, background:persona.light, border:`1px solid ${persona.border}`, marginBottom:"16px", display:"flex", alignItems:"center", gap:"14px" }}>
          <div style={{ fontSize:"32px" }}>{persona.icon}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:"600", fontSize:"15px", color:persona.accent }}>{persona.label}</div>
            <div style={{ fontSize:"13px", color:"#6B7280", marginTop:"2px" }}>{persona.desc}</div>
          </div>
          <div style={{ display:"flex", gap:"8px" }}>
            <button onClick={() => setView("scenarios")}
              style={{ padding:"7px 14px", borderRadius:"8px", border:`1px solid ${persona.border}`,
                background:view==="scenarios"?persona.accent:"transparent",
                color:view==="scenarios"?"#fff":persona.accent, fontSize:"12.5px",
                fontWeight:"500", cursor:"pointer", fontFamily:"inherit" }}>
              시나리오
            </button>
            {doneCount > 0 && (
              <button onClick={() => setView("results")}
                style={{ padding:"7px 14px", borderRadius:"8px", border:`1px solid ${persona.border}`,
                  background:view==="results"?persona.accent:"transparent",
                  color:view==="results"?"#fff":persona.accent, fontSize:"12.5px",
                  fontWeight:"500", cursor:"pointer", fontFamily:"inherit" }}>
                결과 보기 ({doneCount})
              </button>
            )}
            <button onClick={runAll} disabled={loading || doneCount===totalCount}
              style={{ padding:"7px 14px", borderRadius:"8px", border:`1px solid ${persona.border}`,
                background:persona.accent, color:"#fff", fontSize:"12.5px",
                fontWeight:"500", cursor:loading||doneCount===totalCount?"not-allowed":"pointer",
                fontFamily:"inherit", opacity:loading||doneCount===totalCount?.6:1 }}>
              {loading ? "테스트 중…" : doneCount===totalCount ? "완료" : "전체 실행"}
            </button>
          </div>
        </div>

        {/* ── 시나리오 그리드 ── */}
        {view === "scenarios" && (
          <div>
            <div style={{ ...S.label, marginBottom:"12px" }}>테스트 시나리오 ({totalCount}개)</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"10px" }}>
              {persona.scenarios.map((sc, i) => {
                const res = myResults[sc]
                const isRunning = curScenario === sc && loading
                const sc_info = SCENARIO_INFO[sc] || ""
                return (
                  <div key={i} onClick={() => !loading && runScenario(sc)}
                    style={{
                      ...S.card,
                      cursor: loading ? "not-allowed" : "pointer",
                      border: res ? `1px solid ${res.score>=70?"#86EFAC":res.score>=50?"#FCD34D":"#FCA5A5"}` : "1px solid #E5E7EB",
                      background: isRunning ? "#F0F9FF" : res ? (res.score>=70?"#F0FDF4":res.score>=50?"#FFFBEB":"#FEF2F2") : "#fff",
                      transition: "all .15s",
                      position: "relative",
                    }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"6px" }}>
                      <div style={{ fontSize:"13.5px", fontWeight:"600", color:"#111827", flex:1, paddingRight:"8px" }}>{sc}</div>
                      {res && (
                        <div style={{ ...scoreColor(res.score), padding:"3px 9px", borderRadius:"6px", fontSize:"13px", fontWeight:"700", flexShrink:0,
                          background:scoreColor(res.score).bg, color:scoreColor(res.score).text, border:`1px solid ${scoreColor(res.score).border}` }}>
                          {res.score}점
                        </div>
                      )}
                      {isRunning && <div style={{ width:"18px", height:"18px", border:`2px solid ${persona.accent}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .7s linear infinite" }}/>}
                    </div>
                    {res ? (
                      <div style={{ fontSize:"12.5px", color:"#374151", lineHeight:"1.5" }}>{res.summary}</div>
                    ) : (
                      <div style={{ fontSize:"12px", color:"#9CA3AF", lineHeight:"1.5", display:"-webkit-box", WebkitLineClamp:"2", WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                        {sc_info.split(".")[0]}
                      </div>
                    )}
                    {res && (
                      <div style={{ display:"flex", gap:"5px", marginTop:"9px", flexWrap:"wrap" }}>
                        {res.ok.length>0 && <span style={{ ...S.chip("#DCFCE7"), color:"#166534" }}>✅ {res.ok.length}</span>}
                        {res.warn.length>0 && <span style={{ ...S.chip("#FEF3C7"), color:"#92400E" }}>⚠️ {res.warn.length}</span>}
                        {res.error.length>0 && <span style={{ ...S.chip("#FEE2E2"), color:"#991B1B" }}>❌ {res.error.length}</span>}
                      </div>
                    )}
                    {!res && !isRunning && (
                      <div style={{ marginTop:"8px", fontSize:"11.5px", color:persona.accent, fontWeight:"500" }}>클릭해서 테스트 실행 →</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 결과 상세 뷰 ── */}
        {view === "results" && (
          <div>
            <div style={{ ...S.label, marginBottom:"14px" }}>테스트 결과 상세</div>
            {persona.scenarios.filter(sc => myResults[sc]).map((sc, i) => {
              const res = myResults[sc]
              const sc_ = scoreColor(res.score)
              return (
                <div key={i} style={{ ...S.card, marginBottom:"12px" }}>
                  {/* 헤더 */}
                  <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"14px" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"15px", fontWeight:"700", color:"#111827" }}>{sc}</div>
                      <div style={{ fontSize:"13px", color:"#6B7280", marginTop:"3px" }}>{res.summary}</div>
                    </div>
                    <div style={{
                      width:"64px", height:"64px", borderRadius:"50%",
                      background:sc_.bg, border:`3px solid ${sc_.border}`,
                      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                    }}>
                      <span style={{ fontSize:"20px", fontWeight:"800", color:sc_.text, lineHeight:1 }}>{res.score}</span>
                      <span style={{ fontSize:"9px", color:sc_.text, fontWeight:"500" }}>/ 100</span>
                    </div>
                  </div>

                  {/* 4개 섹션 그리드 */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                    {[
                      { title:"✅ 정상 동작", items:res.ok,     bg:"#F0FDF4", border:"#BBF7D0", tc:"#166534" },
                      { title:"⚠️ 개선 필요", items:res.warn,   bg:"#FFFBEB", border:"#FDE68A", tc:"#92400E" },
                      { title:"❌ 오류·미구현",items:res.error,  bg:"#FEF2F2", border:"#FECACA", tc:"#991B1B" },
                      { title:"🔧 개선 제안", items:res.suggest, bg:"#EFF6FF", border:"#BFDBFE", tc:"#1D4ED8" },
                    ].map(({ title, items, bg, border, tc }) => items.length > 0 && (
                      <div key={title} style={{ background:bg, border:`1px solid ${border}`, borderRadius:"8px", padding:"12px" }}>
                        <div style={{ fontSize:"11.5px", fontWeight:"700", color:tc, marginBottom:"8px" }}>{title}</div>
                        {items.map((item, j) => (
                          <div key={j} style={{ fontSize:"12.5px", color:"#374151", padding:"4px 0", borderBottom:j<items.length-1?`1px solid ${border}`:"none", lineHeight:"1.5" }}>
                            {item}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {persona.scenarios.filter(sc => !myResults[sc]).length > 0 && (
              <div style={{ textAlign:"center", padding:"20px", color:"#9CA3AF", fontSize:"13px" }}>
                미완료 시나리오 {persona.scenarios.filter(sc=>!myResults[sc]).length}개 남음 —
                <button onClick={runAll} disabled={loading} style={{ marginLeft:"8px", color:persona.accent, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:"13px", fontWeight:"500" }}>
                  전체 실행
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 종합 리포트 뷰 ── */}
        {view === "report" && (
          <div>
            <div style={{ ...S.label, marginBottom:"14px" }}>📊 종합 테스트 리포트</div>
            {reportLoading && (
              <div style={{ ...S.card, textAlign:"center", padding:"40px", color:"#9CA3AF" }}>
                <div style={{ fontSize:"24px", marginBottom:"10px" }}>📋</div>
                <div>리포트 생성 중…</div>
              </div>
            )}
            {report && !reportLoading && (() => {
              const r = parseReport(report)
              if (!r) return <div style={{ ...S.card, whiteSpace:"pre-wrap", fontSize:"13px" }}>{report}</div>
              const sc_ = scoreColor(r.score)
              return (
                <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                  {/* 종합 점수 */}
                  <div style={{ ...S.card, display:"flex", alignItems:"center", gap:"20px" }}>
                    <div style={{ width:"90px", height:"90px", borderRadius:"50%", background:sc_.bg, border:`4px solid ${sc_.border}`,
                      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ fontSize:"28px", fontWeight:"800", color:sc_.text }}>{r.score}</span>
                      <span style={{ fontSize:"11px", color:sc_.text }}>/ 100</span>
                    </div>
                    <div>
                      <div style={{ fontSize:"16px", fontWeight:"700", marginBottom:"5px" }}>전체 종합 평가</div>
                      <div style={{ fontSize:"13.5px", color:"#374151", lineHeight:"1.6" }}>{r.summary}</div>
                    </div>
                  </div>

                  {/* 이슈 분류 */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                    {[
                      { title:"🚨 즉시 수정 필요", items:r.urgent, bg:"#FEF2F2", border:"#FECACA", tc:"#991B1B" },
                      { title:"🔴 우선 개선 권장", items:r.high,   bg:"#FFF7ED", border:"#FED7AA", tc:"#9A3412" },
                      { title:"🟡 중장기 개선",    items:r.mid,    bg:"#FEFCE8", border:"#FEF08A", tc:"#854D0E" },
                      { title:"🟢 잘 구현된 기능", items:r.good,   bg:"#F0FDF4", border:"#BBF7D0", tc:"#166534" },
                    ].map(({ title, items, bg, border, tc }) => (
                      <div key={title} style={{ background:bg, border:`1px solid ${border}`, borderRadius:"10px", padding:"14px" }}>
                        <div style={{ fontSize:"12.5px", fontWeight:"700", color:tc, marginBottom:"10px" }}>{title}</div>
                        {items.length > 0 ? items.map((item, j) => (
                          <div key={j} style={{ fontSize:"12.5px", color:"#374151", padding:"5px 0", borderBottom:j<items.length-1?`1px solid ${border}`:"none", lineHeight:"1.5" }}>
                            {item}
                          </div>
                        )) : <div style={{ fontSize:"12px", color:tc, opacity:.5 }}>해당 없음</div>}
                      </div>
                    ))}
                  </div>

                  {/* 오픈 체크리스트 */}
                  {r.check.length > 0 && (
                    <div style={{ ...S.card }}>
                      <div style={{ fontSize:"13px", fontWeight:"700", marginBottom:"12px" }}>📋 서비스 오픈 체크리스트</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px" }}>
                        {r.check.map((item, i) => {
                          const done = item.startsWith("☑")
                          return (
                            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"8px", padding:"7px 10px",
                              borderRadius:"7px", background:done?"#F0FDF4":"#FEF2F2", border:`1px solid ${done?"#BBF7D0":"#FECACA"}` }}>
                              <span style={{ fontSize:"14px", flexShrink:0 }}>{done?"✅":"⬜"}</span>
                              <span style={{ fontSize:"12.5px", color:done?"#166534":"#991B1B", lineHeight:"1.4" }}>
                                {item.replace(/^[☑☐]\s*/,"")}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 결론 */}
                  {r.conclude && (
                    <div style={{ ...S.card, background:"#1A1917", border:"1px solid #374151" }}>
                      <div style={{ fontSize:"11.5px", fontWeight:"600", color:"#C9A84C", marginBottom:"8px", letterSpacing:".06em" }}>최종 의견</div>
                      <div style={{ fontSize:"13.5px", color:"rgba(255,255,255,.85)", lineHeight:"1.7" }}>{r.conclude}</div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        button:hover { opacity:.88 }
      `}</style>
    </div>
  )
}
