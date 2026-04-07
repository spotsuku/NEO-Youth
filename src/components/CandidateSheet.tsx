'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
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

const FIELD_LABELS: Record<string, string> = {
  interview_date: '面接日', interviewer: '面接官',
  score_smile: '笑顔', score_respect: 'リスペクト',
  score_premise: '前提超越', score_passion: '熱量',
  score_thinking: '地頭力', score_honest: '素直さ',
  impression: '第一印象', checkpoints_memo: '確認ポイント回答',
  positives: '良かった点', negatives: '懸念点',
  own_challenge: '自分の課題は何か',
  neo_connection: 'NEOとキャリアの接続ポイント',
  neo_strategy: 'NEO活用方針',
  final_comment: '総評', verdict: '最終判定',
  verdict_reason: '判定理由',
}

interface Log {
  id: number
  field_name: string
  old_value: string
  new_value: string
  changed_by: string
  changed_at: string
}

interface Props {
  candidate: Candidate
  interview: Interview | null
  onSave: (data: Partial<Interview>) => Promise<void>
  getEvalLetter: (ev: string | null) => EvalLabel
}

type ScoreKey = 'score_smile'|'score_respect'|'score_premise'|'score_passion'|'score_thinking'|'score_honest'

const emptyForm = (): Partial<Interview> => ({
  interview_date: '', interviewer: '',
  score_smile: null, score_respect: null, score_premise: null,
  score_passion: null, score_thinking: null, score_honest: null,
  impression: '', checkpoints_memo: '', positives: '',
  negatives: '', own_challenge: '', neo_connection: '', neo_strategy: '',
  final_comment: '', verdict: null, verdict_reason: '',
})

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function CandidateSheet({ candidate: c, interview, onSave, getEvalLetter }: Props) {
  const [form, setForm] = useState<Partial<Interview>>(() => ({ ...emptyForm(), ...(interview ?? {}) }))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [logs, setLogs] = useState<Log[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<Partial<Interview>>(form)

  useEffect(() => {
    const next = { ...emptyForm(), ...(interview ?? {}) }
    setForm(next)
    lastSaved.current = next
    setSaveStatus('idle')
  }, [interview, c.name])

  // 変更ログ取得
  useEffect(() => {
    if (!showLogs) return
    fetch(`/api/interviews/${encodeURIComponent(c.name)}`)
      .then(r => r.json())
      .then(data => Array.isArray(data) && setLogs(data))
      .catch(() => {})
  }, [showLogs, c.name])

  const color = getColor(c.persona)
  const evL = getEvalLetter(c.sec2_eval)
  const evalClassMap: Record<string, string> = { A: styles.evA, B: styles.evB, C: styles.evC, D: styles.evD }
  const evalClass = evalClassMap[evL] ?? styles.evC

  // 即時保存（ボタン押下）
  const doSave = useCallback(async (data: Partial<Interview>) => {
    setSaveStatus('saving')
    try {
      await onSave(data)
      lastSaved.current = data
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
    }
  }, [onSave])

  // フィールド変更 → 1.5秒後に自動保存
  const set = useCallback((key: keyof Interview, val: unknown) => {
    setForm(prev => {
      const next = { ...prev, [key]: val }
      // 自動保存タイマーリセット
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      setSaveStatus('saving')
      autoSaveTimer.current = setTimeout(() => {
        doSave(next)
      }, 1500)
      return next
    })
  }, [doSave])

  const scoreTotal = SCORE_CRITERIA.reduce((s, cr) => s + (form[cr.key as ScoreKey] ?? 0), 0)
  const hasScore = SCORE_CRITERIA.some(cr => form[cr.key as ScoreKey] !== null)

  const overallColor = c.overall === '採用' || c.overall === '合格' ? 'var(--grn)'
    : c.overall === 'ボーダー' ? 'var(--gold)' : 'var(--red)'
  const checkPts = (c.check_points ?? '').split(/[。\n]/).filter(s => s.trim())

  const saveLabel = saveStatus === 'saving' ? '保存中…'
    : saveStatus === 'saved' ? '✓ 保存済み'
    : saveStatus === 'error' ? '⚠ 保存失敗'
    : '💾 保存する'

  return (
    <div className={styles.sheet}>
      {/* ── 保存ステータスバー ── */}
      <div className={`${styles.statusBar} ${styles['status_' + saveStatus]}`}>
        <span>{saveStatus === 'saving' ? '⏳ 自動保存中…'
          : saveStatus === 'saved' ? '✓ Supabaseに保存済み'
          : saveStatus === 'error' ? '⚠ 保存に失敗しました。再度保存ボタンを押してください'
          : '　'}</span>
        <button className={styles.logBtn} onClick={() => setShowLogs(v => !v)}>
          🕐 変更ログ {showLogs ? '▲' : '▼'}
        </button>
      </div>

      {/* ── 変更ログパネル ── */}
      {showLogs && (
        <div className={styles.logPanel}>
          <div className={styles.logTitle}>変更ログ（直近50件）</div>
          {logs.length === 0
            ? <div className={styles.logEmpty}>まだ変更ログはありません</div>
            : logs.map(log => (
              <div key={log.id} className={styles.logRow}>
                <span className={styles.logTime}>
                  {new Date(log.changed_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                </span>
                <span className={styles.logWho}>{log.changed_by}</span>
                <span className={styles.logField}>{FIELD_LABELS[log.field_name] ?? log.field_name}</span>
                <span className={styles.logVal}>
                  {log.old_value ? <><s className={styles.logOld}>{log.old_value.substring(0, 30)}</s> → </> : ''}
                  <strong>{log.new_value.substring(0, 40)}</strong>
                </span>
              </div>
            ))
          }
        </div>
      )}

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

      {/* ── 2次選考採点 + 応募書類 ── */}
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

      {/* ── 強み / 懸念 ── */}
      <div className={styles.grid2}>
        {c.strengths && <div className={styles.highlightBox}><div className={styles.hlTitle}>💪 強み（1次選考評価）</div><div className={styles.hlText}>{c.strengths}</div></div>}
        {c.concerns && <div className={styles.warningBox}><div className={styles.warnTitle}>⚠ 懸念点（1次選考評価）</div><div className={styles.warnText}>{c.concerns}</div></div>}
      </div>

      {c.overall_comment && (
        <div className={styles.card} style={{ marginBottom: '0.85rem' }}>
          <div className={styles.cardTitle}>
            1次選考 総評
            {c.overall && <span className={styles.overallChip} style={{ color: overallColor, borderColor: overallColor }}>{c.overall}</span>}
          </div>
          <div className={styles.docText}>{c.overall_comment}</div>
        </div>
      )}

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

      {/* ── 採点 ── */}
      <div className={styles.card} style={{ marginBottom: '0.85rem' }}>
        <div className={styles.cardTitle}>最終面接 採点（各 /4点 合計 /24点）</div>
        <div className={styles.scoreInputGrid}>
          {SCORE_CRITERIA.map(cr => {
            const val = form[cr.key as ScoreKey] ?? null
            return (
              <div key={cr.key} className={styles.scoreInputItem}>
                <div className={styles.scoreInputLabel}>{cr.label}</div>
                <div className={styles.scoreInputRow}>
                  {[1,2,3,4].map(n => (
                    <button key={n}
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
        <label className={styles.fieldLabel}>自分の課題は何か</label>
        <textarea className={styles.textarea} placeholder="候補者自身が認識している課題・弱点・改善したい点など..."
          value={form.own_challenge ?? ''} onChange={e => set('own_challenge', e.target.value)} />
      </div>

      {/* ── NEO特有の2項目 ── */}
      <div className={styles.neoGrid}>
        <div className={styles.neoCard}>
          <div className={styles.neoCardTitle}>🔗 NEOとキャリアの接続ポイント</div>
          <div className={styles.neoCardSub}>この候補者のキャリアビジョンとNEOのプログラムがどう接続しているか</div>
          <textarea className={`${styles.textarea} ${styles.tall}`}
            placeholder="例: 環境ビジネスの起業を目指しており、NEOのパートナー企業との実践PJが直接的な事業検証の場になる。1期生との人脈形成も将来の共同創業者探しに繋がる可能性がある。"
            value={form.neo_connection ?? ''} onChange={e => set('neo_connection', e.target.value)} />
        </div>
        <div className={styles.neoCard}>
          <div className={styles.neoCardTitle}>🎯 NEO活用方針</div>
          <div className={styles.neoCardSub}>NEO入学後、この候補者をどう活かし・育てるか</div>
          <textarea className={`${styles.textarea} ${styles.tall}`}
            placeholder="例: 起業型PJのリーダーとして配置し、事業創出フェーズで中心的役割を担わせる。メンターには経営者視点の強い企業担当者をアサインする。"
            value={form.neo_strategy ?? ''} onChange={e => set('neo_strategy', e.target.value)} />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>総評コメント</label>
        <textarea className={`${styles.textarea} ${styles.tall}`} placeholder="総合的な評価、特記事項、他候補者との比較観点など..."
          value={form.final_comment ?? ''} onChange={e => set('final_comment', e.target.value)} />
      </div>

      {/* ── 判定 ── */}
      <div className={styles.card} style={{ marginBottom: '0.85rem' }}>
        <div className={styles.cardTitle}>最終判定</div>
        <div className={styles.verdictRow}>
          {(['合格','ボーダー','不合格'] as const).map(v => (
            <button key={v}
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

      <button
        className={`${styles.saveBtn} ${saveStatus === 'saved' ? styles.saveBtnSaved : saveStatus === 'error' ? styles.saveBtnError : ''}`}
        onClick={() => doSave(form)}
        disabled={saveStatus === 'saving'}
      >
        {saveLabel}
      </button>
      <div style={{ height: '2.5rem' }} />
    </div>
  )
}
