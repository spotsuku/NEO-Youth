'use client'

import { useState, useMemo, useRef } from 'react'
import type { YouthCandidate } from '@/types/dashboard'

interface Props {
  candidates: YouthCandidate[]
  onUpdate: (name: string, patch: Partial<YouthCandidate>) => Promise<void>
}

// ステータス（事実に基づく状態）フロー順
const STATUSES = [
  { key: '応募完了', color: 'var(--grn)', group: 'flow' },
  { key: '書類選考', color: 'var(--blu)', group: 'flow' },
  { key: 'グループ面接', color: 'var(--gold)', group: 'flow' },
  { key: '最終面接', color: 'var(--red)', group: 'flow' },
  { key: '合格予定', color: 'var(--blu)', group: 'flow' },
  { key: '合格', color: 'var(--grn)', group: 'flow' },
  { key: '補欠合格', color: 'var(--gold)', group: 'flow' },
  { key: '承諾書提出', color: 'var(--grn)', group: 'flow' },
  { key: '保留', color: 'var(--gold)', group: 'flow' },
  { key: '不合格', color: 'var(--bd2)', group: 'flow' },
  { key: '辞退', color: 'var(--red)', group: 'flow' },
]

// KPIカードの順: フロー順（応募後を上段）
const KPI_TOP = ['応募完了', '書類選考', 'グループ面接', '最終面接', '合格', '参加確定']
const KPI_BOTTOM = ['未接触', 'アプローチ中', '説明会参加済', '応募見込み80%', '応募見込み50%']

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

  const total = candidates.length
  const count = (key: string) => candidates.filter((c) => c.status === key).length
  // unused filter removed - all statuses are in single board

  return (
    <>
      {/* KPI: ステータス別 */}
      <div className="kpi-row">
        {STATUSES.map((s) => {
          const n = count(s.key)
          return (
            <div className="kpi-card" key={s.key} style={{ borderLeft: `3px solid ${s.color}` }}>
              <div className="kpi-label">{s.key}</div>
              <div className="kpi-value">{n}<span> 名</span></div>
            </div>
          )
        })}
      </div>

      {/* ファネル */}
      <div className="funnel-summary">
        {STATUSES.map((s) => {
          const n = count(s.key)
          return (
            <div className="funnel-step" key={s.key}>
              <div className="funnel-step-bar" style={{ width: `${total > 0 ? Math.max((n / total) * 100, 3) : 3}%`, background: s.color }} />
              <div className="funnel-step-label">{s.key} ({n})</div>
            </div>
          )
        })}
      </div>

      {/* カンバンボード */}
      <div className="section-title">ステータス管理（ドラッグで移動）</div>
      <div className="kanban-board">
        {columns.map((col) => (
          <KanbanCol key={col.key} col={col} dragName={dragName} overCol={overCol}
            onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={resetDrag} setOverCol={setOverCol} />
        ))}
      </div>
    </>
  )
}

/* ── カンバン列コンポーネント ── */
function KanbanCol({ col, dragName, overCol, onDragStart, onDragOver, onDrop, onDragEnd, setOverCol }: {
  col: { key: string; color: string; candidates: YouthCandidate[] }
  dragName: string | null
  overCol: string | null
  onDragStart: (name: string) => void
  onDragOver: (e: React.DragEvent, colKey: string) => void
  onDrop: (colKey: string) => void
  onDragEnd: () => void
  setOverCol: (v: string | null) => void
}) {
  return (
    <div
      className={`kanban-column ${overCol === col.key ? 'drag-over' : ''}`}
      onDragOver={(e) => onDragOver(e, col.key)}
      onDragLeave={() => setOverCol(null)}
      onDrop={() => onDrop(col.key)}
    >
      <div className="kanban-col-head" style={{ borderBottomColor: col.color }}>
        <span style={{ color: col.color }}>{col.key}</span>
        <span className="kanban-col-count">{col.candidates.length}</span>
      </div>
      <div className="kanban-col-body">
        {col.candidates.map((c) => (
          <div
            key={c.name}
            className={`kanban-card ${dragName === c.name ? 'dragging' : ''}`}
            draggable
            onDragStart={() => onDragStart(c.name)}
            onDragEnd={onDragEnd}
          >
            <div className="kc-name">{c.name}</div>
            <div className="kc-sub">{c.school || c.type || '-'}</div>
            {c.rejected_at && <div className="kc-rejected">{c.rejected_at}で不合格</div>}
          </div>
        ))}
        {col.candidates.length === 0 && <div className="kanban-empty">ここにドロップ</div>}
      </div>
    </div>
  )
}
