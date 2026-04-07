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
    return NextResponse.json({ error: '更新フィールドなし', received: Object.keys(body) }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('candidates')
    .update(patch)
    .eq('name', name)
    .select()
    .single()

  if (error) {
    console.error('candidates update error:', error)
    return NextResponse.json({ error: error.message, name, patch }, { status: 500 })
  }
  return NextResponse.json(data)
}
