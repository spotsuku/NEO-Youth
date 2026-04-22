import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// 一覧取得
export async function GET() {
  const { data, error } = await supabase
    .from('youth_partnerships')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

// 新規作成（空行）
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const payload = {
    university: body.university ?? '',
    partner_contacts: body.partner_contacts ?? [{ name: '', role: '' }],
    internal_handler: body.internal_handler ?? '',
    contact_email: body.contact_email ?? '',
    contact_phone: body.contact_phone ?? '',
    contact_line: body.contact_line ?? '',
    contact_messenger: body.contact_messenger ?? '',
    partnership_details: body.partnership_details ?? '',
    logs: body.logs ?? [],
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
  return NextResponse.json(data)
}
