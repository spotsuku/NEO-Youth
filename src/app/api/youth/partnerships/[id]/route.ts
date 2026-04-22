import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const ALLOWED = new Set([
  'university',
  'partner_contacts',
  'internal_handler',
  'contact_email',
  'contact_phone',
  'contact_line',
  'contact_messenger',
  'partnership_details',
  'logs',
])

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = params.id
  const body = await req.json()

  const payload: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) payload[k] = v
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: '更新フィールドがありません' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('youth_partnerships')
    .update(payload)
    .eq('id', id)
    .select()

  if (error) {
    console.error('[partnerships PATCH] error:', { id, payload, error })
    return NextResponse.json({
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: '該当行が見つかりません' }, { status: 404 })
  }
  return NextResponse.json(data[0])
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = params.id
  const { error } = await supabase
    .from('youth_partnerships')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
  }
  return NextResponse.json({ deleted: id })
}
