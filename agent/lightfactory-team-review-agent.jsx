import { useState, useEffect } from "react"

/* ══════════════════════════════════════════════════════════
   라이트팩토리 4팀장 상호검증 에이전트
   - 기획팀장 / 개발팀장 / 품질팀장 / 디자인UX팀장
   - 4명이 동시 병렬로 검증 → 교차 질의/응답 → 통합 리포트
   - 사용법: 우측 상단 "전체 검증 실행" → 결과 확인 → "교차질의"
══════════════════════════════════════════════════════════ */

const LEADS = {
  pm: {
    id:"pm", name:"기획팀장", label:"정기획 PM",
    icon:"📋", color:"#7C3AED", light:"#F3E8FF", border:"#C4B5FD",
    desc:"B2C+B2B 쇼핑몰 기획 10년차 / PO·서비스기획 베테랑",
    focus:["사용자 스토리","비즈니스 로직","B2B 운영 사이클","누락 기능","법적 요건"],
    prompt:`당신은 라이트팩토리 쇼핑몰의 기획팀장(PM/PO)입니다. B2C+B2B 도매 기획 10년차입니다.
검토 기준:
1. 사용자 스토리 완성도 (비회원→회원→사업자 등급 전환)
2. 비즈니스 로직 정합성 (T1/T2/T3 단가, 견적서, 승인 워크플로우)
3. B2B 핵심 누락 기능 (세금계산서, 후불결제, 다중배송지, RMA, 재구매)
4. 사용자 여정 막힘 지점 (이탈 가능 지점)
5. 법적 요건 (약관, 개인정보, 전자상거래법)

반드시 아래 형식으로 답변하세요:

[요약] 한 줄 평가
[완성도] X/100점

[강점] (✅ 기호)
✅ 항목

[누락 기능] (❌ 기호, 우선순위 표기)
❌ 기능명 [High/Mid/Low] - 이유

[비즈니스 로직 결함] (⚠️ 기호)
⚠️ 항목

[다른 팀장에게 요청] (💬 기호)
💬 [개발팀장] ...
💬 [품질팀장] ...
💬 [디자인팀장] ...

[액션 아이템] (🎯 기호)
🎯 항목

400-500단어, 구체적 코드 위치 인용.`,
  },
  dev: {
    id:"dev", name:"개발팀장", label:"김개발 Tech Lead",
    icon:"⚙️", color:"#0891B2", light:"#CFFAFE", border:"#67E8F9",
    desc:"풀스택 시니어 12년차 / 보안·성능·아키텍처 검토 전문",
    focus:["아키텍처","보안 취약점","성능 병목","코드 품질","결제 안정성"],
    prompt:`당신은 라이트팩토리 쇼핑몰의 개발팀장(Tech Lead)입니다. 풀스택 12년차이며 보안·성능 전문입니다.
검토 기준:
1. 아키텍처 (단일 HTML vs 모듈화, 백엔드 분리)
2. 보안 (DEV_MODE, 평문 비밀번호, XSS, CSRF, 결제 위변조, API 키 노출)
3. 데이터 무결성 (localStorage 클라이언트 조작)
4. 성능 (초기 로드, 렌더링, 메모리)
5. 코드 품질 (try/catch, 매직넘버, 컨벤션)
6. 결제 안정성 (토스 confirm 서버 검증)

반드시 아래 형식으로 답변하세요:

[요약] 한 줄 평가
[완성도] X/100점

[Critical 보안] (🚨 기호)
🚨 항목 - 위치 - 수정안

[아키텍처 문제] (🏗️ 기호)
🏗️ 항목

[성능 병목] (⚡ 기호)
⚡ 항목

[배포전 체크리스트] (□ 기호)
□ 항목

[다른 팀장에게 요청] (💬 기호)
💬 [기획팀장] ...
💬 [품질팀장] ...
💬 [디자인팀장] ...

[액션 아이템] (🎯 기호)
🎯 D+N: 항목

400-500단어, 구체적 라인/패턴 인용.`,
  },
  qa: {
    id:"qa", name:"품질팀장", label:"이품질 QA Lead",
    icon:"🔍", color:"#DC2626", light:"#FEE2E2", border:"#FCA5A5",
    desc:"이커머스 QA 8년차 / 테스트 자동화·엣지케이스 전문",
    focus:["테스트 커버리지","엣지케이스","권한경계","회귀 안정성","자동화 전략"],
    prompt:`당신은 라이트팩토리 쇼핑몰의 품질팀장(QA Lead)입니다. 이커머스 QA 8년차입니다.
검토 기준:
1. 기존 QA 에이전트 시나리오 커버리지 평가
2. 엣지케이스 (음수/0/특수문자/XSS, 중복가입, 권한상승, 동시성)
3. 결제 안정성 (실패/취소/중복/idempotency)
4. 테스트 매트릭스 (역할×화면×브라우저×해상도)
5. 자동화 ROI (Playwright/단위/시각회귀)

반드시 아래 형식으로 답변하세요:

[요약] 한 줄 평가
[완성도] X/100점

[기존 QA 평가]
강점: ...
빠진 시나리오: ...

[Critical 엣지케이스] (🔥 기호)
🔥 시나리오 - 예상결과 - 위험도

[테스트 매트릭스 갭] (📊 기호)
📊 항목

[자동화 추천] (🤖 기호)
🤖 항목

[다른 팀장에게 요청] (💬 기호)
💬 [기획팀장] ...
💬 [개발팀장] ...
💬 [디자인팀장] ...

[추가 시나리오 5개] (🧪 기호)
🧪 시나리오

400-500단어.`,
  },
  ux: {
    id:"ux", name:"디자인/UX팀장", label:"박디자인 UX Lead",
    icon:"🎨", color:"#DB2777", light:"#FCE7F3", border:"#F9A8D4",
    desc:"이커머스 UX 디자인 10년차 / 접근성·모바일·B2B 전문",
    focus:["디자인 일관성","정보 위계","모바일 UX","접근성","퍼널 시각화"],
    prompt:`당신은 라이트팩토리 쇼핑몰의 디자인/UX팀장입니다. 이커머스 UX 10년차입니다.
검토 기준:
1. 시각적 일관성 (색상 #C9A84C 골드·#1A1917 다크·Noto Sans KR·Playfair)
2. 정보 위계 (B2C/B2B/관리자 분기 인지성)
3. 모바일 대응 (하단탭바, 바텀시트, 반응형)
4. 접근성 (alt, aria-label, 키보드, 색상대비 WCAG AA)
5. 퍼널 시각화 (스텝퍼, 신뢰배지, 로딩/에러 상태)
6. B2B 도매 UX (대량주문, 단가비교, 절약액 강조)

반드시 아래 형식으로 답변하세요:

[요약] 한 줄 평가
[완성도] X/100점

[디자인 강점] (✅ 기호)
✅ 항목

[퍼널 막힘] (🚧 기호)
🚧 위치 - 문제 - 개선안

[접근성 이슈] (♿ 기호)
♿ 항목

[모바일 UX 이슈] (📱 기호)
📱 항목

[B2B 전용 개선] (🏢 기호)
🏢 항목

[다른 팀장에게 요청] (💬 기호)
💬 [기획팀장] ...
💬 [개발팀장] ...
💬 [품질팀장] ...

[액션 아이템] (🎯 기호)
🎯 항목

400-500단어, 구체적 CSS/클래스명 인용.`,
  },
  sales: {
    id:"sales", name:"영업팀장", label:"한영업 Sales Lead",
    icon:"💼", color:"#059669", light:"#D1FAE5", border:"#6EE7B7",
    desc:"조명·전기자재 도매 영업 15년차 / 시장조사·품목 기획·도매 단가·시공업체 영업 전문",
    focus:["품목 기획","경쟁사 분석","가격 정책","카테고리 구성","B2B 영업"],
    prompt:`당신은 라이트팩토리 쇼핑몰의 영업팀장입니다. 조명·전기자재 도매 15년차이며 시장조사·품목등록·B2B 영업이 전문입니다.
검토 기준:
1. 품목 라인업 충실도 (인테리어 시공업체가 한 곳에서 끝낼 수 있는가)
2. 가격 정책 정합성 (도매 단가 T1/T2/T3 마진 보호)
3. 카테고리 트리 분류 명료성 (시공 BOM 매칭)
4. 경쟁사 대비 차별 포인트 (visrova, 룸앤조명, 코지룸 등)
5. 신규 상품 발굴 (Matter IOT, 마그네틱, 천연석 등 트렌드)
6. 인기상품/추천상품 큐레이션

반드시 아래 형식으로 답변하세요:

[요약] 한 줄 평가
[완성도] X/100점

[라인업 강점] (✅ 기호)
✅ 항목

[누락 카테고리/품목] (❌ 기호)
❌ 항목 - 시장 수요 근거

[가격 정책 이슈] (💰 기호)
💰 항목 - 권장 조정안

[경쟁사 대비 차별 포인트] (🎯 기호)
🎯 항목

[다른 팀장에게 요청] (💬 기호)
💬 [기획팀장] ...
💬 [개발팀장] ...
💬 [품질팀장] ...
💬 [디자인팀장] ...

[등록 권장 신규 품목] (📦 기호)
📦 품목명 / 예상가 / 카테고리

400-500단어, 실제 시장가/브랜드명 인용.`,
  },
}

const TARGET_INFO = `
검토 대상: 라이트팩토리 쇼핑몰 (B2C+B2B 도매)
- shop/index.html (단일 HTML 약 413KB, 8254라인)
- agent/lightfactory-test-agent.jsx (기존 QA 페르소나 에이전트)
- backend/lightfactory-v2-naver.tar.gz (Next.js + 네이버 스마트스토어)
주요 기능:
- 4단 role: consumer / pending / t1·t2·t3 / admin
- 도매단가 R={t1:.3,t2:.22,t3:.12}
- 토스페이먼츠, 카카오 우편번호, 카카오 알림톡, 네이버 스마트스토어
- 견적서 3-step 퍼널, 사업자 승인 워크플로우
- localStorage + IndexedDB (이미지)
배포 전 필수 (README): DEV_MODE=false, 관리자 PW 변경, 토스 키 입력
`

function parseLead(text) {
  const ex = (tag) => {
    const m = text.match(new RegExp(`\\[${tag}\\]([\\s\\S]*?)(?=\\n\\[|$)`))
    return m ? m[1].trim() : ""
  }
  const items = (s, prefix) =>
    s.split("\n").map(l => l.trim()).filter(l => prefix ? l.startsWith(prefix) : l && !l.startsWith("["))

  const summary = ex("요약")
  const score = parseInt((ex("완성도").match(/\d+/) || ["0"])[0])
  const crossRaw = ex("다른 팀장에게 요청")
  const cross = crossRaw.split("\n").map(l => l.trim()).filter(l => l.startsWith("💬"))

  return {
    summary, score,
    sections: {
      "강점": items(ex("강점"), "✅"),
      "Critical 보안": items(ex("Critical 보안"), "🚨"),
      "Critical 엣지케이스": items(ex("Critical 엣지케이스"), "🔥"),
      "퍼널 막힘": items(ex("퍼널 막힘"), "🚧"),
      "누락 기능": items(ex("누락 기능"), "❌"),
      "비즈니스 로직 결함": items(ex("비즈니스 로직 결함"), "⚠️"),
      "아키텍처 문제": items(ex("아키텍처 문제"), "🏗️"),
      "성능 병목": items(ex("성능 병목"), "⚡"),
      "테스트 매트릭스 갭": items(ex("테스트 매트릭스 갭"), "📊"),
      "자동화 추천": items(ex("자동화 추천"), "🤖"),
      "접근성 이슈": items(ex("접근성 이슈"), "♿"),
      "모바일 UX 이슈": items(ex("모바일 UX 이슈"), "📱"),
      "B2B 전용 개선": items(ex("B2B 전용 개선"), "🏢"),
      "배포전 체크리스트": items(ex("배포전 체크리스트"), "□"),
      "추가 시나리오": items(ex("추가 시나리오 5개"), "🧪"),
      "액션 아이템": items(ex("액션 아이템"), "🎯"),
    },
    cross,
    raw: text,
  }
}

function scoreColor(s) {
  if (s >= 80) return { bg:"#DCFCE7", text:"#166534", border:"#86EFAC" }
  if (s >= 60) return { bg:"#FEF3C7", text:"#92400E", border:"#FCD34D" }
  return { bg:"#FEE2E2", text:"#991B1B", border:"#FCA5A5" }
}

export default function App() {
  const [results, setResults] = useState({}) // {pm:{...}, dev:{...}, ...}
  const [loading, setLoading] = useState({}) // {pm:true, ...}
  const [currentTab, setTab] = useState("overview")
  const [report, setReport] = useState(null)
  const [reportLoading, setRL] = useState(false)

  const doneCount = Object.keys(results).length
  const allLeads = Object.values(LEADS)
  const anyLoading = Object.values(loading).some(Boolean)
  const avgScore = (() => {
    const scores = Object.values(results).map(r => r.score).filter(Boolean)
    return scores.length ? Math.round(scores.reduce((a,b)=>a+b,0) / scores.length) : 0
  })()

  async function runLead(leadId) {
    if (loading[leadId]) return
    setLoading(prev => ({ ...prev, [leadId]: true }))
    const lead = LEADS[leadId]
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: lead.prompt,
          messages: [{ role:"user", content: `${TARGET_INFO}\n\n위 라이트팩토리 쇼핑몰을 ${lead.name} 관점에서 검토하고 형식에 맞춰 답변하세요.` }],
        }),
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || "응답 없음"
      setResults(prev => ({ ...prev, [leadId]: parseLead(text) }))
    } catch(e) {
      setResults(prev => ({ ...prev, [leadId]: { summary:"오류: "+e.message, score:0, sections:{}, cross:[], raw:"" } }))
    }
    setLoading(prev => ({ ...prev, [leadId]: false }))
  }

  async function runAll() {
    // 4명 병렬 실행
    await Promise.all(allLeads.map(l => runLead(l.id)))
  }

  async function generateReport() {
    setRL(true)
    const summary = allLeads.map(l => {
      const r = results[l.id]
      if (!r) return ""
      const crossLines = r.cross.join("\n")
      return `## ${l.name} ${r.score}점\n요약: ${r.summary}\n교차요청:\n${crossLines}`
    }).join("\n\n")

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:2000,
          system:"당신은 4명의 팀장 리뷰를 종합하는 CTO 어드바이저입니다. 충돌과 합의를 식별하고 우선순위 통합 액션을 작성합니다.",
          messages:[{role:"user",content:`다음 4팀장 리뷰를 종합:\n\n${summary}\n\n전체 평균: ${avgScore}점\n\n아래 형식:\n[종합평가] 2-3문장\n[전체점수] X/100\n[합의된 P0 즉시수정] (🚨)\n[합의된 P1 우선개선] (🔴)\n[팀간 충돌사항] (⚔️)\n[2주 로드맵] (📅)\n[오픈가능여부] 결론 한 줄`}],
        }),
      })
      const data = await res.json()
      setReport(data.content?.[0]?.text || "응답 없음")
    } catch(e) { setReport("리포트 오류: "+e.message) }
    setRL(false)
  }

  const S = {
    card: { background:"#fff", border:"1px solid #E5E7EB", borderRadius:"12px", padding:"16px" },
    label: { fontSize:"11px", fontWeight:"600", color:"#6B7280", letterSpacing:".06em", textTransform:"uppercase" },
  }

  return (
    <div style={{ fontFamily:"'Noto Sans KR',system-ui,sans-serif", background:"#F9FAFB", minHeight:"100vh", color:"#111827" }}>
      {/* 헤더 */}
      <div style={{ background:"#1A1917", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <span style={{ fontSize:"16px", fontWeight:"700", color:"#fff" }}>💡 라이트팩토리</span>
          <span style={{ fontSize:"11px", padding:"3px 9px", borderRadius:"4px", background:"rgba(201,168,76,.2)", color:"#C9A84C", border:"1px solid rgba(201,168,76,.3)", fontWeight:"500" }}>4팀장 협업 검증</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          {avgScore > 0 && (
            <span style={{ fontSize:"13px", color:"rgba(255,255,255,.6)" }}>
              평균 <strong style={{ color:"#C9A84C", fontSize:"16px" }}>{avgScore}</strong>점
            </span>
          )}
          <button onClick={runAll} disabled={anyLoading}
            style={{ padding:"7px 16px", borderRadius:"7px", border:"1px solid rgba(201,168,76,.4)",
              background:anyLoading?"transparent":"#C9A84C", color:anyLoading?"#C9A84C":"#1A1917",
              fontSize:"12.5px", fontWeight:"600", cursor:anyLoading?"wait":"pointer", fontFamily:"inherit" }}>
            {anyLoading ? "검증 중…" : doneCount===4 ? "🔄 다시 실행" : "▶ 전체 검증 실행"}
          </button>
          {doneCount === 4 && !anyLoading && (
            <button onClick={generateReport} disabled={reportLoading}
              style={{ padding:"7px 14px", borderRadius:"7px", border:"1px solid rgba(201,168,76,.4)",
                background:"rgba(201,168,76,.1)", color:"#C9A84C", fontSize:"12.5px",
                fontWeight:"500", cursor:"pointer", fontFamily:"inherit" }}>
              {reportLoading ? "통합 중…" : "📊 통합 리포트"}
            </button>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div style={{ background:"#fff", borderBottom:"1px solid #E5E7EB", padding:"0 24px", display:"flex", gap:"0", overflowX:"auto" }}>
        <button onClick={() => setTab("overview")}
          style={{ padding:"13px 18px", border:"none", borderBottom:`3px solid ${currentTab==="overview"?"#C9A84C":"transparent"}`,
            background:"transparent", color:currentTab==="overview"?"#1A1917":"#6B7280",
            fontWeight:currentTab==="overview"?"600":"400", fontSize:"13.5px", cursor:"pointer", fontFamily:"inherit",
            display:"flex", alignItems:"center", gap:"6px" }}>
          <span>🎯</span><span>종합 보드</span>
        </button>
        {allLeads.map(l => {
          const r = results[l.id]
          const isActive = currentTab === l.id
          const isLoading = loading[l.id]
          return (
            <button key={l.id} onClick={() => setTab(l.id)}
              style={{ padding:"13px 18px", border:"none", borderBottom:`3px solid ${isActive?l.color:"transparent"}`,
                background:"transparent", color:isActive?l.color:"#6B7280",
                fontWeight:isActive?"600":"400", fontSize:"13.5px", cursor:"pointer", fontFamily:"inherit",
                display:"flex", alignItems:"center", gap:"7px" }}>
              <span>{l.icon}</span>
              <span>{l.name}</span>
              {isLoading && <span style={{ width:"12px", height:"12px", border:`2px solid ${l.color}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .7s linear infinite" }}/>}
              {r && (
                <span style={{ fontSize:"11px", padding:"1px 7px", borderRadius:"10px",
                  background:scoreColor(r.score).bg, color:scoreColor(r.score).text, fontWeight:"700" }}>
                  {r.score}
                </span>
              )}
            </button>
          )
        })}
        {report && (
          <button onClick={() => setTab("report")}
            style={{ padding:"13px 18px", border:"none", borderBottom:`3px solid ${currentTab==="report"?"#C9A84C":"transparent"}`,
              background:"transparent", color:currentTab==="report"?"#1A1917":"#6B7280",
              fontWeight:currentTab==="report"?"600":"400", fontSize:"13.5px", cursor:"pointer", fontFamily:"inherit",
              display:"flex", alignItems:"center", gap:"6px" }}>
            <span>📊</span><span>통합 리포트</span>
          </button>
        )}
      </div>

      <div style={{ maxWidth:"1200px", margin:"0 auto", padding:"20px 24px" }}>

        {/* ── 종합 보드 ── */}
        {currentTab === "overview" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:"14px", marginBottom:"20px" }}>
              {allLeads.map(l => {
                const r = results[l.id]
                const sc = r ? scoreColor(r.score) : null
                return (
                  <div key={l.id} onClick={() => r ? setTab(l.id) : runLead(l.id)}
                    style={{ ...S.card, background:l.light, border:`1px solid ${l.border}`, cursor:"pointer", transition:"all .15s" }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"10px" }}>
                      <div>
                        <div style={{ fontSize:"24px" }}>{l.icon}</div>
                        <div style={{ fontWeight:"700", fontSize:"15px", color:l.color, marginTop:"4px" }}>{l.name}</div>
                        <div style={{ fontSize:"11px", color:"#6B7280", marginTop:"2px" }}>{l.label}</div>
                      </div>
                      {r && sc && (
                        <div style={{ width:"54px", height:"54px", borderRadius:"50%", background:sc.bg, border:`3px solid ${sc.border}`,
                          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                          <span style={{ fontSize:"17px", fontWeight:"800", color:sc.text }}>{r.score}</span>
                        </div>
                      )}
                      {loading[l.id] && (
                        <div style={{ width:"24px", height:"24px", border:`3px solid ${l.color}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .7s linear infinite" }}/>
                      )}
                    </div>
                    <div style={{ fontSize:"11.5px", color:"#374151", lineHeight:"1.5", minHeight:"34px" }}>
                      {r ? r.summary : l.desc}
                    </div>
                    <div style={{ marginTop:"10px", display:"flex", flexWrap:"wrap", gap:"5px" }}>
                      {l.focus.map((f, i) => (
                        <span key={i} style={{ fontSize:"10.5px", padding:"2px 8px", borderRadius:"10px",
                          background:"rgba(255,255,255,.6)", color:l.color, fontWeight:"500" }}>{f}</span>
                      ))}
                    </div>
                    {!r && !loading[l.id] && (
                      <button onClick={(e) => { e.stopPropagation(); runLead(l.id) }}
                        style={{ marginTop:"10px", width:"100%", padding:"7px", borderRadius:"7px",
                          background:l.color, color:"#fff", border:"none", fontSize:"12px", fontWeight:"500",
                          cursor:"pointer", fontFamily:"inherit" }}>
                        이 팀장만 검증 실행
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 교차 요청 매트릭스 */}
            {doneCount >= 2 && (
              <div style={{ ...S.card, marginTop:"10px" }}>
                <div style={{ fontSize:"14px", fontWeight:"700", marginBottom:"12px" }}>💬 팀간 교차 요청사항</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:"10px" }}>
                  {allLeads.map(from => {
                    const r = results[from.id]
                    if (!r || !r.cross.length) return null
                    return (
                      <div key={from.id} style={{ background:from.light, border:`1px solid ${from.border}`, borderRadius:"8px", padding:"12px" }}>
                        <div style={{ fontSize:"12px", fontWeight:"700", color:from.color, marginBottom:"8px" }}>
                          {from.icon} {from.name} → 다른 팀장
                        </div>
                        {r.cross.map((c, i) => (
                          <div key={i} style={{ fontSize:"12px", color:"#374151", padding:"5px 0", borderBottom:i<r.cross.length-1?"1px solid rgba(0,0,0,.06)":"none", lineHeight:"1.5" }}>
                            {c}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 개별 팀장 상세 ── */}
        {allLeads.map(l => {
          if (currentTab !== l.id) return null
          const r = results[l.id]
          if (!r) return (
            <div key={l.id} style={{ ...S.card, textAlign:"center", padding:"60px 20px" }}>
              <div style={{ fontSize:"40px", marginBottom:"12px" }}>{l.icon}</div>
              <div style={{ fontSize:"15px", fontWeight:"600", marginBottom:"6px" }}>{l.name}의 검증이 아직 실행되지 않았습니다</div>
              <button onClick={() => runLead(l.id)} disabled={loading[l.id]}
                style={{ marginTop:"14px", padding:"10px 22px", borderRadius:"8px", background:l.color, color:"#fff",
                  border:"none", fontSize:"13px", fontWeight:"600", cursor:"pointer", fontFamily:"inherit" }}>
                {loading[l.id] ? "검증 중…" : "검증 시작"}
              </button>
            </div>
          )
          const sc = scoreColor(r.score)
          return (
            <div key={l.id}>
              <div style={{ ...S.card, background:l.light, border:`1px solid ${l.border}`, marginBottom:"14px", display:"flex", alignItems:"center", gap:"16px" }}>
                <div style={{ width:"72px", height:"72px", borderRadius:"50%", background:sc.bg, border:`4px solid ${sc.border}`,
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontSize:"22px", fontWeight:"800", color:sc.text }}>{r.score}</span>
                  <span style={{ fontSize:"10px", color:sc.text }}>/ 100</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"16px", fontWeight:"700", color:l.color }}>{l.icon} {l.label}</div>
                  <div style={{ fontSize:"13px", color:"#374151", marginTop:"4px", lineHeight:"1.5" }}>{r.summary}</div>
                </div>
              </div>

              {/* 섹션들 */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                {Object.entries(r.sections).filter(([_,v]) => v.length > 0).map(([title, items]) => (
                  <div key={title} style={{ ...S.card }}>
                    <div style={{ fontSize:"12.5px", fontWeight:"700", color:l.color, marginBottom:"10px" }}>{title}</div>
                    {items.map((item, i) => (
                      <div key={i} style={{ fontSize:"12.5px", color:"#374151", padding:"5px 0", borderBottom:i<items.length-1?"1px solid #F3F4F6":"none", lineHeight:"1.55" }}>
                        {item}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {r.cross.length > 0 && (
                <div style={{ ...S.card, marginTop:"14px", background:"#FFFBEB", border:"1px solid #FDE68A" }}>
                  <div style={{ fontSize:"12.5px", fontWeight:"700", color:"#92400E", marginBottom:"10px" }}>💬 다른 팀장에게 요청</div>
                  {r.cross.map((c, i) => (
                    <div key={i} style={{ fontSize:"12.5px", color:"#374151", padding:"5px 0", borderBottom:i<r.cross.length-1?"1px solid rgba(146,64,14,.15)":"none", lineHeight:"1.5" }}>
                      {c}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* ── 통합 리포트 ── */}
        {currentTab === "report" && (
          <div style={{ ...S.card, whiteSpace:"pre-wrap", fontSize:"13px", lineHeight:"1.7" }}>
            {reportLoading ? (
              <div style={{ textAlign:"center", padding:"40px", color:"#9CA3AF" }}>
                <div style={{ fontSize:"24px", marginBottom:"10px" }}>📋</div>
                <div>4팀장 의견 통합 중…</div>
              </div>
            ) : report || "리포트가 아직 생성되지 않았습니다."}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        button:hover:not(:disabled) { opacity:.88 }
      `}</style>
    </div>
  )
}
