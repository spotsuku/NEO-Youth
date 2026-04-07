import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function recordLogs(
  candidateName: string,
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown>,
  changedBy: string | null
) {
  const TRACKED = [
    'interview_date','interviewer',
    'score_smile','score_respect','score_premise',
    'score_passion','score_thinking','score_honest',
    'impression','checkpoints_memo','positives',
    'negatives','own_challenge','neo_connection','neo_strategy',
    'final_comment','verdict','verdict_reason',
  ]
  const logs = TRACKED
    .filter(f => {
      const o = String(oldData?.[f] ?? '')
      const n = String(newData[f] ?? '')
      return o !== n && n !== '' && n !== 'null'
    })
    .map(f => ({
      candidate_name: candidateName,
      field_name: f,
      old_value: String(oldData?.[f] ?? ''),
      new_value: String(newData[f] ?? ''),
      changed_by: changedBy || '不明',
    }))
  if (logs.length > 0) {
    await supabase.from('interview_logs').insert(logs)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  const name = decodeURIComponent(params.name)
  const body = await req.json()

  // .maybeSingle() で0件の場合もエラーにならない
  const { data: existingRows } = await supabase
    .from('interviews')
    .select('*')
    .eq('candidate_name', name)
    .limit(1)
  const existing = existingRows?.[0] ?? null

  const { data: candRows } = await supabase
    .from('candidates')
    .select('id')
    .eq('name', name)
    .limit(1)
  const candId = candRows?.[0]?.id ?? null

  const payload: Record<string, unknown> = {
    candidate_name:   name,
    candidate_id:     candId,
    interview_date:   body.interview_date   ?? null,
    interviewer:      body.interviewer      ?? null,
    score_smile:      body.score_smile      ?? null,
    score_respect:    body.score_respect    ?? null,
    score_premise:    body.score_premise    ?? null,
    score_passion:    body.score_passion    ?? null,
    score_thinking:   body.score_thinking   ?? null,
    score_honest:     body.score_honest     ?? null,
    impression:       body.impression       ?? null,
    checkpoints_memo: body.checkpoints_memo ?? null,
    positives:        body.positives        ?? null,
    negatives:        body.negatives        ?? null,
    own_challenge:    body.own_challenge    ?? null,
    neo_connection:   body.neo_connection   ?? null,
    neo_strategy:     body.neo_strategy     ?? null,
    final_comment:    body.final_comment    ?? null,
    verdict:          body.verdict          ?? null,
    verdict_reason:   body.verdict_reason   ?? null,
  }

  const { data: upserted, error } = await supabase
    .from('interviews')
    .upsert(payload, { onConflict: 'candidate_name' })
    .select()

  if (error) {
    // 新カラムが存在しない場合はフォールバック（own_challenge等を除外）
    const { own_challenge, neo_connection, neo_strategy, ...payloadBase } = payload
    const { data: upserted2, error: error2 } = await supabase
      .from('interviews')
      .upsert(payloadBase, { onConflict: 'candidate_name' })
      .select()

    if (error2) {
      return NextResponse.json({ error: error2.message }, { status: 500 })
    }

    try { await recordLogs(name, existing, payloadBase, body.interviewer) } catch {}
    return NextResponse.json(upserted2?.[0] ?? payload)
  }

  try { await recordLogs(name, existing, payload, body.interviewer) } catch {}
  return NextResponse.json(upserted?.[0] ?? payload)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { name: string } }
) {
  const name = decodeURIComponent(params.name)
  const { data, error } = await supabase
    .from('interview_logs')
    .select('*')
    .eq('candidate_name', name)
    .order('changed_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
