'use client'

import { useCallback, useEffect, useState } from 'react'

interface AppUserRow {
  id: number
  email: string
  name: string | null
  role: 'admin' | 'member'
  created_at: string
}

interface Props {
  currentEmail: string
}

export default function AdminTab({ currentEmail }: Props) {
  const [users, setUsers] = useState<AppUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 追加フォーム
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member')
  const [newPassword, setNewPassword] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json().catch(() => [])
      if (!res.ok) {
        setError(data.error ?? 'ユーザー一覧の取得に失敗しました')
        return
      }
      setUsers(data)
      setError('')
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const changeRole = async (u: AppUserRow, role: 'admin' | 'member') => {
    const prev = users
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role } : x)))
    const res = await fetch(`/api/admin/users/${encodeURIComponent(u.email)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? '権限の変更に失敗しました')
      setUsers(prev)
    }
  }

  const removeUser = async (u: AppUserRow) => {
    if (!confirm(`${u.name ?? u.email} を削除しますか？\nこのユーザーはログインできなくなります。`)) return
    const res = await fetch(`/api/admin/users/${encodeURIComponent(u.email)}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? '削除に失敗しました')
      return
    }
    setUsers((list) => list.filter((x) => x.id !== u.id))
  }

  const addUser = async () => {
    setAddError('')
    if (!newEmail.trim()) { setAddError('メールアドレスは必須です'); return }
    if (newPassword.length < 8) { setAddError('初期パスワードは8文字以上にしてください'); return }
    setAdding(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, name: newName, role: newRole, password: newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddError(data.error ?? '追加に失敗しました')
        return
      }
      setNewEmail(''); setNewName(''); setNewRole('member'); setNewPassword('')
      fetchUsers()
    } catch {
      setAddError('通信エラーが発生しました')
    } finally {
      setAdding(false)
    }
  }

  const adminCount = users.filter((u) => u.role === 'admin').length

  return (
    <>
      <div className="section-title">ユーザー管理</div>
      <p style={{ fontSize: '0.75rem', color: 'var(--mu)', marginBottom: '1rem', lineHeight: 1.7 }}>
        管理者は最終面接の評価・面談記録の閲覧と、ユーザーの追加・権限変更ができます。<br />
        一般ユーザーは候補者管理・選考フロー・オンボーディング等のみ利用できます（個人の評価・コメントは非表示）。
      </p>

      {error && <div style={{ color: 'var(--red)', fontSize: '0.78rem', marginBottom: '0.8rem' }}>{error}</div>}

      <div className="table-wrap" style={{ marginBottom: '1.5rem' }}>
        <table>
          <thead>
            <tr>
              <th>メールアドレス</th>
              <th>名前</th>
              <th>権限</th>
              <th>登録日</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--mu)', padding: '1.5rem' }}>読み込み中...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--mu)', padding: '1.5rem' }}>ユーザーがいません</td></tr>
            ) : users.map((u) => {
              const isSelf = u.email.toLowerCase() === currentEmail.toLowerCase()
              const isLastAdmin = u.role === 'admin' && adminCount <= 1
              return (
                <tr key={u.id}>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
                    {u.email}
                    {isSelf && <span className="badge blu" style={{ marginLeft: '0.4rem' }}>自分</span>}
                  </td>
                  <td>{u.name ?? '-'}</td>
                  <td>
                    <select
                      className="iv-input"
                      style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                      value={u.role}
                      disabled={isSelf || isLastAdmin}
                      title={isSelf ? '自分自身の権限は変更できません' : isLastAdmin ? '最後の管理者の権限は変更できません' : ''}
                      onChange={(e) => changeRole(u, e.target.value === 'admin' ? 'admin' : 'member')}
                    >
                      <option value="admin">管理者</option>
                      <option value="member">一般</option>
                    </select>
                  </td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: 'var(--mu)' }}>
                    {u.created_at?.slice(0, 10)}
                  </td>
                  <td>
                    {!isSelf && (
                      <button className="detail-btn delete-btn" onClick={() => removeUser(u)}>削除</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="section-title">ユーザーを追加</div>
      <div className="interview-form" style={{ maxWidth: '560px' }}>
        <div className="field-row">
          <div>
            <div className="field-label">メールアドレス *</div>
            <input className="iv-input" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <div className="field-label">名前</div>
            <input className="iv-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="山田 太郎" />
          </div>
        </div>
        <div className="field-row">
          <div>
            <div className="field-label">権限</div>
            <select className="iv-input" value={newRole} onChange={(e) => setNewRole(e.target.value === 'admin' ? 'admin' : 'member')}>
              <option value="member">一般</option>
              <option value="admin">管理者</option>
            </select>
          </div>
          <div>
            <div className="field-label">初期パスワード *（8文字以上）</div>
            <input className="iv-input" type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="本人に共有してください" />
          </div>
        </div>
        {addError && <div style={{ color: 'var(--red)', fontSize: '0.78rem' }}>{addError}</div>}
        <div className="iv-footer">
          <button className="iv-save-btn" onClick={addUser} disabled={adding}>
            {adding ? '追加中...' : '+ ユーザーを追加'}
          </button>
        </div>
      </div>
    </>
  )
}
