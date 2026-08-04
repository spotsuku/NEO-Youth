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
  { key: 'overview', label: '概要' },
  { key: 'applicants', label: '候補者' },
  { key: 'interviews', label: '面談記録' },
  { key: 'flow', label: '選考フロー' },
  { key: 'onboarding', label: 'オンボーディング' },
  { key: 'sessions', label: '説明会' },
  { key: 'approach', label: 'アプローチ' },
  { key: 'partnerships', label: '学校連携' },
] as const

type TabKey = (typeof TABS)[number]['key']

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

  return (
    <>
      <header className="db-header">
        <div className="db-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/neo-academia-logo.png" alt="NEO ACADEMIA" className="db-logo-img" />
          <span>2nd / Dashboard</span>
        </div>
        <nav className="db-nav">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? 'active' : ''}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <a
          href="/"
          style={{
            fontSize: '0.7rem',
            color: 'var(--mu)',
            textDecoration: 'none',
            border: '1px solid var(--bd)',
            borderRadius: '4px',
            padding: '0.3rem 0.7rem',
            whiteSpace: 'nowrap',
            transition: 'all 0.12s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--red)'
            e.currentTarget.style.color = 'var(--red)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--bd)'
            e.currentTarget.style.color = 'var(--mu)'
          }}
        >
          面接シート
        </a>
      </header>

      {dbError && (
        <div style={{ padding: '0.8rem 2rem', fontSize: '0.78rem', color: 'var(--gold)', background: 'rgba(196,136,42,0.06)', borderBottom: '1px solid rgba(196,136,42,0.18)' }}>
          DB接続エラー: {dbError}
        </div>
      )}

      {tab !== 'approach' && tab !== 'partnerships' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.6rem 2rem', borderBottom: '1px solid var(--bd)', fontSize: '0.75rem', color: 'var(--mu)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            過去の選考データを表示{archivedCount > 0 ? `（${archivedCount}件）` : ''}
          </label>
          {archivedCount === 0 && (
            <button
              className="filter-btn"
              onClick={() => setArchiveModalOpen(true)}
              style={{ marginLeft: 'auto' }}
            >
              今年度の選考をアーカイブする
            </button>
          )}
        </div>
      )}

      <Modal open={archiveModalOpen} onClose={() => setArchiveModalOpen(false)} title="選考をアーカイブしますか？">
        <p style={{ fontSize: '0.85rem', color: 'var(--mu)', marginBottom: '1rem' }}>
          現在の候補者{candidates.filter((c) => !c.deleted_at && !c.selection_archived_at).length}名の選考データを
          アーカイブします。データは削除されず、「過去の選考データを表示」で後からいつでも確認できます。
          アプローチ管理・学校連携のデータは影響を受けません。
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button className="filter-btn" onClick={() => setArchiveModalOpen(false)} disabled={archiving}>
            キャンセル
          </button>
          <button className="iv-save-btn" onClick={archiveSelection} disabled={archiving}>
            {archiving ? 'アーカイブ中...' : 'アーカイブする'}
          </button>
        </div>
      </Modal>

      <main className="db-main">
        {tab === 'overview' && (
          <div className="db-page">
            <OverviewTab
              candidates={selectionCandidates}
              applicantCount={selectionCandidates.length}
              interviewCount={interviewed.length}
              sessionCount={sessions.length}
              verdictMap={verdictMap}
              showArchived={showArchived}
            />
          </div>
        )}
        {tab === 'applicants' && (
          <div className="db-page">
            <ApplicantsTab
              candidates={selectionCandidates}
              onUpdate={updateCandidate}
              onAdd={addCandidate}
              onDelete={deleteCandidate}
              onPromoteFinal={promoteToFinal}
              verdictMap={verdictMap}
              promotedNames={promoted}
            />
          </div>
        )}
        {tab === 'interviews' && (
          <div className="db-page">
            <InterviewsTab candidates={interviewed} />
          </div>
        )}
        {tab === 'flow' && (
          <div className="db-page">
            <FlowTab candidates={selectionCandidates} onUpdate={updateCandidate} />
          </div>
        )}
        {tab === 'onboarding' && (
          <div className="db-page">
            <OnboardingTab candidates={selectionCandidates} onUpdate={updateCandidate} />
          </div>
        )}
        {tab === 'sessions' && (
          <div className="db-page">
            <SessionsTab sessions={sessions} />
          </div>
        )}
        {tab === 'approach' && (
          <div className="db-page">
            <ApproachTab candidates={candidates} onUpdate={updateCandidate} />
          </div>
        )}
        {tab === 'partnerships' && (
          <div className="db-page">
            <PartnershipsTab />
          </div>
        )}
      </main>
    </>
  )
}
