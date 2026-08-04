'use client'

import { useState, useCallback, useMemo } from 'react'
import type { YouthCandidate, YouthSession } from '@/types/dashboard'
import type { VerdictRecord } from '@/app/dashboard/page'
import OverviewTab from './OverviewTab'
import ApplicantsTab from './ApplicantsTab'
import InterviewsTab from './InterviewsTab'
import FlowTab from './FlowTab'
import OnboardingTab from './OnboardingTab'
import SessionsTab from './SessionsTab'
import PartnershipsTab from './PartnershipsTab'
import ApproachTab from './ApproachTab'
import Modal from './Modal'

const TABS = [
  { key: 'overview', label: '概要', icon: '🏠' },
  { key: 'applicants', label: '候補者', icon: '👥' },
  { key: 'interviews', label: '面談記録', icon: '🗣️' },
  { key: 'flow', label: '選考フロー', icon: '🧭' },
  { key: 'onboarding', label: 'オンボーディング', icon: '✅' },
  { key: 'sessions', label: '説明会', icon: '📅' },
  { key: 'approach', label: 'アプローチ', icon: '🎯' },
  { key: 'partnerships', label: '学校連携', icon: '🤝' },
] as const

type TabKey = (typeof TABS)[number]['key']

// サイドバーの表示構造: 概要 → 募集活動（アプローチ/説明会/学校連携） →
// 候補者 → 選考フロー → 面談（面談記録/面談シート） → オンボーディング
type NavEntry =
  | { type: 'tab'; key: TabKey }
  | { type: 'link'; href: string; label: string; icon: string }
  | { type: 'group'; label: string; items: NavEntry[] }

const SIDEBAR_NAV: NavEntry[] = [
  { type: 'tab', key: 'overview' },
  {
    type: 'group',
    label: '募集活動',
    items: [
      { type: 'tab', key: 'approach' },
      { type: 'tab', key: 'sessions' },
      { type: 'tab', key: 'partnerships' },
    ],
  },
  { type: 'tab', key: 'applicants' },
  { type: 'tab', key: 'flow' },
  {
    type: 'group',
    label: '面談',
    items: [
      { type: 'tab', key: 'interviews' },
      { type: 'link', href: '/', label: '面談シート', icon: '📝' },
    ],
  },
  { type: 'tab', key: 'onboarding' },
]

interface Props {
  candidates: YouthCandidate[]
  sessions: YouthSession[]
  verdictMap: Record<string, VerdictRecord>
  promotedNames: string[]
  dbError: string | null
}

export default function RecruitmentDashboard({ candidates: initial, sessions, verdictMap, promotedNames, dbError }: Props) {
  const [tab, setTab] = useState<TabKey>('overview')
  const [candidates, setCandidates] = useState<YouthCandidate[]>(initial)
  const [promoted, setPromoted] = useState<Set<string>>(() => new Set(promotedNames))
  const [showArchived, setShowArchived] = useState(false)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)

  // 選考パイプライン系タブ（概要／候補者／面談記録／選考フロー／オンボーディング／説明会）のみ
  // アーカイブ切替の対象。アプローチ・学校連携は常に全候補者を見る。
  const selectionCandidates = useMemo(
    () => (showArchived ? candidates : candidates.filter((c) => !c.selection_archived_at)),
    [candidates, showArchived],
  )
  const archivedCount = useMemo(
    () => candidates.filter((c) => c.selection_archived_at).length,
    [candidates],
  )

  const archiveSelection = useCallback(async () => {
    setArchiving(true)
    try {
      const res = await fetch('/api/youth/candidates/bulk-archive', { method: 'POST' })
      if (!res.ok) {
        console.error('[archiveSelection] error:', await res.json().catch(() => ({})))
        return
      }
      const { names } = await res.json()
      const archivedAt = new Date().toISOString()
      setCandidates((prev) =>
        prev.map((c) => (names?.includes(c.name) ? { ...c, selection_archived_at: archivedAt } : c)),
      )
      setArchiveModalOpen(false)
    } finally {
      setArchiving(false)
    }
  }, [])

  const promoteToFinal = useCallback(async (name: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/youth/candidates/${encodeURIComponent(name)}/promote-final`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('[promoteToFinal] error:', err)
        return false
      }
      setPromoted((prev) => {
        const next = new Set(prev)
        next.add(name)
        return next
      })
      return true
    } catch (e) {
      console.error('[promoteToFinal] network error:', e)
      return false
    }
  }, [])

  const updateCandidate = useCallback(async (name: string, patch: Partial<YouthCandidate>) => {
    // 元の値をスナップショット（ロールバック用）
    let snapshot: YouthCandidate | null = null
    setCandidates((prev) => {
      const found = prev.find((c) => c.name === name)
      if (found) snapshot = { ...found }
      return prev.map((c) => (c.name === name ? { ...c, ...patch } : c))
    })
    try {
      const res = await fetch(`/api/youth/candidates/${encodeURIComponent(name)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'PATCH 失敗' }))
        console.error('[updateCandidate] PATCH error:', {
          status: res.status,
          name,
          patch,
          message: err?.error,
          code: err?.code,
          details: err?.details,
          hint: err?.hint,
          payload: err?.payload,
        })
        // ロールバック
        if (snapshot) {
          const snap = snapshot
          setCandidates((prev) => prev.map((c) => (c.name === name ? snap : c)))
        }
        return
      }
      // サーバーから返ってきた最新値で上書き（DB側で変換された値があれば反映）
      const updated = await res.json().catch(() => null)
      if (updated && updated.id) {
        setCandidates((prev) => prev.map((c) => (c.name === name ? updated : c)))
      }
    } catch (e) {
      console.error('[updateCandidate] network error:', e)
      if (snapshot) {
        const snap = snapshot
        setCandidates((prev) => prev.map((c) => (c.name === name ? snap : c)))
      }
    }
  }, [])

  const addCandidate = useCallback(async (data: Partial<YouthCandidate>): Promise<boolean> => {
    try {
      const res = await fetch('/api/youth/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) return false
      const created = await res.json()
      if (created.id) {
        setCandidates((prev) => [...prev, created])
      }
      return true
    } catch {
      return false
    }
  }, [])

  const deleteCandidate = useCallback(async (name: string) => {
    setCandidates((prev) => prev.filter((c) => c.name !== name))
    try {
      await fetch(`/api/youth/candidates/${encodeURIComponent(name)}`, { method: 'DELETE' })
    } catch {}
  }, [])

  const interviewed = selectionCandidates.filter((c) => c.interview_date)
  const showArchiveToolbar = tab !== 'approach' && tab !== 'partnerships'

  const renderNavEntry = (entry: NavEntry, sub = false) => {
    if (entry.type === 'tab') {
      const t = TABS.find((x) => x.key === entry.key)!
      return (
        <button
          key={t.key}
          className={`shell-nav-item ${sub ? 'shell-nav-subitem' : ''} ${tab === t.key ? 'active' : ''}`}
          onClick={() => setTab(t.key)}
        >
          <span className="shell-nav-icon">{t.icon}</span>
          {t.label}
        </button>
      )
    }
    if (entry.type === 'link') {
      return (
        <a key={entry.href} className={`shell-nav-item ${sub ? 'shell-nav-subitem' : ''}`} href={entry.href}>
          <span className="shell-nav-icon">{entry.icon}</span>
          {entry.label}
        </a>
      )
    }
    return (
      <div key={entry.label}>
        <div className="shell-nav-group-label">{entry.label}</div>
        {entry.items.map((item) => renderNavEntry(item, true))}
      </div>
    )
  }

  return (
    <div className="shell">
      <aside className="shell-sidebar">
        <div className="shell-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/neo-academia-logo.png" alt="NEO ACADEMIA" className="shell-logo-img" />
          <span className="shell-logo-text">2nd<br />Dashboard</span>
        </div>
        <nav className="shell-nav">
          {SIDEBAR_NAV.map((entry) => renderNavEntry(entry))}
        </nav>
      </aside>

      <nav className="shell-bottomnav">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`shell-bottomnav-item ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="shell-main">
        <main className="shell-page">
          {dbError && (
            <div className="card-state danger" style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
              DB接続エラー: {dbError}
            </div>
          )}

          {showArchiveToolbar && (
            <div className="toolbar">
              <label className="toolbar-toggle">
                <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                過去の選考データを表示{archivedCount > 0 ? `（${archivedCount}件）` : ''}
              </label>
              {archivedCount === 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setArchiveModalOpen(true)}
                  style={{ marginLeft: 'auto' }}
                >
                  今年度の選考をアーカイブする
                </button>
              )}
            </div>
          )}

          <Modal open={archiveModalOpen} onClose={() => setArchiveModalOpen(false)} title="選考をアーカイブしますか？">
            <p style={{ fontSize: '0.85rem', color: 'var(--mu)', marginBottom: '1rem', lineHeight: 1.7 }}>
              現在の候補者{candidates.filter((c) => !c.deleted_at && !c.selection_archived_at).length}名の選考データを
              アーカイブします。データは削除されず、「過去の選考データを表示」で後からいつでも確認できます。
              アプローチ管理・学校連携のデータは影響を受けません。
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setArchiveModalOpen(false)} disabled={archiving}>
                キャンセル
              </button>
              <button className="btn btn-primary" onClick={archiveSelection} disabled={archiving}>
                {archiving ? 'アーカイブ中...' : 'アーカイブする'}
              </button>
            </div>
          </Modal>

          {tab === 'overview' && (
            <OverviewTab
              candidates={selectionCandidates}
              applicantCount={selectionCandidates.length}
              interviewCount={interviewed.length}
              sessionCount={sessions.length}
              verdictMap={verdictMap}
              showArchived={showArchived}
            />
          )}
          {tab === 'applicants' && (
            <ApplicantsTab
              candidates={selectionCandidates}
              onUpdate={updateCandidate}
              onAdd={addCandidate}
              onDelete={deleteCandidate}
              onPromoteFinal={promoteToFinal}
              verdictMap={verdictMap}
              promotedNames={promoted}
            />
          )}
          {tab === 'interviews' && <InterviewsTab candidates={interviewed} />}
          {tab === 'flow' && <FlowTab candidates={selectionCandidates} onUpdate={updateCandidate} />}
          {tab === 'onboarding' && <OnboardingTab candidates={selectionCandidates} onUpdate={updateCandidate} />}
          {tab === 'sessions' && <SessionsTab sessions={sessions} />}
          {tab === 'approach' && <ApproachTab candidates={candidates} onUpdate={updateCandidate} />}
          {tab === 'partnerships' && <PartnershipsTab />}
        </main>
      </div>
    </div>
  )
}
