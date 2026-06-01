// ============================================================
//  Cloudflare R2 이미지 업로드 유틸리티
//  실제 배포 시 R2 버킷 연결 필요
//  개발 환경: public/ 폴더에 저장 (로컬 파일시스템)
// ============================================================
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

// R2는 S3 호환 API 사용
const r2 = new S3Client({
  region:   'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!
const CDN    = process.env.R2_PUBLIC_URL!   // https://cdn.lightfactory.co.kr

/** 이미지 파일을 R2에 업로드하고 공개 URL 반환 */
export async function uploadImage(
  buffer: Buffer,
  mimeType: string,
  folder: 'products' | 'banners' | 'misc' = 'products'
): Promise<string> {
  const ext  = mimeType.split('/')[1] || 'jpg'
  const key  = `${folder}/${randomUUID()}.${ext}`

  await r2.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: mimeType,
    // 공개 접근 허용
    ACL:         'public-read' as any,
  }))

  return `${CDN}/${key}`
}

/** R2 파일 삭제 (URL → key 변환) */
export async function deleteImage(url: string): Promise<void> {
  const key = url.replace(CDN + '/', '')
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

/** 프론트엔드에서 직접 업로드할 수 있는 Pre-signed URL 발급
 *  1. 클라이언트가 /api/upload/presign 호출
 *  2. Pre-signed URL 받아서 PUT 요청으로 직접 R2에 업로드
 *  3. 업로드 완료 후 공개 URL을 서버에 저장 */
export async function getPresignedUrl(folder: string, mimeType: string) {
  const ext = mimeType.split('/')[1] || 'jpg'
  const key = `${folder}/${randomUUID()}.${ext}`

  const url = await getSignedUrl(r2, new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    ContentType: mimeType,
  }), { expiresIn: 300 }) // 5분 유효

  return { uploadUrl: url, publicUrl: `${CDN}/${key}`, key }
}
