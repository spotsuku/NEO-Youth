'use client'

import { useState } from 'react'
import type { DashboardInterview } from '@/types/dashboard'
import Modal from './Modal'

interface Props {
  interviews: DashboardInterview[]
}

export default function InterviewsTab({ interviews }: Props) {
  const [selected, setSelected] = useState<DashboardInterview | null>(null)

  const special = interviews.filter((i) => i.result.includes('特別')).length
  const general = interviews.filter((i) => i.result.includes('一般')).length

  return (
    <>
      <div className="kpi-row">
        <div className="kpi-card red">
          <div className="kpi-label">面談実施数</div>
          <div className="kpi-value">
            {interviews.length}
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
            {interviews.map((iv, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{iv.name}</td>
                <td style={{ fontSize: '0.75rem' }}>{iv.referral}</td>
                <td>{iv.org}</td>
                <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
                  {iv.date}
                </td>
                <td>
                  <span className={`badge ${iv.type === '大学生' ? 'blu' : 'gold'}`}>
                    {iv.type}
                  </span>
                </td>
                <td>{iv.course}</td>
                <td>
                  <span
                    className={`badge ${
                      iv.result.includes('特別') ? 'grn' : iv.result.includes('一般') ? 'gray' : 'red'
                    }`}
                  >
                    {iv.result.includes('特別') ? '特別選考' : '一般'}
                  </span>
                </td>
                <td>
                  <button className="detail-btn" onClick={() => setSelected(iv)}>
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
                <div className="field-value">{selected.kana}</div>
              </div>
              <div>
                <div className="field-label">紹介者</div>
                <div className="field-value">{selected.referral}</div>
              </div>
            </div>
            <div className="field-row">
              <div>
                <div className="field-label">担当者</div>
                <div className="field-value">{selected.handler}</div>
              </div>
              <div>
                <div className="field-label">所属</div>
                <div className="field-value">{selected.org}</div>
              </div>
            </div>
            <div className="field-row">
              <div>
                <div className="field-label">面談日</div>
                <div className="field-value">{selected.date}</div>
              </div>
              <div>
                <div className="field-label">進路希望</div>
                <div className="field-value">{selected.course}</div>
              </div>
            </div>
            <div className="field-row">
              <div>
                <div className="field-label">区分</div>
                <div className="field-value">{selected.type}</div>
              </div>
              <div>
                <div className="field-label">結果</div>
                <div className="field-value">
                  <span
                    className={`badge ${selected.result.includes('特別') ? 'grn' : 'gray'}`}
                  >
                    {selected.result}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <div className="field-label">備考</div>
              <div className="field-value long">{selected.notes}</div>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
