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

export default function InterviewDashboard({ candidates, initialInterviews }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [interviews, setInterviews] = useState<Record<string, Interview>>(() => {
    const map: Record<string, Interview> = {}
    initialInterviews.forEach(iv => { map[iv.candidate_name] = iv })
    return map
  })
  const [saving, setSaving] = useState(false)

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
    <div className={styles.layout}>
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
      <div className={styles.main}>
        <div className={styles.topbar}>
          <div>
            <div className={styles.topbarName}>{current?.name ?? '—'}</div>
            <div className={styles.topbarSub}>
              {current ? `${current.org ?? ''} · ${current.persona ?? ''} · ${current.final_date ?? '日程未定'}` : ''}
            </div>
          </div>
          <div className={styles.topbarRight}>
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
            candidate={current}
            interview={interviews[current.name] ?? null}
            onSave={handleSave}
            getEvalLetter={getEvalLetter}
          />
        )}
      </div>
    </div>
  )
}
