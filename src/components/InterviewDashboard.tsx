'use client'

import { useState, useCallback, useMemo } from 'react'
import { Candidate, Interview, FilterType, EvalLabel } from '@/types'
import Sidebar from './Sidebar'
import CandidateSheet from './CandidateSheet'
import styles from './Dashboard.module.css'

interface Props {
  candidates: Candidate[]
  initialInterviews: Interview[]
}

export default function InterviewDashboard({ candidates: rawCandidates, initialInterviews }: Props) {
  // 50音順ソート（かなで並べ、かながない場合は漢字で）
  const candidates = useMemo(() =>
    [...rawCandidates].sort((a, b) => {
      const ka = a.kana || a.name
      const kb = b.kana || b.name
      return ka.localeCompare(kb, 'ja')
    }), [rawCandidates]
  )

  // 印刷用グローバルCSS（インラインスタイルを上書き）
  const printStyle = `
    @media print {
      [data-sidebar] { display: none !important; }
      [data-topbar]  { display: none !important; }
      [data-main]    { margin-left: 0 !important; width: 100% !important; }
    }
  `
  const [currentIdx, setCurrentIdx] = useState(0)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [interviews, setInterviews] = useState<Record<string, Interview>>(() => {
    const map: Record<string, Interview> = {}
    initialInterviews.forEach(iv => { map[iv.candidate_name] = iv })
    return map
  })
  const [saving, setSaving] = useState(false)
  // 候補者データのローカル更新（編集保存後に即時反映）
  const [candOverrides, setCandOverrides] = useState<Record<string, Partial<Candidate>>>({})
  const handleCandidateUpdate = useCallback((name: string, data: Partial<Candidate>) => {
    setCandOverrides(prev => ({ ...prev, [name]: { ...(prev[name] ?? {}), ...data } }))
  }, [])

  const getEvalLetter = (ev: string | null): EvalLabel => {
    if (!ev) return '?'
    if (ev.startsWith('A')) return 'A'
    if (ev.startsWith('B')) return 'B'
    if (ev.startsWith('C')) return 'C'
    if (ev.startsWith('D')) return 'D'
    return '?'
  }

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const evL = getEvalLetter(c.sec2_eval)
      const matchFilter = filter === 'all' || evL === filter
      const q = search.toLowerCase()
      const matchSearch = !q ||
        c.name.includes(search) ||
        (c.org?.toLowerCase().includes(q) ?? false) ||
        (c.kana?.includes(search) ?? false)
      return matchFilter && matchSearch
    })
  }, [candidates, filter, search])

  const current = candidates[currentIdx]

  const handleSave = useCallback(async (interview: Partial<Interview>) => {
    if (!current) return
    setSaving(true)
    try {
      const res = await fetch(`/api/interviews/${encodeURIComponent(current.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interview),
      })
      if (res.ok) {
        const saved = await res.json()
        setInterviews(prev => ({ ...prev, [current.name]: saved }))
      }
    } finally {
      setSaving(false)
    }
  }, [current])

  const savedCount = Object.keys(interviews).filter(n => {
    const iv = interviews[n]
    return iv && (iv.verdict || iv.impression || iv.final_comment)
  }).length

  const passCount = Object.values(interviews).filter(iv => iv?.verdict === '合格').length

  return (
    <>
      <style>{printStyle}</style>
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
        <div data-sidebar>
          <Sidebar
            candidates={candidates}
            interviews={interviews}
            currentIdx={currentIdx}
            filter={filter}
            search={search}
            savedCount={savedCount}
            passCount={passCount}
            onSelect={setCurrentIdx}
            onFilter={setFilter}
            onSearch={setSearch}
            getEvalLetter={getEvalLetter}
          />
        </div>
        <div data-main style={{ marginLeft: '252px', flex: 1, minHeight: '100vh', minWidth: 0, background: 'var(--bg)', width: 'calc(100% - 252px)' }}>
          <div data-topbar className={styles.topbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={styles.counter}>{currentIdx + 1} / {candidates.length}</span>
            <button className={styles.tbBtn} onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}>← 前</button>
            <button className={styles.tbBtn} onClick={() => setCurrentIdx(i => Math.min(candidates.length - 1, i + 1))}>次 →</button>
            <button className={styles.tbBtn} onClick={() => window.print()}>🖨 印刷</button>
            {saving && <span className={styles.saving}>保存中…</span>}
          </div>
        </div>
        {current && (
          <CandidateSheet
            key={current.name}
            candidate={{ ...current, ...(candOverrides[current.name] ?? {}) }}
            interview={interviews[current.name] ?? null}
            onSave={handleSave}
            onCandidateUpdate={handleCandidateUpdate}
            getEvalLetter={getEvalLetter}
          />
        )}
        </div>
      </div>
    </>
  )
}
