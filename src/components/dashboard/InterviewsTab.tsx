'use client'

import { useState } from 'react'
import type { YouthCandidate } from '@/types/dashboard'
import Modal from './Modal'

interface Props {
  candidates: YouthCandidate[]
}

export default function InterviewsTab({ candidates }: Props) {
  const [selected, setSelected] = useState<YouthCandidate | null>(null)

  const special = candidates.filter((c) => (c.interview_result ?? '').includes('特別')).length
  const general = candidates.filter((c) => (c.interview_result ?? '').includes('一般')).length

  return (
    <>
      <div className="grid grid-3" style={{ marginBottom: '1.4rem' }}>
        <div className="card-state danger">
          <div className="stat-label">面談実施数</div>
          <div className="stat-value">{candidates.length}<span style={{ fontSize: '0.9rem', fontWeight: 700 }}> 件</span></div>
        </div>
        <div className="card-state sun">
          <div className="stat-label">特別選考枠付与</div>
          <div className="stat-value">{special}<span style={{ fontSize: '0.9rem', fontWeight: 700 }}> 件</span></div>
        </div>
        <div className="card-state sky">
          <div className="stat-label">一般応募</div>
          <div className="stat-value">{general}<span style={{ fontSize: '0.9rem', fontWeight: 700 }}> 件</span></div>
        </div>
      </div>

      <div className="flex-between" style={{ marginBottom: '0.9rem' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>面談記録一覧</div>
        <a className="btn btn-secondary btn-sm" href="/">最終面接シートを開く →</a>
      </div>

      {candidates.length === 0 ? (
        <div className="empty-state">面談記録がありません。</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>氏名</th>
                <th>紹介者</th>
                <th>所属</th>
                <th>面談日</th>
                <th>区分</th>
                <th>進路</th>
                <th>結果</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{c.name}</td>
                  <td style={{ fontSize: '0.75rem' }}>{c.referral ?? '-'}</td>
                  <td>{c.school ?? '-'}</td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
                    {c.interview_date ?? '-'}
                  </td>
                  <td>
                    <span className={`badge ${(c.type ?? '').includes('社会人') ? 'gold' : 'blu'}`}>
                      {(c.type ?? '').includes('社会人') ? '社会人' : '大学生'}
                    </span>
                  </td>
                  <td>{c.interview_course ?? '-'}</td>
                  <td>
                    <span
                      className={`badge ${
                        (c.interview_result ?? '').includes('特別') ? 'grn' : 'gray'
                      }`}
                    >
                      {(c.interview_result ?? '').includes('特別') ? '特別選考' : '一般'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelected(c)}>
                      詳細
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''}>
        {selected && (
          <>
            <div className="grid grid-2">
              <div className="field">
                <div className="field-label">ふりがな</div>
                <div>{selected.kana ?? '-'}</div>
              </div>
              <div className="field">
                <div className="field-label">紹介者</div>
                <div>{selected.referral ?? '-'}</div>
              </div>
              <div className="field">
                <div className="field-label">担当者</div>
                <div>{selected.interview_handler ?? '-'}</div>
              </div>
              <div className="field">
                <div className="field-label">所属</div>
                <div>{selected.school ?? '-'}</div>
              </div>
              <div className="field">
                <div className="field-label">面談日</div>
                <div>{selected.interview_date ?? '-'}</div>
              </div>
              <div className="field">
                <div className="field-label">進路希望</div>
                <div>{selected.interview_course ?? '-'}</div>
              </div>
              <div className="field">
                <div className="field-label">区分</div>
                <div>{selected.type ?? '-'}</div>
              </div>
              <div className="field">
                <div className="field-label">結果</div>
                <div>
                  <span className={`badge ${(selected.interview_result ?? '').includes('特別') ? 'grn' : 'gray'}`}>
                    {selected.interview_result ?? '-'}
                  </span>
                </div>
              </div>
            </div>
            <div className="field">
              <div className="field-label">備考</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--ink2)', whiteSpace: 'pre-wrap' }}>{selected.interview_notes ?? '-'}</div>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
