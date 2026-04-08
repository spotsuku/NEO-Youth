'use client'

import { useState, useMemo, useRef } from 'react'
import type { YouthCandidate } from '@/types/dashboard'

interface Props {
  candidates: YouthCandidate[]
  onUpdate: (name: string, patch: Partial<YouthCandidate>) => Promise<void>
}

const STATUSES = [
  { key: '応募完了', color: 'var(--grn)' },
  { key: 'アプローチ中', color: 'var(--gold)' },
  { key: '説明会参加済', color: 'var(--blu)' },
  { key: '参加確定', color: 'var(--grn)' },
  { key: '特別選考付与', color: 'var(--gold)' },
  { key: '3期生候補', color: '#7b2d8e' },
  { key: '対応不要', color: 'var(--bd2)' },
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
      else {
        if (!map.has(c.status)) map.set(c.status, [])
        map.get(c.status)!.push(c)
      }
    }
    return STATUSES.map((s) => ({
      ...s,
      candidates: map.get(s.key) ?? [],
    }))
  }, [candidates])

  const total = candidates.length

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
    if (name) {
      const c = candidates.find((x) => x.name === name)
      if (c && c.status !== colKey) {
        onUpdate(name, { status: colKey })
      }
    }
    setDragName(null)
    setOverCol(null)
    dragRef.current = null
  }

  const handleDragEnd = () => {
    setDragName(null)
    setOverCol(null)
    dragRef.current = null
  }

  return (
    <>
      <div className="kpi-row">
        <div className="kpi-card red">
          <div className="kpi-label">コンタクト総数</div>
          <div className="kpi-value">
            {total}
            <span> 名</span>
          </div>
        </div>
        {STATUSES.slice(0, 4).map((s) => {
          const count = candidates.filter((c) => c.status === s.key).length
          if (count === 0) return null
          return (
            <div className="kpi-card" key={s.key} style={{ borderLeft: `3px solid ${s.color}` }}>
              <div className="kpi-label">{s.key}</div>
              <div className="kpi-value">
                {count}
                <span> 名</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="section-title">選考パイプライン（ドラッグで移動）</div>

      <div className="kanban-board">
        {columns.map((col) => (
          <div
            key={col.key}
            className={`kanban-column ${overCol === col.key ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDragLeave={() => setOverCol(null)}
            onDrop={() => handleDrop(col.key)}
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
                  onDragStart={() => handleDragStart(c.name)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="kc-name">{c.name}</div>
                  <div className="kc-sub">{c.school || c.type || '-'}</div>
                </div>
              ))}
              {col.candidates.length === 0 && (
                <div className="kanban-empty">ここにドロップ</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
