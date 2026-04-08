'use client'

import type { YouthCandidate } from '@/types/dashboard'
import { OB_LABELS, OB_FIELDS } from '@/types/dashboard'

interface Props {
  candidates: YouthCandidate[]
  onUpdate: (name: string, patch: Partial<YouthCandidate>) => Promise<void>
}

export default function OnboardingTab({ candidates, onUpdate }: Props) {
  const totalChecks = candidates.length * OB_FIELDS.length
  const doneChecks = candidates.reduce(
    (sum, c) => sum + OB_FIELDS.filter((f) => c[f]).length,
    0,
  )

  const toggle = (c: YouthCandidate, field: typeof OB_FIELDS[number]) => {
    onUpdate(c.name, { [field]: !c[field] })
  }

  return (
    <>
      <div className="kpi-row">
        <div className="kpi-card grn">
          <div className="kpi-label">対象者数</div>
          <div className="kpi-value">
            {candidates.length}
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
        {candidates.map((c) => {
          const done = OB_FIELDS.filter((f) => c[f]).length
          const pct = OB_FIELDS.length > 0 ? Math.round((done / OB_FIELDS.length) * 100) : 0
          return (
            <div className="ob-card" key={c.id}>
              <div className="ob-name">{c.name}</div>
              <div className="ob-email">{c.email ?? '-'}</div>
              <div className="ob-checks">
                {OB_FIELDS.map((f) => (
                  <button
                    key={f}
                    className={`ob-check ${c[f] ? 'ok' : ''}`}
                    onClick={() => toggle(c, f)}
                    type="button"
                  >
                    {c[f] ? '\u2713 ' : ''}{OB_LABELS[f]}
                  </button>
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
