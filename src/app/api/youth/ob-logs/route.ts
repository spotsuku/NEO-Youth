import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { candidate_name, field_name, field_label, new_value } = body

  if (!candidate_name || !field_name) {
    return NextResponse.json({ error: '必須フィールドが不足' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('youth_ob_logs')
    .insert({ candidate_name, field_name, field_label, new_value })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data?.[0] ?? {})
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')

  let query = supabase
    .from('youth_ob_logs')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(100)

  if (name) {
    query = query.eq('candidate_name', name)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}
