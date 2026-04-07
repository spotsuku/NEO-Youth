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

  // まずUPDATEしてから SELECT で取得（single()を使わない）
  const { error: updateError } = await supabase
    .from('candidates')
    .update(patch)
    .eq('name', name)

  if (updateError) {
    console.error('update error:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // 更新後のデータを取得
  const { data, error: selectError } = await supabase
    .from('candidates')
    .select('*')
    .eq('name', name)
    .limit(1)
    .single()

  if (selectError || !data) {
    // 更新自体は成功している可能性があるのでpatchをそのまま返す
    return NextResponse.json({ name, ...patch })
  }

  return NextResponse.json(data)
}
