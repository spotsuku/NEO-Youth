'use client'

import { useState, useMemo, useRef } from 'react'
import type { YouthCandidate } from '@/types/dashboard'
import Modal from './Modal'

interface Props {
  candidates: YouthCandidate[]
  onUpdate: (name: string, patch: Partial<YouthCandidate>) => Promise<void>
}

const STATUSES = [
  { key: '応募完了', color: 'var(--grn)', stage: true },
  { key: '書類選考', color: 'var(--blu)', stage: true },
  { key: 'グループ面接', color: 'var(--gold)', stage: true },
  { key: '最終面接', color: 'var(--red)', stage: true },
  { key: '参加確定', color: 'var(--grn)', stage: false },
  { key: '保留', color: 'var(--mu)', stage: false },
  { key: '不合格', color: 'var(--bd2)', stage: false },
  { key: 'アプローチ中', color: 'var(--gold)', stage: false },
  { key: '説明会参加済', color: 'var(--blu)', stage: false },
  { key: '特別選考付与', color: 'var(--gold)', stage: false },
  { key: '3期生候補', color: '#7b2d8e', stage: false },
  { key: '対応不要', color: 'var(--bd2)', stage: false },
]

// 不合格にする際にどのステージで落ちたかを記録する対象
const REJECTION_STAGES = ['書類選考', 'グループ面接', '最終面接']

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
      else {
        if (!map.has(c.status)) map.set(c.status, [])
        map.get(c.status)!.push(c)
      }
    }
    // 空列を除外（ただし選考ステージは常に表示）
    return STATUSES.map((s) => ({
      ...s,
      candidates: map.get(s.key) ?? [],
    })).filter((col) => col.candidates.length > 0 || col.stage)
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
    if (!name) return

    const c = candidates.find((x) => x.name === name)
    if (!c || c.status === colKey) {
      resetDrag()
      return
    }

    // 「不合格」列にドロップ → 理由入力モーダルを表示
    if (colKey === '不合格') {
      setRejectTarget({ name, fromStatus: c.status })
      setRejectReason('')
      resetDrag()
      return
    }

    // 通常のステータス変更（不合格から戻す場合はrejected情報クリア）
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
  const stageKeys = ['応募完了', '書類選考', 'グループ面接', '最終面接', '参加確定']

  return (
    <>
      {/* KPI: 選考ファネル */}
      <div className="kpi-row">
        {stageKeys.map((key) => {
          const count = candidates.filter((c) => c.status === key).length
          const s = STATUSES.find((x) => x.key === key)
          return (
            <div className="kpi-card" key={key} style={{ borderLeft: `3px solid ${s?.color ?? 'var(--mu)'}` }}>
              <div className="kpi-label">{key}</div>
              <div className="kpi-value">
                {count}
                <span> 名</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ファネル進捗バー */}
      <div className="funnel-summary">
        {stageKeys.map((key) => {
          const count = candidates.filter((c) => c.status === key).length
          const s = STATUSES.find((x) => x.key === key)
          return (
            <div className="funnel-step" key={key}>
              <div className="funnel-step-bar" style={{ width: `${total > 0 ? Math.max((count / total) * 100, 4) : 4}%`, background: s?.color }} />
              <div className="funnel-step-label">{key} ({count})</div>
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
                  onDragEnd={resetDrag}
                >
                  <div className="kc-name">{c.name}</div>
                  <div className="kc-sub">{c.school || c.type || '-'}</div>
                  {c.rejected_at && (
                    <div className="kc-rejected">
                      {c.rejected_at}で不合格
                    </div>
                  )}
                </div>
              ))}
              {col.candidates.length === 0 && (
                <div className="kanban-empty">ここにドロップ</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 不合格理由入力モーダル */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="不合格記録"
      >
        {rejectTarget && (
          <div className="interview-form">
            <div style={{ marginBottom: '0.8rem', fontSize: '0.85rem' }}>
              <strong>{rejectTarget.name}</strong> を不合格にします
            </div>
            <div className="field-row">
              <div>
                <div className="field-label">不合格ステージ</div>
                <div className="field-value">
                  <span className="badge red">{rejectTarget.fromStatus}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="field-label">不合格理由・メモ</div>
              <textarea
                className="iv-textarea"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="不合格の理由や備考を入力..."
                rows={4}
              />
            </div>
            <div className="iv-footer">
              <button
                className="iv-save-btn"
                style={{ background: 'var(--red)' }}
                onClick={confirmReject}
              >
                不合格を確定
              </button>
              <button className="detail-btn" onClick={() => setRejectTarget(null)}>
                キャンセル
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
