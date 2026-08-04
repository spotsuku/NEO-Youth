'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { YouthCandidate, SelectOption } from '@/types/dashboard'
import { APPROACH_STEPS, APPROACH_STEP_COLORS } from '@/types/dashboard'
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

interface PartnerOption {
  id: string
  university: string
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const due = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

type SortColumn =
  | 'name' | 'school' | 'grade' | 'step' | 'next_action' | 'na_due_date'
  | 'na_written_at' | 'referral' | 'interview_handler' | 'contact_method' | 'inflow_source'

const SORT_ACCESSORS: Record<SortColumn, (c: YouthCandidate, grade: string | null) => string> = {
  name: (c) => c.name ?? '',
  school: (c) => c.school ?? '',
  grade: (_c, grade) => grade ?? '',
  step: (c) => {
    const steps: readonly string[] = APPROACH_STEPS
    return String(steps.indexOf(c.step ?? '未観測')).padStart(2, '0')
  },
  next_action: (c) => c.next_action ?? '',
  na_due_date: (c) => c.na_due_date ?? '',
  na_written_at: (c) => c.na_written_at ?? '',
  referral: (c) => c.referral ?? '',
  interview_handler: (c) => c.interview_handler ?? '',
  contact_method: (c) => c.contact_method ?? '',
  inflow_source: (c) => c.inflow_source ?? '',
}

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'name', label: '氏名' },
  { key: 'school', label: '所属' },
  { key: 'grade', label: '学年' },
  { key: 'step', label: 'ステップ' },
  { key: 'next_action', label: 'ネクストアクション' },
  { key: 'na_due_date', label: 'NA期限' },
  { key: 'na_written_at', label: 'NA記入日' },
  { key: 'referral', label: '紹介者' },
  { key: 'interview_handler', label: '対応者' },
  { key: 'contact_method', label: '連絡手段' },
  { key: 'inflow_source', label: '流入経路' },
]

export default function ApproachListTab({ candidates, onUpdate, initialStepFilter }: Props) {
  const [query, setQuery] = useState('')
  const [stepFilter, setStepFilter] = useState<string>(initialStepFilter ?? '全て')
  const [assigneeFilter, setAssigneeFilter] = useState('全て')
  const [inflowFilter, setInflowFilter] = useState('全て')
  const [gradeFilter, setGradeFilter] = useState('全て')
  const [showArchived, setShowArchived] = useState(false)
  const [showGraduated, setShowGraduated] = useState(false)
  const [sortKey, setSortKey] = useState<SortColumn>('na_due_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [options, setOptions] = useState<SelectOption[]>([])
  const [partners, setPartners] = useState<PartnerOption[]>([])

  useEffect(() => {
    if (initialStepFilter) setStepFilter(initialStepFilter)
  }, [initialStepFilter])

  useEffect(() => {
    fetch('/api/youth/options')
      .then((r) => r.json())
      .then((data: SelectOption[]) => setOptions(Array.isArray(data) ? data : []))
      .catch(() => {})
    fetch('/api/youth/partnerships')
      .then((r) => r.json())
      .then((data: PartnerOption[]) => setPartners(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const contactMethods = options.filter((o) => o.list_key === 'contact_method')
  const inflowSources = options.filter((o) => o.list_key === 'inflow_source')

  const assignees = useMemo(() => {
    const set = new Set<string>()
    for (const c of candidates) if (c.interview_handler) set.add(c.interview_handler)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'))
  }, [candidates])

  // 表示用の実効学年（手動上書き優先、無ければ入学年度から算出）
  const gradeOf = (c: YouthCandidate) => c.grade || calcGrade(c.entry_year, c.course_length ?? 3)

  const grades = useMemo(() => {
    const set = new Set<string>()
    for (const c of candidates) {
      const g = gradeOf(c)
      if (g && g !== '卒業') set.add(g)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'))
  }, [candidates])

  const stepChange = async (name: string, step: string) => {
    const changed_by = getOperatorName()
    await onUpdate(name, { step, changed_by })
  }

  const toggleSort = (col: SortColumn) => {
    if (sortKey === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(col)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return candidates
      .filter((c) => (showArchived ? true : !c.archived))
      .filter((c) => stepFilter === '全て' || c.step === stepFilter)
      .filter((c) => assigneeFilter === '全て' || c.interview_handler === assigneeFilter)
      .filter((c) => inflowFilter === '全て' || c.inflow_source === inflowFilter)
      .filter((c) => gradeFilter === '全て' || gradeOf(c) === gradeFilter)
      .filter((c) => (showGraduated ? true : gradeOf(c) !== '卒業'))
      .filter((c) => {
        if (!q) return true
        return c.name.toLowerCase().includes(q) || (c.school ?? '').toLowerCase().includes(q)
      })
      .sort((a, b) => {
        const accessor = SORT_ACCESSORS[sortKey]
        const av = accessor(a, gradeOf(a))
        const bv = accessor(b, gradeOf(b))
        // 空値は常に末尾
        if (!av && bv) return 1
        if (av && !bv) return -1
        const cmp = av.localeCompare(bv, 'ja')
        return sortDir === 'asc' ? cmp : -cmp
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, query, stepFilter, assigneeFilter, inflowFilter, gradeFilter, showArchived, showGraduated, sortKey, sortDir])

  return (
    <>
      <div className="flex-between">
        <div className="section-title" style={{ marginBottom: 0 }}>アプローチリスト</div>
        <div className="flex-row">
          <label className="toolbar-toggle">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            アーカイブを表示
          </label>
          <label className="toolbar-toggle">
            <input type="checkbox" checked={showGraduated} onChange={(e) => setShowGraduated(e.target.checked)} />
            卒業を表示
          </label>
        </div>
      </div>

      <div className="search-row">
        <input
          className="input"
          type="text"
          placeholder="氏名・所属で検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="select" style={{ width: 'auto' }} value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="全て">対応者: 全て</option>
          {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="select" style={{ width: 'auto' }} value={inflowFilter} onChange={(e) => setInflowFilter(e.target.value)}>
          <option value="全て">流入経路: 全て</option>
          {inflowSources.map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
        </select>
        <select className="select" style={{ width: 'auto' }} value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
          <option value="全て">学年: 全て</option>
          {grades.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="search-row" style={{ marginBottom: '1.1rem' }}>
        {['全て', ...APPROACH_STEPS].map((s) => (
          <button
            key={s}
            className={`btn-chip ${stepFilter === s ? 'active' : ''}`}
            onClick={() => setStepFilter(s)}
          >
            {s === '全て' ? `全て (${candidates.filter((c) => !c.archived).length})` : `${s} (${candidates.filter((c) => c.step === s && !c.archived).length})`}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key} onClick={() => toggleSort(col.key)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  {col.label}{sortKey === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
              <th>パートナー</th>
              <th>備考</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const remaining = daysUntil(c.na_due_date)
              const overdue = remaining !== null && remaining < 0
              const soon = remaining !== null && remaining >= 0 && remaining <= 3
              const grade = gradeOf(c)
              const readOnly = c.archived
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{c.school ?? '-'}</td>
                  <td>
                    {readOnly ? (
                      grade ?? '-'
                    ) : (
                      <GradeCell
                        manualValue={c.grade ?? ''}
                        entryYear={c.entry_year}
                        computed={calcGrade(c.entry_year, c.course_length ?? 3)}
                        onSaveGrade={(v) => onUpdate(c.name, { grade: v || null })}
                        onSaveEntryYear={(v) => onUpdate(c.name, { entry_year: v })}
                      />
                    )}
                  </td>
                  <td>
                    {readOnly ? (
                      <span
                        className="badge"
                        style={{
                          background: `color-mix(in srgb, ${APPROACH_STEP_COLORS[c.step ?? '未観測']} 16%, transparent)`,
                          borderColor: `color-mix(in srgb, ${APPROACH_STEP_COLORS[c.step ?? '未観測']} 45%, transparent)`,
                          color: 'var(--ink)',
                        }}
                      >
                        {c.step ?? '未観測'}
                      </span>
                    ) : (
                      <select
                        className="cell-select"
                        value={c.step ?? '未観測'}
                        onChange={(e) => stepChange(c.name, e.target.value)}
                        style={{ borderLeft: `4px solid ${APPROACH_STEP_COLORS[c.step ?? '未観測']}` }}
                      >
                        {APPROACH_STEPS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </td>
                  <td>
                    {readOnly ? (
                      c.next_action || '-'
                    ) : (
                      <NextActionCell
                        value={c.next_action ?? ''}
                        onSave={(v) => onUpdate(c.name, { next_action: v || null })}
                      />
                    )}
                  </td>
                  <td
                    style={{
                      color: overdue ? 'var(--red)' : soon ? 'var(--gold)' : 'var(--mu)',
                      fontWeight: overdue || soon ? 700 : 400,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.72rem',
                    }}
                  >
                    {readOnly ? (
                      c.na_due_date ?? '-'
                    ) : (
                      <input
                        type="date"
                        className="cell-input"
                        value={c.na_due_date ?? ''}
                        onChange={(e) => onUpdate(c.name, { na_due_date: e.target.value || null })}
                      />
                    )}
                  </td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: 'var(--mu)' }}>
                    {readOnly ? (
                      c.na_written_at ?? '-'
                    ) : (
                      <input
                        type="date"
                        className="cell-input"
                        value={c.na_written_at ?? ''}
                        onChange={(e) => onUpdate(c.name, { na_written_at: e.target.value || null })}
                      />
                    )}
                  </td>
                  <td>
                    {readOnly ? (
                      c.referral || '-'
                    ) : (
                      <input
                        className="cell-input"
                        defaultValue={c.referral ?? ''}
                        placeholder="紹介者名"
                        onBlur={(e) => {
                          if (e.target.value !== (c.referral ?? '')) {
                            onUpdate(c.name, { referral: e.target.value || null })
                          }
                        }}
                      />
                    )}
                  </td>
                  <td>
                    {readOnly ? (
                      c.interview_handler || '-'
                    ) : (
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
                    )}
                  </td>
                  <td>
                    {readOnly ? (
                      c.contact_method || '-'
                    ) : (
                      <select
                        className="cell-select"
                        value={c.contact_method ?? ''}
                        onChange={(e) => onUpdate(c.name, { contact_method: e.target.value || null })}
                      >
                        <option value="">—</option>
                        {contactMethods.map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
                      </select>
                    )}
                  </td>
                  <td>
                    {readOnly ? (
                      c.inflow_source || '-'
                    ) : (
                      <select
                        className="cell-select"
                        value={c.inflow_source ?? ''}
                        onChange={(e) => onUpdate(c.name, { inflow_source: e.target.value || null })}
                      >
                        <option value="">—</option>
                        {inflowSources.map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
                      </select>
                    )}
                  </td>
                  <td>
                    {readOnly ? (
                      partners.find((p) => p.id === c.partner_id)?.university || '-'
                    ) : (
                      <select
                        className="cell-select"
                        value={c.partner_id ?? ''}
                        onChange={(e) => onUpdate(c.name, { partner_id: e.target.value || null })}
                      >
                        <option value="">—</option>
                        {partners.map((p) => <option key={p.id} value={p.id}>{p.university || '（名称未設定）'}</option>)}
                      </select>
                    )}
                  </td>
                  <td style={{ maxWidth: '220px' }}>
                    {readOnly ? (
                      c.note ? <Linkify text={c.note} /> : '-'
                    ) : (
                      <NoteCell value={c.note ?? ''} onSave={(v) => onUpdate(c.name, { note: v || null })} />
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="empty-state">
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

function GradeCell({ manualValue, entryYear, computed, onSaveGrade, onSaveEntryYear }: {
  manualValue: string
  entryYear: number | null
  computed: string | null
  onSaveGrade: (v: string) => void
  onSaveEntryYear: (v: number | null) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <input
        className="cell-input"
        defaultValue={manualValue}
        placeholder={computed ?? '未算出'}
        title="手動上書き（空欄なら入学年度から自動算出）"
        onBlur={(e) => {
          if (e.target.value !== manualValue) onSaveGrade(e.target.value)
        }}
      />
      <input
        className="cell-input"
        type="number"
        defaultValue={entryYear ?? ''}
        placeholder="入学年度"
        style={{ fontSize: '0.65rem' }}
        onBlur={(e) => {
          const v = e.target.value ? Number(e.target.value) : null
          if (v !== entryYear) onSaveEntryYear(v)
        }}
      />
    </div>
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
    <div onClick={() => setEditing(true)} style={{ cursor: 'text', padding: '0.22rem 0.3rem', minHeight: '1.4em' }}>
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
    <div
      onClick={() => setEditing(true)}
      style={{ cursor: 'text', padding: '0.22rem 0.3rem', minHeight: '1.4em', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
    >
      {value ? <Linkify text={value} /> : <span style={{ color: 'var(--bd2)' }}>-</span>}
    </div>
  )
}
