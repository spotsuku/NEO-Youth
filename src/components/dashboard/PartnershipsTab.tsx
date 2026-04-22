'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

// サーバー上の youth_partnerships 1行
interface Row {
  id: string
  university: string
  partner_contacts: { name: string; role: string }[]
  internal_handler: string
  contact_email: string
  contact_phone: string
  contact_line: string
  contact_messenger: string
  partnership_details: string
  logs: { date: string; content: string }[]
  created_at?: string
  updated_at?: string
}

type PartnerContact = Row['partner_contacts'][number]
type PartnershipLog = Row['logs'][number]

const SAVE_DEBOUNCE_MS = 600

function csvEscape(v: string) {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCSV(rows: Row[]): string {
  const header = [
    '大学名',
    '先方担当',
    '社内担当',
    'メール',
    '電話',
    'LINE',
    'Messenger',
    '提携内容',
    '実施内容ログ',
  ]
  const body = rows.map((r) => [
    r.university,
    r.partner_contacts
      .filter((c) => c.name || c.role)
      .map((c) => (c.role ? `${c.name}（${c.role}）` : c.name))
      .join(' / '),
    r.internal_handler,
    r.contact_email,
    r.contact_phone,
    r.contact_line,
    r.contact_messenger,
    r.partnership_details,
    r.logs
      .filter((l) => l.date || l.content)
      .map((l) => `${l.date}：${l.content}`)
      .join(' / '),
  ])
  return [header, ...body]
    .map((row) => row.map(csvEscape).join(','))
    .join('\r\n')
}

export default function PartnershipsTab() {
  const [rows, setRows] = useState<Row[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())

  // 行ごとの保存デバウンスタイマー
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // 初期ロード
  useEffect(() => {
    let aborted = false
    ;(async () => {
      try {
        const res = await fetch('/api/youth/partnerships', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as Row[]
        if (!aborted) setRows(data)
      } catch (e: unknown) {
        if (!aborted) setErrorMsg(e instanceof Error ? e.message : '読み込みに失敗しました')
      } finally {
        if (!aborted) setLoading(false)
      }
    })()
    return () => {
      aborted = true
    }
  }, [])

  // 30秒おきに再フェッチ（他ユーザーの編集を緩やかに反映）
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch('/api/youth/partnerships', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as Row[]
        // 自分が編集中の行（保存中）は残し、それ以外はサーバー値で置き換え
        setRows((prev) => {
          const editing = new Set(savingIds)
          const prevById = new Map(prev.map((r) => [r.id, r]))
          return data.map((d) => (editing.has(d.id) && prevById.get(d.id)) || d)
        })
      } catch {}
    }, 30_000)
    return () => clearInterval(t)
  }, [savingIds])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const hay = [
        r.university,
        r.internal_handler,
        r.partnership_details,
        r.contact_email,
        r.contact_phone,
        r.contact_line,
        r.contact_messenger,
        ...r.partner_contacts.flatMap((c) => [c.name, c.role]),
        ...r.logs.flatMap((l) => [l.date, l.content]),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, query])

  // 行を mutate してデバウンス保存
  function mutateRow(id: string, updater: (r: Row) => Row) {
    setRows((prev) => prev.map((r) => (r.id === id ? updater(r) : r)))
    scheduleSave(id, updater)
  }

  function scheduleSave(id: string, updater: (r: Row) => Row) {
    const timers = saveTimers.current
    if (timers.has(id)) clearTimeout(timers.get(id)!)
    const t = setTimeout(async () => {
      timers.delete(id)
      const current = currentRef.current.find((r) => r.id === id)
      if (!current) return
      // updater はすでに state に反映済みなので current がそのまま送信対象
      setSavingIds((prev) => new Set(prev).add(id))
      try {
        const res = await fetch(`/api/youth/partnerships/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            university: current.university,
            partner_contacts: current.partner_contacts,
            internal_handler: current.internal_handler,
            contact_email: current.contact_email,
            contact_phone: current.contact_phone,
            contact_line: current.contact_line,
            contact_messenger: current.contact_messenger,
            partnership_details: current.partnership_details,
            logs: current.logs,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          console.error('[partnerships PATCH] failed:', err)
          setErrorMsg(`保存失敗: ${err.error ?? res.status}`)
        } else {
          setErrorMsg('')
        }
      } catch (e) {
        console.error('[partnerships PATCH] network error:', e)
        setErrorMsg('保存失敗: ネットワークエラー')
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    }, SAVE_DEBOUNCE_MS)
    timers.set(id, t)
    // 不要な lint 警告を避けるため updater を明示的に参照
    void updater
  }

  // 最新の rows を ref で参照して保存時の stale closure を回避
  const currentRef = useRef<Row[]>(rows)
  useEffect(() => {
    currentRef.current = rows
  }, [rows])

  async function addRow() {
    try {
      const res = await fetch('/api/youth/partnerships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const created = (await res.json()) as Row
      setRows((prev) => [...prev, created])
    } catch (e) {
      console.error('[partnerships POST] failed:', e)
      setErrorMsg('行の追加に失敗しました')
    }
  }

  async function deleteRow(id: string) {
    if (!confirm('この行を削除しますか？')) return
    const prev = rows
    setRows((r) => r.filter((x) => x.id !== id))
    try {
      const res = await fetch(`/api/youth/partnerships/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      console.error('[partnerships DELETE] failed:', e)
      setErrorMsg('削除に失敗しました')
      setRows(prev) // ロールバック
    }
  }

  function updatePartnerContact(id: string, idx: number, patch: Partial<PartnerContact>) {
    mutateRow(id, (r) => {
      const next = r.partner_contacts.slice()
      next[idx] = { ...next[idx], ...patch }
      return { ...r, partner_contacts: next }
    })
  }

  function addPartnerContact(id: string) {
    mutateRow(id, (r) => ({
      ...r,
      partner_contacts: [...r.partner_contacts, { name: '', role: '' }],
    }))
  }

  function removePartnerContact(id: string, idx: number) {
    mutateRow(id, (r) => ({
      ...r,
      partner_contacts:
        r.partner_contacts.length <= 1
          ? [{ name: '', role: '' }]
          : r.partner_contacts.filter((_, i) => i !== idx),
    }))
  }

  function updateLog(id: string, idx: number, patch: Partial<PartnershipLog>) {
    mutateRow(id, (r) => {
      const next = r.logs.slice()
      next[idx] = { ...next[idx], ...patch }
      return { ...r, logs: next }
    })
  }

  function addLog(id: string) {
    mutateRow(id, (r) => ({
      ...r,
      logs: [...r.logs, { date: new Date().toISOString().slice(0, 10), content: '' }],
    }))
  }

  function removeLog(id: string, idx: number) {
    mutateRow(id, (r) => ({ ...r, logs: r.logs.filter((_, i) => i !== idx) }))
  }

  function exportCSV() {
    const csv = toCSV(rows)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `団体連携_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const syncLabel = savingIds.size > 0 ? '保存中…' : loading ? '読込中…' : 'DB 同期済'

  return (
    <>
      <div className="section-title">
        団体連携
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '0.62rem',
            letterSpacing: '0.04em',
            textTransform: 'none',
            color: savingIds.size > 0 ? 'var(--gold)' : 'var(--grn)',
            fontWeight: 600,
          }}
        >
          {syncLabel}
        </span>
      </div>

      <div className="search-row">
        <input
          className="search-input"
          type="text"
          placeholder="大学名・担当者・提携内容で検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="filter-btn" onClick={addRow}>
          ＋ 行を追加
        </button>
        <button className="filter-btn" onClick={exportCSV}>
          ⬇ CSV出力（Excel対応）
        </button>
      </div>

      {errorMsg && (
        <div
          style={{
            marginBottom: '0.8rem',
            padding: '0.5rem 0.8rem',
            fontSize: '0.75rem',
            color: 'var(--red)',
            background: 'rgba(192,57,43,0.06)',
            border: '1px solid rgba(192,57,43,0.2)',
            borderRadius: '4px',
          }}
        >
          {errorMsg}
        </div>
      )}

      <div className="pt-wrap">
        <table className="pt-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th style={{ minWidth: 160 }}>大学名</th>
              <th style={{ minWidth: 240 }}>先方担当</th>
              <th style={{ minWidth: 130 }}>社内担当</th>
              <th style={{ minWidth: 260 }}>連絡先</th>
              <th style={{ minWidth: 220 }}>提携内容</th>
              <th style={{ minWidth: 300 }}>実施内容ログ</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id}>
                <td className="pt-idx">{i + 1}</td>
                <td>
                  <input
                    className="pt-cell"
                    value={r.university}
                    placeholder="大学名"
                    onChange={(e) =>
                      mutateRow(r.id, (row) => ({ ...row, university: e.target.value }))
                    }
                  />
                </td>
                <td>
                  <div className="pt-list">
                    {r.partner_contacts.map((c, idx) => (
                      <div className="pt-contact-row" key={idx}>
                        <input
                          className="pt-cell"
                          value={c.name}
                          placeholder="氏名"
                          onChange={(e) =>
                            updatePartnerContact(r.id, idx, { name: e.target.value })
                          }
                        />
                        <input
                          className="pt-cell"
                          value={c.role}
                          placeholder="役職/所属"
                          onChange={(e) =>
                            updatePartnerContact(r.id, idx, { role: e.target.value })
                          }
                        />
                        <button
                          className="pt-mini"
                          onClick={() => removePartnerContact(r.id, idx)}
                          title="削除"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button className="pt-add" onClick={() => addPartnerContact(r.id)}>
                      ＋ 先方担当を追加
                    </button>
                  </div>
                </td>
                <td>
                  <input
                    className="pt-cell"
                    value={r.internal_handler}
                    placeholder="担当者"
                    onChange={(e) =>
                      mutateRow(r.id, (row) => ({ ...row, internal_handler: e.target.value }))
                    }
                  />
                </td>
                <td>
                  <div className="pt-contact-grid">
                    <label className="pt-field-label">メール</label>
                    <input
                      className="pt-cell"
                      value={r.contact_email}
                      placeholder="example@example.com"
                      onChange={(e) =>
                        mutateRow(r.id, (row) => ({ ...row, contact_email: e.target.value }))
                      }
                    />
                    <label className="pt-field-label">電話</label>
                    <input
                      className="pt-cell"
                      value={r.contact_phone}
                      placeholder="090-0000-0000"
                      onChange={(e) =>
                        mutateRow(r.id, (row) => ({ ...row, contact_phone: e.target.value }))
                      }
                    />
                    <label className="pt-field-label">LINE</label>
                    <input
                      className="pt-cell"
                      value={r.contact_line}
                      placeholder="LINE ID"
                      onChange={(e) =>
                        mutateRow(r.id, (row) => ({ ...row, contact_line: e.target.value }))
                      }
                    />
                    <label className="pt-field-label">Messenger</label>
                    <input
                      className="pt-cell"
                      value={r.contact_messenger}
                      placeholder="Messenger"
                      onChange={(e) =>
                        mutateRow(r.id, (row) => ({ ...row, contact_messenger: e.target.value }))
                      }
                    />
                  </div>
                </td>
                <td>
                  <textarea
                    className="pt-cell pt-textarea"
                    value={r.partnership_details}
                    placeholder="授業連携、インターン紹介など"
                    onChange={(e) =>
                      mutateRow(r.id, (row) => ({ ...row, partnership_details: e.target.value }))
                    }
                  />
                </td>
                <td>
                  <div className="pt-list">
                    {r.logs.length === 0 && <div className="pt-empty">実施記録なし</div>}
                    {r.logs.map((l, idx) => (
                      <div className="pt-log-row" key={idx}>
                        <input
                          className="pt-cell pt-date"
                          type="date"
                          value={l.date}
                          onChange={(e) => updateLog(r.id, idx, { date: e.target.value })}
                        />
                        <input
                          className="pt-cell"
                          value={l.content}
                          placeholder="例）大学の授業で三木が講演実施"
                          onChange={(e) => updateLog(r.id, idx, { content: e.target.value })}
                        />
                        <button
                          className="pt-mini"
                          onClick={() => removeLog(r.id, idx)}
                          title="削除"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button className="pt-add" onClick={() => addLog(r.id)}>
                      ＋ ログを追加
                    </button>
                  </div>
                </td>
                <td>
                  <button
                    className="pt-mini pt-danger"
                    onClick={() => deleteRow(r.id)}
                    title="行を削除"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: 'center', color: 'var(--mu)', padding: '2rem' }}
                >
                  該当する連携団体がありません
                </td>
              </tr>
            )}
            {loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: 'center', color: 'var(--mu)', padding: '2rem' }}
                >
                  読み込み中...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pt-note">
        ※ 編集内容は Supabase に自動保存され、全ユーザーで共有されます（約0.6秒後に反映）。30秒ごとに他ユーザーの更新を取得します。
      </div>
    </>
  )
}
