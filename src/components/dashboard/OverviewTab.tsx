'use client'

import type { StatusData, YomiData } from '@/types/dashboard'

interface Props {
  statusData: StatusData[]
  yomiData: YomiData[]
  applicantCount: number
  interviewCount: number
  sessionCount: number
}

const TIMELINE = [
  { date: '2026-02-01', title: '1次面談開始', sub: 'リファラル・事前ヒアリング', done: true },
  { date: '2026-03-03', title: '説明会開催開始', sub: '対面・オンライン計5回', done: true },
  { date: '2026-03-10', title: '2次応募フォーム受付開始', sub: '対象: 2期生候補', done: true },
  { date: '2026-04-04', title: '最終選考面接', sub: '選考委員による最終面接', upcoming: true },
  { date: '2026-04-15', title: '合否通知・入金案内', sub: '合格者へメール送付', upcoming: false },
  { date: '2026-05-01', title: '事前研修・オンボーディング', sub: '写真撮影・Slack・ポータル', upcoming: false },
]

export default function OverviewTab({ statusData, yomiData, applicantCount, interviewCount, sessionCount }: Props) {
  const totalStatus = statusData.reduce((s, d) => s + d.count, 0)
  const totalYomi = yomiData.reduce((s, d) => s + d.count, 0)
  const target = 20
  const confirmed = 3

  return (
    <>
      {/* KPI Row */}
      <div className="kpi-row">
        <div className="kpi-card red">
          <div className="kpi-label">応募者数</div>
          <div className="kpi-value">
            {applicantCount}
            <span> 名</span>
          </div>
          <div className="kpi-sub">フォーム経由</div>
        </div>
        <div className="kpi-card gold">
          <div className="kpi-label">面談実施数</div>
          <div className="kpi-value">
            {interviewCount}
            <span> 件</span>
          </div>
          <div className="kpi-sub">1次ヒアリング</div>
        </div>
        <div className="kpi-card grn">
          <div className="kpi-label">参加確定</div>
          <div className="kpi-value">
            {confirmed}
            <span> / {target}</span>
          </div>
          <div className="kpi-sub">目標 {target} 名</div>
        </div>
        <div className="kpi-card blu">
          <div className="kpi-label">説明会参加</div>
          <div className="kpi-value">
            {sessionCount}
            <span> 名</span>
          </div>
          <div className="kpi-sub">計5回開催</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">コンタクト総数</div>
          <div className="kpi-value">
            {totalStatus}
            <span> 名</span>
          </div>
          <div className="kpi-sub">全ステータス合計</div>
        </div>
      </div>

      {/* Progress */}
      <div className="progress-wrap">
        <div className="progress-label">
          <span>採用充足率</span>
          <span>
            {confirmed} / {target} ({Math.round((confirmed / target) * 100)}%)
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill grn" style={{ width: `${(confirmed / target) * 100}%` }} />
        </div>
      </div>

      <div className="grid2">
        {/* Status Funnel */}
        <div className="card">
          <div className="card-title">ステータス分布</div>
          <div className="funnel">
            {statusData.map((d) => (
              <div className="funnel-item" key={d.status}>
                <div className="funnel-label">{d.status}</div>
                <div
                  className="funnel-bar"
                  style={{
                    width: `${Math.max((d.count / Math.max(...statusData.map((x) => x.count))) * 100, 12)}%`,
                    background: d.color,
                  }}
                >
                  {d.count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Yomi Distribution */}
        <div className="card">
          <div className="card-title">ヨミ分布</div>
          <div className="chart-bars">
            {yomiData.map((d) => (
              <div className="chart-bar-item" key={d.yomi}>
                <div className="chart-bar-label">{d.yomi}</div>
                <div className="chart-bar-track">
                  <div
                    className="chart-bar-fill"
                    style={{
                      width: `${(d.count / totalYomi) * 100}%`,
                      background: d.color,
                    }}
                  >
                    <span>{d.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid2">
        {/* Timeline */}
        <div className="card">
          <div className="card-title">選考タイムライン</div>
          <div className="timeline">
            {TIMELINE.map((item, i) => (
              <div className="tl-item" key={i}>
                <div className={`tl-dot ${item.done ? 'done' : item.upcoming ? 'upcoming' : ''}`} />
                <div className="tl-content">
                  <div className="tl-date">{item.date}</div>
                  <div className="tl-title">{item.title}</div>
                  <div className="tl-sub">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Issues */}
        <div className="card">
          <div className="card-title">現在の課題</div>
          <div className="issue-card warn">
            <div className="issue-title">面接日程の調整が必要</div>
            <div className="issue-desc">
              3名の候補者で面接日程が未確定。4/4(土)の面接枠を追加検討中。
            </div>
          </div>
          <div className="issue-card danger">
            <div className="issue-title">応募目標未達</div>
            <div className="issue-desc">
              目標20名に対し確定3名。残り17名の選考を加速する必要あり。
            </div>
          </div>
          <div className="issue-card info">
            <div className="issue-title">リファラル経路の強化</div>
            <div className="issue-desc">
              1期生からの紹介が有効。追加の紹介依頼を検討中。
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
