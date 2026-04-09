'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import type { YouthCandidate, YouthInterview } from '@/types/dashboard'
import Modal from './Modal'

interface Props {
  applicants: YouthCandidate[]
  onUpdate: (name: string, patch: Partial<YouthCandidate>) => Promise<void>
}

const TYPE_FILTERS = ['全て', '大学生・専門学生・大学院生', '社会人']

const STATUS_BADGE: Record<string, { cls: string }> = {
  '応募完了':     { cls: 'grn' },
  '書類選考':     { cls: 'blu' },
  'グループ面接': { cls: 'gold' },
  '最終面接':     { cls: 'red' },
  '参加確定':     { cls: 'grn' },
  '保留':         { cls: 'gray' },
  '不合格':       { cls: 'gray' },
  'アプローチ中': { cls: 'gold' },
  '説明会参加済': { cls: 'blu' },
  '特別選考付与': { cls: 'gold' },
  '3期生候補':    { cls: 'purple' },
  '対応不要':     { cls: 'gray' },
}

export default function ApplicantsTab({ applicants, onUpdate }: Props) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('全て')
  const [selected, setSelected] = useState<YouthCandidate | null>(null)
  const [interviewTarget, setInterviewTarget] = useState<YouthCandidate | null>(null)

  const filtered = useMemo(() => {
    return applicants.filter((a) => {
      const q = query.toLowerCase()
      const matchQuery =
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.kana ?? '').toLowerCase().includes(q) ||
        (a.school ?? '').toLowerCase().includes(q)
      const matchType = typeFilter === '全て' || (a.type ?? '').includes(typeFilter === '社会人' ? '社会人' : '大学')
      return matchQuery && matchType
    })
  }, [applicants, query, typeFilter])

  const openInterview = (c: YouthCandidate) => {
    setSelected(null)
    setInterviewTarget(c)
  }

  const toggleSession = (c: YouthCandidate) => {
    onUpdate(c.name, { attended_session: !c.attended_session })
  }

  return (
    <>
      <div className="section-title">応募者一覧</div>

      <div className="search-row">
        <input
          className="search-input"
          type="text"
          placeholder="氏名・ふりがな・所属で検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {TYPE_FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-btn ${typeFilter === f ? 'active' : ''}`}
            onClick={() => setTypeFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>氏名</th>
              <th>ステータス</th>
              <th>区分</th>
              <th>所属</th>
              <th>応募日</th>
              <th>説明会</th>
              <th>面談</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const sb = STATUS_BADGE[a.status] ?? { cls: 'gray' }
              return (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.name}</td>
                  <td>
                    <span className={`badge ${sb.cls}`}>{a.status}</span>
                  </td>
                  <td>
                    <span className={`badge ${(a.type ?? '').includes('大学') ? 'blu' : 'gold'}`}>
                      {(a.type ?? '').includes('大学') ? '学生' : '社会人'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem' }}>{a.school || '-'}</td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem' }}>
                    {a.applied_at ? a.applied_at.slice(0, 10) : '-'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className={`ob-cell ${a.attended_session ? 'checked' : ''}`}
                      onClick={() => toggleSession(a)}
                      type="button"
                      title="説明会参加"
                    >
                      {a.attended_session ? '\u2713' : ''}
                    </button>
                  </td>
                  <td>
                    <button className="detail-btn" onClick={() => openInterview(a)}>
                      面談記録
                    </button>
                  </td>
                  <td>
                    <button className="detail-btn" onClick={() => setSelected(a)}>
                      詳細
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--mu)', padding: '2rem' }}>
                  該当する応募者がいません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 詳細モーダル */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''}>
        {selected && (
          <>
            <div className="field-row">
              <div>
                <div className="field-label">ふりがな</div>
                <div className="field-value">{selected.kana ?? '-'}</div>
              </div>
              <div>
                <div className="field-label">メール</div>
                <div className="field-value" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' }}>
                  {selected.email ?? '-'}
                </div>
              </div>
            </div>
            <div className="field-row">
              <div>
                <div className="field-label">区分</div>
                <div className="field-value">{selected.type ?? '-'}</div>
              </div>
              <div>
                <div className="field-label">所属・学年</div>
                <div className="field-value">
                  {selected.school ?? ''} {selected.grade ?? ''}
                </div>
              </div>
            </div>
            <div className="field-row">
              <div>
                <div className="field-label">応募日</div>
                <div className="field-value">{selected.applied_at ? selected.applied_at.slice(0, 10) : '-'}</div>
              </div>
              <div>
                <div className="field-label">紹介元</div>
                <div className="field-value">{selected.source ?? '-'}</div>
              </div>
            </div>
            {selected.motivation && (
              <div style={{ marginBottom: '0.85rem' }}>
                <div className="field-label">志望動機</div>
                <div className="field-value long">{selected.motivation}</div>
              </div>
            )}
            {selected.pr && (
              <div style={{ marginBottom: '0.85rem' }}>
                <div className="field-label">自己PR</div>
                <div className="field-value long">{selected.pr}</div>
              </div>
            )}
            {selected.contribution && (
              <div style={{ marginBottom: '0.85rem' }}>
                <div className="field-label">貢献・活動方針</div>
                <div className="field-value long">{selected.contribution}</div>
              </div>
            )}
            {selected.career && (
              <div style={{ marginBottom: '0.85rem' }}>
                <div className="field-label">キャリアプラン</div>
                <div className="field-value long">{selected.career}</div>
              </div>
            )}
            <div className="field-row">
              <div>
                <div className="field-label">2次面接希望日</div>
                <div className="field-value" style={{ fontSize: '0.78rem' }}>
                  {selected.interview2_dates ?? '-'}
                </div>
              </div>
              <div>
                <div className="field-label">3次面接</div>
                <div className="field-value">{selected.interview3_dates ?? '-'}</div>
              </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <button
                className="detail-btn"
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                onClick={() => openInterview(selected)}
              >
                面談記録を開く
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* 面談記録モーダル */}
      {interviewTarget && (
        <InterviewListModal
          candidate={interviewTarget}
          onClose={() => setInterviewTarget(null)}
        />
      )}
    </>
  )
}

/* ── 面談記録一覧モーダル ── */

function InterviewListModal({
  candidate,
  onClose,
}: {
  candidate: YouthCandidate
  onClose: () => void
}) {
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

  const handleSaved = () => {
    setAdding(false)
    fetchRecords()
  }

  return (
    <Modal open onClose={onClose} title={`面談記録: ${candidate.name}`}>
      {loading ? (
        <div style={{ color: 'var(--mu)', textAlign: 'center', padding: '1rem' }}>読み込み中...</div>
      ) : records.length === 0 && !adding ? (
        <div style={{ color: 'var(--mu)', textAlign: 'center', padding: '1.5rem 0' }}>
          面談記録はまだありません
        </div>
      ) : (
        <div className="iv-records">
          {records.map((r) => (
            <div key={r.id} className="iv-record">
              <div className="iv-record-head">
                <span style={{ fontWeight: 600 }}>{r.handler || '担当未設定'}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: 'var(--mu)' }}>
                  {r.interview_date || '日付未設定'}
                </span>
              </div>
              <div className="iv-record-meta">
                {r.course && <span className="badge blu">{r.course}</span>}
                {r.result && <span className={`badge ${(r.result ?? '').includes('特別') ? 'grn' : 'gray'}`}>{r.result}</span>}
              </div>
              {r.notes && <div className="iv-record-notes">{r.notes}</div>}
              <div style={{ fontSize: '0.62rem', color: 'var(--bd2)', marginTop: '0.3rem' }}>
                {new Date(r.created_at).toLocaleString('ja-JP')}
              </div>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <InterviewForm
          candidateName={candidate.name}
          onSaved={handleSaved}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <button className="iv-save-btn" onClick={() => setAdding(true)}>
            + 新しい面談記録を追加
          </button>
        </div>
      )}
    </Modal>
  )
}

/* ── 面談記録入力フォーム ── */

function InterviewForm({
  candidateName,
  onSaved,
  onCancel,
}: {
  candidateName: string
  onSaved: () => void
  onCancel: () => void
}) {
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
        body: JSON.stringify({
          candidate_name: candidateName,
          handler: handler || null,
          interview_date: date || null,
          course: course || null,
          result: result || null,
          notes: notes || null,
        }),
      })
      onSaved()
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="interview-form" style={{ marginTop: '1rem', borderTop: '1px solid var(--bd)', paddingTop: '1rem' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--mu)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
        新規面談記録
      </div>
      <div className="field-row">
        <div>
          <div className="field-label">面談担当</div>
          <input className="iv-input" value={handler} onChange={(e) => setHandler(e.target.value)} placeholder="担当者名" />
        </div>
        <div>
          <div className="field-label">面談日</div>
          <input className="iv-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <div>
          <div className="field-label">進路希望</div>
          <select className="iv-input" value={course} onChange={(e) => setCourse(e.target.value)}>
            <option value="">選択してください</option>
            <option value="起業">起業</option>
            <option value="地元企業">地元企業</option>
            <option value="大手企業">大手企業</option>
            <option value="その他">その他</option>
          </select>
        </div>
        <div>
          <div className="field-label">結果</div>
          <select className="iv-input" value={result} onChange={(e) => setResult(e.target.value)}>
            <option value="">選択してください</option>
            <option value="特別選考枠付与">特別選考枠付与</option>
            <option value="付与なし（一般応募）">付与なし（一般応募）</option>
            <option value="保留">保留</option>
          </select>
        </div>
      </div>
      <div>
        <div className="field-label">議事録・メモ</div>
        <textarea
          className="iv-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="面談の内容、印象、備考を入力..."
          rows={6}
        />
      </div>
      <div className="iv-footer">
        <button className="iv-save-btn" onClick={save} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </button>
        <button className="detail-btn" onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  )
}
