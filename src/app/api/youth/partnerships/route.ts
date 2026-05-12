import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

interface ContactShape {
  name?: string
  role?: string
  email?: string
  phone?: string
  line?: string
  messenger?: string
  logs?: { date?: string; content?: string }[]
}

interface RowShape {
  id?: string
  university?: string
  internal_handler?: string
  partnership_details?: string
  partner_contacts?: ContactShape[]
  // 旧スキーマ（行レベル）— 後方互換のため受け取るが空で扱う
  contact_email?: string
  contact_phone?: string
  contact_line?: string
  contact_messenger?: string
  logs?: { date?: string; content?: string }[]
}

// 旧スキーマ → 新スキーマへ正規化（GET 結果に対する保険）
function normalize(row: RowShape) {
  const list = Array.isArray(row.partner_contacts) && row.partner_contacts.length > 0
    ? row.partner_contacts
    : [{}]
  const normalized = list.map((c, i) => ({
    name: c?.name ?? '',
    role: c?.role ?? '',
    email: c?.email ?? (i === 0 ? row.contact_email ?? '' : ''),
    phone: c?.phone ?? (i === 0 ? row.contact_phone ?? '' : ''),
    line: c?.line ?? (i === 0 ? row.contact_line ?? '' : ''),
    messenger: c?.messenger ?? (i === 0 ? row.contact_messenger ?? '' : ''),
    logs: Array.isArray(c?.logs)
      ? c!.logs!.map((l) => ({ date: l?.date ?? '', content: l?.content ?? '' }))
      : i === 0 && Array.isArray(row.logs)
      ? row.logs.map((l) => ({ date: l?.date ?? '', content: l?.content ?? '' }))
      : [],
  }))
  return {
    id: row.id,
    university: row.university ?? '',
    internal_handler: row.internal_handler ?? '',
    partnership_details: row.partnership_details ?? '',
    partner_contacts: normalized,
  }
}

// 一覧取得
export async function GET() {
  const { data, error } = await supabase
    .from('youth_partnerships')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[partnerships GET] error:', error)
    return NextResponse.json({
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    }, { status: 500 })
  }
  return NextResponse.json((data ?? []).map(normalize))
}

// 新規作成
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as RowShape

  // 新スキーマで保存。partner_contacts には連絡先・ログを含むフル構造で1件用意。
  const partnerContacts: ContactShape[] =
    Array.isArray(body.partner_contacts) && body.partner_contacts.length > 0
      ? body.partner_contacts.map((c) => ({
          name: c?.name ?? '',
          role: c?.role ?? '',
          email: c?.email ?? '',
          phone: c?.phone ?? '',
          line: c?.line ?? '',
          messenger: c?.messenger ?? '',
          logs: Array.isArray(c?.logs)
            ? c!.logs!.map((l) => ({ date: l?.date ?? '', content: l?.content ?? '' }))
            : [],
        }))
      : [{ name: '', role: '', email: '', phone: '', line: '', messenger: '', logs: [] }]

  const payload = {
    university: body.university ?? '',
    internal_handler: body.internal_handler ?? '',
    partnership_details: body.partnership_details ?? '',
    partner_contacts: partnerContacts,
    // 旧カラムは空のまま
    contact_email: '',
    contact_phone: '',
    contact_line: '',
    contact_messenger: '',
    logs: [],
  }

  const { data, error } = await supabase
    .from('youth_partnerships')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('[partnerships POST] error:', error)
    return NextResponse.json({
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    }, { status: 500 })
  }
  return NextResponse.json(normalize(data))
}
