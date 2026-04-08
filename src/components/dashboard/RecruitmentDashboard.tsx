'use client'

import { useState } from 'react'
import {
  APPLICANTS,
  INTERVIEWS,
  ONBOARDING,
  SESSIONS,
  STATUS_DATA,
  YOMI_DATA,
  KANBAN_COLS,
} from '@/data/dashboard-seed'
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

export default function RecruitmentDashboard() {
  const [tab, setTab] = useState<TabKey>('overview')

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

      <main className="db-main">
        {tab === 'overview' && (
          <div className="db-page">
            <OverviewTab
              statusData={STATUS_DATA}
              yomiData={YOMI_DATA}
              applicantCount={APPLICANTS.length}
              interviewCount={INTERVIEWS.length}
              sessionCount={SESSIONS.length}
            />
          </div>
        )}
        {tab === 'applicants' && (
          <div className="db-page">
            <ApplicantsTab applicants={APPLICANTS} />
          </div>
        )}
        {tab === 'interviews' && (
          <div className="db-page">
            <InterviewsTab interviews={INTERVIEWS} />
          </div>
        )}
        {tab === 'flow' && (
          <div className="db-page">
            <FlowTab columns={KANBAN_COLS} />
          </div>
        )}
        {tab === 'onboarding' && (
          <div className="db-page">
            <OnboardingTab records={ONBOARDING} />
          </div>
        )}
        {tab === 'sessions' && (
          <div className="db-page">
            <SessionsTab sessions={SESSIONS} />
          </div>
        )}
      </main>
    </>
  )
}
