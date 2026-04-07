'use client'

import { useState, useCallback, useEffect } from 'react'
import { Candidate, Interview, EvalLabel, SCORE_CRITERIA } from '@/types'
import styles from './CandidateSheet.module.css'

const COLORS: string[] = ['#c0392b','#2563a8','#2e7d52','#6b3fa0','#c4882a','#1a6b7a','#8b3a62']
function getColor(persona: string | null): string {
  if (!persona) return COLORS[0]
  if (persona.includes('起業')) return COLORS[0]
  if (persona.includes('クリエイター')) return COLORS[4]
  if (persona.includes('就職')) return COLORS[1]
  if (persona.includes('社会人')) return COLORS[2]
  return COLORS[5]
}

interface Props {
  candidate: Candidate
  interview: Interview | null
  onSave: (data: Partial<Interview>) => Promise<void>
  getEvalLetter: (ev: string | null) => EvalLabel
}

type ScoreKey = 'score_smile' | 'score_respect' | 'score_premise' | 'score_passion' | 'score_thinking' | 'score_honest'

const emptyInterview = (): Partial<Interview> => ({
  interview_date: '',
  interviewer: '',
  score_smile: null,
  score_respect: null,
  score_premise: null,
  score_passion: null,
  score_thinking: null,
  score_honest: null,
  impression: '',
  checkpoints_memo: '',
  positives: '',
  negatives: '',
  final_comment: '',
  verdict: null,
  verdict_reason: '',
})

export default function CandidateSheet({ candidate: c, interview, onSave, getEvalLetter }: Props) {
  const [form, setForm] = useState<Partial<Interview>>(() => ({
    ...emptyInterview(),
    ...(interview ?? {}),
  }))
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm({ ...emptyInterview(), ...(interview ?? {}) })
  }, [interview])

  const color = getColor(c.persona)
  const evL = getEvalLetter(c.sec2_eval)

  const set = (key: keyof Interview, val: unknown) => {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  const handleSave = useCallback(async () => {
    await onSave(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [form, onSave])

  const scoreTotal = SCORE_CRITERIA.reduce((sum, cr) => {
    const v = form[cr.key as ScoreKey]
    return sum + (v ?? 0)
  }, 0)
  const hasScore = SCORE_CRITERIA.some(cr => form[cr.key as ScoreKey] !== null)

  const overallColor = c.overall === '採用' || c.overall === '合格' ? 'var(--grn)'
    : c.overall === 'ボーダー' ? 'var(--gold)' : c.overall === '不採用' ? 'var(--red)' : 'var(--mu)'

  const evalClassMap: Record<string, string> = { A: styles.evA, B: styles.evB, C: styles.evC, D: styles.evD }
  const evalClass = evalClassMap[evL] ?? styles.evC

  const checkPts = (c.check_points ?? '').split(/[。\n]/).filter(s => s.trim())

  return (
    <div className={styles.sheet}>
      {/* ── プロフィールヘッダー ── */}
      <div className={styles.ph}>
        <div className={styles.avatar} style={{ background: color }}>{c.name[0]}</div>
        <div className={styles.phInfo}>
          <div className={styles.name}>{c.name}</div>
          {c.kana && <div className={styles.kana}>{c.kana}</div>}
          <div className={styles.org}>{c.org}</div>
          <div className={styles.meta}>
            {c.persona && <span className={styles.tag}>📋 {c.persona}</span>}
            {c.final_date && <span className={styles.tag}>📅 {c.final_date}</span>}
            {c.email && <span className={styles.tag}>✉ {c.email}</span>}
            {c.referral && <span className={styles.tag}>🔗 {c.referral}</span>}
            {c.sec2_group && <span className={styles.tag}>👥 {c.sec2_group}グループ / {c.sec2_evaluator}</span>}
          </div>
        </div>
        <div className={styles.scores}>
          <div className={styles.scorePair}>
            <div className={styles.scoreNum} style={{ color }}>{c.doc_score || '—'}<span className={styles.scoreDen}>/16</span></div>
            <div className={styles.scoreLabel}>1次書類</div>
          </div>
          <div className={styles.scorePair}>
            <div className={styles.scoreNum} style={{ color }}>{c.sec2_total || '—'}<span className={styles.scoreDen}>/24</span></div>
            <div className={styles.scoreLabel}>2次選考</div>
          </div>
          <span className={`${styles.evalBadge} ${evalClass}`}>{c.sec2_eval ?? '—'}</span>
        </div>
      </div>

      {/* ── 2次選考採点 + 応募書類サマリー ── */}
      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>2次選考 採点</div>
          <div className={styles.scoreBars}>
            {SCORE_CRITERIA.map(cr => {
              const v = c[cr.sec2Key as keyof Candidate] as number ?? 0
              const pct = v / 4 * 100
              const bc = v >= 4 ? 'var(--grn)' : v === 3 ? 'var(--blu)' : v === 2 ? 'var(--gold)' : 'var(--red)'
              return (
                <div key={cr.key} className={styles.barRow}>
                  <span className={styles.barLabel}>{cr.label}</span>
                  <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${pct}%`, background: bc }} /></div>
                  <span className={styles.barNum} style={{ color: bc }}>{v}</span>
                </div>
              )
            })}
          </div>
          {c.sec2_comment && <div className={styles.sec2Comment}>{c.sec2_comment}</div>}
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>応募書類 サマリー</div>
          {c.motivation && <div className={styles.docBlock}><div className={styles.docLabel}>応募動機</div><div className={styles.docText}>{c.motivation}</div></div>}
          {c.pr && <div className={styles.docBlock}><div className={styles.docLabel}>自己PR・実績</div><div className={styles.docText}>{c.pr}</div></div>}
          {c.career && <div className={styles.docBlock}><div className={styles.docLabel}>卒業後キャリア</div><div className={styles.docText}>{c.career}</div></div>}
        </div>
      </div>

      {/* ── 強み / 懸念点 ── */}
      <div className={styles.grid2}>
        {c.strengths && (
          <div className={styles.highlightBox}>
            <div className={styles.hlTitle}>💪 強み（1次選考評価）</div>
            <div className={styles.hlText}>{c.strengths}</div>
          </div>
        )}
        {c.concerns && (
          <div className={styles.warningBox}>
            <div className={styles.warnTitle}>⚠ 懸念点（1次選考評価）</div>
            <div className={styles.warnText}>{c.concerns}</div>
          </div>
        )}
      </div>

      {/* ── 1次選考総評 ── */}
      {c.overall_comment && (
        <div className={styles.card} style={{ marginBottom: '0.85rem' }}>
          <div className={styles.cardTitle}>
            1次選考 総評
            {c.overall && <span className={styles.overallChip} style={{ color: overallColor, borderColor: overallColor }}>{c.overall}</span>}
          </div>
          <div className={styles.docText}>{c.overall_comment}</div>
        </div>
      )}

      {/* ── 確認ポイント ── */}
      {checkPts.length > 0 && (
        <div className={styles.checkCard}>
          <div className={styles.cardTitle}>🎯 最終面接での確認ポイント</div>
          <div className={styles.checkList}>
            {checkPts.map((pt, i) => (
              <div key={i} className={styles.checkItem}>
                <input type="checkbox" id={`chk-${c.name}-${i}`} />
                <label htmlFor={`chk-${c.name}-${i}`}>{pt.trim()}</label>
              </div>
            ))}
          </div>
        </div>
      )}

      <hr className={styles.divider} />
      <div className={styles.sectionLabel}>▌ 最終面接 記入欄</div>

      {/* ── 面接日・面接官 ── */}
      <div className={styles.rowGrid}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>面接日</label>
          <input className={`${styles.input} ${styles.short}`} placeholder="例: 2026年4月15日"
            value={form.interview_date ?? ''} onChange={e => set('interview_date', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>面接官</label>
          <input className={`${styles.input} ${styles.short}`} placeholder="例: 三木浩江"
            value={form.interviewer ?? ''} onChange={e => set('interviewer', e.target.value)} />
        </div>
      </div>

      {/* ── 面接採点 ── */}
      <div className={styles.card} style={{ marginBottom: '0.85rem' }}>
        <div className={styles.cardTitle}>最終面接 採点（各 /4点 合計 /24点）</div>
        <div className={styles.scoreInputGrid}>
          {SCORE_CRITERIA.map(cr => {
            const val = form[cr.key as ScoreKey] ?? null
            return (
              <div key={cr.key} className={styles.scoreInputItem}>
                <div className={styles.scoreInputLabel}>{cr.label}</div>
                <div className={styles.scoreInputRow}>
                  {[1, 2, 3, 4].map(n => (
                    <button
                      key={n}
                      className={`${styles.scoreBtn} ${val === n ? styles.scoreBtnSel : ''}`}
                      onClick={() => set(cr.key as keyof Interview, val === n ? null : n)}
                    >{n}</button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <div className={styles.totalDisplay}>
          <div className={styles.totalLabel}>面接合計点</div>
          <div className={styles.totalRight}>
            <span className={styles.totalNum}>{hasScore ? scoreTotal : '—'}</span>
            <span className={styles.totalDen}>/ 24</span>
          </div>
        </div>
      </div>

      {/* ── テキスト記入欄 ── */}
      <div className={styles.grid2}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>第一印象・雰囲気</label>
          <textarea className={styles.textarea} placeholder="入室時の様子、挨拶、表情、コミュニケーションの質感など..."
            value={form.impression ?? ''} onChange={e => set('impression', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>確認ポイントへの回答メモ</label>
          <textarea className={styles.textarea} placeholder="事前確認ポイントに対する回答をメモ..."
            value={form.checkpoints_memo ?? ''} onChange={e => set('checkpoints_memo', e.target.value)} />
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>良かった点・光ったポイント</label>
        <textarea className={styles.textarea} placeholder="特に印象に残ったエピソードや発言、想定外に良かった点など..."
          value={form.positives ?? ''} onChange={e => set('positives', e.target.value)} />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>懸念が残る点・気になった点</label>
        <textarea className={styles.textarea} placeholder="回答の不明瞭さ、矛盾点、コミットメントへの疑問など..."
          value={form.negatives ?? ''} onChange={e => set('negatives', e.target.value)} />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>総評コメント</label>
        <textarea className={`${styles.textarea} ${styles.tall}`} placeholder="総合的な評価、特記事項、他候補者との比較観点など..."
          value={form.final_comment ?? ''} onChange={e => set('final_comment', e.target.value)} />
      </div>

      {/* ── 最終判定 ── */}
      <div className={styles.card} style={{ marginBottom: '0.85rem' }}>
        <div className={styles.cardTitle}>最終判定</div>
        <div className={styles.verdictRow}>
          {(['合格', 'ボーダー', '不合格'] as const).map(v => (
            <button
              key={v}
              className={`${styles.verdictBtn} ${v === '合格' ? styles.vPass : v === 'ボーダー' ? styles.vBorder : styles.vFail} ${form.verdict === v ? styles.verdictSel : ''}`}
              onClick={() => set('verdict', form.verdict === v ? null : v)}
            >
              {v === '合格' ? '✓ 合格' : v === 'ボーダー' ? '△ ボーダー' : '✕ 不合格'}
            </button>
          ))}
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>判定理由・条件など</label>
          <textarea className={`${styles.textarea} ${styles.short}`} placeholder="奨学金適用、条件付き合格、再確認事項など..."
            value={form.verdict_reason ?? ''} onChange={e => set('verdict_reason', e.target.value)} />
        </div>
      </div>

      <button className={`${styles.saveBtn} ${saved ? styles.saveBtnSaved : ''}`} onClick={handleSave}>
        {saved ? '✓ 保存しました' : '💾 このシートを保存する'}
      </button>
      <div style={{ height: '2.5rem' }} />
    </div>
  )
}
