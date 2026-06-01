// ============================================================
//  라이트팩토리 프론트엔드 API 클라이언트
//  ─────────────────────────────────────────────────────────
//  개발: API_BASE = 'http://localhost:4000'
//  배포: API_BASE = 'https://api.lightfactory.co.kr' (Vercel URL)
//
//  사용법:
//    const products = await api.get('/products?category=switch')
//    const order    = await api.post('/checkout/prepare', { items, ... })
// ============================================================

const API_BASE = window.__LF_API_BASE__ || 'http://localhost:4000'

// 토큰 관리
const token = {
  get:     ()      => localStorage.getItem('lf_access_token'),
  set:     (t)     => localStorage.setItem('lf_access_token', t),
  remove:  ()      => localStorage.removeItem('lf_access_token'),
}

// 공통 fetch 래퍼
async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const t = token.get()
  if (t) headers['Authorization'] = `Bearer ${t}`

  const res = await fetch(API_BASE + '/api' + path, {
    method,
    credentials: 'include',        // Refresh Token 쿠키 포함
    headers,
    ...(body && { body: JSON.stringify(body) }),
  })

  // Access Token 만료 → 자동 갱신 시도
  if (res.status === 401 && path !== '/auth/login') {
    const refreshed = await tryRefresh()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${token.get()}`
      const retry = await fetch(API_BASE + '/api' + path, {
        method, credentials:'include', headers,
        ...(body && { body: JSON.stringify(body) }),
      })
      if (!retry.ok) throw await retry.json()
      return retry.json()
    }
    token.remove()
    window.location.reload()
    return
  }

  if (!res.ok) throw await res.json()
  return res.json()
}

async function tryRefresh() {
  try {
    const data = await fetch(API_BASE + '/api/auth/refresh', {
      method:'POST', credentials:'include'
    }).then(r => r.json())
    if (data.accessToken) { token.set(data.accessToken); return true }
  } catch {}
  return false
}

// API 클라이언트 객체
window.api = {
  get:    (path)       => request('GET',    path),
  post:   (path, body) => request('POST',   path, body),
  patch:  (path, body) => request('PATCH',  path, body),
  delete: (path, body) => request('DELETE', path, body),
  token,

  // 편의 메서드
  auth: {
    login:    (email, pw)   => request('POST', '/auth/login',    { email, password:pw }),
    register: (data)        => request('POST', '/auth/register', data),
    logout:   ()            => request('POST', '/auth/logout').finally(() => token.remove()),
    me:       ()            => request('GET',  '/auth'),
    refresh:  ()            => tryRefresh(),
  },
  products: {
    list:   (params='') => request('GET', '/products'  + (params ? '?'+params : '')),
    get:    (id)        => request('GET', `/products/${id}`),
  },
  categories: {
    tree: () => request('GET', '/categories'),
  },
  cart: {
    get:    ()              => request('GET',    '/cart'),
    add:    (productId, qty)=> request('POST',   '/cart', { productId, quantity:qty }),
    update: (id, qty)       => request('PATCH',  `/cart/${id}`, { quantity:qty }),
    remove: (id)            => request('DELETE', `/cart/${id}`),
    clear:  ()              => request('DELETE', '/cart'),
  },
  orders: {
    list:    (page=1) => request('GET', `/orders?page=${page}`),
    prepare: (data)   => request('POST', '/checkout/prepare', data),
    confirm: (data)   => request('POST', '/checkout/confirm', data),
  },
}
