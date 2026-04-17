'use client'

import { useEffect, useMemo, useState } from 'react'
import type {
  Partnership,
  PartnerContact,
  PartnershipLog,
} from '@/types/dashboard'

interface Props {
  initial: Partnership[]
}

const STORAGE_KEY = 'neo-partnerships-v1'

function emptyRow(): Partnership {
  return {
    id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    university: '',
    partnerContacts: [{ name: '', role: '' }],
    internalHandler: '',
    contact: { email: '', phone: '', line: '', messenger: '' },
    partnershipDetails: '',
    logs: [],
  }
}

function csvEscape(v: string) {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCSV(rows: Partnership[]): string {
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
    r.partnerContacts
      .filter((c) => c.name || c.role)
      .map((c) => (c.role ? `${c.name}（${c.role}）` : c.name))
      .join(' / '),
    r.internalHandler,
    r.contact.email,
    r.contact.phone,
    r.contact.line,
    r.contact.messenger,
    r.partnershipDetails,
    r.logs
      .filter((l) => l.date || l.content)
      .map((l) => `${l.date}：${l.content}`)
      .join(' / '),
  ])
  return [header, ...body]
    .map((row) => row.map(csvEscape).join(','))
    .join('\r\n')
}

export default function PartnershipsTab({ initial }: Props) {
  const [rows, setRows] = useState<Partnership[]>(initial)
  const [query, setQuery] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partnership[]
        if (Array.isArray(parsed) && parsed.length > 0) setRows(parsed)
      }
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
    } catch {}
  }, [rows, loaded])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const hay = [
        r.university,
        r.internalHandler,
        r.partnershipDetails,
        r.contact.email,
        r.contact.phone,
        r.contact.line,
        r.contact.messenger,
        ...r.partnerContacts.flatMap((c) => [c.name, c.role]),
        ...r.logs.flatMap((l) => [l.date, l.content]),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, query])

  function updateRow(id: string, patch: Partial<Partnership>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function updateContact(id: string, patch: Partial<Partnership['contact']>) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, contact: { ...r.contact, ...patch } } : r,
      ),
    )
  }

  function updatePartnerContact(
    id: string,
    idx: number,
    patch: Partial<PartnerContact>,
  ) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const next = r.partnerContacts.slice()
        next[idx] = { ...next[idx], ...patch }
        return { ...r, partnerContacts: next }
      }),
    )
  }

  function addPartnerContact(id: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, partnerContacts: [...r.partnerContacts, { name: '', role: '' }] }
          : r,
      ),
    )
  }

  function removePartnerContact(id: string, idx: number) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              partnerContacts:
                r.partnerContacts.length <= 1
                  ? [{ name: '', role: '' }]
                  : r.partnerContacts.filter((_, i) => i !== idx),
            }
          : r,
      ),
    )
  }

  function updateLog(id: string, idx: number, patch: Partial<PartnershipLog>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const next = r.logs.slice()
        next[idx] = { ...next[idx], ...patch }
        return { ...r, logs: next }
      }),
    )
  }

  function addLog(id: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              logs: [
                ...r.logs,
                { date: new Date().toISOString().slice(0, 10), content: '' },
              ],
            }
          : r,
      ),
    )
  }

  function removeLog(id: string, idx: number) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, logs: r.logs.filter((_, i) => i !== idx) } : r,
      ),
    )
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
  }

  function deleteRow(id: string) {
    if (!confirm('この行を削除しますか？')) return
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  function resetToSeed() {
    if (!confirm('初期データにリセットしますか？（編集内容は失われます）')) return
    setRows(initial)
  }

  function exportCSV() {
    const csv = toCSV(rows)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `団体連携_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="section-title">団体連携</div>

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
        <button className="filter-btn" onClick={resetToSeed}>
          ↺ リセット
        </button>
      </div>

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
                    onChange={(e) => updateRow(r.id, { university: e.target.value })}
                  />
                </td>
                <td>
                  <div className="pt-list">
                    {r.partnerContacts.map((c, idx) => (
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
                    value={r.internalHandler}
                    placeholder="担当者"
                    onChange={(e) =>
                      updateRow(r.id, { internalHandler: e.target.value })
                    }
                  />
                </td>
                <td>
                  <div className="pt-contact-grid">
                    <label className="pt-field-label">メール</label>
                    <input
                      className="pt-cell"
                      value={r.contact.email}
                      placeholder="example@example.com"
                      onChange={(e) => updateContact(r.id, { email: e.target.value })}
                    />
                    <label className="pt-field-label">電話</label>
                    <input
                      className="pt-cell"
                      value={r.contact.phone}
                      placeholder="090-0000-0000"
                      onChange={(e) => updateContact(r.id, { phone: e.target.value })}
                    />
                    <label className="pt-field-label">LINE</label>
                    <input
                      className="pt-cell"
                      value={r.contact.line}
                      placeholder="LINE ID"
                      onChange={(e) => updateContact(r.id, { line: e.target.value })}
                    />
                    <label className="pt-field-label">Messenger</label>
                    <input
                      className="pt-cell"
                      value={r.contact.messenger}
                      placeholder="Messenger"
                      onChange={(e) => updateContact(r.id, { messenger: e.target.value })}
                    />
                  </div>
                </td>
                <td>
                  <textarea
                    className="pt-cell pt-textarea"
                    value={r.partnershipDetails}
                    placeholder="授業連携、インターン紹介など"
                    onChange={(e) =>
                      updateRow(r.id, { partnershipDetails: e.target.value })
                    }
                  />
                </td>
                <td>
                  <div className="pt-list">
                    {r.logs.length === 0 && (
                      <div className="pt-empty">実施記録なし</div>
                    )}
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
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: 'center', color: 'var(--mu)', padding: '2rem' }}
                >
                  該当する連携団体がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pt-note">
        ※ 編集内容はブラウザに自動保存されます。CSV出力するとExcelでそのまま開けます。
      </div>
    </>
  )
}
