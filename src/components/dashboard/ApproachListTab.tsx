'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { YouthCandidate, SelectOption } from '@/types/dashboard'
import { APPROACH_STEPS } from '@/types/dashboard'
import { calcGrade } from '@/lib/grade'
import { Linkify } from '@/lib/linkify'

const OPERATOR_KEY = 'neo-youth-operator-name'

function getOperatorName(): string {
  if (typeof window === 'undefined') return ''
  let name = localStorage.getItem(OPERATOR_KEY) ?? ''
  if (!name) {
    name = window.prompt('お名前を入力してください（ステップ変更の記録に使用します）') ?? ''
    if (name) localStorage.setItem(OPERATOR_KEY, name)
  }
  return name
}

interface Props {
  candidates: YouthCandidate[]
  onUpdate: (name: string, patch: Partial<YouthCandidate> & { changed_by?: string }) => Promise<void>
  initialStepFilter?: string | null
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const due = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

export default function ApproachListTab({ candidates, onUpdate, initialStepFilter }: Props) {
  const [query, setQuery] = useState('')
  const [stepFilter, setStepFilter] = useState<string>(initialStepFilter ?? '全て')
  const [assigneeFilter, setAssigneeFilter] = useState('全て')
  const [inflowFilter, setInflowFilter] = useState('全て')
  const [showArchived, setShowArchived] = useState(false)
  const [sortKey, setSortKey] = useState<'na_due_date' | 'name' | 'step'>('na_due_date')
  const [options, setOptions] = useState<SelectOption[]>([])

  useEffect(() => {
    if (initialStepFilter) setStepFilter(initialStepFilter)
  }, [initialStepFilter])

  useEffect(() => {
    fetch('/api/youth/options')
      .then((r) => r.json())
      .then((data: SelectOption[]) => setOptions(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const contactMethods = options.filter((o) => o.list_key === 'contact_method')
  const inflowSources = options.filter((o) => o.list_key === 'inflow_source')

  const assignees = useMemo(() => {
    const set = new Set<string>()
    for (const c of candidates) if (c.interview_handler) set.add(c.interview_handler)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'))
  }, [candidates])

  const stepChange = async (name: string, step: string) => {
    const changed_by = getOperatorName()
    await onUpdate(name, { step, changed_by })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return candidates
      .filter((c) => (showArchived ? true : !c.archived))
      .filter((c) => stepFilter === '全て' || c.step === stepFilter)
      .filter((c) => assigneeFilter === '全て' || c.interview_handler === assigneeFilter)
      .filter((c) => inflowFilter === '全て' || c.inflow_source === inflowFilter)
      .filter((c) => {
        if (!q) return true
        return c.name.toLowerCase().includes(q) || (c.school ?? '').toLowerCase().includes(q)
      })
      .sort((a, b) => {
        if (sortKey === 'name') return a.name.localeCompare(b.name, 'ja')
        if (sortKey === 'step') {
          const steps: readonly string[] = APPROACH_STEPS
          return steps.indexOf(a.step ?? '未観測') - steps.indexOf(b.step ?? '未観測')
        }
        // na_due_date: 未設定は末尾
        if (!a.na_due_date && !b.na_due_date) return 0
        if (!a.na_due_date) return 1
        if (!b.na_due_date) return -1
        return a.na_due_date.localeCompare(b.na_due_date)
      })
  }, [candidates, query, stepFilter, assigneeFilter, inflowFilter, showArchived, sortKey])

  return (
    <>
      <div className="section-title">アプローチリスト</div>

      <div className="search-row">
        <input
          className="search-input"
          type="text"
          placeholder="氏名・所属で検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--mu)' }}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          アーカイブを表示
        </label>
      </div>

      <div className="search-row" style={{ flexWrap: 'wrap', gap: '0.35rem' }}>
        {['全て', ...APPROACH_STEPS].map((s) => (
          <button
            key={s}
            className={`filter-btn ${stepFilter === s ? 'active' : ''}`}
            onClick={() => setStepFilter(s)}
          >
            {s === '全て' ? `全て (${candidates.filter((c) => !c.archived).length})` : `${s} (${candidates.filter((c) => c.step === s && !c.archived).length})`}
          </button>
        ))}
      </div>

      <div className="search-row" style={{ gap: '0.5rem' }}>
        <select className="cell-select" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="全て">対応者: 全て</option>
          {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="cell-select" value={inflowFilter} onChange={(e) => setInflowFilter(e.target.value)}>
          <option value="全て">流入経路: 全て</option>
          {inflowSources.map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
        </select>
        <select className="cell-select" value={sortKey} onChange={(e) => setSortKey(e.target.value as typeof sortKey)}>
          <option value="na_due_date">並び替え: NA期限順</option>
          <option value="name">並び替え: 氏名順</option>
          <option value="step">並び替え: ステップ順</option>
        </select>
      </div>

      <div className="table-wrap sticky-head">
        <table className="editable-table">
          <thead>
            <tr>
              <th>氏名</th>
              <th>所属</th>
              <th>学年</th>
              <th>ステップ</th>
              <th>ネクストアクション</th>
              <th>NA期限</th>
              <th>対応者</th>
              <th>連絡手段</th>
              <th>流入経路</th>
              <th>備考</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const remaining = daysUntil(c.na_due_date)
              const overdue = remaining !== null && remaining < 0
              const soon = remaining !== null && remaining >= 0 && remaining <= 3
              const grade = c.grade || calcGrade(c.entry_year, c.course_length ?? 3)
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{c.school ?? '-'}</td>
                  <td>{grade ?? '-'}</td>
                  <td>
                    <select
                      className="cell-select"
                      value={c.step ?? '未観測'}
                      onChange={(e) => stepChange(c.name, e.target.value)}
                    >
                      {APPROACH_STEPS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <NextActionCell
                      value={c.next_action ?? ''}
                      onSave={(v) => onUpdate(c.name, { next_action: v || null })}
                    />
                  </td>
                  <td
                    style={{
                      color: overdue ? 'var(--red)' : soon ? 'var(--gold)' : 'var(--mu)',
                      fontWeight: overdue || soon ? 700 : 400,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.72rem',
                    }}
                  >
                    <input
                      type="date"
                      className="cell-input"
                      value={c.na_due_date ?? ''}
                      onChange={(e) => onUpdate(c.name, { na_due_date: e.target.value || null })}
                    />
                  </td>
                  <td>
                    <input
                      className="cell-input"
                      defaultValue={c.interview_handler ?? ''}
                      placeholder="担当者名"
                      onBlur={(e) => {
                        if (e.target.value !== (c.interview_handler ?? '')) {
                          onUpdate(c.name, { interview_handler: e.target.value || null })
                        }
                      }}
                    />
                  </td>
                  <td>
                    <select
                      className="cell-select"
                      value={c.contact_method ?? ''}
                      onChange={(e) => onUpdate(c.name, { contact_method: e.target.value || null })}
                    >
                      <option value="">—</option>
                      {contactMethods.map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
                    </select>
                  </td>
                  <td>
                    <select
                      className="cell-select"
                      value={c.inflow_source ?? ''}
                      onChange={(e) => onUpdate(c.name, { inflow_source: e.target.value || null })}
                    >
                      <option value="">—</option>
                      {inflowSources.map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
                    </select>
                  </td>
                  <td style={{ maxWidth: '220px' }}>
                    <NoteCell value={c.note ?? ''} onSave={(v) => onUpdate(c.name, { note: v || null })} />
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', color: 'var(--mu)', padding: '2rem' }}>
                  該当する対象者がいません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function NextActionCell({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) ref.current?.focus() }, [editing])
  useEffect(() => { setDraft(value) }, [value])

  const commit = () => {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  if (editing) {
    return (
      <input
        ref={ref}
        className="cell-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
      />
    )
  }

  return (
    <div className="cell-text" onClick={() => setEditing(true)}>
      {value || <span style={{ color: 'var(--bd2)' }}>-</span>}
    </div>
  )
}

function NoteCell({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (editing) ref.current?.focus() }, [editing])
  useEffect(() => { setDraft(value) }, [value])

  const commit = () => {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        className="cell-input"
        value={draft}
        rows={2}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
      />
    )
  }

  return (
    <div className="cell-text" onClick={() => setEditing(true)} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {value ? <Linkify text={value} /> : <span style={{ color: 'var(--bd2)' }}>-</span>}
    </div>
  )
}
