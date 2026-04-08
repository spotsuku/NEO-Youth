'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import type { YouthCandidate } from '@/types/dashboard'
import Modal from './Modal'

interface Props {
  applicants: YouthCandidate[]
  onUpdate: (name: string, patch: Partial<YouthCandidate>) => Promise<void>
}

const TYPE_FILTERS = ['全て', '大学生・専門学生・大学院生', '社会人']

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

  // 面談ビューを開く（選択中のモーダルから、またはテーブルから直接）
  const openInterview = (c: YouthCandidate) => {
    setSelected(null)
    setInterviewTarget(c)
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
              <th>ふりがな</th>
              <th>区分</th>
              <th>所属</th>
              <th>応募日</th>
              <th>面談</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}>{a.name}</td>
                <td style={{ fontSize: '0.75rem', color: 'var(--mu)' }}>{a.kana ?? '-'}</td>
                <td>
                  <span className={`badge ${(a.type ?? '').includes('大学') ? 'blu' : 'gold'}`}>
                    {(a.type ?? '').includes('大学') ? '学生' : '社会人'}
                  </span>
                </td>
                <td>{a.school || '-'}</td>
                <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
                  {a.applied_at ? a.applied_at.slice(0, 10) : '-'}
                </td>
                <td>
                  <button
                    className={`detail-btn ${a.interview_notes ? 'has-notes' : ''}`}
                    onClick={() => openInterview(a)}
                  >
                    {a.interview_notes ? '記録あり' : '面談記録'}
                  </button>
                </td>
                <td>
                  <button className="detail-btn" onClick={() => setSelected(a)}>
                    詳細
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--mu)', padding: '2rem' }}>
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
            <div style={{ marginBottom: '0.85rem' }}>
              <div className="field-label">志望動機</div>
              <div className="field-value long">{selected.motivation ?? '-'}</div>
            </div>
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
        <InterviewNoteModal
          candidate={interviewTarget}
          onClose={() => setInterviewTarget(null)}
          onUpdate={onUpdate}
        />
      )}
    </>
  )
}

/* ── 面談記録モーダル（議事録入力 → 自動保存） ── */

function InterviewNoteModal({
  candidate,
  onClose,
  onUpdate,
}: {
  candidate: YouthCandidate
  onClose: () => void
  onUpdate: (name: string, patch: Partial<YouthCandidate>) => Promise<void>
}) {
  const [handler, setHandler] = useState(candidate.interview_handler ?? '')
  const [date, setDate] = useState(candidate.interview_date ?? '')
  const [course, setCourse] = useState(candidate.interview_course ?? '')
  const [result, setResult] = useState(candidate.interview_result ?? '')
  const [notes, setNotes] = useState(candidate.interview_notes ?? '')
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(() => {
    onUpdate(candidate.name, {
      interview_handler: handler || null,
      interview_date: date || null,
      interview_course: course || null,
      interview_result: result || null,
      interview_notes: notes || null,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [candidate.name, handler, date, course, result, notes, onUpdate])

  // 自動保存（1秒デバウンス）
  const autoSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(save, 1000)
  }, [save])

  // フィールド変更時に自動保存をトリガー
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleChange = (setter: (v: string) => void) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setter(e.target.value)
    autoSave()
  }

  return (
    <Modal open onClose={onClose} title={`面談記録: ${candidate.name}`}>
      <div className="interview-form">
        <div className="field-row">
          <div>
            <div className="field-label">面談担当</div>
            <input
              className="iv-input"
              value={handler}
              onChange={handleChange(setHandler)}
              placeholder="担当者名"
            />
          </div>
          <div>
            <div className="field-label">面談日</div>
            <input
              className="iv-input"
              type="date"
              value={date}
              onChange={handleChange(setDate)}
            />
          </div>
        </div>
        <div className="field-row">
          <div>
            <div className="field-label">進路希望</div>
            <select className="iv-input" value={course} onChange={handleChange(setCourse)}>
              <option value="">選択してください</option>
              <option value="起業">起業</option>
              <option value="地元企業">地元企業</option>
              <option value="大手企業">大手企業</option>
              <option value="その他">その他</option>
            </select>
          </div>
          <div>
            <div className="field-label">結果</div>
            <select className="iv-input" value={result} onChange={handleChange(setResult)}>
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
            onChange={handleChange(setNotes)}
            placeholder="面談の内容、印象、備考を入力..."
            rows={8}
          />
        </div>
        <div className="iv-footer">
          <button className="iv-save-btn" onClick={save}>
            保存
          </button>
          {saved && <span className="iv-saved">自動保存しました</span>}
        </div>
      </div>
    </Modal>
  )
}
