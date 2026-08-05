import { NextRequest, NextResponse } from 'next/server'

// フェーズ2で認証（Supabase Auth）を実装するまでの暫定措置。
// Vercel Hobby プランでは Production デプロイに Deployment Protection が
// 使えない（Standard Protection は Preview のみが対象）ため、
// このミドルウェアで Basic Auth を掛けて代替する。
//
// 開発時（next dev）は素通しし、本番ビルド（next start / Vercel）でのみ強制する。
// next build 時点では NODE_ENV は 'production' になるが、ミドルウェアの実行判定は
// リクエスト時に評価されるため next start / デプロイ後の挙動に影響する。
const REQUIRE_AUTH = process.env.NODE_ENV === 'production'

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

function unauthorized() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="YouthDB"' },
  })
}

export function middleware(request: NextRequest) {
  if (!REQUIRE_AUTH) return NextResponse.next()

  const expectedUser = process.env.BASIC_AUTH_USER
  const expectedPass = process.env.BASIC_AUTH_PASSWORD

  // 環境変数が未設定の場合、素通しにすると保護が無いのと同じになる。
  // 設定漏れは「本番が丸ごと401になる」形で気づけるようにし、
  // 「保護されていないのに気づかない」状態を避ける。
  if (!expectedUser || !expectedPass) return unauthorized()

  const header = request.headers.get('authorization')
  if (!header?.startsWith('Basic ')) return unauthorized()

  let decoded: string
  try {
    decoded = atob(header.slice('Basic '.length))
  } catch {
    return unauthorized()
  }

  const sep = decoded.indexOf(':')
  if (sep === -1) return unauthorized()

  const user = decoded.slice(0, sep)
  const pass = decoded.slice(sep + 1)

  if (!timingSafeEqual(user, expectedUser) || !timingSafeEqual(pass, expectedPass)) {
    return unauthorized()
  }

  return NextResponse.next()
}

export const config = {
  // 除外は _next/static, _next/image, favicon のみ。
  // /api/* を含む全パスが対象（API を素通りさせると保護の意味が無くなる）。
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
