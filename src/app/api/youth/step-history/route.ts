import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// 最近のステップ変更ログ（ダッシュボードの「最近のログ」用）
export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '20')

  const { data, error } = await supabase
    .from('step_history')
    .select('id, youth_candidate_id, from_step, to_step, changed_at, changed_by, youth_candidates(name)')
    .order('changed_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}
