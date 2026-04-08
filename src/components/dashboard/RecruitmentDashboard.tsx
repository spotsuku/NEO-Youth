'use client'

import { useState } from 'react'
import type { YouthCandidate, YouthSession } from '@/types/dashboard'
import OverviewTab from './OverviewTab'
import ApplicantsTab from './ApplicantsTab'
import InterviewsTab from './InterviewsTab'
import FlowTab from './FlowTab'
import OnboardingTab from './OnboardingTab'
import SessionsTab from './SessionsTab'

const TABS = [
  { key: 'overview', label: '概要' },
  { key: 'applicants', label: '応募者' },
  { key: 'interviews', label: '面談記録' },
  { key: 'flow', label: '選考フロー' },
  { key: 'onboarding', label: 'オンボーディング' },
  { key: 'sessions', label: '説明会' },
] as const

type TabKey = (typeof TABS)[number]['key']

interface Props {
  candidates: YouthCandidate[]
  sessions: YouthSession[]
  dbError: string | null
}

export default function RecruitmentDashboard({ candidates, sessions, dbError }: Props) {
  const [tab, setTab] = useState<TabKey>('overview')

  // 応募完了者（応募フォーム経由）
  const applicants = candidates.filter((c) => c.applied_at)
  // 面談実施者
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
          DB接続エラー: {dbError}（シードデータなし）
        </div>
      )}

      <main className="db-main">
        {tab === 'overview' && (
          <div className="db-page">
            <OverviewTab
              candidates={candidates}
              applicantCount={applicants.length}
              interviewCount={interviewed.length}
              sessionCount={sessions.length}
            />
          </div>
        )}
        {tab === 'applicants' && (
          <div className="db-page">
            <ApplicantsTab applicants={applicants} />
          </div>
        )}
        {tab === 'interviews' && (
          <div className="db-page">
            <InterviewsTab candidates={interviewed} />
          </div>
        )}
        {tab === 'flow' && (
          <div className="db-page">
            <FlowTab candidates={candidates} />
          </div>
        )}
        {tab === 'onboarding' && (
          <div className="db-page">
            <OnboardingTab candidates={candidates} />
          </div>
        )}
        {tab === 'sessions' && (
          <div className="db-page">
            <SessionsTab sessions={sessions} />
          </div>
        )}
      </main>
    </>
  )
}
