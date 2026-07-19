'use client'

import { useState, useCallback } from 'react'
import type { YouthCandidate, YouthSession } from '@/types/dashboard'
import type { VerdictRecord } from '@/app/dashboard/page'
import type { AppUser } from '@/lib/auth'
import OverviewTab from './OverviewTab'
import ApplicantsTab from './ApplicantsTab'
import InterviewsTab from './InterviewsTab'
import FlowTab from './FlowTab'
import OnboardingTab from './OnboardingTab'
import SessionsTab from './SessionsTab'
import PartnershipsTab from './PartnershipsTab'
import AdminTab from './AdminTab'

// adminOnly のタブは管理者のみ表示（面談記録=個人の評価コメントを含むため）
const TABS = [
  { key: 'overview', label: '概要', adminOnly: false },
  { key: 'applicants', label: '候補者', adminOnly: false },
  { key: 'interviews', label: '面談記録', adminOnly: true },
  { key: 'flow', label: '選考フロー', adminOnly: false },
  { key: 'onboarding', label: 'オンボーディング', adminOnly: false },
  { key: 'sessions', label: '説明会', adminOnly: false },
  { key: 'partnerships', label: '団体連携', adminOnly: false },
  { key: 'admin', label: '管理', adminOnly: true },
] as const

type TabKey = (typeof TABS)[number]['key']

interface Props {
  candidates: YouthCandidate[]
  sessions: YouthSession[]
  verdictMap: Record<string, VerdictRecord>
  promotedNames: string[]
  dbError: string | null
  currentUser: AppUser
}

export default function RecruitmentDashboard({ candidates: initial, sessions, verdictMap, promotedNames, dbError, currentUser }: Props) {
  const isAdmin = currentUser.role === 'admin'
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin)
  const [tab, setTab] = useState<TabKey>('overview')

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
    window.location.href = '/login'
  }
  const [candidates, setCandidates] = useState<YouthCandidate[]>(initial)
  const [promoted, setPromoted] = useState<Set<string>>(() => new Set(promotedNames))

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

  const interviewed = candidates.filter((c) => c.interview_date)

  return (
    <>
      <header className="db-header">
        <div className="db-logo">
          NEO ACADEMIA <span>2nd / Dashboard</span>
        </div>
        <nav className="db-nav">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? 'active' : ''}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--mu)', whiteSpace: 'nowrap' }}>
            {currentUser.name ?? currentUser.email}
            <span className={`badge ${isAdmin ? 'red' : 'gray'}`} style={{ marginLeft: '0.35rem' }}>
              {isAdmin ? '管理者' : '一般'}
            </span>
          </span>
          {isAdmin && (
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
          )}
          <button
            onClick={logout}
            style={{
              fontSize: '0.7rem',
              color: 'var(--mu)',
              background: 'none',
              border: '1px solid var(--bd)',
              borderRadius: '4px',
              padding: '0.3rem 0.7rem',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            ログアウト
          </button>
        </div>
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
            <ApplicantsTab
              candidates={candidates}
              onUpdate={updateCandidate}
              onAdd={addCandidate}
              onDelete={deleteCandidate}
              onPromoteFinal={promoteToFinal}
              verdictMap={verdictMap}
              promotedNames={promoted}
              isAdmin={isAdmin}
            />
          </div>
        )}
        {tab === 'interviews' && isAdmin && (
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
            <PartnershipsTab />
          </div>
        )}
        {tab === 'admin' && isAdmin && (
          <div className="db-page">
            <AdminTab currentEmail={currentUser.email} />
          </div>
        )}
      </main>
    </>
  )
}
