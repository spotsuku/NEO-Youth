import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  const name = decodeURIComponent(params.name)
  const body = await req.json()

  const ALLOWED_FIELDS = [
    'motivation', 'pr', 'contribution', 'career',
    'strengths', 'concerns', 'overall', 'overall_comment',
    'check_points', 'final_date', 'email',
  ]

  const patch: Record<string, string> = {}
  for (const field of ALLOWED_FIELDS) {
    if (field in body) patch[field] = body[field]
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '更新フィールドなし' }, { status: 400 })
  }

  // UPDATE実行（結果件数を確認）
  const { error: updateError } = await supabase
    .from('candidates')
    .update(patch)
    .eq('name', name)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // ilike で念のため再確認（空白・全角半角の違いに対応）
  const { error: updateError2 } = await supabase
    .from('candidates')
    .update(patch)
    .ilike('name', name.trim())

  // 更新後のデータを返す（single()不使用）
  const { data: rows } = await supabase
    .from('candidates')
    .select('*')
    .eq('name', name)

  const data = rows?.[0] ?? { name, ...patch }
  return NextResponse.json(data)
}

// デバッグ用：候補者名の一覧を返す
export async function GET() {
  const { data } = await supabase
    .from('candidates')
    .select('name')
    .order('name')
  return NextResponse.json(data ?? [])
}
