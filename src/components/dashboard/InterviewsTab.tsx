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
      <div className="kpi-row">
        <div className="kpi-card red">
          <div className="kpi-label">面談実施数</div>
          <div className="kpi-value">
            {candidates.length}
            <span> 件</span>
          </div>
        </div>
        <div className="kpi-card gold">
          <div className="kpi-label">特別選考枠付与</div>
          <div className="kpi-value">
            {special}
            <span> 件</span>
          </div>
        </div>
        <div className="kpi-card blu">
          <div className="kpi-label">一般応募</div>
          <div className="kpi-value">
            {general}
            <span> 件</span>
          </div>
        </div>
      </div>

      <div className="section-title">面談記録一覧</div>

      <div className="table-wrap">
        <table>
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
                <td style={{ fontWeight: 600 }}>{c.name}</td>
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
                  <button className="detail-btn" onClick={() => setSelected(c)}>
                    詳細
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''}>
        {selected && (
          <>
            <div className="field-row">
              <div>
                <div className="field-label">ふりがな</div>
                <div className="field-value">{selected.kana ?? '-'}</div>
              </div>
              <div>
                <div className="field-label">紹介者</div>
                <div className="field-value">{selected.referral ?? '-'}</div>
              </div>
            </div>
            <div className="field-row">
              <div>
                <div className="field-label">担当者</div>
                <div className="field-value">{selected.interview_handler ?? '-'}</div>
              </div>
              <div>
                <div className="field-label">所属</div>
                <div className="field-value">{selected.school ?? '-'}</div>
              </div>
            </div>
            <div className="field-row">
              <div>
                <div className="field-label">面談日</div>
                <div className="field-value">{selected.interview_date ?? '-'}</div>
              </div>
              <div>
                <div className="field-label">進路希望</div>
                <div className="field-value">{selected.interview_course ?? '-'}</div>
              </div>
            </div>
            <div className="field-row">
              <div>
                <div className="field-label">区分</div>
                <div className="field-value">{selected.type ?? '-'}</div>
              </div>
              <div>
                <div className="field-label">結果</div>
                <div className="field-value">
                  <span className={`badge ${(selected.interview_result ?? '').includes('特別') ? 'grn' : 'gray'}`}>
                    {selected.interview_result ?? '-'}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <div className="field-label">備考</div>
              <div className="field-value long">{selected.interview_notes ?? '-'}</div>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
