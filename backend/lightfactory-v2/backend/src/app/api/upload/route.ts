// ============================================================
//  /api/upload/presign — R2 Pre-signed URL 발급
//  클라이언트가 이 URL로 직접 R2에 업로드 (서버 통과 없음)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { withAuth }        from '@/lib/middleware'
import { getPresignedUrl } from '@/lib/r2'
import { z }               from 'zod'

const schema = z.object({
  mimeType: z.string().regex(/^image\//),
  folder:   z.enum(['products','banners','misc']).optional(),
})

export const POST = withAuth(async (req) => {
  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  const { uploadUrl, publicUrl, key } = await getPresignedUrl(body.data.folder || 'products', body.data.mimeType)
  return NextResponse.json({ uploadUrl, publicUrl, key })
}, ['admin'])
