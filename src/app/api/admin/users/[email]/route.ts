import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, serviceClient } from '@/lib/auth'

/** ロール・名前の変更（管理者のみ） */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { email: string } },
) {
  const auth = await requireAdmin()
  if ('response' in auth) return auth.response

  const targetEmail = decodeURIComponent(params.email).toLowerCase()
  const body = await req.json().catch(() => ({}))

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if ('role' in body) {
    const role = body.role === 'admin' ? 'admin' : 'member'
    // 自分自身の権限降格を禁止（管理者が誰もいなくなる事故を防ぐ）
    if (targetEmail === auth.user.email && role !== 'admin') {
      return NextResponse.json({ error: '自分自身の管理者権限は外せません' }, { status: 400 })
    }
    patch.role = role
  }
  if ('name' in body) {
    patch.name = String(body.name ?? '').trim() || null
  }

  const { data, error } = await serviceClient()
    .from('app_users')
    .update(patch)
    .ilike('email', targetEmail)
    .select('id, email, name, role, created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
  }
  return NextResponse.json(data[0])
}

/** ユーザー削除（管理者のみ）: app_users 行 + 認証アカウントを削除 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { email: string } },
) {
  const auth = await requireAdmin()
  if ('response' in auth) return auth.response

  const targetEmail = decodeURIComponent(params.email).toLowerCase()
  if (targetEmail === auth.user.email) {
    return NextResponse.json({ error: '自分自身は削除できません' }, { status: 400 })
  }

  const svc = serviceClient()

  const { error: de } = await svc.from('app_users').delete().ilike('email', targetEmail)
  if (de) return NextResponse.json({ error: de.message }, { status: 500 })

  // 認証アカウントも削除（見つからなくてもエラーにしない）
  try {
    const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const authUser = list?.users?.find((u) => (u.email ?? '').toLowerCase() === targetEmail)
    if (authUser) await svc.auth.admin.deleteUser(authUser.id)
  } catch {}

  return NextResponse.json({ ok: true })
}
