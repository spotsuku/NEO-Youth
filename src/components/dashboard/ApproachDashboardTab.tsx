'use client'

import { useEffect, useMemo, useState } from 'react'
import type { YouthCandidate } from '@/types/dashboard'
import { APPROACH_STEPS, APPROACH_STEP_COLORS } from '@/types/dashboard'

interface HistoryEntry {
  id: number
  from_step: string | null
  to_step: string | null
  changed_at: string
  changed_by: string | null
  youth_candidates: { name: string } | null
}

interface Props {
  candidates: YouthCandidate[]
  onDrill: (step: string) => void
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const due = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

export default function ApproachDashboardTab({ candidates, onDrill }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [assigneeFilter, setAssigneeFilter] = useState('全て')
  const [inflowFilter, setInflowFilter] = useState('全て')

  useEffect(() => {
    fetch('/api/youth/step-history?limit=20')
      .then((r) => r.json())
      .then((data: HistoryEntry[]) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const active = useMemo(() => candidates.filter((c) => !c.archived), [candidates])

  const assignees = useMemo(() => {
    const set = new Set<string>()
    for (const c of active) if (c.interview_handler) set.add(c.interview_handler)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'))
  }, [active])

  const inflowSources = useMemo(() => {
    const set = new Set<string>()
    for (const c of active) if (c.inflow_source) set.add(c.inflow_source)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'))
  }, [active])

  const filtered = useMemo(() => {
    return active
      .filter((c) => assigneeFilter === '全て' || c.interview_handler === assigneeFilter)
      .filter((c) => inflowFilter === '全て' || c.inflow_source === inflowFilter)
  }, [active, assigneeFilter, inflowFilter])

  // アプローチ対象者数 = ステップ != 対象外（未観測は含む）
  const excludedCount = filtered.filter((c) => c.step === '対象外').length
  const targetCount = filtered.length - excludedCount

  const stepCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of APPROACH_STEPS) map.set(s, 0)
    for (const c of filtered) {
      const s = c.step ?? '未観測'
      map.set(s, (map.get(s) ?? 0) + 1)
    }
    return map
  }, [filtered])

  const maxStepCount = Math.max(...Array.from(stepCounts.values()), 1)

  const nextActions = useMemo(() => {
    return filtered
      .filter((c) => c.next_action)
      .sort((a, b) => {
        if (!a.na_due_date && !b.na_due_date) return 0
        if (!a.na_due_date) return 1
        if (!b.na_due_date) return -1
        return a.na_due_date.localeCompare(b.na_due_date)
      })
  }, [filtered])

  return (
    <>
      <div className="section-title">アプローチ ダッシュボード</div>

      <div className="kpi-row">
        <div className="kpi-card red">
          <div className="kpi-label">アプローチ対象者数</div>
          <div className="kpi-value">{targetCount}<span> 名</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">対象外（内訳）</div>
          <div className="kpi-value">{excludedCount}<span> 名</span></div>
        </div>
      </div>

      <div className="search-row" style={{ gap: '0.5rem' }}>
        <select className="cell-select" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="全て">対応者: 全て</option>
          {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="cell-select" value={inflowFilter} onChange={(e) => setInflowFilter(e.target.value)}>
          <option value="全て">流入経路: 全て</option>
          {inflowSources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="section-title" style={{ marginTop: '1.2rem' }}>ステップ別ファネル</div>
      <div className="funnel-summary">
        {APPROACH_STEPS.map((s) => {
          const n = stepCounts.get(s) ?? 0
          return (
            <div
              className="funnel-step"
              key={s}
              onClick={() => onDrill(s)}
              style={{ cursor: 'pointer' }}
              title={`${s} のリストへ`}
            >
              <div
                className="funnel-step-bar"
                style={{ width: `${Math.max((n / maxStepCount) * 100, n > 0 ? 3 : 0)}%`, background: APPROACH_STEP_COLORS[s] }}
              />
              <div className="funnel-step-label">{s} ({n})</div>
            </div>
          )
        })}
      </div>

      <div className="grid2" style={{ marginTop: '1.2rem' }}>
        <div className="card">
          <div className="card-title">ネクストアクション（期限順）</div>
          <div className="table-wrap">
            <table className="editable-table">
              <thead>
                <tr><th>氏名</th><th>ネクストアクション</th><th>期限</th></tr>
              </thead>
              <tbody>
                {nextActions.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--mu)', padding: '1rem' }}>ネクストアクションはありません</td></tr>
                )}
                {nextActions.map((c) => {
                  const remaining = daysUntil(c.na_due_date)
                  const overdue = remaining !== null && remaining < 0
                  const soon = remaining !== null && remaining >= 0 && remaining <= 3
                  return (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.next_action}</td>
                      <td style={{ color: overdue ? 'var(--red)' : soon ? 'var(--gold)' : 'var(--mu)', fontWeight: overdue || soon ? 700 : 400 }}>
                        {c.na_due_date ?? '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-title">最近のログ</div>
          <div className="timeline">
            {history.length === 0 && <div style={{ color: 'var(--mu)', fontSize: '0.8rem' }}>ログはまだありません</div>}
            {history.map((h) => (
              <div className="tl-item" key={h.id}>
                <div className="tl-dot done" />
                <div className="tl-content">
                  <div className="tl-date">{new Date(h.changed_at).toLocaleString('ja-JP')}</div>
                  <div className="tl-title">{h.youth_candidates?.name ?? '(削除済み)'}</div>
                  <div className="tl-sub">
                    {h.from_step ?? '-'} → {h.to_step ?? '-'}{h.changed_by ? `（${h.changed_by}）` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
