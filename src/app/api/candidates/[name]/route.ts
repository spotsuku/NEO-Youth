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

  // まず id を取得（名前で検索）
  const { data: found } = await supabase
    .from('candidates')
    .select('id, name')
    .eq('name', name)

  // 完全一致で見つからない場合はtrimして再検索
  let targetId: number | null = null
  if (found && found.length > 0) {
    targetId = found[0].id
  } else {
    const { data: found2 } = await supabase
      .from('candidates')
      .select('id, name')
      .ilike('name', name.trim())
    if (found2 && found2.length > 0) {
      targetId = found2[0].id
    }
  }

  if (!targetId) {
    return NextResponse.json({ 
      error: `候補者「${name}」が見つかりません`,
      searched: name,
    }, { status: 404 })
  }

  // id で UPDATE（名前の不一致を回避）
  const { data, error } = await supabase
    .from('candidates')
    .update(patch)
    .eq('id', targetId)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data?.[0] ?? { name, ...patch })
}

export async function GET() {
  const { data } = await supabase
    .from('candidates')
    .select('id, name')
    .order('name')
  return NextResponse.json(data ?? [])
}
