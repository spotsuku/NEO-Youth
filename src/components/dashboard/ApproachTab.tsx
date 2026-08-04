'use client'

import { useState } from 'react'
import type { YouthCandidate } from '@/types/dashboard'
import ApproachDashboardTab from './ApproachDashboardTab'
import ApproachListTab from './ApproachListTab'
import OptionsAdminPanel from './OptionsAdminPanel'
import Modal from './Modal'

interface Props {
  candidates: YouthCandidate[]
  onUpdate: (name: string, patch: Partial<YouthCandidate> & { changed_by?: string }) => Promise<void>
}

export default function ApproachTab({ candidates, onUpdate }: Props) {
  const [subView, setSubView] = useState<'dashboard' | 'list'>('dashboard')
  const [drillStep, setDrillStep] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)

  const drillTo = (step: string) => {
    setDrillStep(step)
    setSubView('list')
  }

  return (
    <>
      <div className="toolbar">
        <div className="flex-row">
          <button
            className={`btn-chip ${subView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setSubView('dashboard')}
          >
            ダッシュボード
          </button>
          <button
            className={`btn-chip ${subView === 'list' ? 'active' : ''}`}
            onClick={() => setSubView('list')}
          >
            リスト
          </button>
        </div>
        <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setShowOptions(true)}>
          ⚙ 選択肢を管理
        </button>
      </div>

      {subView === 'dashboard' ? (
        <ApproachDashboardTab candidates={candidates} onDrill={drillTo} />
      ) : (
        <ApproachListTab candidates={candidates} onUpdate={onUpdate} initialStepFilter={drillStep} />
      )}

      <Modal open={showOptions} onClose={() => setShowOptions(false)} title="選択肢の管理">
        <OptionsAdminPanel open={showOptions} />
      </Modal>
    </>
  )
}
