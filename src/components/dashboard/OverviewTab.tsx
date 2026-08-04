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
  showArchived: boolean
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

export default function OverviewTab({ candidates, applicantCount, interviewCount, sessionCount, verdictMap, showArchived }: Props) {
  const target = 36
  const confirmed = candidates.filter((c) => c.status === '参加確定').length

  // ステージ到達累積カウント: target以上のステージに到達した候補者数（不合格者は除外）
  const reachedCount = (target: number) =>
    candidates.filter((c) => !c.rejected_at && stageIdx(c.status) >= target).length

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

  // 不合格者は各カウントから除外（最終結果の不合格バーでのみカウント）
  const passCount = candidates.filter((c) => c.ob_pass_criteria && !c.rejected_at).length
  const acceptCount = candidates.filter((c) => c.status === '承諾書提出' && !c.rejected_at).length
  const goukakuCount = candidates.filter((c) => (c.status === '合格' || c.status === '合格予定') && !c.rejected_at).length

  const finalResultRows = [
    { label: '参加承諾', value: acceptCount, target, color: 'var(--grn)' },
    { label: '合格', value: goukakuCount, color: 'var(--grn)' },
    { label: '合格基準', value: passCount, color: 'var(--blu)' },
    { label: '不合格', value: candidates.filter((c) => !!c.rejected_at).length, color: 'var(--red)' },
    { label: '辞退', value: candidates.filter((c) => c.status === '辞退' && !c.rejected_at).length, color: 'var(--gold)' },
  ]
  const finalResultMax = Math.max(...finalResultRows.map((r) => r.value), 1)

  const pipelineRows = [
    { label: '応募前', value: candidates.filter((c) => c.status === '応募前' && !c.rejected_at).length, color: 'var(--bd2)' },
    { label: '応募完了', value: reachedCount(1), color: 'var(--grn)' },
    { label: '書類選考', value: reachedCount(2), color: 'var(--blu)' },
    { label: 'グループ面接', value: reachedCount(3), color: 'var(--gold)' },
    { label: '最終面接', value: reachedCount(4), color: 'var(--red)' },
    { label: '合格予定', value: reachedCount(5), color: 'var(--blu)' },
    { label: '保留', value: candidates.filter((c) => c.status === '保留' && !c.rejected_at).length, color: 'var(--gold)' },
  ]
  const pipelineMax = Math.max(...pipelineRows.map((r) => r.value), 1)

  const yomiRows = [
    { label: '応募見込み80%', value: yomiSummary['応募見込み80%'] ?? 0, color: 'var(--grn)' },
    { label: '応募見込み50%', value: yomiSummary['応募見込み50%'] ?? 0, color: 'var(--blu)' },
    { label: '応募見込み20%', value: yomiSummary['応募見込み20%'] ?? 0, color: 'var(--gold)' },
    { label: '応募対象外', value: yomiSummary['応募対象外'] ?? 0, color: 'var(--bd2)' },
    { label: '3期生候補', value: yomiSummary['3期生候補'] ?? 0, color: 'var(--neo-purple)' },
  ]
  const yomiMax = Math.max(...yomiRows.map((r) => r.value), 1)
  void totalYomi
  void verdictCounts
  void statusData
  void yomiData

  const pct = target > 0 ? Math.round((confirmed / target) * 100) : 0

  return (
    <>
      <div className="hero">
        <div className="hero-body">
          <span className="sticker hero-eyebrow">{showArchived ? 'ARCHIVE' : 'NEXT SEASON'}</span>
          <div className="hero-title display">
            {showArchived ? '2期生 選考サマリー' : '次期選考の準備中です'}
          </div>
          <div className="hero-sub">
            採用充足率 {confirmed} / {target} 名（{pct}%）
          </div>
        </div>
        <div className="hero-panel">
          <div className="stat-label">採用充足率</div>
          <div className="stat-value">{confirmed}<span style={{ fontSize: '0.9rem', color: 'var(--mu)', fontWeight: 600 }}> / {target}名</span></div>
          <div className="xp-track" style={{ marginTop: '0.5rem' }}><div className="xp-fill" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: '1.4rem' }}>
        <div className="card-info">
          <div className="section-label">最終結果</div>
          {finalResultRows.map((r) => (
            <div className="data-bar-row" key={r.label}>
              <div className="data-bar-label">{r.label}</div>
              <div className="data-bar-track">
                <div className="data-bar-fill" style={{ width: `${Math.max((r.value / finalResultMax) * 100, r.value > 0 ? 12 : 0)}%`, background: r.color }}>
                  {r.value > 0 && <span>{r.target !== undefined ? `${r.value} / ${r.target}` : r.value}</span>}
                </div>
                {r.value === 0 && <span className="data-bar-zero">{r.target !== undefined ? `0 / ${r.target}` : '0'}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="card-info">
          <div className="section-label">選考中（累積: 各ステージに到達した人数）</div>
          {pipelineRows.map((r) => (
            <div className="data-bar-row" key={r.label}>
              <div className="data-bar-label">{r.label}</div>
              <div className="data-bar-track">
                <div className="data-bar-fill" style={{ width: `${Math.max((r.value / pipelineMax) * 100, r.value > 0 ? 12 : 0)}%`, background: r.color }}>
                  {r.value > 0 && <span>{r.value}</span>}
                </div>
                {r.value === 0 && <span className="data-bar-zero">0</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="card-info">
          <div className="section-label">応募前（ヨミ）</div>
          {yomiRows.map((r) => (
            <div className="data-bar-row" key={r.label}>
              <div className="data-bar-label">{r.label}</div>
              <div className="data-bar-track">
                <div className="data-bar-fill" style={{ width: `${Math.max((r.value / yomiMax) * 100, r.value > 0 ? 12 : 0)}%`, background: r.color }}>
                  {r.value > 0 && <span>{r.value}</span>}
                </div>
                {r.value === 0 && <span className="data-bar-zero">0</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card-info">
          <div className="section-label">選考タイムライン</div>
          {showArchived ? (
            <div className="timeline">
              {TIMELINE.map((item, i) => (
                <div className="tl-item" key={i}>
                  <div className={`tl-dot ${item.done ? 'done' : item.upcoming ? 'upcoming' : ''}`} />
                  <div>
                    <div className="tl-date">{item.date}</div>
                    <div className="tl-title">{item.title}</div>
                    <div className="tl-sub">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">次期選考のタイムラインは未定です。</div>
          )}
        </div>

        <div className="card-info">
          <div className="section-label">現在の課題</div>
          {showArchived ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div className="card-state sun">
                <div style={{ fontWeight: 800, fontSize: '0.8rem', marginBottom: '0.2rem' }}>面接日程の調整が必要</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ink2)' }}>
                  候補者で面接日程が未確定のケースあり。4/4(土)の面接枠を追加検討中。
                </div>
              </div>
              <div className="card-state danger">
                <div style={{ fontWeight: 800, fontSize: '0.8rem', marginBottom: '0.2rem' }}>応募目標未達</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ink2)' }}>
                  目標{target}名に対し確定{confirmed}名。残り{target - confirmed}名の選考を加速する必要あり。
                </div>
              </div>
              <div className="card-state sky">
                <div style={{ fontWeight: 800, fontSize: '0.8rem', marginBottom: '0.2rem' }}>リファラル経路の強化</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ink2)' }}>
                  1期生からの紹介が有効。追加の紹介依頼を検討中。
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">次期選考の課題はまだありません。</div>
          )}
        </div>
      </div>
    </>
  )
}
