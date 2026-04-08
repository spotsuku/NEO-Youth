'use client'

import { useMemo } from 'react'
import type { YouthCandidate } from '@/types/dashboard'

interface Props {
  candidates: YouthCandidate[]
}

const COL_COLORS: Record<string, string> = {
  '応募完了': 'var(--grn)',
  'アプローチ中': 'var(--gold)',
  '説明会参加済': 'var(--blu)',
  '参加確定': 'var(--grn)',
  '特別選考付与': 'var(--gold)',
  '未接触': 'var(--mu)',
  '3期生候補': '#7b2d8e',
  '対応不要': 'var(--bd2)',
}

export default function FlowTab({ candidates }: Props) {
  const columns = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of candidates) {
      map.set(c.status, (map.get(c.status) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([key, count]) => ({
      key,
      count,
      color: COL_COLORS[key] ?? 'var(--mu)',
    }))
  }, [candidates])

  const total = candidates.length
  const applied = columns.find((c) => c.key === '応募完了')?.count ?? 0

  return (
    <>
      <div className="kpi-row">
        <div className="kpi-card red">
          <div className="kpi-label">コンタクト総数</div>
          <div className="kpi-value">
            {total}
            <span> 名</span>
          </div>
        </div>
        <div className="kpi-card grn">
          <div className="kpi-label">応募完了</div>
          <div className="kpi-value">
            {applied}
            <span> 名</span>
          </div>
        </div>
        <div className="kpi-card gold">
          <div className="kpi-label">アプローチ中</div>
          <div className="kpi-value">
            {columns.find((c) => c.key === 'アプローチ中')?.count ?? 0}
            <span> 名</span>
          </div>
        </div>
      </div>

      <div className="progress-wrap">
        <div className="progress-label">
          <span>応募完了率</span>
          <span>
            {applied} / {total} ({total > 0 ? Math.round((applied / total) * 100) : 0}%)
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill grn"
            style={{ width: `${total > 0 ? (applied / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="section-title">選考パイプライン</div>

      <div className="kanban">
        {columns.map((col) => {
          const max = Math.max(...columns.map((c) => c.count), 1)
          return (
            <div className="kanban-col" key={col.key}>
              <div className="kanban-col-header">
                <div className="kanban-col-title" style={{ color: col.color }}>
                  {col.key}
                </div>
                <div className="kanban-count">{col.count}</div>
              </div>
              <div className="progress-bar" style={{ marginBottom: 0 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${(col.count / max) * 100}%`,
                    background: col.color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
