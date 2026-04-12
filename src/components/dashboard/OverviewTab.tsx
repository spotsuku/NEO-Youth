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

// 選考フローの順序: 応募前(0) → 応募完了(1) → 書類選考(2) → グループ面接(3) → 最終面接(4) → 合格予定(5) → 合格/補欠合格(6) → 承諾書提出(7)
// 保留/辞退 は分岐状態。最低でも「応募完了」まで到達したとみなす（stageIdx=1）
const STAGE_INDEX: Record<string, number> = {
  '応募前': 0,
  '応募完了': 1,
  '書類選考': 2,
  'グループ面接': 3,
  '最終面接': 4,
  '合格予定': 5,
  '合格': 6,
  '補欠合格': 6,
  '承諾書提出': 7,
  '保留': 1,
  '辞退': 1,
}

const stageIdx = (status: string | null | undefined): number =>
  status && status in STAGE_INDEX ? STAGE_INDEX[status] : -1

export default function OverviewTab({ candidates, applicantCount, interviewCount, sessionCount, verdictMap }: Props) {
  const target = 36
  const confirmed = candidates.filter((c) => c.status === '参加確定').length

  // ステージ到達累積カウント: target以上のステージに到達した候補者数
  const reachedCount = (target: number) =>
    candidates.filter((c) => stageIdx(c.status) >= target).length

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
      {/* サマリーテーブル（3列横並び・バー形式） */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-title">最終結果</div>
          <div className="summary-bars">
            {[
              { label: '参加承諾', value: acceptCount, target, color: 'var(--grn)' },
              { label: '合格', value: goukakuCount, color: 'var(--grn)' },
              { label: '合格基準', value: passCount, color: 'var(--blu)' },
              { label: '不合格', value: candidates.filter((c) => !!c.rejected_at).length, color: 'var(--bd2)' },
              { label: '辞退', value: candidates.filter((c) => c.status === '辞退').length, color: 'var(--red)' },
            ].map((r) => {
              const max = Math.max(acceptCount, goukakuCount, passCount, candidates.filter((c) => !!c.rejected_at).length, candidates.filter((c) => c.status === '辞退').length, 1)
              return (
                <div className="summary-bar-item" key={r.label}>
                  <div className="summary-bar-label">{r.label}</div>
                  <div className="summary-bar-track">
                    <div
                      className="summary-bar-fill"
                      style={{
                        width: `${Math.max((r.value / max) * 100, r.value > 0 ? 12 : 0)}%`,
                        background: r.color,
                      }}
                    >
                      {r.target !== undefined ? <span>{r.value} / {r.target}</span> : r.value > 0 && <span>{r.value}</span>}
                    </div>
                    {r.value === 0 && <span className="summary-bar-zero">{r.target !== undefined ? `0 / ${r.target}` : '0'}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-title">選考中（累積: 各ステージに到達した人数）</div>
          <div className="summary-bars">
            {[
              { label: '応募前', value: candidates.filter((c) => c.status === '応募前').length, color: 'var(--bd2)' },
              { label: '応募完了', value: reachedCount(1), color: 'var(--grn)' },
              { label: '書類選考', value: reachedCount(2), color: 'var(--blu)' },
              { label: 'グループ面接', value: reachedCount(3), color: 'var(--gold)' },
              { label: '最終面接', value: reachedCount(4), color: 'var(--red)' },
              { label: '合格予定', value: reachedCount(5), color: 'var(--blu)' },
              { label: '保留', value: candidates.filter((c) => c.status === '保留').length, color: 'var(--gold)' },
            ].map((r) => {
              const max = Math.max(
                candidates.filter((c) => c.status === '応募前').length,
                reachedCount(1),
                reachedCount(2),
                reachedCount(3),
                reachedCount(4),
                reachedCount(5),
                candidates.filter((c) => c.status === '保留').length,
                1
              )
              return (
                <div className="summary-bar-item" key={r.label}>
                  <div className="summary-bar-label">{r.label}</div>
                  <div className="summary-bar-track">
                    <div
                      className="summary-bar-fill"
                      style={{
                        width: `${Math.max((r.value / max) * 100, r.value > 0 ? 12 : 0)}%`,
                        background: r.color,
                      }}
                    >
                      {r.value > 0 && <span>{r.value}</span>}
                    </div>
                    {r.value === 0 && <span className="summary-bar-zero">0</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-title">応募前（ヨミ）</div>
          <div className="summary-bars">
            {[
              { label: '応募見込み80%', value: yomiSummary['応募見込み80%'] ?? 0, color: 'var(--grn)' },
              { label: '応募見込み50%', value: yomiSummary['応募見込み50%'] ?? 0, color: 'var(--blu)' },
              { label: '応募見込み20%', value: yomiSummary['応募見込み20%'] ?? 0, color: 'var(--gold)' },
              { label: '応募対象外', value: yomiSummary['応募対象外'] ?? 0, color: 'var(--bd2)' },
              { label: '3期生候補', value: yomiSummary['3期生候補'] ?? 0, color: '#7b2d8e' },
            ].map((r) => {
              const max = Math.max(
                yomiSummary['応募見込み80%'] ?? 0,
                yomiSummary['応募見込み50%'] ?? 0,
                yomiSummary['応募見込み20%'] ?? 0,
                yomiSummary['応募対象外'] ?? 0,
                yomiSummary['3期生候補'] ?? 0,
                1
              )
              return (
                <div className="summary-bar-item" key={r.label}>
                  <div className="summary-bar-label">{r.label}</div>
                  <div className="summary-bar-track">
                    <div
                      className="summary-bar-fill"
                      style={{
                        width: `${Math.max((r.value / max) * 100, r.value > 0 ? 12 : 0)}%`,
                        background: r.color,
                      }}
                    >
                      {r.value > 0 && <span>{r.value}</span>}
                    </div>
                    {r.value === 0 && <span className="summary-bar-zero">0</span>}
                  </div>
                </div>
              )
            })}
          </div>
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
