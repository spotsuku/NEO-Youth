import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, serviceClient } from '@/lib/auth'

/** ユーザー一覧（管理者のみ） */
export async function GET() {
  const auth = await requireAdmin()
  if ('response' in auth) return auth.response

  const { data, error } = await serviceClient()
    .from('app_users')
    .select('id, email, name, role, created_at')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

/** ユーザー追加（管理者のみ）: 認証アカウント + app_users 行を作成 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('response' in auth) return auth.response

  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const name = String(body.name ?? '').trim() || null
  const role = body.role === 'admin' ? 'admin' : 'member'
  const password = String(body.password ?? '')

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: '有効なメールアドレスを入力してください' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: '初期パスワードは8文字以上にしてください' }, { status: 400 })
  }

  const svc = serviceClient()

  // 認証アカウント作成（既に存在する場合はそのまま app_users のみ登録）
  const { error: ce } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (ce && !/already|registered/i.test(ce.message)) {
    return NextResponse.json({ error: ce.message }, { status: 500 })
  }

  const { data, error } = await svc
    .from('app_users')
    .upsert(
      { email, name, role, updated_at: new Date().toISOString() },
      { onConflict: 'email' },
    )
    .select('id, email, name, role, created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.[0] ?? { email, name, role })
}
