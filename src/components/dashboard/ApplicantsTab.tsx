'use client'

import { useState, useMemo } from 'react'
import type { DashboardApplicant } from '@/types/dashboard'
import Modal from './Modal'

interface Props {
  applicants: DashboardApplicant[]
}

const TYPE_FILTERS = ['全て', '大学生・専門学生・大学院生', '社会人']

export default function ApplicantsTab({ applicants }: Props) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('全て')
  const [selected, setSelected] = useState<DashboardApplicant | null>(null)

  const filtered = useMemo(() => {
    return applicants.filter((a) => {
      const q = query.toLowerCase()
      const matchQuery =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.kana.toLowerCase().includes(q) ||
        a.school.toLowerCase().includes(q)
      const matchType = typeFilter === '全て' || a.type === typeFilter
      return matchQuery && matchType
    })
  }, [applicants, query, typeFilter])

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
              <th>紹介元</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{a.name}</td>
                <td style={{ fontSize: '0.75rem', color: 'var(--mu)' }}>{a.kana}</td>
                <td>
                  <span className={`badge ${a.type.includes('大学') ? 'blu' : 'gold'}`}>
                    {a.type.includes('大学') ? '学生' : '社会人'}
                  </span>
                </td>
                <td>{a.school || '-'}</td>
                <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>{a.ts}</td>
                <td>
                  {a.source !== 'None' ? (
                    <span className="badge grn">{a.source}</span>
                  ) : (
                    <span style={{ color: 'var(--bd2)', fontSize: '0.75rem' }}>-</span>
                  )}
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

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''}>
        {selected && (
          <>
            <div className="field-row">
              <div>
                <div className="field-label">ふりがな</div>
                <div className="field-value">{selected.kana}</div>
              </div>
              <div>
                <div className="field-label">メール</div>
                <div className="field-value" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' }}>
                  {selected.email}
                </div>
              </div>
            </div>
            <div className="field-row">
              <div>
                <div className="field-label">区分</div>
                <div className="field-value">{selected.type}</div>
              </div>
              <div>
                <div className="field-label">所属・学年</div>
                <div className="field-value">
                  {selected.school} {selected.grade}
                </div>
              </div>
            </div>
            <div className="field-row">
              <div>
                <div className="field-label">応募日</div>
                <div className="field-value">{selected.ts}</div>
              </div>
              <div>
                <div className="field-label">紹介元</div>
                <div className="field-value">{selected.source === 'None' ? '-' : selected.source}</div>
              </div>
            </div>
            <div style={{ marginBottom: '0.85rem' }}>
              <div className="field-label">志望動機</div>
              <div className="field-value long">{selected.motivation}</div>
            </div>
            <div className="field-row">
              <div>
                <div className="field-label">2次面接希望日</div>
                <div className="field-value" style={{ fontSize: '0.78rem' }}>
                  {selected.interview2}
                </div>
              </div>
              <div>
                <div className="field-label">3次面接</div>
                <div className="field-value">{selected.interview3}</div>
              </div>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
