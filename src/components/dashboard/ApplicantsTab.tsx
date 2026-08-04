'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { YouthCandidate, YouthInterview } from '@/types/dashboard'
import type { VerdictRecord } from '@/app/dashboard/page'
import Modal from './Modal'
import TrashPanel from './TrashPanel'

interface Props {
  candidates: YouthCandidate[]
  onUpdate: (name: string, patch: Partial<YouthCandidate>) => Promise<void>
  onAdd: (data: Partial<YouthCandidate>) => Promise<boolean>
  onDelete: (name: string) => Promise<void>
  onPromoteFinal: (name: string) => Promise<boolean>
  verdictMap: Record<string, VerdictRecord>
  promotedNames: Set<string>
}

// ステータス（事実に基づく状態）
const ALL_STATUSES = [
  '承諾書提出', '合格', '合格予定', '補欠合格',
  '最終面接', 'グループ面接', '書類選考', '応募完了',
  '応募前', '保留', '辞退',
]

const STATUS_COLORS: Record<string, string> = {
  '承諾書提出': 'grn', '合格': 'grn', '合格予定': 'blu', '補欠合格': 'gold',
  '最終面接': 'red', 'グループ面接': 'gold', '書類選考': 'blu',
  '応募完了': 'grn', '応募前': 'gray', '保留': 'gold', '辞退': 'red',
}

// ヨミ（主観的な見込み）
const YOMI_OPTIONS = [
  { value: '', label: '—', color: '' },
  { value: '応募見込み80%', label: '80%', color: 'grn' },
  { value: '応募見込み50%', label: '50%', color: 'blu' },
  { value: '応募見込み20%', label: '20%', color: 'gold' },
  { value: '応募対象外', label: '対象外', color: 'gray' },
  { value: '3期生候補', label: '3期生候補', color: 'purple' },
]

const VERDICT_BADGE: Record<string, string> = {
  '合格': 'grn', 'ボーダー': 'gold', '不合格': 'red',
}

const STATUS_FILTERS = ['全て', '応募前', '応募完了', '書類選考', 'グループ面接', '最終面接', '合格予定', '合格', '補欠合格', '承諾書提出', '保留', '不合格', '辞退']

export default function ApplicantsTab({ candidates, onUpdate, onAdd, onDelete, onPromoteFinal, verdictMap, promotedNames }: Props) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('全て')
  const [typeFilter, setTypeFilter] = useState<'全て' | '学生' | '社会人'>('全て')
  const [selected, setSelected] = useState<YouthCandidate | null>(null)
  const [interviewTarget, setInterviewTarget] = useState<YouthCandidate | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [promoting, setPromoting] = useState<Set<string>>(new Set())

  const handlePromote = async (name: string) => {
    if (!confirm(`${name} さんを「最終面接シート」に追加しますか？\n（応募書類情報が連携されます）`)) return
    setPromoting((prev) => new Set(prev).add(name))
    const ok = await onPromoteFinal(name)
    setPromoting((prev) => {
      const next = new Set(prev)
      next.delete(name)
      return next
    })
    if (!ok) alert('連携に失敗しました。コンソールを確認してください。')
  }

  const isStudent = (c: YouthCandidate) => (c.type ?? '').includes('大学') || (c.type ?? '').includes('学生')

  // KPI 集計（不合格者は合計から除外）
  const active = candidates.filter((c) => !c.rejected_at)
  const totalCount = active.length
  const appliedCount = active.filter((c) => c.status !== '応募前').length
  const studentCount = active.filter(isStudent).length
  const shakaijinCount = active.filter((c) => !isStudent(c)).length
  const passCriteriaCount = active.filter((c) => c.ob_pass_criteria).length
  const passCount = active.filter((c) => c.status === '合格' || c.status === '合格予定' || c.status === '補欠合格').length

  const filtered = useMemo(() => {
    return candidates
      .filter((c) => {
        const q = query.toLowerCase()
        const matchQuery = !q ||
          c.name.toLowerCase().includes(q) ||
          (c.kana ?? '').toLowerCase().includes(q) ||
          (c.school ?? '').toLowerCase().includes(q)
        const matchStatus = statusFilter === '全て' || (statusFilter === '不合格' ? !!c.rejected_at : c.status === statusFilter)
        const matchType = typeFilter === '全て' ||
          (typeFilter === '学生' ? isStudent(c) : !isStudent(c))
        return matchQuery && matchStatus && matchType
      })
      .sort((a, b) => {
        const ka = a.kana || a.name
        const kb = b.kana || b.name
        return ka.localeCompare(kb, 'ja')
      })
  }, [candidates, query, statusFilter, typeFilter])

  const openInterview = (c: YouthCandidate) => {
    setSelected(null)
    setInterviewTarget(c)
  }

  return (
    <>
      {/* KPIカード */}
      <div className="grid grid-auto" style={{ marginBottom: '1.4rem' }}>
        <div className="card-state pink">
          <div className="stat-label">候補者（累積）</div>
          <div className="stat-value">{totalCount}</div>
        </div>
        <div className="card-state mint">
          <div className="stat-label">応募者（累積）</div>
          <div className="stat-value">{appliedCount}</div>
        </div>
        <div className="card-state sky">
          <div className="stat-label">学生</div>
          <div className="stat-value">{studentCount}</div>
        </div>
        <div className="card-state sun">
          <div className="stat-label">社会人</div>
          <div className="stat-value">{shakaijinCount}</div>
        </div>
        <div className="card-state sky">
          <div className="stat-label">合格基準</div>
          <div className="stat-value">{passCriteriaCount}</div>
        </div>
        <div className="card-state mint">
          <div className="stat-label">合格</div>
          <div className="stat-value">{passCount}</div>
        </div>
      </div>

      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>候補者管理</div>
        <div className="flex-row">
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)}>
            + 候補者を追加
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowTrash(true)}>
            🗑 ゴミ箱
          </button>
        </div>
      </div>

      <div className="search-row">
        <input
          className="input"
          type="text"
          placeholder="氏名・ふりがな・所属で検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {/* 区分フィルター（学生/社会人） */}
      <div className="flex-row" style={{ marginBottom: '0.6rem' }}>
        {(['全て', '学生', '社会人'] as const).map((f) => (
          <button
            key={f}
            className={`btn-chip ${typeFilter === f ? 'active' : ''}`}
            onClick={() => setTypeFilter(f)}
          >
            {f === '全て'
              ? `区分: 全て (${candidates.length})`
              : f === '学生'
              ? `学生 (${studentCount})`
              : `社会人 (${shakaijinCount})`}
          </button>
        ))}
      </div>
      <div className="flex-row" style={{ marginBottom: '1.1rem' }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            className={`btn-chip ${statusFilter === f ? 'active' : ''}`}
            onClick={() => setStatusFilter(f)}
          >
            {f === '全て' ? `全て (${candidates.length})` : f === '不合格' ? `不合格 (${candidates.filter((c) => !!c.rejected_at).length})` : `${f} (${candidates.filter((c) => c.status === f).length})`}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>氏名</th>
              <th>応募確度</th>
              <th>ステータス</th>
              <th>区分</th>
              <th>所属</th>
              <th>応募日</th>
              <th>合格基準</th>
              <th>不合格</th>
              <th>説明会</th>
              <th>面談済</th>
              <th>最終面接</th>
              <th>シート連携</th>
              <th></th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, idx) => {
              const v = verdictMap[c.name]
              return (
                <tr key={c.id}>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: 'var(--mu)', textAlign: 'center', width: '32px' }}>
                    {idx + 1}
                  </td>
                  {/* 氏名: インライン編集 */}
                  <td>
                    <EditableText
                      value={c.name}
                      onSave={(val) => onUpdate(c.name, { name: val })}
                      bold
                    />
                  </td>
                  {/* 応募確度（ヨミ） */}
                  <td>
                    <InlineSelect
                      value={c.yomi ?? ''}
                      options={YOMI_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                      onSave={(val) => onUpdate(c.name, { yomi: val || null })}
                      badgeClass={YOMI_OPTIONS.find((o) => o.value === (c.yomi ?? ''))?.color ?? ''}
                    />
                  </td>
                  {/* ステータス */}
                  <td>
                    <InlineSelect
                      value={c.status}
                      options={ALL_STATUSES.map((s) => ({ value: s, label: s }))}
                      onSave={(val) => onUpdate(c.name, { status: val })}
                      badgeClass={STATUS_COLORS[c.status] ?? 'gray'}
                    />
                  </td>
                  {/* 区分 */}
                  <td>
                    <span className={`badge ${(c.type ?? '').includes('大学') ? 'blu' : 'gold'}`}>
                      {(c.type ?? '').includes('大学') ? '学生' : '社会人'}
                    </span>
                  </td>
                  {/* 所属 */}
                  <td>
                    <EditableText
                      value={c.school ?? ''}
                      onSave={(val) => onUpdate(c.name, { school: val || null })}
                      placeholder="-"
                    />
                  </td>
                  {/* 応募日 */}
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: 'var(--mu)' }}>
                    {c.applied_at ? c.applied_at.slice(0, 10) : '-'}
                  </td>
                  {/* 合格基準 */}
                  <td className="table-check">
                    <CellCheck checked={!!c.ob_pass_criteria} onClick={() => onUpdate(c.name, { ob_pass_criteria: !c.ob_pass_criteria })} />
                  </td>
                  {/* 不合格 */}
                  <td className="table-check">
                    <CellCheck
                      checked={!!c.rejected_at}
                      tone="red"
                      onClick={() => onUpdate(c.name, { rejected_at: c.rejected_at ? null : new Date().toISOString() })}
                    />
                  </td>
                  {/* 説明会 */}
                  <td className="table-check">
                    <CellCheck checked={!!c.attended_session} onClick={() => onUpdate(c.name, { attended_session: !c.attended_session })} />
                  </td>
                  {/* 面談済チェック */}
                  <td className="table-check">
                    <CellCheck
                      checked={!!c.interview_date}
                      title={c.interview_date ? `面談日: ${c.interview_date}` : '面談済にする'}
                      onClick={() => onUpdate(c.name, { interview_date: c.interview_date ? null : new Date().toISOString().slice(0, 10) })}
                    />
                  </td>
                  {/* 最終面接結果 */}
                  <td>
                    {v ? (
                      <span className={`badge ${VERDICT_BADGE[v.verdict!] ?? 'gray'}`}>
                        {v.verdict}
                        {v.score_total != null && <span style={{ marginLeft: '0.3rem', opacity: 0.7 }}>{v.score_total}pt</span>}
                      </span>
                    ) : (
                      <span className="muted" style={{ fontSize: '0.72rem' }}>-</span>
                    )}
                  </td>
                  {/* 最終面接シート連携 */}
                  <td>
                    {c.status === '最終面接' ? (
                      promotedNames.has(c.name) ? (
                        <span className="badge grn" title="最終面接シートに追加済み">✓ 連携済</span>
                      ) : (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handlePromote(c.name)}
                          disabled={promoting.has(c.name)}
                          title="この候補者を最終面接シートに追加します"
                        >
                          {promoting.has(c.name) ? '連携中...' : '+ シート追加'}
                        </button>
                      )
                    ) : promotedNames.has(c.name) ? (
                      <span className="badge gray" title="最終面接シートに登録済（過去）">登録済</span>
                    ) : (
                      <span className="muted" style={{ fontSize: '0.72rem' }}>-</span>
                    )}
                  </td>
                  {/* 面談ボタン */}
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => openInterview(c)}>面談</button>
                  </td>
                  {/* 詳細 */}
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelected(c)}>詳細</button>
                  </td>
                  {/* 削除 */}
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        if (confirm(`${c.name} を削除しますか？この操作は元に戻せません。`)) {
                          onDelete(c.name)
                        }
                      }}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={16}><div className="empty-state">該当する候補者がいません</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 詳細モーダル */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''}>
        {selected && <CandidateDetail candidate={selected} onOpenInterview={() => openInterview(selected)} onUpdate={onUpdate} />}
      </Modal>

      {/* 面談記録モーダル */}
      {interviewTarget && (
        <InterviewListModal candidate={interviewTarget} onClose={() => setInterviewTarget(null)} />
      )}

      {/* 候補者追加モーダル */}
      <Modal open={showAddForm} onClose={() => setShowAddForm(false)} title="候補者を追加">
        <AddCandidateForm
          onSaved={() => setShowAddForm(false)}
          onAdd={onAdd}
        />
      </Modal>

      {/* ゴミ箱モーダル（論理削除からの復元） */}
      <Modal open={showTrash} onClose={() => setShowTrash(false)} title="ゴミ箱">
        <TrashPanel apiPath="/api/youth/candidates" nameField="name" labelField="name" open={showTrash} />
      </Modal>
    </>
  )
}

/* ── テーブル用チェックボタン（合格基準・不合格・説明会・面談済） ── */
function CellCheck({ checked, onClick, title, tone = 'grn' }: {
  checked: boolean
  onClick: () => void
  title?: string
  tone?: 'grn' | 'red'
}) {
  const color = tone === 'red' ? 'var(--red)' : 'var(--grn)'
  const bg = tone === 'red' ? 'rgba(212,65,86,0.1)' : 'rgba(47,165,122,0.12)'
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: 22,
        height: 22,
        borderRadius: 6,
        border: `1.5px solid ${checked ? color : 'var(--bd)'}`,
        background: checked ? bg : 'transparent',
        color,
        fontSize: '0.75rem',
        fontWeight: 800,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      {checked ? '✓' : ''}
    </button>
  )
}

/* ── インライン編集: テキスト ── */
function EditableText({ value, onSave, bold, placeholder }: {
  value: string
  onSave: (v: string) => void
  bold?: boolean
  placeholder?: string
}) {
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
    <div
      style={{ fontWeight: bold ? 700 : 400, fontSize: '0.8rem', cursor: 'text', color: 'var(--ink)' }}
      onClick={() => setEditing(true)}
    >
      {value || <span className="muted">{placeholder || '-'}</span>}
    </div>
  )
}

/* ── インライン編集: セレクト ── */
function InlineSelect({ value, options, onSave, badgeClass }: {
  value: string
  options: { value: string; label: string }[]
  onSave: (v: string) => void
  badgeClass: string
}) {
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLSelectElement>(null)

  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  if (editing) {
    return (
      <select
        ref={ref}
        className="cell-select"
        value={value}
        onChange={(e) => { onSave(e.target.value); setEditing(false) }}
        onBlur={() => setEditing(false)}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  }

  const display = options.find((o) => o.value === value)?.label ?? value ?? '—'
  return (
    <span className={`badge ${badgeClass} cell-badge`} onClick={() => setEditing(true)}>
      {display}
    </span>
  )
}

/* ── 候補者詳細表示 ── */
function CandidateDetail({ candidate: c, onOpenInterview, onUpdate }: {
  candidate: YouthCandidate
  onOpenInterview: () => void
  onUpdate: (name: string, patch: Partial<YouthCandidate>) => Promise<void>
}) {
  const save = (field: string) => (val: string) => {
    onUpdate(c.name, { [field]: val || null } as Partial<YouthCandidate>)
  }

  return (
    <>
      <div className="grid grid-2">
        <div className="field"><div className="field-label">ふりがな</div><EditableField value={c.kana ?? ''} onSave={save('kana')} /></div>
        <div className="field"><div className="field-label">メール</div><EditableField value={c.email ?? ''} onSave={save('email')} mono /></div>
      </div>
      <div className="grid grid-2">
        <div className="field"><div className="field-label">区分</div><div style={{ fontSize: '0.82rem', color: 'var(--ink)' }}>{c.type ?? '-'}</div></div>
        <div className="field"><div className="field-label">所属</div><EditableField value={c.school ?? ''} onSave={save('school')} /></div>
      </div>
      <div className="grid grid-2">
        <div className="field"><div className="field-label">学年・役職</div><EditableField value={c.grade ?? ''} onSave={save('grade')} /></div>
        <div className="field"><div className="field-label">紹介元</div><EditableField value={c.source ?? ''} onSave={save('source')} /></div>
      </div>
      <div className="field">
        <div className="field-label">志望動機</div>
        <EditableArea value={c.motivation ?? ''} onSave={save('motivation')} />
      </div>
      <div className="field">
        <div className="field-label">自己PR</div>
        <EditableArea value={c.pr ?? ''} onSave={save('pr')} />
      </div>
      <div className="field">
        <div className="field-label">貢献・活動方針</div>
        <EditableArea value={c.contribution ?? ''} onSave={save('contribution')} />
      </div>
      <div className="field">
        <div className="field-label">キャリアプラン</div>
        <EditableField value={c.career ?? ''} onSave={save('career')} />
      </div>
      <div className="grid grid-2">
        <div className="field"><div className="field-label">2次面接希望日</div><div style={{ fontSize: '0.78rem', color: 'var(--ink)' }}>{c.interview2_dates ?? '-'}</div></div>
        <div className="field"><div className="field-label">3次面接</div><div style={{ fontSize: '0.82rem', color: 'var(--ink)' }}>{c.interview3_dates ?? '-'}</div></div>
      </div>
      <div style={{ marginTop: '0.4rem' }}>
        <button className="btn btn-secondary" onClick={onOpenInterview}>面談記録を開く</button>
      </div>
    </>
  )
}

/* ── 編集可能フィールド（モーダル内、1行） ── */
function EditableField({ value, onSave, mono }: { value: string; onSave: (v: string) => void; mono?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])
  useEffect(() => { setDraft(value) }, [value])
  const commit = () => { setEditing(false); if (draft !== value) onSave(draft) }

  if (editing) {
    return <input ref={ref} className="input" value={draft} onChange={(e) => setDraft(e.target.value)}
      onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }} />
  }
  return (
    <div style={{ cursor: 'text', fontFamily: mono ? "'JetBrains Mono', monospace" : undefined, fontSize: mono ? '0.78rem' : '0.82rem', color: 'var(--ink)' }}
      onClick={() => setEditing(true)}>
      {value || <span className="muted">クリックして入力</span>}
    </div>
  )
}

/* ── 編集可能フィールド（モーダル内、複数行） ── */
function EditableArea({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])
  useEffect(() => { setDraft(value) }, [value])
  const commit = () => { setEditing(false); if (draft !== value) onSave(draft) }

  if (editing) {
    return <textarea ref={ref} className="textarea" value={draft} onChange={(e) => setDraft(e.target.value)}
      onBlur={commit} rows={6} />
  }
  return (
    <div style={{ cursor: 'text', minHeight: '2rem', fontSize: '0.82rem', color: 'var(--ink)', lineHeight: 1.6 }}
      onClick={() => setEditing(true)}>
      {value || <span className="muted">クリックして入力</span>}
    </div>
  )
}

/* ── 面談記録一覧モーダル ── */
function InterviewListModal({ candidate, onClose }: { candidate: YouthCandidate; onClose: () => void }) {
  const [records, setRecords] = useState<YouthInterview[]>([])
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchRecords = useCallback(() => {
    fetch(`/api/youth/interviews/${encodeURIComponent(candidate.name)}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setRecords(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [candidate.name])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const handleSaved = () => { setAdding(false); fetchRecords() }

  return (
    <Modal open onClose={onClose} title={`面談記録: ${candidate.name}`}>
      {loading ? (
        <div className="empty-state">読み込み中...</div>
      ) : records.length === 0 && !adding ? (
        <div className="empty-state">面談記録はまだありません</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {records.map((r) => (
            <div key={r.id} className="card-info">
              <div className="flex-between" style={{ marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink)' }}>{r.handler || '担当未設定'}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: 'var(--mu)' }}>{r.interview_date || '日付未設定'}</span>
              </div>
              <div className="flex-row" style={{ marginBottom: '0.4rem' }}>
                {r.course && <span className="badge blu">{r.course}</span>}
                {r.result && <span className={`badge ${(r.result ?? '').includes('特別') ? 'grn' : 'gray'}`}>{r.result}</span>}
              </div>
              {r.notes && <div style={{ fontSize: '0.8rem', color: 'var(--ink2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.notes}</div>}
              <div style={{ fontSize: '0.62rem', color: 'var(--bd2)', marginTop: '0.4rem' }}>{new Date(r.created_at).toLocaleString('ja-JP')}</div>
            </div>
          ))}
        </div>
      )}
      {adding ? (
        <InterviewForm candidateName={candidate.name} onSaved={handleSaved} onCancel={() => setAdding(false)} />
      ) : (
        <div style={{ marginTop: '1.1rem' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ 新しい面談記録を追加</button>
        </div>
      )}
    </Modal>
  )
}

/* ── 面談記録入力フォーム ── */
function InterviewForm({ candidateName, onSaved, onCancel }: { candidateName: string; onSaved: () => void; onCancel: () => void }) {
  const [handler, setHandler] = useState('')
  const [date, setDate] = useState('')
  const [course, setCourse] = useState('')
  const [result, setResult] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/youth/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_name: candidateName, handler: handler || null, interview_date: date || null, course: course || null, result: result || null, notes: notes || null }),
      })
      onSaved()
    } catch { setSaving(false) }
  }

  return (
    <div style={{ marginTop: '1.1rem', borderTop: '1px solid var(--bd)', paddingTop: '1.1rem' }}>
      <div className="section-label">新規面談記録</div>
      <div className="grid grid-2">
        <div className="field"><div className="field-label">面談担当</div><input className="input" value={handler} onChange={(e) => setHandler(e.target.value)} placeholder="担当者名" /></div>
        <div className="field"><div className="field-label">面談日</div><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      <div className="grid grid-2">
        <div className="field"><div className="field-label">進路希望</div><select className="select" value={course} onChange={(e) => setCourse(e.target.value)}><option value="">選択</option><option value="起業">起業</option><option value="地元企業">地元企業</option><option value="大手企業">大手企業</option><option value="その他">その他</option></select></div>
        <div className="field"><div className="field-label">結果</div><select className="select" value={result} onChange={(e) => setResult(e.target.value)}><option value="">選択</option><option value="特別選考枠付与">特別選考枠付与</option><option value="付与なし（一般応募）">付与なし</option><option value="保留">保留</option></select></div>
      </div>
      <div className="field"><div className="field-label">議事録・メモ</div><textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="面談の内容を入力..." rows={6} /></div>
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onCancel}>キャンセル</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
      </div>
    </div>
  )
}

/* ── 候補者追加フォーム ── */
function AddCandidateForm({ onSaved, onAdd }: { onSaved: () => void; onAdd: (data: Partial<YouthCandidate>) => Promise<boolean> }) {
  const [name, setName] = useState('')
  const [kana, setKana] = useState('')
  const [email, setEmail] = useState('')
  const [type, setType] = useState('大学生・専門学生・大学院生')
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState('')
  const [status, setStatus] = useState('応募前')
  const [yomi, setYomi] = useState('')
  const [source, setSource] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!name.trim()) { setError('氏名は必須です'); return }
    setSaving(true)
    setError('')
    const ok = await onAdd({
      name: name.trim(),
      kana: kana || null,
      email: email || null,
      type,
      school: school || null,
      grade: grade || null,
      status,
      yomi: yomi || null,
      source: source || null,
    } as Partial<YouthCandidate>)
    setSaving(false)
    if (ok) { onSaved() } else { setError('追加に失敗しました（同名の候補者が存在する可能性があります）') }
  }

  return (
    <div>
      <div className="grid grid-2">
        <div className="field"><div className="field-label">氏名 *</div><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="山田 太郎" /></div>
        <div className="field"><div className="field-label">ふりがな</div><input className="input" value={kana} onChange={(e) => setKana(e.target.value)} placeholder="やまだ たろう" /></div>
      </div>
      <div className="grid grid-2">
        <div className="field"><div className="field-label">メール</div><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" /></div>
        <div className="field"><div className="field-label">区分</div>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="大学生・専門学生・大学院生">大学生・専門学生・大学院生</option>
            <option value="社会人">社会人</option>
          </select>
        </div>
      </div>
      <div className="grid grid-2">
        <div className="field"><div className="field-label">所属</div><input className="input" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="九州大学" /></div>
        <div className="field"><div className="field-label">学年・役職</div><input className="input" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="工学部2年" /></div>
      </div>
      <div className="grid grid-2">
        <div className="field"><div className="field-label">ステータス</div>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field"><div className="field-label">応募確度</div>
          <select className="select" value={yomi} onChange={(e) => setYomi(e.target.value)}>
            {YOMI_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.value || '—（未設定）'}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-2">
        <div className="field"><div className="field-label">紹介元</div><input className="input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Instagram, 知人紹介 等" /></div>
        <div />
      </div>
      {error && <div style={{ color: 'var(--red)', fontSize: '0.78rem', marginBottom: '0.6rem' }}>{error}</div>}
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '追加中...' : '追加'}</button>
      </div>
    </div>
  )
}
