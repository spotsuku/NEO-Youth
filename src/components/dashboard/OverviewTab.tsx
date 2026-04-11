'use client'

import { useMemo } from 'react'
import type { YouthCandidate } from '@/types/dashboard'
import type { VerdictRecord } from '@/app/dashboard/page'

interface Props {
  candidates: YouthCandidate[]
  applicantCount: number
  interviewCount: number
  sessionCount: number
  verdictMap: Record<string, VerdictRecord>
}

const STATUS_COLORS: Record<string, string> = {
  '未接触': 'var(--bd)',
  'アプローチ中': 'var(--gold)',
  '説明会参加済': 'var(--blu)',
  '応募完了': 'var(--grn)',
  '書類選考': 'var(--blu)',
  'グループ面接': 'var(--gold)',
  '最終面接': 'var(--red)',
  '参加確定': 'var(--grn)',
  '保留': 'var(--mu)',
  '不合格': 'var(--bd2)',
  '辞退': 'var(--red)',
  '3期生候補': '#7b2d8e',
}

const YOMI_COLORS: Record<string, string> = {
  '承諾書提出': 'var(--grn)',
  '合格': 'var(--grn)',
  '通過予定': 'var(--blu)',
  '補欠合格': 'var(--gold)',
  '応募見込み80%': 'var(--grn)',
  '応募見込み50%': 'var(--blu)',
  '応募見込み20%': 'var(--gold)',
  '応募対象外': 'var(--bd2)',
  '辞退': 'var(--red)',
  '3期生候補': '#7b2d8e',
}

const TIMELINE = [
  { date: '2026-02-01', title: '1次面談開始', sub: 'リファラル・事前ヒアリング', done: true },
  { date: '2026-03-03', title: '説明会開催開始', sub: '対面・オンライン計5回', done: true },
  { date: '2026-03-10', title: '2次応募フォーム受付開始', sub: '対象: 2期生候補', done: true },
  { date: '2026-04-04', title: '最終選考面接', sub: '選考委員による最終面接', upcoming: true },
  { date: '2026-04-15', title: '合否通知・入金案内', sub: '合格者へメール送付' },
  { date: '2026-05-01', title: '事前研修・オンボーディング', sub: '写真撮影・Slack・ポータル' },
]

export default function OverviewTab({ candidates, applicantCount, interviewCount, sessionCount, verdictMap }: Props) {
  const target = 36
  const confirmed = candidates.filter((c) => c.status === '参加確定').length

  // 最終面接結果の集計
  const verdictCounts = useMemo(() => {
    const counts = { pass: 0, border: 0, fail: 0 }
    for (const v of Object.values(verdictMap)) {
      if (v.verdict === '合格') counts.pass++
      else if (v.verdict === 'ボーダー') counts.border++
      else if (v.verdict === '不合格') counts.fail++
    }
    return counts
  }, [verdictMap])

  // ヨミ別集計
  const yomiSummary = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of candidates) {
      if (c.yomi) map[c.yomi] = (map[c.yomi] ?? 0) + 1
    }
    return map
  }, [candidates])

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

  const passCount = candidates.filter((c) => c.ob_pass_criteria).length
  const acceptCount = candidates.filter((c) => c.status === '承諾書提出').length
  const goukakuCount = candidates.filter((c) => c.status === '合格' || c.status === '合格予定').length

  return (
    <>
      {/* 最上段: 参加承諾 / 合格 / 合格基準 */}
      <div className="kpi-row">
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--grn)', background: 'rgba(46,125,82,0.04)' }}>
          <div className="kpi-label">参加承諾</div>
          <div className="kpi-value" style={{ color: 'var(--grn)' }}>{acceptCount}<span> / {target}</span></div>
        </div>
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--grn)' }}>
          <div className="kpi-label">合格</div>
          <div className="kpi-value" style={{ color: 'var(--grn)' }}>{goukakuCount}</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--blu)' }}>
          <div className="kpi-label">合格基準</div>
          <div className="kpi-value" style={{ color: 'var(--blu)' }}>{passCount}</div>
        </div>
      </div>

      {/* ステータス別フロー順 */}
      <div className="kpi-row">
        {[
          { key: '応募完了', color: 'var(--grn)' },
          { key: '書類選考', color: 'var(--blu)' },
          { key: 'グループ面接', color: 'var(--gold)' },
          { key: '最終面接', color: 'var(--red)' },
          { key: '合格', color: 'var(--grn)' },
          { key: '補欠合格', color: 'var(--gold)' },
          { key: '承諾書提出', color: 'var(--grn)' },
        ].map(({ key, color }) => (
          <div className="kpi-card" key={key} style={{ borderLeft: `3px solid ${color}` }}>
            <div className="kpi-label">{key}</div>
            <div className="kpi-value">{candidates.filter((c) => c.status === key).length}<span> 名</span></div>
          </div>
        ))}
      </div>

      {/* 下段: ヨミ（主観） */}
      <div className="kpi-row">
        {[
          { key: '応募見込み80%', color: 'grn' },
          { key: '応募見込み50%', color: 'blu' },
          { key: '応募見込み20%', color: 'gold' },
          { key: '応募対象外', color: 'gray' },
          { key: '3期生候補', color: 'purple' },
        ].map(({ key, color }) => (
          <div className={`kpi-card ${color}`} key={key}>
            <div className="kpi-label">{key}</div>
            <div className="kpi-value">{yomiSummary[key] ?? 0}</div>
          </div>
        ))}
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
