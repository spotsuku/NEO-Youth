'use client'

import { useState, useMemo, useRef } from 'react'
import type { YouthCandidate } from '@/types/dashboard'
import Modal from './Modal'

interface Props {
  candidates: YouthCandidate[]
  onUpdate: (name: string, patch: Partial<YouthCandidate>) => Promise<void>
}

// プレ応募（引き上げフロー） → 選考フロー → 結果
const STATUSES = [
  { key: '未接触', color: 'var(--bd)', group: 'pre' },
  { key: 'アプローチ中', color: 'var(--gold)', group: 'pre' },
  { key: '説明会参加済', color: 'var(--blu)', group: 'pre' },
  { key: '応募完了', color: 'var(--grn)', group: 'selection' },
  { key: '書類選考', color: 'var(--blu)', group: 'selection' },
  { key: 'グループ面接', color: 'var(--gold)', group: 'selection' },
  { key: '最終面接', color: 'var(--red)', group: 'selection' },
  { key: '参加確定', color: 'var(--grn)', group: 'result' },
  { key: '保留', color: 'var(--mu)', group: 'result' },
  { key: '不合格', color: 'var(--bd2)', group: 'result' },
  { key: '特別選考付与', color: 'var(--gold)', group: 'result' },
  { key: '3期生候補', color: '#7b2d8e', group: 'result' },
  { key: '対応不要', color: 'var(--bd2)', group: 'result' },
]

// KPIカードの順: フロー順（応募後を上段）
const KPI_TOP = ['応募完了', '書類選考', 'グループ面接', '最終面接', '合格', '参加確定']
const KPI_BOTTOM = ['未接触', 'アプローチ中', '説明会参加済', '応募見込み80%', '応募見込み50%']

export default function FlowTab({ candidates, onUpdate }: Props) {
  const [dragName, setDragName] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)
  const dragRef = useRef<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<{ name: string; fromStatus: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

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
    })).filter((col) => col.candidates.length > 0 || ['pre', 'selection'].includes(col.group))
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

    if (colKey === '不合格') {
      setRejectTarget({ name, fromStatus: c.status })
      setRejectReason('')
      resetDrag()
      return
    }

    const patch: Partial<YouthCandidate> = { status: colKey }
    if (c.rejected_at) {
      patch.rejected_at = null
      patch.rejected_reason = null
    }
    onUpdate(name, patch)
    resetDrag()
  }

  const resetDrag = () => {
    setDragName(null)
    setOverCol(null)
    dragRef.current = null
  }

  const confirmReject = () => {
    if (!rejectTarget) return
    onUpdate(rejectTarget.name, {
      status: '不合格',
      rejected_at: rejectTarget.fromStatus,
      rejected_reason: rejectReason || null,
    })
    setRejectTarget(null)
    setRejectReason('')
  }

  const total = candidates.length
  const count = (key: string) => candidates.filter((c) => c.status === key).length

  const preGroup = columns.filter((c) => c.group === 'pre')
  const selGroup = columns.filter((c) => c.group === 'selection')
  const resGroup = columns.filter((c) => c.group === 'result')

  return (
    <>
      {/* KPI上段: 応募後フロー順 */}
      <div className="kpi-row">
        {['応募完了', '書類選考', 'グループ面接', '最終面接', '参加確定'].map((key) => {
          const n = count(key)
          const s = STATUSES.find((x) => x.key === key)
          return (
            <div className="kpi-card" key={key} style={{ borderLeft: `3px solid ${s?.color ?? 'var(--mu)'}` }}>
              <div className="kpi-label">{key}</div>
              <div className="kpi-value">{n}<span> 名</span></div>
            </div>
          )
        })}
      </div>

      {/* KPI下段: 応募前フロー順 */}
      <div className="kpi-row">
        {['未接触', 'アプローチ中', '説明会参加済', '保留', '不合格', '対応不要'].map((key) => {
          const n = count(key)
          if (n === 0 && !['未接触', 'アプローチ中', '説明会参加済'].includes(key)) return null
          const s = STATUSES.find((x) => x.key === key)
          return (
            <div className="kpi-card" key={key} style={{ borderLeft: `3px solid ${s?.color ?? 'var(--mu)'}` }}>
              <div className="kpi-label">{key}</div>
              <div className="kpi-value">{n}<span> 名</span></div>
            </div>
          )
        })}
      </div>

      {/* ファネル: 応募後 → 応募前 */}
      <div className="funnel-summary">
        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--mu)', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>選考フロー</div>
        {['応募完了', '書類選考', 'グループ面接', '最終面接', '参加確定'].map((key) => {
          const n = count(key)
          const s = STATUSES.find((x) => x.key === key)
          return (
            <div className="funnel-step" key={key}>
              <div className="funnel-step-bar" style={{ width: `${total > 0 ? Math.max((n / total) * 100, 3) : 3}%`, background: s?.color }} />
              <div className="funnel-step-label">{key} ({n})</div>
            </div>
          )
        })}
        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--mu)', letterSpacing: '0.1em', marginTop: '0.5rem', marginBottom: '0.2rem' }}>引き上げフロー（応募前）</div>
        {['未接触', 'アプローチ中', '説明会参加済'].map((key) => {
          const n = count(key)
          const s = STATUSES.find((x) => x.key === key)
          return (
            <div className="funnel-step" key={key}>
              <div className="funnel-step-bar" style={{ width: `${total > 0 ? Math.max((n / total) * 100, 3) : 3}%`, background: s?.color }} />
              <div className="funnel-step-label">{key} ({n})</div>
            </div>
          )
        })}
      </div>

      {/* カンバン: 選考フロー（応募後） */}
      <div className="section-title">選考フロー（ドラッグで移動）</div>
      <div className="kanban-board" style={{ marginBottom: '1.5rem' }}>
        {selGroup.map((col) => (
          <KanbanCol key={col.key} col={col} dragName={dragName} overCol={overCol}
            onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={resetDrag} setOverCol={setOverCol} />
        ))}
        {resGroup.map((col) => (
          <KanbanCol key={col.key} col={col} dragName={dragName} overCol={overCol}
            onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={resetDrag} setOverCol={setOverCol} />
        ))}
      </div>

      {/* カンバン: 引き上げフロー（応募前） */}
      <div className="section-title">引き上げフロー（応募前 → 応募完了）</div>
      <div className="kanban-board">
        {preGroup.map((col) => (
          <KanbanCol key={col.key} col={col} dragName={dragName} overCol={overCol}
            onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={resetDrag} setOverCol={setOverCol} />
        ))}
      </div>

      {/* 不合格理由入力モーダル */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="不合格記録">
        {rejectTarget && (
          <div className="interview-form">
            <div style={{ marginBottom: '0.8rem', fontSize: '0.85rem' }}>
              <strong>{rejectTarget.name}</strong> を不合格にします
            </div>
            <div className="field-row">
              <div>
                <div className="field-label">不合格ステージ</div>
                <div className="field-value"><span className="badge red">{rejectTarget.fromStatus}</span></div>
              </div>
            </div>
            <div>
              <div className="field-label">不合格理由・メモ</div>
              <textarea className="iv-textarea" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="不合格の理由や備考を入力..." rows={4} />
            </div>
            <div className="iv-footer">
              <button className="iv-save-btn" style={{ background: 'var(--red)' }} onClick={confirmReject}>不合格を確定</button>
              <button className="detail-btn" onClick={() => setRejectTarget(null)}>キャンセル</button>
            </div>
          </div>
        )}
      </Modal>
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
