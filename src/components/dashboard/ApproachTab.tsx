'use client'

import { useState } from 'react'
import type { YouthCandidate } from '@/types/dashboard'
import ApproachDashboardTab from './ApproachDashboardTab'
import ApproachListTab from './ApproachListTab'

interface Props {
  candidates: YouthCandidate[]
  onUpdate: (name: string, patch: Partial<YouthCandidate> & { changed_by?: string }) => Promise<void>
}

export default function ApproachTab({ candidates, onUpdate }: Props) {
  const [subView, setSubView] = useState<'dashboard' | 'list'>('dashboard')
  const [drillStep, setDrillStep] = useState<string | null>(null)

  const drillTo = (step: string) => {
    setDrillStep(step)
    setSubView('list')
  }

  return (
    <>
      <div className="search-row" style={{ gap: '0.35rem' }}>
        <button className={`filter-btn ${subView === 'dashboard' ? 'active' : ''}`} onClick={() => setSubView('dashboard')}>
          ダッシュボード
        </button>
        <button className={`filter-btn ${subView === 'list' ? 'active' : ''}`} onClick={() => setSubView('list')}>
          リスト
        </button>
      </div>

      {subView === 'dashboard' ? (
        <ApproachDashboardTab candidates={candidates} onDrill={drillTo} />
      ) : (
        <ApproachListTab candidates={candidates} onUpdate={onUpdate} initialStepFilter={drillStep} />
      )}
    </>
  )
}
