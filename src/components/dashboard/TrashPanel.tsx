'use client'

import { useState, useEffect, useCallback } from 'react'

// ゴミ箱（論理削除の一覧・復元）。候補者・学校連携どちらでも使う汎用パネル。
export default function TrashPanel({ apiPath, nameField, labelField, open }: {
  apiPath: string
  nameField: string
  labelField: string
  open: boolean
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiPath}?trash=true`, { cache: 'no-store' })
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [apiPath])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const restore = async (row: Record<string, unknown>) => {
    const key = String(row[nameField])
    setRestoringId(key)
    try {
      await fetch(`${apiPath}/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleted_at: null }),
      })
      setRows((prev) => prev.filter((r) => String(r[nameField]) !== key))
    } finally {
      setRestoringId(null)
    }
  }

  if (loading) return <div className="empty-state">読み込み中...</div>
  if (rows.length === 0) return <div className="empty-state">ゴミ箱は空です</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {rows.map((r) => {
        const key = String(r[nameField])
        return (
          <div key={key} className="card-info flex-between">
            <div>
              <div style={{ fontWeight: 700 }}>{String(r[labelField] ?? key)}</div>
              <div className="field-hint">
                削除日時: {r.deleted_at ? new Date(String(r.deleted_at)).toLocaleString('ja-JP') : '-'}
              </div>
            </div>
            <button className="btn btn-primary btn-sm" disabled={restoringId === key} onClick={() => restore(r)}>
              {restoringId === key ? '復元中...' : '復元'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
