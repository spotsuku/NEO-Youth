'use client'

import type { OnboardingRecord } from '@/types/dashboard'
import { OB_LABELS, OB_FIELDS } from '@/types/dashboard'

interface Props {
  records: OnboardingRecord[]
}

export default function OnboardingTab({ records }: Props) {
  const totalChecks = records.length * OB_FIELDS.length
  const doneChecks = records.reduce(
    (sum, r) => sum + OB_FIELDS.filter((f) => r[f]).length,
    0,
  )

  return (
    <>
      <div className="kpi-row">
        <div className="kpi-card grn">
          <div className="kpi-label">対象者数</div>
          <div className="kpi-value">
            {records.length}
            <span> 名</span>
          </div>
        </div>
        <div className="kpi-card gold">
          <div className="kpi-label">完了タスク</div>
          <div className="kpi-value">
            {doneChecks}
            <span> / {totalChecks}</span>
          </div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">進捗率</div>
          <div className="kpi-value">
            {totalChecks > 0 ? Math.round((doneChecks / totalChecks) * 100) : 0}
            <span>%</span>
          </div>
        </div>
      </div>

      <div className="progress-wrap">
        <div className="progress-label">
          <span>オンボーディング全体進捗</span>
          <span>
            {doneChecks} / {totalChecks}
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill grn"
            style={{ width: totalChecks > 0 ? `${(doneChecks / totalChecks) * 100}%` : '0%' }}
          />
        </div>
      </div>

      <div className="section-title">候補者別チェックリスト</div>

      <div className="ob-grid">
        {records.map((r) => {
          const done = OB_FIELDS.filter((f) => r[f]).length
          const pct = Math.round((done / OB_FIELDS.length) * 100)
          return (
            <div className="ob-card" key={r.email}>
              <div className="ob-name">{r.name}</div>
              <div className="ob-email">{r.email}</div>
              <div className="ob-checks">
                {OB_FIELDS.map((f) => (
                  <span key={f} className={`ob-check ${r[f] ? 'ok' : ''}`}>
                    {OB_LABELS[f]}
                  </span>
                ))}
              </div>
              <div className="ob-progress">
                <div className="ob-progress-bar">
                  <div className="ob-progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="ob-progress-text">
                  {done}/{OB_FIELDS.length} ({pct}%)
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
