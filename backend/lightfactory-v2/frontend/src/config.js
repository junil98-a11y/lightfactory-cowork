// ============================================================
//  프론트엔드 환경 설정
//  배포 시 이 파일의 API_BASE 를 실제 백엔드 URL로 변경하세요.
//
//  Netlify 배포 시:
//    Netlify > Site settings > Build & deploy > Environment variables
//    LF_API_BASE = https://lightfactory-api.vercel.app
//
//  또는 index.html 상단에 직접 작성:
//    <script>window.__LF_API_BASE__ = 'https://api.lightfactory.co.kr'</script>
// ============================================================

// 개발 환경: 백엔드 서버 주소
// 배포 환경: Vercel 배포 주소로 변경
window.__LF_API_BASE__ = window.LF_API_BASE || 'http://localhost:4000'
