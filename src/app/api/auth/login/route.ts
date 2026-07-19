import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, getAppUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')

  if (!email || !password) {
    return NextResponse.json({ error: 'メールアドレスとパスワードを入力してください' }, { status: 400 })
  }

  const supabase = createServerSupabase()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json(
      { error: 'メールアドレスまたはパスワードが正しくありません' },
      { status: 401 },
    )
  }

  const user = await getAppUser()
  return NextResponse.json({ ok: true, role: user?.role ?? 'member' })
}
