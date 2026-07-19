import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export type AppRole = 'admin' | 'member'

export interface AppUser {
  email: string
  name: string | null
  role: AppRole
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/** service_role クライアント（サーバー専用・RLSバイパス） */
export function serviceClient() {
  return createClient(supabaseUrl!, serviceKey!)
}

/**
 * Server Component / Route Handler 用の Supabase クライアント。
 * セッションは httpOnly クッキーから読み取る。
 * （Server Component のレンダリング中はクッキー書込不可のため try/catch で無視）
 */
export function createServerSupabase() {
  const store = cookies()
  return createServerClient(supabaseUrl!, anonKey!, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try { store.set({ name, value, ...options }) } catch {}
      },
      remove(name: string, options: CookieOptions) {
        try { store.set({ name, value: '', ...options }) } catch {}
      },
    },
  })
}

/** ログイン中ユーザーを app_users のロール込みで取得（未ログインは null） */
export async function getAppUser(): Promise<AppUser | null> {
  if (!supabaseUrl || !anonKey || !serviceKey) return null
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return null

    const email = user.email.toLowerCase()
    const { data } = await serviceClient()
      .from('app_users')
      .select('email, name, role')
      .ilike('email', email)
      .limit(1)
    const row = data?.[0]
    return {
      email,
      name: row?.name ?? null,
      role: row?.role === 'admin' ? 'admin' : 'member',
    }
  } catch {
    return null
  }
}

/**
 * APIルート用の管理者ガード。
 * 管理者なら { user } を、そうでなければ返却すべき { response } を返す。
 */
export async function requireAdmin(): Promise<{ user: AppUser } | { response: NextResponse }> {
  const user = await getAppUser()
  if (!user) {
    return { response: NextResponse.json({ error: '認証が必要です' }, { status: 401 }) }
  }
  if (user.role !== 'admin') {
    return { response: NextResponse.json({ error: 'この操作には管理者権限が必要です' }, { status: 403 }) }
  }
  return { user }
}
