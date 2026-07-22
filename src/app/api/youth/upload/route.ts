import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'partner-assets'

// 学校連携（ロゴ・資料）のファイルアップロード
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'file が必要です' }, { status: 400 })
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop() : ''
  const path = `${crypto.randomUUID()}${ext ? `.${ext}` : ''}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type || 'application/octet-stream',
    })

  if (error) {
    const hint = /bucket.*not.*found/i.test(error.message)
      ? '（Supabase で 023_approach_tracking.sql を実行し、partner-assets バケットを作成してください）'
      : ''
    return NextResponse.json({ error: `${error.message} ${hint}`.trim() }, { status: 500 })
  }

  const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({ name: file.name, url: publicUrl.publicUrl, uploaded_at: new Date().toISOString() })
}
