'use client'

import { useEffect, useState } from 'react'
import type { SelectOption } from '@/types/dashboard'

const LISTS: { key: 'contact_method' | 'inflow_source'; label: string }[] = [
  { key: 'contact_method', label: '連絡手段' },
  { key: 'inflow_source', label: '流入経路' },
]

// 連絡手段・流入経路の選択肢マスタを管理画面から追加・削除する
export default function OptionsAdminPanel({ open }: { open: boolean }) {
  const [options, setOptions] = useState<SelectOption[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({ contact_method: '', inflow_source: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/youth/options')
      .then((r) => r.json())
      .then((data: SelectOption[]) => setOptions(Array.isArray(data) ? data : []))
      .catch(() => setError('読み込みに失敗しました'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (open) load()
  }, [open])

  const add = async (listKey: string) => {
    const value = drafts[listKey]?.trim()
    if (!value) return
    setError('')
    const res = await fetch('/api/youth/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_key: listKey, value }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(err.error ?? '追加に失敗しました')
      return
    }
    setDrafts((prev) => ({ ...prev, [listKey]: '' }))
    load()
  }

  const remove = async (id: number) => {
    await fetch(`/api/youth/options/${id}`, { method: 'DELETE' })
    setOptions((prev) => prev.filter((o) => o.id !== id))
  }

  if (loading) return <div className="empty-state">読み込み中...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      {error && <div className="field-hint" style={{ color: 'var(--red)' }}>{error}</div>}
      {LISTS.map((list) => {
        const items = options.filter((o) => o.list_key === list.key)
        return (
          <div key={list.key} className="card-info">
            <div className="section-label">{list.label}</div>
            <div className="flex-row" style={{ marginBottom: '0.8rem' }}>
              {items.length === 0 && <span className="field-hint">選択肢がありません</span>}
              {items.map((o) => (
                <span key={o.id} className="badge gray" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {o.value}
                  <button
                    className="btn-ghost"
                    style={{ padding: 0, minHeight: 'auto', width: '14px', height: '14px', fontSize: '0.7rem', lineHeight: 1 }}
                    onClick={() => remove(o.id)}
                    title="削除"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex-row">
              <input
                className="input"
                style={{ maxWidth: '220px' }}
                placeholder="新しい選択肢を追加"
                value={drafts[list.key] ?? ''}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [list.key]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') add(list.key) }}
              />
              <button className="btn btn-primary btn-sm" onClick={() => add(list.key)}>＋ 追加</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
