import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET() {
  const { data, error } = await supabase
    .from('youth_candidates')
    .select('*')
    .order('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, kana, email, type, school, grade, status, yomi, source } = body

  if (!name) {
    return NextResponse.json({ error: '氏名は必須です' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('youth_candidates')
    .insert({
      name,
      kana: kana || null,
      email: email || null,
      type: type || null,
      school: school || null,
      grade: grade || null,
      status: status || '応募完了',
      yomi: yomi || null,
      source: source || null,
    })
    .select()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '同名の候補者が既に存在します' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data?.[0] ?? {}, { status: 201 })
}
