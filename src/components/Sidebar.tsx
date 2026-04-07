'use client'

import { Candidate, Interview, FilterType, EvalLabel } from '@/types'
import styles from './Sidebar.module.css'

const COLORS: Record<string, string> = {
  '起業': '#c0392b',
  'クリエイター': '#c4882a',
  '就職': '#2563a8',
  '社会人': '#2e7d52',
}

function getColor(persona: string | null, idx: number) {
  const all = ['#c0392b','#2563a8','#2e7d52','#6b3fa0','#c4882a','#1a6b7a','#8b3a62']
  if (!persona) return all[idx % all.length]
  for (const [k, v] of Object.entries(COLORS)) {
    if (persona.includes(k)) return v
  }
  return all[idx % all.length]
}

function verdictClass(v: string | null | undefined) {
  if (!v) return styles.bNone
  if (v === '採用' || v === '合格') return styles.bPass
  if (v === 'ボーダー') return styles.bBorder
  return styles.bFail
}

interface Props {
  candidates: Candidate[]
  interviews: Record<string, Interview>
  currentIdx: number
  filter: FilterType
  search: string
  savedCount: number
  passCount: number
  onSelect: (i: number) => void
  onFilter: (f: FilterType) => void
  onSearch: (q: string) => void
  getEvalLetter: (ev: string | null) => EvalLabel
}

export default function Sidebar({
  candidates, interviews, currentIdx, filter, search,
  savedCount, passCount, onSelect, onFilter, onSearch, getEvalLetter,
}: Props) {
  return (
    <aside style={{ width: '252px', background: '#1a1510', color: '#f0ece4', flexShrink: 0, position: 'fixed', top: 0, left: 0, bottom: 0, overflowY: 'auto', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
      <div className={styles.sbh}>
        <div className={styles.logo}>NEO ACADEMIA 2026</div>
        <div className={styles.title}>最終面接 選考シート</div>
        <div className={styles.sub}>第2期生 · 全{candidates.length}名</div>
      </div>

      <div className={styles.stats}>
        <div><span className={styles.statN}>{candidates.length}</span><span className={styles.statL}>候補者</span></div>
        <div><span className={styles.statN}>{savedCount}</span><span className={styles.statL}>記入済</span></div>
        <div><span className={styles.statN}>{passCount}</span><span className={styles.statL}>合格判定</span></div>
      </div>

      <div className={styles.search}>
        <input
          placeholder="🔍 氏名・所属で検索..."
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>

      <div className={styles.filters}>
        {(['all','A','B','C','D'] as const).map(f => (
          <button
            key={f}
            className={`${styles.fb} ${filter === f ? styles.fbOn : ''}`}
            onClick={() => onFilter(f)}
          >
            {f === 'all' ? '全員' : f === 'A' ? 'A合格圏' : f === 'B' ? 'B要審議' : f === 'C' ? 'C復活' : 'D不合格'}
          </button>
        ))}
      </div>

      <nav className={styles.nav}>
        {candidates.map((c, i) => {
          const evL = getEvalLetter(c.sec2_eval)
          const iv = interviews[c.name]
          const verdict = iv?.verdict ?? c.overall ?? ''
          const color = getColor(c.persona, i)

          // filter check
          const matchFilter = filter === 'all' || evL === filter
          const q = search.toLowerCase()
          const matchSearch = !q || c.name.includes(search) ||
            (c.org?.toLowerCase().includes(q) ?? false) ||
            (c.kana?.includes(search) ?? false)
          if (!matchFilter || !matchSearch) return null

          return (
            <div
              key={c.name}
              className={`${styles.ni} ${i === currentIdx ? styles.niOn : ''}`}
              onClick={() => onSelect(i)}
            >
              <div className={styles.avatar} style={{ background: color }}>{c.name[0]}</div>
              <div className={styles.niInfo}>
                <div className={styles.niName}>{c.name}</div>
                <div className={styles.niOrg}>{c.org?.split(' ')[0] ?? ''}</div>
              </div>
              <div className={styles.badges}>
                <span className={`${styles.badge} ${styles['b' + evL]}`}>{evL}</span>
                <span className={`${styles.badge} ${verdictClass(verdict)}`}>{verdict || '未定'}</span>
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
