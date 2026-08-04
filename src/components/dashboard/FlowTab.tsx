'use client'

import { useState, useMemo, useRef } from 'react'
import type { YouthCandidate } from '@/types/dashboard'

interface Props {
  candidates: YouthCandidate[]
  onUpdate: (name: string, patch: Partial<YouthCandidate>) => Promise<void>
}

// ステータス（事実に基づく状態）フロー順
const STATUSES = [
  { key: '応募前', color: 'var(--bd2)' },
  { key: '応募完了', color: 'var(--grn)' },
  { key: '書類選考', color: 'var(--blu)' },
  { key: 'グループ面接', color: 'var(--gold)' },
  { key: '最終面接', color: 'var(--red)' },
  { key: '合格予定', color: 'var(--blu)' },
  { key: '合格', color: 'var(--grn)' },
  { key: '補欠合格', color: 'var(--gold)' },
  { key: '承諾書提出', color: 'var(--grn)' },
  { key: '保留', color: 'var(--gold)' },
  { key: '辞退', color: 'var(--red)' },
]

export default function FlowTab({ candidates, onUpdate }: Props) {
  const [dragName, setDragName] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)
  const dragRef = useRef<string | null>(null)

  const columns = useMemo(() => {
    const map = new Map<string, YouthCandidate[]>()
    for (const s of STATUSES) map.set(s.key, [])
    for (const c of candidates) {
      const list = map.get(c.status)
      if (list) list.push(c)
    }
    return STATUSES.map((s) => ({
      ...s,
      candidates: map.get(s.key) ?? [],
    }))
  }, [candidates])

  const handleDragStart = (name: string) => {
    setDragName(name)
    dragRef.current = name
  }

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault()
    setOverCol(colKey)
  }

  const handleDrop = (colKey: string) => {
    const name = dragRef.current
    if (!name) { resetDrag(); return }
    const c = candidates.find((x) => x.name === name)
    if (!c || c.status === colKey) { resetDrag(); return }
    onUpdate(name, { status: colKey })
    resetDrag()
  }

  const resetDrag = () => {
    setDragName(null)
    setOverCol(null)
    dragRef.current = null
  }

  const total = candidates.filter((c) => !c.rejected_at).length
  // 不合格者はカウントに含めない（カードは表示される）
  const count = (key: string) => candidates.filter((c) => c.status === key && !c.rejected_at).length

  // 不合格: ステータスは変えず rejected_at をトグル（その場でグレーアウト）
  const handleReject = (name: string) => {
    const c = candidates.find((x) => x.name === name)
    if (!c) return
    onUpdate(name, { rejected_at: c.rejected_at ? null : new Date().toISOString() })
  }

  return (
    <>
      {/* ファネル */}
      <div className="card-info" style={{ marginBottom: '1.4rem' }}>
        <div className="section-label">選考ファネル</div>
        <div className="stepper">
          {STATUSES.map((s) => {
            const n = count(s.key)
            const pct = total > 0 ? Math.max((n / total) * 100, n > 0 ? 6 : 0) : 0
            return (
              <div className="stepper-item" key={s.key}>
                <div className="stepper-label">{s.key}</div>
                <div className="stepper-track">
                  <div className="stepper-fill" style={{ width: `${pct}%`, background: s.color }}>
                    {n}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* カンバンボード（横スクロール） */}
      <div className="section-title">ステータス管理（ドラッグで移動）</div>
      <div className="kanban">
        {columns.map((col) => (
          <KanbanCol key={col.key} col={col} dragName={dragName} overCol={overCol}
            onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
            onDragEnd={resetDrag} setOverCol={setOverCol} onReject={handleReject} />
        ))}
      </div>
    </>
  )
}

/* ── カンバン列コンポーネント ── */
function KanbanCol({ col, dragName, overCol, onDragStart, onDragOver, onDrop, onDragEnd, setOverCol, onReject }: {
  col: { key: string; color: string; candidates: YouthCandidate[] }
  dragName: string | null
  overCol: string | null
  onDragStart: (name: string) => void
  onDragOver: (e: React.DragEvent, colKey: string) => void
  onDrop: (colKey: string) => void
  onDragEnd: () => void
  setOverCol: (v: string | null) => void
  onReject: (name: string) => void
}) {
  return (
    <div
      className="kanban-col"
      onDragOver={(e) => onDragOver(e, col.key)}
      onDragLeave={() => setOverCol(null)}
      onDrop={() => onDrop(col.key)}
      style={overCol === col.key ? { outline: `2px dashed ${col.color}`, outlineOffset: '2px', borderRadius: 'var(--neo-radius-control)' } : undefined}
    >
      <div className="kanban-col-head" style={{ borderBottom: `2px solid ${col.color}`, paddingBottom: '0.4rem' }}>
        <span className="kanban-col-title" style={{ color: col.color }}>{col.key}</span>
        <span className="kanban-col-count">{col.candidates.filter((c) => !c.rejected_at).length}</span>
      </div>
      <div className="kanban-col-body">
        {col.candidates.map((c) => (
          <div
            key={c.name}
            className="card-info kanban-card"
            draggable
            onDragStart={() => onDragStart(c.name)}
            onDragEnd={onDragEnd}
            style={{
              opacity: dragName === c.name ? 0.4 : c.rejected_at ? 0.5 : 1,
              padding: '0.7rem 0.85rem',
            }}
          >
            <div className="flex-between" style={{ gap: '0.4rem' }}>
              <div className="kc-name">{c.name}</div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); onReject(c.name) }}
                title={c.rejected_at ? '不合格を取消' : '不合格にする'}
                type="button"
                style={c.rejected_at ? { color: 'var(--red)' } : undefined}
              >
                ✕
              </button>
            </div>
            <div className="kc-sub">{c.school || c.type || '-'}</div>
          </div>
        ))}
        {col.candidates.length === 0 && <div className="empty-state" style={{ padding: '1rem 0.5rem', fontSize: '0.72rem' }}>ここにドロップ</div>}
      </div>
    </div>
  )
}
