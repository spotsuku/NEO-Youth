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
  void maxStepCount

  // ステップごとの候補者一覧（かんばん表示用・純粋な表示派生なのでフックは使わない）
  const stepGroups: Record<string, YouthCandidate[]> = {}
  for (const s of APPROACH_STEPS) stepGroups[s] = []
  for (const c of filtered) {
    const s = c.step ?? '未観測'
    if (!stepGroups[s]) stepGroups[s] = []
    stepGroups[s].push(c)
  }

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
      <div className="flex-between">
        <div className="section-title" style={{ marginBottom: 0 }}>アプローチ ダッシュボード</div>
        <div className="flex-row">
          <select className="select" style={{ width: 'auto' }} value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="全て">対応者: 全て</option>
            {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="select" style={{ width: 'auto' }} value={inflowFilter} onChange={(e) => setInflowFilter(e.target.value)}>
            <option value="全て">流入経路: 全て</option>
            {inflowSources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-2" style={{ margin: '1rem 0 1.6rem' }}>
        <div className="card-state pink">
          <div className="stat-label">アプローチ対象者数</div>
          <div className="stat-value">{targetCount}<span style={{ fontSize: '0.9rem', fontWeight: 700 }}> 名</span></div>
        </div>
        <div className="card-state">
          <div className="stat-label">対象外（内訳）</div>
          <div className="stat-value">{excludedCount}<span style={{ fontSize: '0.9rem', fontWeight: 700 }}> 名</span></div>
        </div>
      </div>

      <div className="section-label">ステップ別かんばん（カードをクリックでリストへ）</div>
      <div className="kanban">
        {APPROACH_STEPS.map((s) => {
          const members = stepGroups[s] ?? []
          return (
            <div className="kanban-col" key={s}>
              <div className="kanban-col-head">
                <div className="kanban-col-title" style={{ color: APPROACH_STEP_COLORS[s] }}>{s}</div>
                <button className="kanban-col-count" style={{ cursor: 'pointer', border: 'none' }} onClick={() => onDrill(s)} title={`${s} のリストへ`}>
                  {members.length}
                </button>
              </div>
              <div className="kanban-col-body">
                {members.length === 0 && (
                  <div className="muted" style={{ fontSize: '0.68rem', padding: '0.4rem 0.2rem' }}>対象者なし</div>
                )}
                {members.map((c) => (
                  <div
                    key={c.id}
                    className="kanban-card card-quest"
                    style={{ borderColor: APPROACH_STEP_COLORS[s], boxShadow: `0 4px 0 ${APPROACH_STEP_COLORS[s]}`, padding: '0.7rem 0.8rem' }}
                    onClick={() => onDrill(s)}
                    title={`${c.name} のリストへ`}
                  >
                    <div className="kc-name">{c.name}</div>
                    <div className="kc-sub">{c.school ?? '所属未登録'}</div>
                    {c.next_action && <div className="kc-sub">▸ {c.next_action}</div>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-2" style={{ marginTop: '1.4rem' }}>
        <div className="card-info">
          <div className="section-label">ネクストアクション（期限順）</div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>氏名</th><th>ネクストアクション</th><th>期限</th></tr>
              </thead>
              <tbody>
                {nextActions.length === 0 && (
                  <tr><td colSpan={3} className="empty-state">ネクストアクションはありません</td></tr>
                )}
                {nextActions.map((c) => {
                  const remaining = daysUntil(c.na_due_date)
                  const overdue = remaining !== null && remaining < 0
                  const soon = remaining !== null && remaining >= 0 && remaining <= 3
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{c.next_action}</td>
                      <td style={{ color: overdue ? 'var(--red)' : soon ? 'var(--gold)' : 'var(--mu)', fontWeight: overdue || soon ? 700 : 400, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem' }}>
                        {c.na_due_date ?? '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-info">
          <div className="section-label"><span className="live-dot" />最近のログ</div>
          <div className="timeline">
            {history.length === 0 && <div className="empty-state">ログはまだありません</div>}
            {history.map((h) => (
              <div className="tl-item" key={h.id}>
                <div className="tl-dot done" />
                <div>
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
