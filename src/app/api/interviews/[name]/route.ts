import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  const name = decodeURIComponent(params.name)
  const body = await req.json()

  // candidate_id を取得
  const { data: cand } = await supabase
    .from('candidates')
    .select('id')
    .eq('name', name)
    .single()

  const payload = {
    candidate_name: name,
    candidate_id: cand?.id ?? null,
    interview_date: body.interview_date ?? null,
    interviewer: body.interviewer ?? null,
    score_smile: body.score_smile ?? null,
    score_respect: body.score_respect ?? null,
    score_premise: body.score_premise ?? null,
    score_passion: body.score_passion ?? null,
    score_thinking: body.score_thinking ?? null,
    score_honest: body.score_honest ?? null,
    impression: body.impression ?? null,
    checkpoints_memo: body.checkpoints_memo ?? null,
    positives: body.positives ?? null,
    negatives: body.negatives ?? null,
    final_comment: body.final_comment ?? null,
    verdict: body.verdict ?? null,
    verdict_reason: body.verdict_reason ?? null,
  }

  const { data, error } = await supabase
    .from('interviews')
    .upsert(payload, { onConflict: 'candidate_name' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
