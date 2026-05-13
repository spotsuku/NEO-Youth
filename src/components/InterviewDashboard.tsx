'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Candidate, Interview, FilterType, EvalLabel } from '@/types'
import Sidebar from './Sidebar'
import CandidateSheet from './CandidateSheet'
import styles from './Dashboard.module.css'

interface Props {
  candidates: Candidate[]
  initialInterviews: Interview[]
}

export default function InterviewDashboard({ candidates: rawCandidates, initialInterviews }: Props) {
  const candidates = useMemo(() =>
    [...rawCandidates].sort((a, b) => {
      const ka = a.kana || a.name
      const kb = b.kana || b.name
      return ka.localeCompare(kb, 'ja')
    }), [rawCandidates]
  )

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
  const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle')
  const [candOverrides, setCandOverrides] = useState<Record<string, Partial<Candidate>>>({})

  // 自動保存タイマーをInterviewDashboard側で管理
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSave = useRef<{ name: string; data: Partial<Interview> } | null>(null)

  const executeSave = useCallback(async (name: string, data: Partial<Interview>) => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/interviews/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const saved = await res.json()
        setInterviews(prev => ({ ...prev, [name]: saved }))
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    }
    pendingSave.current = null
  }, [])

  // 入力変更時に呼ばれる：800ms後に自動保存
  const handleChange = useCallback((name: string, data: Partial<Interview>) => {
    pendingSave.current = { name, data }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    setSaveStatus('saving')
    autoSaveTimer.current = setTimeout(() => {
      if (pendingSave.current) {
        executeSave(pendingSave.current.name, pendingSave.current.data)
      }
    }, 800)
  }, [executeSave])

  // 即時保存（保存ボタン押下時）
  const handleSaveNow = useCallback((name: string, data: Partial<Interview>) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    executeSave(name, data)
  }, [executeSave])

  // ページ離脱前に未保存データがあれば即時保存を試みる
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSave.current) {
        e.preventDefault()
        e.returnValue = '保存中のデータがあります。'
        // 同期的に保存を試みる（ベストエフォート）
        const { name, data } = pendingSave.current
        navigator.sendBeacon(
          `/api/interviews/${encodeURIComponent(name)}`,
          new Blob([JSON.stringify({ ...data, _method: 'PUT' })], { type: 'application/json' })
        )
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  const handleCandidateUpdate = useCallback((name: string, data: Partial<Candidate>) => {
    setCandOverrides(prev => ({ ...prev, [name]: { ...(prev[name] ?? {}), ...data } }))
  }, [])

  const getEvalLetter = useCallback((ev: string | null): EvalLabel => {
    if (!ev) return '?'
    if (ev.startsWith('A')) return 'A'
    if (ev.startsWith('B')) return 'B'
    if (ev.startsWith('C')) return 'C'
    if (ev.startsWith('D')) return 'D'
    return '?'
  }, [])

  const current = candidates[currentIdx]

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
              <a href="/dashboard" className={styles.tbBtn} style={{ textDecoration: 'none' }}>Dashboard</a>
              <span className={styles.counter}>{currentIdx + 1} / {candidates.length}</span>
              <button className={styles.tbBtn} onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}>��� 前</button>
              <button className={styles.tbBtn} onClick={() => setCurrentIdx(i => Math.min(candidates.length - 1, i + 1))}>次 →</button>
              <button className={styles.tbBtn} onClick={() => window.print()}>🖨 印刷</button>
              {saveStatus === 'saving' && <span className={styles.saving}>⏳ 保存中…</span>}
              {saveStatus === 'saved'  && <span style={{ fontSize: '0.7rem', color: 'var(--grn)', fontWeight: 600 }}>✓ 保存済み</span>}
              {saveStatus === 'error'  && <span style={{ fontSize: '0.7rem', color: 'var(--red)', fontWeight: 600 }}>⚠ 保存失敗</span>}
            </div>
          </div>
          {current && (
            <CandidateSheet
              key={current.name}
              candidate={{ ...current, ...(candOverrides[current.name] ?? {}) }}
              interview={interviews[current.name] ?? null}
              candidateName={current.name}
              onChange={handleChange}
              onSaveNow={handleSaveNow}
              onCandidateUpdate={handleCandidateUpdate}
              getEvalLetter={getEvalLetter}
              saveStatus={saveStatus}
            />
          )}
        </div>
      </div>
    </>
  )
}
