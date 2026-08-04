'use client'

import { useState, useEffect } from 'react'
import type { YouthCandidate, YouthObLog } from '@/types/dashboard'
import { OB_LABELS, OB_FIELDS } from '@/types/dashboard'

interface Props {
  candidates: YouthCandidate[]
  onUpdate: (name: string, patch: Partial<YouthCandidate>) => Promise<void>
}

export default function OnboardingTab({ candidates, onUpdate }: Props) {
  const [logs, setLogs] = useState<YouthObLog[]>([])
  const [showLog, setShowLog] = useState(false)

  useEffect(() => {
    fetch('/api/youth/ob-logs')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setLogs(d) })
      .catch(() => {})
  }, [])

  const totalChecks = candidates.length * OB_FIELDS.length
  const doneChecks = candidates.reduce(
    (sum, c) => sum + OB_FIELDS.filter((f) => c[f]).length,
    0,
  )

  const toggle = async (c: YouthCandidate, field: typeof OB_FIELDS[number]) => {
    const newVal = !c[field]
    onUpdate(c.name, { [field]: newVal })

    // 履歴ログを記録
    const log: Omit<YouthObLog, 'id' | 'changed_at'> & { changed_at?: string } = {
      candidate_name: c.name,
      field_name: field,
      field_label: OB_LABELS[field],
      new_value: newVal,
    }

    try {
      const res = await fetch('/api/youth/ob-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      })
      const saved = await res.json()
      if (saved.id) {
        setLogs((prev) => [saved, ...prev].slice(0, 100))
      }
    } catch {}
  }

  return (
    <>
      <div className="grid grid-3" style={{ marginBottom: '1.4rem' }}>
        <div className="card-state mint">
          <div className="stat-label">対象者数</div>
          <div className="stat-value">{candidates.length}<span style={{ fontSize: '0.9rem', fontWeight: 700 }}> 名</span></div>
        </div>
        <div className="card-state sun">
          <div className="stat-label">完了タスク</div>
          <div className="stat-value">{doneChecks}<span style={{ fontSize: '0.9rem', fontWeight: 700 }}> / {totalChecks}</span></div>
        </div>
        <div className="card-state danger">
          <div className="stat-label">進捗率</div>
          <div className="stat-value">{totalChecks > 0 ? Math.round((doneChecks / totalChecks) * 100) : 0}<span style={{ fontSize: '0.9rem', fontWeight: 700 }}>%</span></div>
        </div>
      </div>

      <div className="card-info" style={{ marginBottom: '1.4rem' }}>
        <div className="xp-head">
          <span>オンボーディング全体進捗</span>
          <span>{doneChecks} / {totalChecks}</span>
        </div>
        <div className="xp-track">
          <div
            className="xp-fill mint"
            style={{ width: totalChecks > 0 ? `${(doneChecks / totalChecks) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* 変更履歴トグル */}
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>候補者別チェックリスト</div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowLog(!showLog)}
        >
          {showLog ? '履歴を閉じる' : `変更履歴 (${logs.length})`}
        </button>
      </div>

      {showLog && (
        <div className="card-info" style={{ marginBottom: '1.4rem' }}>
          {logs.length === 0 ? (
            <div className="empty-state">変更履歴はありません</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>日時</th>
                    <th>候補者</th>
                    <th>項目</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 50).map((l) => (
                    <tr key={l.id}>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                        {new Date(l.changed_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ fontWeight: 600 }}>{l.candidate_name}</td>
                      <td>{l.field_label}</td>
                      <td>
                        <span className={`badge ${l.new_value ? 'grn' : 'gray'}`}>
                          {l.new_value ? '完了' : '取消'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'var(--sur2)', zIndex: 2 }}>氏名</th>
              {OB_FIELDS.map((f) => (
                <th key={f}>{OB_LABELS[f]}</th>
              ))}
              <th>進捗</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => {
              const done = OB_FIELDS.filter((f) => c[f]).length
              const pct = OB_FIELDS.length > 0 ? Math.round((done / OB_FIELDS.length) * 100) : 0
              return (
                <tr key={c.id}>
                  <td
                    style={{
                      position: 'sticky',
                      left: 0,
                      background: 'var(--sur)',
                      zIndex: 1,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.name}
                  </td>
                  {OB_FIELDS.map((f) => (
                    <td key={f} className="table-check">
                      <input
                        type="checkbox"
                        checked={!!c[f]}
                        onChange={() => toggle(c, f)}
                      />
                    </td>
                  ))}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '110px' }}>
                      <div className="xp-track" style={{ flex: 1 }}>
                        <div className="xp-fill mint" style={{ width: `${pct}%` }} />
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--mu)', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>{done}/{OB_FIELDS.length}</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
