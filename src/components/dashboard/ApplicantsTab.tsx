'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { YouthCandidate, YouthInterview } from '@/types/dashboard'
import type { VerdictRecord } from '@/app/dashboard/page'
import Modal from './Modal'

interface Props {
  candidates: YouthCandidate[]
  onUpdate: (name: string, patch: Partial<YouthCandidate>) => Promise<void>
  onAdd: (data: Partial<YouthCandidate>) => Promise<boolean>
  onDelete: (name: string) => Promise<void>
  verdictMap: Record<string, VerdictRecord>
}

// ステータス（事実に基づく状態）
const ALL_STATUSES = [
  '承諾書提出', '合格', '合格予定', '補欠合格',
  '最終面接', 'グループ面接', '書類選考', '応募完了',
  '保留', '不合格', '辞退',
]

const STATUS_COLORS: Record<string, string> = {
  '承諾書提出': 'grn', '合格': 'grn', '合格予定': 'blu', '補欠合格': 'gold',
  '最終面接': 'red', 'グループ面接': 'gold', '書類選考': 'blu',
  '応募完了': 'grn', '保留': 'gold', '不合格': 'gray', '辞退': 'red',
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

const STATUS_FILTERS = ['全て', '応募完了', '書類選考', 'グループ面接', '最終面接', '合格予定', '合格', '補欠合格', '承諾書提出', '保留', '不合格', '辞退']

export default function ApplicantsTab({ candidates, onUpdate, onAdd, onDelete, verdictMap }: Props) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('全て')
  const [selected, setSelected] = useState<YouthCandidate | null>(null)
  const [interviewTarget, setInterviewTarget] = useState<YouthCandidate | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const filtered = useMemo(() => {
    return candidates
      .filter((c) => {
        const q = query.toLowerCase()
        const matchQuery = !q ||
          c.name.toLowerCase().includes(q) ||
          (c.kana ?? '').toLowerCase().includes(q) ||
          (c.school ?? '').toLowerCase().includes(q)
        const matchStatus = statusFilter === '全て' || c.status === statusFilter
        return matchQuery && matchStatus
      })
      .sort((a, b) => {
        const ka = a.kana || a.name
        const kb = b.kana || b.name
        return ka.localeCompare(kb, 'ja')
      })
  }, [candidates, query, statusFilter])

  const openInterview = (c: YouthCandidate) => {
    setSelected(null)
    setInterviewTarget(c)
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>候補者管理</div>
        <button className="iv-save-btn" style={{ fontSize: '0.72rem', padding: '0.35rem 0.8rem' }} onClick={() => setShowAddForm(true)}>
          + 候補者を追加
        </button>
      </div>

      <div className="search-row">
        <input
          className="search-input"
          type="text"
          placeholder="氏名・ふりがな・所属で検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="search-row" style={{ flexWrap: 'wrap', gap: '0.35rem' }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-btn ${statusFilter === f ? 'active' : ''}`}
            onClick={() => setStatusFilter(f)}
          >
            {f === '全て' ? `全て (${candidates.length})` : `${f} (${candidates.filter((c) => c.status === f).length})`}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="editable-table">
          <thead>
            <tr>
              <th>#</th>
              <th>氏名</th>
              <th>確度</th>
              <th>ステータス</th>
              <th>区分</th>
              <th>所属</th>
              <th>応募日</th>
              <th>合格基準</th>
              <th>不合格</th>
              <th>説明会</th>
              <th>面談済</th>
              <th>最終面接</th>
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
                  {/* 確度（ヨミ） */}
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
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className={`ob-cell ${c.ob_pass_criteria ? 'checked' : ''}`}
                      onClick={() => onUpdate(c.name, { ob_pass_criteria: !c.ob_pass_criteria })}
                      type="button"
                    >
                      {c.ob_pass_criteria ? '\u2713' : ''}
                    </button>
                  </td>
                  {/* 不合格 */}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className={`ob-cell ${c.status === '不合格' ? 'checked reject' : ''}`}
                      onClick={() => onUpdate(c.name, { status: c.status === '不合格' ? '応募完了' : '不合格' })}
                      type="button"
                    >
                      {c.status === '不合格' ? '\u2713' : ''}
                    </button>
                  </td>
                  {/* 説明会 */}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className={`ob-cell ${c.attended_session ? 'checked' : ''}`}
                      onClick={() => onUpdate(c.name, { attended_session: !c.attended_session })}
                      type="button"
                    >
                      {c.attended_session ? '\u2713' : ''}
                    </button>
                  </td>
                  {/* 面談済チェック */}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className={`ob-cell ${c.interview_date ? 'checked' : ''}`}
                      onClick={() => openInterview(c)}
                      type="button"
                      title={c.interview_date ? `面談日: ${c.interview_date}` : '面談記録を追加'}
                    >
                      {c.interview_date ? '\u2713' : ''}
                    </button>
                  </td>
                  {/* 最終面接結果 */}
                  <td>
                    {v ? (
                      <span className={`badge ${VERDICT_BADGE[v.verdict!] ?? 'gray'}`}>
                        {v.verdict}
                        {v.score_total != null && <span style={{ marginLeft: '0.3rem', opacity: 0.7 }}>{v.score_total}pt</span>}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--bd2)', fontSize: '0.72rem' }}>-</span>
                    )}
                  </td>
                  {/* 面談ボタン */}
                  <td>
                    <button className="detail-btn" onClick={() => openInterview(c)}>面談</button>
                  </td>
                  {/* 詳細 */}
                  <td>
                    <button className="detail-btn" onClick={() => setSelected(c)}>詳細</button>
                  </td>
                  {/* 削除 */}
                  <td>
                    <button
                      className="detail-btn delete-btn"
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
              <tr><td colSpan={15} style={{ textAlign: 'center', color: 'var(--mu)', padding: '2rem' }}>該当する候補者がいません</td></tr>
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
    </>
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
      className="cell-text"
      style={{ fontWeight: bold ? 600 : 400 }}
      onClick={() => setEditing(true)}
    >
      {value || <span style={{ color: 'var(--bd2)' }}>{placeholder || '-'}</span>}
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
      <div className="field-row">
        <div><div className="field-label">ふりがな</div><EditableField value={c.kana ?? ''} onSave={save('kana')} /></div>
        <div><div className="field-label">メール</div><EditableField value={c.email ?? ''} onSave={save('email')} mono /></div>
      </div>
      <div className="field-row">
        <div><div className="field-label">区分</div><div className="field-value">{c.type ?? '-'}</div></div>
        <div><div className="field-label">所属</div><EditableField value={c.school ?? ''} onSave={save('school')} /></div>
      </div>
      <div className="field-row">
        <div><div className="field-label">学年・役職</div><EditableField value={c.grade ?? ''} onSave={save('grade')} /></div>
        <div><div className="field-label">紹介元</div><EditableField value={c.source ?? ''} onSave={save('source')} /></div>
      </div>
      <div style={{ marginBottom: '0.85rem' }}>
        <div className="field-label">志望動機</div>
        <EditableArea value={c.motivation ?? ''} onSave={save('motivation')} />
      </div>
      <div style={{ marginBottom: '0.85rem' }}>
        <div className="field-label">自己PR</div>
        <EditableArea value={c.pr ?? ''} onSave={save('pr')} />
      </div>
      <div style={{ marginBottom: '0.85rem' }}>
        <div className="field-label">貢献・活動方針</div>
        <EditableArea value={c.contribution ?? ''} onSave={save('contribution')} />
      </div>
      <div style={{ marginBottom: '0.85rem' }}>
        <div className="field-label">キャリアプラン</div>
        <EditableField value={c.career ?? ''} onSave={save('career')} />
      </div>
      <div className="field-row">
        <div><div className="field-label">2次面接希望日</div><div className="field-value" style={{ fontSize: '0.78rem' }}>{c.interview2_dates ?? '-'}</div></div>
        <div><div className="field-label">3次面接</div><div className="field-value">{c.interview3_dates ?? '-'}</div></div>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <button className="detail-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={onOpenInterview}>面談記録を開く</button>
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
    return <input ref={ref} className="iv-input" value={draft} onChange={(e) => setDraft(e.target.value)}
      onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }} />
  }
  return (
    <div className="field-value" style={{ cursor: 'text', fontFamily: mono ? "'JetBrains Mono', monospace" : undefined, fontSize: mono ? '0.78rem' : undefined }}
      onClick={() => setEditing(true)}>
      {value || <span style={{ color: 'var(--bd2)' }}>クリックして入力</span>}
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
    return <textarea ref={ref} className="iv-textarea" value={draft} onChange={(e) => setDraft(e.target.value)}
      onBlur={commit} rows={6} />
  }
  return (
    <div className="field-value long" style={{ cursor: 'text', minHeight: '2rem' }}
      onClick={() => setEditing(true)}>
      {value || <span style={{ color: 'var(--bd2)' }}>クリックして入力</span>}
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
        <div style={{ color: 'var(--mu)', textAlign: 'center', padding: '1rem' }}>読み込み中...</div>
      ) : records.length === 0 && !adding ? (
        <div style={{ color: 'var(--mu)', textAlign: 'center', padding: '1.5rem 0' }}>面談記録はまだありません</div>
      ) : (
        <div className="iv-records">
          {records.map((r) => (
            <div key={r.id} className="iv-record">
              <div className="iv-record-head">
                <span style={{ fontWeight: 600 }}>{r.handler || '担当未設定'}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: 'var(--mu)' }}>{r.interview_date || '日付未設定'}</span>
              </div>
              <div className="iv-record-meta">
                {r.course && <span className="badge blu">{r.course}</span>}
                {r.result && <span className={`badge ${(r.result ?? '').includes('特別') ? 'grn' : 'gray'}`}>{r.result}</span>}
              </div>
              {r.notes && <div className="iv-record-notes">{r.notes}</div>}
              <div style={{ fontSize: '0.62rem', color: 'var(--bd2)', marginTop: '0.3rem' }}>{new Date(r.created_at).toLocaleString('ja-JP')}</div>
            </div>
          ))}
        </div>
      )}
      {adding ? (
        <InterviewForm candidateName={candidate.name} onSaved={handleSaved} onCancel={() => setAdding(false)} />
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <button className="iv-save-btn" onClick={() => setAdding(true)}>+ 新しい面談記録を追加</button>
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
    <div className="interview-form" style={{ marginTop: '1rem', borderTop: '1px solid var(--bd)', paddingTop: '1rem' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--mu)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>新規面談記録</div>
      <div className="field-row">
        <div><div className="field-label">面談担当</div><input className="iv-input" value={handler} onChange={(e) => setHandler(e.target.value)} placeholder="担当者名" /></div>
        <div><div className="field-label">面談日</div><input className="iv-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      <div className="field-row">
        <div><div className="field-label">進路希望</div><select className="iv-input" value={course} onChange={(e) => setCourse(e.target.value)}><option value="">選択</option><option value="起業">起業</option><option value="地元企業">地元企業</option><option value="大手企業">大手企業</option><option value="その他">その他</option></select></div>
        <div><div className="field-label">結果</div><select className="iv-input" value={result} onChange={(e) => setResult(e.target.value)}><option value="">選択</option><option value="特別選考枠付与">特別選考枠付与</option><option value="付与なし（一般応募）">付与なし</option><option value="保留">保留</option></select></div>
      </div>
      <div><div className="field-label">議事録・メモ</div><textarea className="iv-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="面談の内容を入力..." rows={6} /></div>
      <div className="iv-footer">
        <button className="iv-save-btn" onClick={save} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
        <button className="detail-btn" onClick={onCancel}>キャンセル</button>
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
  const [status, setStatus] = useState('未接触')
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
      source: source || null,
    } as Partial<YouthCandidate>)
    setSaving(false)
    if (ok) { onSaved() } else { setError('追加に失敗しました（同名の候補者が存在する可能性があります）') }
  }

  return (
    <div className="interview-form">
      <div className="field-row">
        <div><div className="field-label">氏名 *</div><input className="iv-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="山田 太郎" /></div>
        <div><div className="field-label">ふりがな</div><input className="iv-input" value={kana} onChange={(e) => setKana(e.target.value)} placeholder="やまだ たろう" /></div>
      </div>
      <div className="field-row">
        <div><div className="field-label">メール</div><input className="iv-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" /></div>
        <div><div className="field-label">区分</div>
          <select className="iv-input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="大学生・専門学生・大学院生">大学生・専門学生・大学院生</option>
            <option value="社会人">社会人</option>
          </select>
        </div>
      </div>
      <div className="field-row">
        <div><div className="field-label">所属</div><input className="iv-input" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="九州大学" /></div>
        <div><div className="field-label">学年・役職</div><input className="iv-input" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="工学部2年" /></div>
      </div>
      <div className="field-row">
        <div><div className="field-label">ステータス</div>
          <select className="iv-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div><div className="field-label">紹介元</div><input className="iv-input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Instagram, 知人紹介 等" /></div>
      </div>
      {error && <div style={{ color: 'var(--red)', fontSize: '0.78rem' }}>{error}</div>}
      <div className="iv-footer">
        <button className="iv-save-btn" onClick={save} disabled={saving}>{saving ? '追加中...' : '追加'}</button>
      </div>
    </div>
  )
}
