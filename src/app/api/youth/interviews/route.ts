import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { candidate_name, handler, interview_date, course, result, notes } = body

  if (!candidate_name) {
    return NextResponse.json({ error: 'candidate_name は必須' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('youth_interviews')
    .insert({ candidate_name, handler, interview_date, course, result, notes })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data?.[0] ?? {})
}
