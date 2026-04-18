'use client'

import { useState, useCallback } from 'react'
import type { YouthCandidate, YouthSession } from '@/types/dashboard'
import type { VerdictRecord } from '@/app/dashboard/page'
import { PARTNERSHIPS } from '@/data/dashboard-seed'
import OverviewTab from './OverviewTab'
import ApplicantsTab from './ApplicantsTab'
import InterviewsTab from './InterviewsTab'
import FlowTab from './FlowTab'
import OnboardingTab from './OnboardingTab'
import SessionsTab from './SessionsTab'
import PartnershipsTab from './PartnershipsTab'

const TABS = [
  { key: 'overview', label: '概要' },
  { key: 'applicants', label: '候補者' },
  { key: 'interviews', label: '面談記録' },
  { key: 'flow', label: '選考フロー' },
  { key: 'onboarding', label: 'オンボーディング' },
  { key: 'sessions', label: '説明会' },
  { key: 'partnerships', label: '団体連携' },
] as const

type TabKey = (typeof TABS)[number]['key']

interface Props {
  candidates: YouthCandidate[]
  sessions: YouthSession[]
  verdictMap: Record<string, VerdictRecord>
  dbError: string | null
}

export default function RecruitmentDashboard({ candidates: initial, sessions, verdictMap, dbError }: Props) {
  const [tab, setTab] = useState<TabKey>('overview')
  const [candidates, setCandidates] = useState<YouthCandidate[]>(initial)

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

  const interviewed = candidates.filter((c) => c.interview_date)

  return (
    <>
      <header className="db-header">
        <div className="db-logo">
          NEO ACADEMIA <span>2nd / Dashboard</span>
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

      <main className="db-main">
        {tab === 'overview' && (
          <div className="db-page">
            <OverviewTab
              candidates={candidates}
              applicantCount={candidates.length}
              interviewCount={interviewed.length}
              sessionCount={sessions.length}
              verdictMap={verdictMap}
            />
          </div>
        )}
        {tab === 'applicants' && (
          <div className="db-page">
            <ApplicantsTab candidates={candidates} onUpdate={updateCandidate} onAdd={addCandidate} onDelete={deleteCandidate} verdictMap={verdictMap} />
          </div>
        )}
        {tab === 'interviews' && (
          <div className="db-page">
            <InterviewsTab candidates={interviewed} />
          </div>
        )}
        {tab === 'flow' && (
          <div className="db-page">
            <FlowTab candidates={candidates} onUpdate={updateCandidate} />
          </div>
        )}
        {tab === 'onboarding' && (
          <div className="db-page">
            <OnboardingTab candidates={candidates} onUpdate={updateCandidate} />
          </div>
        )}
        {tab === 'sessions' && (
          <div className="db-page">
            <SessionsTab sessions={sessions} />
          </div>
        )}
        {tab === 'partnerships' && (
          <div className="db-page">
            <PartnershipsTab initial={PARTNERSHIPS} />
          </div>
        )}
      </main>
    </>
  )
}
