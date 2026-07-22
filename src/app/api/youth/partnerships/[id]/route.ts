import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const ALLOWED = new Set([
  'university',
  'partner_contacts',
  'internal_handler',
  'partnership_details',
  // 旧カラム — 互換のため受け付けるが、新 UI からは送信しない
  'contact_email',
  'contact_phone',
  'contact_line',
  'contact_messenger',
  'logs',
  // 学校連携拡張 — 契約管理・資料添付
  'is_contracted',
  'logo_url',
  'documents',
  'manager_name',
  'deleted_at', // 復元（ゴミ箱から戻す）時に null をセットするために許可
])

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = params.id
  const body = await req.json()

  const payload: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) payload[k] = v
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: '更新フィールドがありません' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('youth_partnerships')
    .update(payload)
    .eq('id', id)
    .select()

  if (error) {
    console.error('[partnerships PATCH] error:', { id, payload, error })
    return NextResponse.json({
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: '該当行が見つかりません' }, { status: 404 })
  }
  return NextResponse.json(data[0])
}

// 論理削除（誤操作からの復旧用）。物理削除はしない。
// 復元する場合は PATCH で { deleted_at: null } を送る。
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = params.id
  const { data, error } = await supabase
    .from('youth_partnerships')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select()

  if (error) {
    console.error('[partnerships DELETE] error:', { id, error })
    return NextResponse.json({
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    }, { status: 500 })
  }
  return NextResponse.json({ deleted: id, affected: data?.length ?? 0 })
}
