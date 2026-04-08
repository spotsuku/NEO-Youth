'use client'

import { useMemo } from 'react'
import type { YouthCandidate } from '@/types/dashboard'

interface Props {
  candidates: YouthCandidate[]
  applicantCount: number
  interviewCount: number
  sessionCount: number
}

const STATUS_COLORS: Record<string, string> = {
  '応募完了': 'var(--grn)',
  '説明会参加済': 'var(--blu)',
  'アプローチ中': 'var(--gold)',
  '特別選考付与': 'var(--grn)',
  '参加確定': 'var(--grn)',
  '3期生候補': '#7b2d8e',
  '対応不要': 'var(--bd2)',
  '未接触': 'var(--bd)',
}

const YOMI_COLORS: Record<string, string> = {
  SS: 'var(--grn)',
  S: 'var(--blu)',
  AA: 'var(--gold)',
  A: 'var(--mu)',
}

const TIMELINE = [
  { date: '2026-02-01', title: '1次面談開始', sub: 'リファラル・事前ヒアリング', done: true },
  { date: '2026-03-03', title: '説明会開催開始', sub: '対面・オンライン計5回', done: true },
  { date: '2026-03-10', title: '2次応募フォーム受付開始', sub: '対象: 2期生候補', done: true },
  { date: '2026-04-04', title: '最終選考面接', sub: '選考委員による最終面接', upcoming: true },
  { date: '2026-04-15', title: '合否通知・入金案内', sub: '合格者へメール送付' },
  { date: '2026-05-01', title: '事前研修・オンボーディング', sub: '写真撮影・Slack・ポータル' },
]

export default function OverviewTab({ candidates, applicantCount, interviewCount, sessionCount }: Props) {
  const target = 20
  const confirmed = candidates.filter((c) => c.status === '参加確定').length

  // ステータス集計
  const statusData = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of candidates) {
      map.set(c.status, (map.get(c.status) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([status, count]) => ({
      status,
      count,
      color: STATUS_COLORS[status] ?? 'var(--mu)',
    }))
  }, [candidates])

  // ヨミ集計
  const yomiData = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of candidates) {
      if (c.yomi) map.set(c.yomi, (map.get(c.yomi) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([yomi, count]) => ({
      yomi,
      count,
      color: YOMI_COLORS[yomi] ?? 'var(--mu)',
    }))
  }, [candidates])

  const totalYomi = yomiData.reduce((s, d) => s + d.count, 0)

  return (
    <>
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
            {candidates.length}
            <span> 名</span>
          </div>
          <div className="kpi-sub">全ステータス合計</div>
        </div>
      </div>

      <div className="progress-wrap">
        <div className="progress-label">
          <span>採用充足率</span>
          <span>
            {confirmed} / {target} ({target > 0 ? Math.round((confirmed / target) * 100) : 0}%)
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill grn" style={{ width: `${target > 0 ? (confirmed / target) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card-title">ステータス分布</div>
          <div className="funnel">
            {statusData.map((d) => {
              const max = Math.max(...statusData.map((x) => x.count), 1)
              return (
                <div className="funnel-item" key={d.status}>
                  <div className="funnel-label">{d.status}</div>
                  <div
                    className="funnel-bar"
                    style={{
                      width: `${Math.max((d.count / max) * 100, 12)}%`,
                      background: d.color,
                    }}
                  >
                    {d.count}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-title">ヨミ分布</div>
          {yomiData.length > 0 ? (
            <div className="chart-bars">
              {yomiData.map((d) => (
                <div className="chart-bar-item" key={d.yomi}>
                  <div className="chart-bar-label">{d.yomi}</div>
                  <div className="chart-bar-track">
                    <div
                      className="chart-bar-fill"
                      style={{
                        width: `${totalYomi > 0 ? (d.count / totalYomi) * 100 : 0}%`,
                        background: d.color,
                      }}
                    >
                      <span>{d.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.78rem', color: 'var(--mu)', padding: '1rem 0' }}>
              ヨミデータなし
            </div>
          )}
        </div>
      </div>

      <div className="grid2">
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

        <div className="card">
          <div className="card-title">現在の課題</div>
          <div className="issue-card warn">
            <div className="issue-title">面接日程の調整が必要</div>
            <div className="issue-desc">
              候補者で面接日程が未確定のケースあり。4/4(土)の面接枠を追加検討中。
            </div>
          </div>
          <div className="issue-card danger">
            <div className="issue-title">応募目標未達</div>
            <div className="issue-desc">
              目標{target}名に対し確定{confirmed}名。残り{target - confirmed}名の選考を加速する必要あり。
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
