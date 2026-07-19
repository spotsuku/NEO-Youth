import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// 未ログインでもアクセス可能なパス
const PUBLIC_PAGES = ['/login']
const PUBLIC_API_PREFIXES = ['/api/auth/']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isApi = pathname.startsWith('/api/')
  const isPublic =
    PUBLIC_PAGES.includes(pathname) ||
    PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 認証用の環境変数が無い場合はフェイルクローズ（ログイン画面で案内）
  if (!url || !anonKey) {
    if (isPublic) return NextResponse.next()
    if (isApi) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です' },
        { status: 500 },
      )
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  let res = NextResponse.next({ request: { headers: req.headers } })
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        req.cookies.set({ name, value, ...options })
        res = NextResponse.next({ request: { headers: req.headers } })
        res.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        req.cookies.set({ name, value: '', ...options })
        res = NextResponse.next({ request: { headers: req.headers } })
        res.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !isPublic) {
    if (isApi) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ログイン済みで /login に来たらダッシュボードへ
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
}
