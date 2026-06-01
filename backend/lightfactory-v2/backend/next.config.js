/** @type {import('next').NextConfig} */
const nextConfig = {
  // CORS 헤더 설정 — 프론트엔드(다른 도메인)에서 API 호출 허용
  async headers() {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',')
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin',
            value: allowedOrigins[0] }, // 운영: 실제 프론트 도메인
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers',
            value: 'Content-Type,Authorization,X-Requested-With' },
        ],
      },
    ]
  },
}
module.exports = nextConfig
