import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const LIST_KEYS = new Set(['contact_method', 'inflow_source'])

// 一覧取得（連絡手段・流入経路の選択肢マスタ）
export async function GET() {
  const { data, error } = await supabase
    .from('select_options')
    .select('*')
    .order('list_key')
    .order('sort_order')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

// 選択肢を追加
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { list_key, value, sort_order } = body

  if (!LIST_KEYS.has(list_key) || !value) {
    return NextResponse.json({ error: 'list_key と value は必須です' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('select_options')
    .insert({ list_key, value, sort_order: sort_order ?? 0 })
    .select()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '同じ選択肢が既に存在します' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data?.[0] ?? {}, { status: 201 })
}
