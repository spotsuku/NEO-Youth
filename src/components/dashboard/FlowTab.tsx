'use client'

interface KanbanCol {
  key: string
  label: string
  count: number
  color: string
}

interface Props {
  columns: KanbanCol[]
}

export default function FlowTab({ columns }: Props) {
  const total = columns.reduce((s, c) => s + c.count, 0)

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
            {columns.find((c) => c.key === '応募完了')?.count ?? 0}
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

      {/* Progress */}
      <div className="progress-wrap">
        <div className="progress-label">
          <span>応募完了率</span>
          <span>
            {columns.find((c) => c.key === '応募完了')?.count ?? 0} / {total} (
            {Math.round(((columns.find((c) => c.key === '応募完了')?.count ?? 0) / total) * 100)}%)
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill grn"
            style={{ width: `${((columns.find((c) => c.key === '応募完了')?.count ?? 0) / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="section-title">選考パイプライン</div>

      <div className="kanban">
        {columns.map((col) => (
          <div className="kanban-col" key={col.key}>
            <div className="kanban-col-header">
              <div className="kanban-col-title" style={{ color: col.color }}>
                {col.label}
              </div>
              <div className="kanban-count">{col.count}</div>
            </div>
            <div className="progress-bar" style={{ marginBottom: 0 }}>
              <div
                className="progress-fill"
                style={{
                  width: `${(col.count / Math.max(...columns.map((c) => c.count))) * 100}%`,
                  background: col.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
