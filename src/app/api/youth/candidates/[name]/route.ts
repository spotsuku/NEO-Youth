import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// 許可フィールド（SQL injection 防止）
const ALLOWED = new Set([
  'name', 'kana', 'email', 'type', 'school', 'grade',
  'status', 'yomi', 'source', 'rejected_at', 'rejected_reason',
  'applied_at', 'motivation', 'pr', 'contribution', 'career',
  'interview2_dates', 'interview3_dates',
  'referral', 'interview_handler', 'interview_date',
  'interview_course', 'interview_result', 'interview_notes',
  'ob_final_exam', 'ob_mail_sent', 'ob_payment', 'ob_training',
  'ob_photo', 'ob_portal', 'ob_slack', 'ob_profile',
  'ob_motivation_written', 'ob_pledge', 'ob_handbook', 'ob_pass_criteria',
  'attended_session',
  // アプローチ管理（ユースDB改修）
  'step', 'entry_year', 'course_length',
  'next_action', 'na_due_date', 'na_written_at',
  'contact_method', 'inflow_source', 'note', 'partner_id', 'archived',
  'deleted_at', // 復元（ゴミ箱から戻す）時に null をセットするために許可
  'selection_archived_at', // 選考パイプラインのアーカイブ／解除
])

export async function PATCH(
  req: NextRequest,
  { params }: { params: { name: string } },
) {
  const name = decodeURIComponent(params.name)
  const body = await req.json()

  // changed_by は候補者テーブルのカラムではなく、step_history への属性付けにのみ使う
  const changedBy = typeof body.changed_by === 'string' ? body.changed_by : null

  const payload: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) payload[k] = v
  }

  // ネクストアクションを更新したのに記入日が明示されていなければ、当日を自動セット
  if ('next_action' in payload && !('na_written_at' in payload)) {
    payload.na_written_at = new Date().toISOString().slice(0, 10)
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
    console.error('[PATCH youth_candidates] supabase error:', {
      name,
      payload,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return NextResponse.json({
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      payload,
    }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: '候補者が見つかりません', searched: name }, { status: 404 })
  }

  // step が変わった場合、DBトリガーが自動記録した step_history の changed_by を補完する
  // （ログイン機能がないため、クライアントが送った操作者名をベストエフォートで反映）
  if ('step' in payload && changedBy) {
    const { data: latest } = await supabase
      .from('step_history')
      .select('id')
      .eq('youth_candidate_id', data[0].id)
      .order('id', { ascending: false })
      .limit(1)
    if (latest && latest[0]) {
      await supabase.from('step_history').update({ changed_by: changedBy }).eq('id', latest[0].id)
    }
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

// 論理削除（誤操作からの復旧用）。物理削除はしない。
// 復元する場合は PATCH で { deleted_at: null } を送る。
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { name: string } },
) {
  const name = decodeURIComponent(params.name)
  const { error } = await supabase
    .from('youth_candidates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('name', name)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ deleted: name })
}
