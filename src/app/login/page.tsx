'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [setupMode, setSetupMode] = useState(false)

  const nextPath = () => {
    const p = new URLSearchParams(window.location.search).get('next')
    return p && p.startsWith('/') ? p : '/dashboard'
  }

  const login = async () => {
    setBusy(true)
    setError('')
    setInfo('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'ログインに失敗しました')
        return
      }
      window.location.href = nextPath()
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setBusy(false)
    }
  }

  const bootstrap = async () => {
    setBusy(true)
    setError('')
    setInfo('')
    try {
      const res = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'セットアップに失敗しました')
        return
      }
      setInfo('管理者アカウントを作成しました。そのままログインします...')
      await login()
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (setupMode) bootstrap()
    else login()
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg, #f7f5f0)', padding: '1rem',
    }}>
      <form onSubmit={submit} style={{
        width: '100%', maxWidth: '380px', background: '#fff',
        border: '1px solid var(--bd, #e2ddd2)', borderRadius: '10px',
        padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--mu, #8a8272)' }}>
          NEO ACADEMIA
        </div>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.3rem 0 1.4rem' }}>
          {setupMode ? '初回セットアップ' : '採用ダッシュボード ログイン'}
        </h1>

        {setupMode && (
          <p style={{ fontSize: '0.75rem', color: 'var(--mu, #8a8272)', marginBottom: '1rem', lineHeight: 1.6 }}>
            初期管理者として登録されているメールアドレスに、ログイン用パスワードを設定します（最初の1回のみ実行できます）。
          </p>
        )}

        <div style={{ marginBottom: '0.85rem' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--mu, #8a8272)', marginBottom: '0.3rem' }}>
            メールアドレス
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="email@example.com"
            style={{ width: '100%', padding: '0.55rem 0.7rem', fontSize: '0.85rem', border: '1px solid var(--bd, #e2ddd2)', borderRadius: '6px' }}
          />
        </div>
        <div style={{ marginBottom: '1.2rem' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--mu, #8a8272)', marginBottom: '0.3rem' }}>
            パスワード{setupMode ? '（8文字以上）' : ''}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={setupMode ? 'new-password' : 'current-password'}
            style={{ width: '100%', padding: '0.55rem 0.7rem', fontSize: '0.85rem', border: '1px solid var(--bd, #e2ddd2)', borderRadius: '6px' }}
          />
        </div>

        {error && (
          <div style={{ fontSize: '0.75rem', color: '#c0392b', marginBottom: '0.8rem' }}>{error}</div>
        )}
        {info && (
          <div style={{ fontSize: '0.75rem', color: '#2e7d52', marginBottom: '0.8rem' }}>{info}</div>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{
            width: '100%', padding: '0.65rem', fontSize: '0.85rem', fontWeight: 700,
            background: '#c0392b', color: '#fff', border: 'none', borderRadius: '6px',
            cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? '処理中...' : setupMode ? '管理者アカウントを作成' : 'ログイン'}
        </button>

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => { setSetupMode((v) => !v); setError(''); setInfo('') }}
            style={{ background: 'none', border: 'none', fontSize: '0.72rem', color: 'var(--mu, #8a8272)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {setupMode ? 'ログインに戻る' : '初回セットアップはこちら'}
          </button>
        </div>
      </form>
    </div>
  )
}
