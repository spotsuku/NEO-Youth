'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from './Modal'
import TrashPanel from './TrashPanel'

// 1先方担当（人）= 連絡先＋ログ＋社内担当を内包
interface Contact {
  name: string
  role: string
  internal_handler: string
  email: string
  phone: string
  line: string
  messenger: string
  logs: PartnershipLog[]
}

interface PartnershipLog {
  date: string
  content: string
  author: string
}

interface PartnerDocument {
  name: string
  url: string
  uploaded_at: string
}

// 1団体 = 1行
interface Row {
  id: string
  university: string
  internal_handler: string
  partnership_details: string
  partner_contacts: Contact[]
  is_contracted: boolean
  logo_url: string
  documents: PartnerDocument[]
  manager_name: string
}

const SAVE_DEBOUNCE_MS = 600

// ── 旧 localStorage 移行（既存ロジックを保持） ───────────────
const LEGACY_STORAGE_KEY = 'neo-partnerships-v1'

interface LegacyRow {
  id?: string
  university?: string
  partnerContacts?: { name?: string; role?: string }[]
  internalHandler?: string
  contact?: { email?: string; phone?: string; line?: string; messenger?: string }
  partnershipDetails?: string
  logs?: { date?: string; content?: string }[]
}

function readLegacy(): LegacyRow[] | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as LegacyRow[]
    return null
  } catch {
    return null
  }
}

function archiveLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (raw) {
      const backupKey = `${LEGACY_STORAGE_KEY}-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`
      localStorage.setItem(backupKey, raw)
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    }
  } catch {}
}

function legacyToPayload(l: LegacyRow) {
  const baseContacts =
    Array.isArray(l.partnerContacts) && l.partnerContacts.length > 0
      ? l.partnerContacts
      : [{ name: '', role: '' }]
  const partnerContacts = baseContacts.map((c, i) => ({
    name: c?.name ?? '',
    role: c?.role ?? '',
    internal_handler: l.internalHandler ?? '',
    email: i === 0 ? l.contact?.email ?? '' : '',
    phone: i === 0 ? l.contact?.phone ?? '' : '',
    line: i === 0 ? l.contact?.line ?? '' : '',
    messenger: i === 0 ? l.contact?.messenger ?? '' : '',
    logs:
      i === 0 && Array.isArray(l.logs)
        ? l.logs.map((x) => ({ date: x?.date ?? '', content: x?.content ?? '', author: '' }))
        : [],
  }))
  return {
    university: l.university ?? '',
    internal_handler: l.internalHandler ?? '',
    partnership_details: l.partnershipDetails ?? '',
    partner_contacts: partnerContacts,
  }
}

function csvEscape(v: string) {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCSV(rows: Row[]): string {
  const header = [
    '大学名',
    '社内担当（団体全体）',
    '提携内容',
    '先方担当氏名',
    '役職/所属',
    '社内担当（先方ごと）',
    'メール',
    '電話',
    'LINE',
    'Messenger',
    '実施内容ログ',
  ]
  const body: string[][] = []
  for (const r of rows) {
    if (r.partner_contacts.length === 0) {
      body.push([r.university, r.internal_handler, r.partnership_details, '', '', '', '', '', '', '', ''])
      continue
    }
    for (const c of r.partner_contacts) {
      body.push([
        r.university,
        r.internal_handler,
        r.partnership_details,
        c.name,
        c.role,
        c.internal_handler,
        c.email,
        c.phone,
        c.line,
        c.messenger,
        c.logs.filter((l) => l.date || l.content).map((l) => `${l.date}：${l.content}`).join(' / '),
      ])
    }
  }
  return [header, ...body].map((row) => row.map(csvEscape).join(',')).join('\r\n')
}

function nonEmptyContactCount(r: Row): number {
  return r.partner_contacts.filter(
    (c) =>
      c.name || c.role || c.email || c.phone || c.line || c.messenger || c.logs.length > 0,
  ).length
}

// ── 本体 ──────────────────────────────────────
export default function PartnershipsTab() {
  const [rows, setRows] = useState<Row[]>([])
  const [query, setQuery] = useState('')
  const [contractFilter, setContractFilter] = useState<'全て' | '締結済み' | '候補'>('全て')
  const [showTrash, setShowTrash] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // ログ表示中の (rowId, contactIndex)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const expandKey = (rowId: string, idx: number) => `${rowId}::${idx}`

  // 旧 localStorage 移行 UI 用
  const [legacyRows, setLegacyRows] = useState<LegacyRow[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<{ done: number; total: number } | null>(null)
  const [importResult, setImportResult] = useState<string>('')

  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const currentRef = useRef<Row[]>(rows)
  useEffect(() => {
    currentRef.current = rows
  }, [rows])

  // 初期ロード
  useEffect(() => {
    let aborted = false
    ;(async () => {
      try {
        const res = await fetch('/api/youth/partnerships', { cache: 'no-store' })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          const hint =
            typeof err?.message === 'string' && /relation .* does not exist/i.test(err.message)
              ? '（Supabase で 016_youth_partnerships.sql / 017_partnership_contacts_nested.sql を実行してください）'
              : ''
          throw new Error(
            `読み込み失敗 (HTTP ${res.status}): ${err?.error ?? err?.message ?? '不明なエラー'} ${hint}`.trim(),
          )
        }
        const data = (await res.json()) as Row[]
        if (!aborted) {
          setRows(data)
          if (data.length > 0) setSelectedId(data[0].id)
        }
      } catch (e: unknown) {
        if (!aborted) setErrorMsg(e instanceof Error ? e.message : '読み込みに失敗しました')
      } finally {
        if (!aborted) setLoading(false)
      }
    })()
    const legacy = readLegacy()
    if (legacy) setLegacyRows(legacy)
    return () => {
      aborted = true
    }
  }, [])

  // 30秒おきに再フェッチ
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch('/api/youth/partnerships', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as Row[]
        setRows((prev) => {
          const editing = new Set(savingIds)
          const prevById = new Map(prev.map((r) => [r.id, r]))
          return data.map((d) => (editing.has(d.id) && prevById.get(d.id)) || d)
        })
      } catch {}
    }, 30_000)
    return () => clearInterval(t)
  }, [savingIds])

  // 検索（サイドバーのフィルタ）
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((r) => {
        if (contractFilter === '締結済み') return r.is_contracted
        if (contractFilter === '候補') return !r.is_contracted
        return true
      })
      .filter((r) => {
        if (!q) return true
        const hay = [
          r.university,
          r.internal_handler,
          r.partnership_details,
          ...r.partner_contacts.flatMap((c) => [
            c.name,
            c.role,
            c.email,
            c.phone,
            c.line,
            c.messenger,
            ...c.logs.flatMap((l) => [l.date, l.content]),
          ]),
        ]
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
  }, [rows, query, contractFilter])

  // 大学名でソート（読みやすさのため）
  const sortedRows = useMemo(() => {
    return filteredRows.slice().sort((a, b) => {
      const aU = (a.university || '').trim()
      const bU = (b.university || '').trim()
      if (!aU && bU) return 1
      if (aU && !bU) return -1
      return aU.localeCompare(bU, 'ja')
    })
  }, [filteredRows])

  const selected = rows.find((r) => r.id === selectedId) ?? null

  // ── ローカル変更 + デバウンス保存 ──────────────
  function mutateRow(id: string, updater: (r: Row) => Row) {
    setRows((prev) => prev.map((r) => (r.id === id ? updater(r) : r)))
    scheduleSave(id)
  }

  function scheduleSave(id: string) {
    const timers = saveTimers.current
    if (timers.has(id)) clearTimeout(timers.get(id)!)
    const t = setTimeout(async () => {
      timers.delete(id)
      const current = currentRef.current.find((r) => r.id === id)
      if (!current) return
      setSavingIds((prev) => new Set(prev).add(id))
      try {
        const res = await fetch(`/api/youth/partnerships/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            university: current.university,
            internal_handler: current.internal_handler,
            partnership_details: current.partnership_details,
            partner_contacts: current.partner_contacts,
            is_contracted: current.is_contracted,
            logo_url: current.logo_url,
            documents: current.documents,
            manager_name: current.manager_name,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          console.error('[partnerships PATCH] failed:', err)
          setErrorMsg(`保存失敗: ${err.error ?? err.message ?? `HTTP ${res.status}`}${err.hint ? ` / ${err.hint}` : ''}`)
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
  }

  // ── 行の追加・削除 ────────────────────────
  async function addRow() {
    try {
      const res = await fetch('/api/youth/partnerships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('[partnerships POST] failed:', err)
        const tableMissing =
          typeof err?.message === 'string' && /relation .* does not exist/i.test(err.message)
        setErrorMsg(
          tableMissing
            ? 'Supabase に youth_partnerships テーブルが存在しません。SQL Editor で 016_youth_partnerships.sql を実行してください。'
            : `行追加失敗: ${err.error ?? err.message ?? `HTTP ${res.status}`}${err.hint ? ` / ${err.hint}` : ''}`,
        )
        return
      }
      const created = (await res.json()) as Row
      setRows((prev) => [...prev, created])
      setSelectedId(created.id)
      setErrorMsg('')
    } catch (e) {
      console.error('[partnerships POST] network error:', e)
      setErrorMsg('行追加失敗: ネットワークエラー')
    }
  }

  async function deleteRow(id: string) {
    if (!confirm('この団体を削除しますか？\n中の先方担当・ログもすべて削除されます。')) return
    const prev = rows
    const wasSelected = selectedId === id
    setRows((r) => r.filter((x) => x.id !== id))
    if (wasSelected) {
      const remaining = prev.filter((x) => x.id !== id)
      setSelectedId(remaining[0]?.id ?? null)
    }
    try {
      const res = await fetch(`/api/youth/partnerships/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('[partnerships DELETE] failed:', err)
        setErrorMsg(`削除失敗: ${err.error ?? err.message ?? `HTTP ${res.status}`}${err.hint ? ` / ${err.hint}` : ''}`)
        setRows(prev)
        if (wasSelected) setSelectedId(id)
      } else {
        setErrorMsg('')
      }
    } catch (e) {
      console.error('[partnerships DELETE] network error:', e)
      setErrorMsg('削除失敗: ネットワークエラー')
      setRows(prev)
      if (wasSelected) setSelectedId(id)
    }
  }

  // ── 先方担当の追加・削除・更新 ───────────────
  function addContact(rowId: string) {
    mutateRow(rowId, (r) => ({
      ...r,
      partner_contacts: [
        ...r.partner_contacts,
        { name: '', role: '', internal_handler: '', email: '', phone: '', line: '', messenger: '', logs: [] },
      ],
    }))
  }

  function removeContact(rowId: string, idx: number) {
    if (!confirm('この先方担当を削除しますか？')) return
    mutateRow(rowId, (r) => ({
      ...r,
      partner_contacts:
        r.partner_contacts.length <= 1
          ? [{ name: '', role: '', internal_handler: '', email: '', phone: '', line: '', messenger: '', logs: [] }]
          : r.partner_contacts.filter((_, i) => i !== idx),
    }))
  }

  function updateContact(rowId: string, idx: number, patch: Partial<Contact>) {
    mutateRow(rowId, (r) => {
      const next = r.partner_contacts.slice()
      next[idx] = { ...next[idx], ...patch }
      return { ...r, partner_contacts: next }
    })
  }

  // ── ログ ───────────────────────────
  function addLog(rowId: string, idx: number) {
    mutateRow(rowId, (r) => {
      const next = r.partner_contacts.slice()
      next[idx] = {
        ...next[idx],
        logs: [...next[idx].logs, { date: new Date().toISOString().slice(0, 10), content: '', author: '' }],
      }
      return { ...r, partner_contacts: next }
    })
    setExpandedLogs((prev) => new Set(prev).add(expandKey(rowId, idx)))
  }

  function removeLog(rowId: string, idx: number, logIdx: number) {
    mutateRow(rowId, (r) => {
      const next = r.partner_contacts.slice()
      next[idx] = { ...next[idx], logs: next[idx].logs.filter((_, i) => i !== logIdx) }
      return { ...r, partner_contacts: next }
    })
  }

  function updateLog(rowId: string, idx: number, logIdx: number, patch: Partial<PartnershipLog>) {
    mutateRow(rowId, (r) => {
      const next = r.partner_contacts.slice()
      const logs = next[idx].logs.slice()
      logs[logIdx] = { ...logs[logIdx], ...patch }
      next[idx] = { ...next[idx], logs }
      return { ...r, partner_contacts: next }
    })
  }

  function toggleLogs(rowId: string, idx: number) {
    const key = expandKey(rowId, idx)
    setExpandedLogs((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ── レガシー移行 ───────────────────────
  async function importLegacy() {
    if (!legacyRows || importing) return
    if (
      !confirm(
        `ローカルブラウザに保存されている ${legacyRows.length} 件の学校連携データを DB にインポートしますか？\n\n` +
          '※ 既に DB に同名の団体がある場合は重複して追加されます（後から手動で調整してください）\n' +
          '※ 元データは自動的にバックアップキーへ退避され、すぐには削除されません',
      )
    )
      return

    setImporting(true)
    setImportStatus({ done: 0, total: legacyRows.length })
    setImportResult('')

    const created: Row[] = []
    let failed = 0
    let firstError: string | null = null

    for (let i = 0; i < legacyRows.length; i++) {
      const payload = legacyToPayload(legacyRows[i])
      try {
        const res = await fetch('/api/youth/partnerships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          failed++
          const err = await res.json().catch(() => ({}))
          console.error('[partnerships import] row failed:', err)
          if (!firstError) {
            const msg = err?.error ?? err?.message ?? `HTTP ${res.status}`
            const tableMissing = typeof msg === 'string' && /relation .* does not exist/i.test(msg)
            firstError = tableMissing
              ? 'Supabase に youth_partnerships テーブルがまだ作成されていません。SQL Editor で 016_youth_partnerships.sql を実行してください。'
              : `${msg}${err?.hint ? ` / hint: ${err.hint}` : ''}`
          }
        } else {
          created.push((await res.json()) as Row)
        }
      } catch (e) {
        failed++
        console.error('[partnerships import] network error:', e)
        if (!firstError) firstError = e instanceof Error ? e.message : 'ネットワークエラー'
      }
      setImportStatus({ done: i + 1, total: legacyRows.length })
    }

    if (created.length > 0) setRows((prev) => [...prev, ...created])

    if (failed === 0) {
      archiveLegacy()
      setLegacyRows(null)
      setImportResult(`${created.length} 件を DB にインポートしました。元データはブラウザ内のバックアップキーに保存済みです。`)
    } else {
      setImportResult(
        `${created.length} 件をインポート、${failed} 件が失敗しました。元データは削除せず残しています（再試行可）。\n原因: ${firstError ?? '不明'}`,
      )
    }

    setImporting(false)
  }

  function dismissLegacy() {
    if (
      !confirm(
        'このメッセージを非表示にしますか？ローカルデータは削除されません。\n（ページをリロードすると再度表示されます）',
      )
    )
      return
    setLegacyRows(null)
  }

  // ── CSV ───────────────────────────────
  function exportCSV() {
    const csv = toCSV(rows)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `学校連携_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const syncLabel = savingIds.size > 0 ? '保存中…' : loading ? '読込中…' : 'DB 同期済'

  // ── レンダリング ────────────────────────
  return (
    <>
      <div className="section-title">
        学校連携
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
          placeholder="大学名・担当者・提携内容・ログで検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="filter-btn" onClick={addRow}>
          ＋ 行を追加
        </button>
        <button className="filter-btn" onClick={exportCSV}>
          ⬇ CSV出力（Excel対応）
        </button>
        <button className="filter-btn" onClick={() => setShowTrash(true)}>
          🗑 ゴミ箱
        </button>
      </div>

      <div className="search-row" style={{ gap: '0.35rem' }}>
        {(['全て', '締結済み', '候補'] as const).map((f) => (
          <button
            key={f}
            className={`filter-btn ${contractFilter === f ? 'active' : ''}`}
            onClick={() => setContractFilter(f)}
          >
            {f === '全て'
              ? `全て (${rows.length})`
              : f === '締結済み'
              ? `締結済み (${rows.filter((r) => r.is_contracted).length})`
              : `候補 (${rows.filter((r) => !r.is_contracted).length})`}
          </button>
        ))}
      </div>

      {legacyRows && (
        <div
          style={{
            marginBottom: '0.9rem',
            padding: '0.8rem 1rem',
            fontSize: '0.78rem',
            color: 'var(--ink)',
            background: 'rgba(196,136,42,0.08)',
            border: '1px solid rgba(196,136,42,0.35)',
            borderRadius: '5px',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--gold)', marginBottom: '0.35rem' }}>
            ローカル保存データが見つかりました（{legacyRows.length} 件）
          </div>
          <div style={{ color: 'var(--ink2)', lineHeight: 1.6, marginBottom: '0.6rem' }}>
            以前の学校連携タブ（localStorage 版）で登録された {legacyRows.length} 件のデータがこのブラウザに残っています。
            DB 同期版に切り替わったため、そのままでは他のユーザーに共有されません。
            <br />
            <strong>DB にインポート</strong> を押すと、全件を Supabase へ登録し、全員に共有されるようになります。
            元データはブラウザ内のバックアップキーに自動退避されます（即時には削除しません）。
          </div>
          {importStatus && (
            <div
              style={{
                fontSize: '0.72rem',
                color: 'var(--mu)',
                marginBottom: '0.5rem',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              進行状況: {importStatus.done} / {importStatus.total}
            </div>
          )}
          {importResult && (
            <div
              style={{
                fontSize: '0.74rem',
                color: importResult.includes('失敗') ? 'var(--red)' : 'var(--grn)',
                marginBottom: '0.5rem',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5,
              }}
            >
              {importResult}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="filter-btn"
              onClick={importLegacy}
              disabled={importing}
              style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}
            >
              {importing ? 'インポート中...' : `⬆ DB にインポート（${legacyRows.length} 件）`}
            </button>
            <button className="filter-btn" onClick={dismissLegacy} disabled={importing}>
              今は閉じる
            </button>
          </div>
        </div>
      )}

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
            whiteSpace: 'pre-wrap',
          }}
        >
          {errorMsg}
        </div>
      )}

      <div className="pt-split">
        {/* 左: 大学一覧サイドバー */}
        <aside className="pt-sidebar">
          <div className="pt-sidebar-head">
            大学・団体（{sortedRows.length}{query ? ` / ${rows.length}` : ''}）
          </div>
          <div className="pt-sidebar-list">
            {sortedRows.length === 0 && !loading && (
              <div className="pt-empty" style={{ padding: '1rem', textAlign: 'center' }}>
                {query ? '該当する団体がありません' : '団体がまだ登録されていません'}
              </div>
            )}
            {sortedRows.map((r) => {
              const count = nonEmptyContactCount(r)
              const isSelected = r.id === selectedId
              const isSaving = savingIds.has(r.id)
              return (
                <button
                  key={r.id}
                  className={`pt-sidebar-item ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedId(r.id)}
                  type="button"
                >
                  <span className="pt-sidebar-uni">
                    {r.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.logo_url} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain', borderRadius: '2px', marginRight: '0.35rem', verticalAlign: 'middle' }} />
                    )}
                    {r.university || '（名称未設定）'}
                  </span>
                  <span className="pt-sidebar-meta">
                    <span className={`badge ${r.is_contracted ? 'grn' : 'gray'}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>
                      {r.is_contracted ? '締結済み' : '候補'}
                    </span>
                    {isSaving && <span className="pt-saving-dot" title="保存中" />}
                    <span className="pt-sidebar-count">{count}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        {/* 右: 詳細パネル */}
        <section className="pt-detail">
          {!selected ? (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--mu)',
                padding: '3rem 1rem',
                fontSize: '0.85rem',
              }}
            >
              {loading
                ? '読み込み中...'
                : rows.length === 0
                ? '「＋ 行を追加」で最初の団体を登録してください'
                : '左の一覧から大学を選択してください'}
            </div>
          ) : (
            <PartnershipDetail
              row={selected}
              onUpdate={mutateRow}
              onDelete={() => deleteRow(selected.id)}
              expandedLogs={expandedLogs}
              expandKey={expandKey}
              toggleLogs={toggleLogs}
              addContact={addContact}
              removeContact={removeContact}
              updateContact={updateContact}
              addLog={addLog}
              removeLog={removeLog}
              updateLog={updateLog}
            />
          )}
        </section>
      </div>

      <div className="pt-note">
        ※ 1団体につき1行。先方担当は行内で複数登録できます。編集は Supabase に自動保存され、全ユーザーで共有されます（約0.6秒後に反映）。30秒ごとに他ユーザーの更新を取得します。
      </div>

      <Modal open={showTrash} onClose={() => setShowTrash(false)} title="ゴミ箱">
        <TrashPanel apiPath="/api/youth/partnerships" nameField="id" labelField="university" open={showTrash} />
      </Modal>
    </>
  )
}

// ── 詳細パネル ───────────────────────────
interface DetailProps {
  row: Row
  onUpdate: (id: string, updater: (r: Row) => Row) => void
  onDelete: () => void
  expandedLogs: Set<string>
  expandKey: (rowId: string, idx: number) => string
  toggleLogs: (rowId: string, idx: number) => void
  addContact: (rowId: string) => void
  removeContact: (rowId: string, idx: number) => void
  updateContact: (rowId: string, idx: number, patch: Partial<Contact>) => void
  addLog: (rowId: string, idx: number) => void
  removeLog: (rowId: string, idx: number, logIdx: number) => void
  updateLog: (rowId: string, idx: number, logIdx: number, patch: Partial<PartnershipLog>) => void
}

function PartnershipDetail({
  row,
  onUpdate,
  onDelete,
  expandedLogs,
  expandKey,
  toggleLogs,
  addContact,
  removeContact,
  updateContact,
  addLog,
  removeLog,
  updateLog,
}: DetailProps) {
  return (
    <>
      <div className="pt-detail-head">
        <input
          className="pt-cell pt-title"
          value={row.university}
          placeholder="大学・団体名"
          onChange={(e) => onUpdate(row.id, (r) => ({ ...r, university: e.target.value }))}
        />
        <button className="pt-mini pt-danger" onClick={onDelete} title="この団体を削除">
          団体を削除
        </button>
      </div>

      <div className="pt-field" style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={row.is_contracted}
            onChange={(e) => onUpdate(row.id, (r) => ({ ...r, is_contracted: e.target.checked }))}
          />
          <span className={`badge ${row.is_contracted ? 'grn' : 'gray'}`}>
            {row.is_contracted ? '締結済み' : '候補'}
          </span>
        </label>
      </div>

      <PartnerAssets row={row} onUpdate={onUpdate} />

      <div className="pt-detail-fields">
        <div className="pt-field">
          <div className="pt-field-label">責任者名</div>
          <input
            className="pt-cell"
            value={row.manager_name}
            placeholder="先方の責任者名"
            onChange={(e) =>
              onUpdate(row.id, (r) => ({ ...r, manager_name: e.target.value }))
            }
          />
        </div>
        <div className="pt-field">
          <div className="pt-field-label">社内担当（団体全体・元の担当）</div>
          <input
            className="pt-cell"
            value={row.internal_handler}
            placeholder="団体全体の担当者"
            onChange={(e) =>
              onUpdate(row.id, (r) => ({ ...r, internal_handler: e.target.value }))
            }
          />
          <div className="pt-field-hint">
            ※ 先方担当ごとに分かれている場合は、各カード内の「社内担当」を使ってください
          </div>
        </div>
        <div className="pt-field">
          <div className="pt-field-label">提携内容</div>
          <textarea
            className="pt-cell pt-textarea"
            value={row.partnership_details}
            placeholder="授業連携、インターン紹介など"
            onChange={(e) =>
              onUpdate(row.id, (r) => ({ ...r, partnership_details: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="pt-section-label">先方担当（{row.partner_contacts.length}名）</div>

      <div className="pt-contacts">
        {row.partner_contacts.map((c, idx) => {
          const key = expandKey(row.id, idx)
          const expanded = expandedLogs.has(key)
          return (
            <div className="pt-contact-card" key={idx}>
              <div className="pt-contact-row">
                <input
                  className="pt-cell"
                  value={c.name}
                  placeholder="氏名"
                  onChange={(e) => updateContact(row.id, idx, { name: e.target.value })}
                />
                <input
                  className="pt-cell"
                  value={c.role}
                  placeholder="役職/所属"
                  onChange={(e) => updateContact(row.id, idx, { role: e.target.value })}
                />
                <button
                  className="pt-mini"
                  onClick={() => removeContact(row.id, idx)}
                  title="この先方担当を削除"
                >
                  ×
                </button>
              </div>
              <div className="pt-contact-handler">
                <label className="pt-field-label">社内担当</label>
                <input
                  className="pt-cell"
                  value={c.internal_handler}
                  placeholder={row.internal_handler || '担当者（この先方）'}
                  onChange={(e) =>
                    updateContact(row.id, idx, { internal_handler: e.target.value })
                  }
                />
              </div>
              <div className="pt-contact-grid">
                <label className="pt-field-label">メール</label>
                <input
                  className="pt-cell"
                  value={c.email}
                  placeholder="example@example.com"
                  onChange={(e) => updateContact(row.id, idx, { email: e.target.value })}
                />
                <label className="pt-field-label">電話</label>
                <input
                  className="pt-cell"
                  value={c.phone}
                  placeholder="090-0000-0000"
                  onChange={(e) => updateContact(row.id, idx, { phone: e.target.value })}
                />
                <label className="pt-field-label">LINE</label>
                <input
                  className="pt-cell"
                  value={c.line}
                  placeholder="LINE ID"
                  onChange={(e) => updateContact(row.id, idx, { line: e.target.value })}
                />
                <label className="pt-field-label">Messenger</label>
                <input
                  className="pt-cell"
                  value={c.messenger}
                  placeholder="Messenger"
                  onChange={(e) => updateContact(row.id, idx, { messenger: e.target.value })}
                />
              </div>
              <div className="pt-logs-bar">
                <button
                  className="pt-log-toggle"
                  onClick={() => toggleLogs(row.id, idx)}
                  title={expanded ? 'ログを閉じる' : 'ログを開く'}
                >
                  {expanded ? '▼' : '▶'} 実施ログ（{c.logs.length}）
                </button>
                <button className="pt-add" onClick={() => addLog(row.id, idx)}>
                  ＋ ログを追加
                </button>
              </div>
              {expanded && (
                <div className="pt-logs">
                  {c.logs.length === 0 && <div className="pt-empty">実施記録はまだありません</div>}
                  {c.logs.map((l, logIdx) => (
                    <div className="pt-log-row" key={logIdx}>
                      <input
                        className="pt-cell pt-date"
                        type="date"
                        value={l.date}
                        onChange={(e) => updateLog(row.id, idx, logIdx, { date: e.target.value })}
                      />
                      <input
                        className="pt-cell"
                        value={l.content}
                        placeholder="例）大学の授業で三木が講演実施"
                        onChange={(e) => updateLog(row.id, idx, logIdx, { content: e.target.value })}
                      />
                      <input
                        className="pt-cell"
                        style={{ maxWidth: '110px' }}
                        value={l.author ?? ''}
                        placeholder="実施者"
                        onChange={(e) => updateLog(row.id, idx, logIdx, { author: e.target.value })}
                      />
                      <button
                        className="pt-mini"
                        onClick={() => removeLog(row.id, idx, logIdx)}
                        title="ログを削除"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        <button className="pt-add pt-add-contact" onClick={() => addContact(row.id)}>
          ＋ 先方担当を追加
        </button>
      </div>
    </>
  )
}

// ── ロゴ・資料アップロード ───────────────────
async function uploadFile(file: File): Promise<PartnerDocument> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/youth/upload', { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `アップロード失敗 (HTTP ${res.status})`)
  }
  return res.json()
}

function PartnerAssets({
  row,
  onUpdate,
}: {
  row: Row
  onUpdate: (id: string, updater: (r: Row) => Row) => void
}) {
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [assetError, setAssetError] = useState('')

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true)
    setAssetError('')
    try {
      const uploaded = await uploadFile(file)
      onUpdate(row.id, (r) => ({ ...r, logo_url: uploaded.url }))
    } catch (e) {
      setAssetError(e instanceof Error ? e.message : 'ロゴのアップロードに失敗しました')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleDocUpload = async (file: File) => {
    setUploadingDoc(true)
    setAssetError('')
    try {
      const uploaded = await uploadFile(file)
      onUpdate(row.id, (r) => ({ ...r, documents: [...r.documents, uploaded] }))
    } catch (e) {
      setAssetError(e instanceof Error ? e.message : '資料のアップロードに失敗しました')
    } finally {
      setUploadingDoc(false)
    }
  }

  const removeDoc = (idx: number) => {
    onUpdate(row.id, (r) => ({ ...r, documents: r.documents.filter((_, i) => i !== idx) }))
  }

  return (
    <div className="pt-field" style={{ marginBottom: '1rem' }}>
      <div className="pt-field-label">ロゴ・資料</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {row.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.logo_url}
              alt="ロゴ"
              style={{ width: '40px', height: '40px', objectFit: 'contain', border: '1px solid var(--bd)', borderRadius: '4px' }}
            />
          )}
          <label className="pt-add" style={{ cursor: 'pointer' }}>
            {uploadingLogo ? 'アップロード中...' : row.logo_url ? 'ロゴを変更' : 'ロゴを追加'}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleLogoUpload(file)
                e.target.value = ''
              }}
            />
          </label>
        </div>

        <label className="pt-add" style={{ cursor: 'pointer' }}>
          {uploadingDoc ? 'アップロード中...' : '＋ 資料を追加'}
          <input
            type="file"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleDocUpload(file)
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {assetError && <div style={{ color: 'var(--red)', fontSize: '0.72rem', marginTop: '0.35rem' }}>{assetError}</div>}

      {row.documents.length > 0 && (
        <ul style={{ marginTop: '0.5rem', fontSize: '0.78rem', paddingLeft: '1.1rem' }}>
          {row.documents.map((d, idx) => (
            <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <a href={d.url} target="_blank" rel="noopener noreferrer">{d.name}</a>
              <button className="pt-mini" onClick={() => removeDoc(idx)} title="削除">×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
