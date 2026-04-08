import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// 許可フィールド（SQL injection 防止）
const ALLOWED = new Set([
  'name', 'kana', 'email', 'type', 'school', 'grade',
  'status', 'yomi', 'source',
  'applied_at', 'motivation', 'pr', 'contribution', 'career',
  'interview2_dates', 'interview3_dates',
  'referral', 'interview_handler', 'interview_date',
  'interview_course', 'interview_result', 'interview_notes',
  'ob_final_exam', 'ob_mail_sent', 'ob_payment', 'ob_training',
  'ob_photo', 'ob_portal', 'ob_slack', 'ob_profile',
  'ob_motivation_written', 'ob_pledge', 'ob_handbook',
  'attended_session',
])

export async function PATCH(
  req: NextRequest,
  { params }: { params: { name: string } },
) {
  const name = decodeURIComponent(params.name)
  const body = await req.json()

  const payload: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) payload[k] = v
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: '更新フィールドがありません' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('youth_candidates')
    .update(payload)
    .eq('name', name)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: '候補者が見つかりません', searched: name }, { status: 404 })
  }
  return NextResponse.json(data[0])
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { name: string } },
) {
  const name = decodeURIComponent(params.name)
  const { data, error } = await supabase
    .from('youth_candidates')
    .select('*')
    .eq('name', name)
    .limit(1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: '候補者が見つかりません' }, { status: 404 })
  }
  return NextResponse.json(data[0])
}
