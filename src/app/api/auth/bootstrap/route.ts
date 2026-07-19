import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/auth'

/**
 * 初回セットアップ専用エンドポイント。
 * Supabase Auth にユーザーが1人も存在しない場合に限り、
 * app_users に登録済みの管理者メールアドレスに対して
 * ログインアカウント（パスワード）を作成できる。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')

  if (!email || !password) {
    return NextResponse.json({ error: 'メールアドレスとパスワードを入力してください' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'パスワードは8文字以上にしてください' }, { status: 400 })
  }

  const svc = serviceClient()

  // すでに認証ユーザーが存在する場合はセットアップ不可
  const { data: list, error: le } = await svc.auth.admin.listUsers({ page: 1, perPage: 1 })
  if (le) {
    return NextResponse.json({ error: le.message }, { status: 500 })
  }
  if ((list?.users?.length ?? 0) > 0) {
    return NextResponse.json(
      { error: 'すでにセットアップ済みです。ログインしてください。' },
      { status: 403 },
    )
  }

  // app_users に管理者として登録されているメールのみ許可
  const { data: admins, error: ae } = await svc
    .from('app_users')
    .select('email')
    .eq('role', 'admin')
  if (ae) {
    return NextResponse.json({ error: ae.message }, { status: 500 })
  }
  const isSeededAdmin = (admins ?? []).some((a) => a.email.toLowerCase() === email)
  if (!isSeededAdmin) {
    return NextResponse.json(
      { error: 'このメールアドレスは初期管理者として登録されていません' },
      { status: 403 },
    )
  }

  const { error: ce } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (ce) {
    return NextResponse.json({ error: ce.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
