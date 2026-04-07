export interface Candidate {
  id: number
  name: string
  kana: string | null
  org: string | null
  persona: string | null
  email: string | null
  final_date: string | null
  doc_score: number
  referral: string | null

  // 2次選考
  sec2_group: string | null
  sec2_evaluator: string | null
  sec2_score_smile: number
  sec2_score_respect: number
  sec2_score_premise: number
  sec2_score_passion: number
  sec2_score_thinking: number
  sec2_score_honest: number
  sec2_total: number
  sec2_eval: string | null
  sec2_comment: string | null

  // 1次評価
  strengths: string | null
  concerns: string | null
  overall: string | null
  overall_comment: string | null

  // 応募書類
  motivation: string | null
  pr: string | null
  contribution: string | null
  career: string | null
  check_points: string | null
}

export interface Interview {
  id?: number
  candidate_id?: number
  candidate_name: string

  interview_date: string | null
  interviewer: string | null

  score_smile: number | null
  score_respect: number | null
  score_premise: number | null
  score_passion: number | null
  score_thinking: number | null
  score_honest: number | null
  score_total?: number

  impression: string | null
  checkpoints_memo: string | null
  positives: string | null
  negatives: string | null
  final_comment: string | null

  verdict: '合格' | 'ボーダー' | '不合格' | null
  verdict_reason: string | null

  created_at?: string
  updated_at?: string
}

export type EvalLabel = 'A' | 'B' | 'C' | 'D' | '?'
export type FilterType = 'all' | 'A' | 'B' | 'C' | 'D'

export const SCORE_CRITERIA = [
  { key: 'score_smile',    label: '笑顔',    sec2Key: 'sec2_score_smile' },
  { key: 'score_respect',  label: 'リスペクト', sec2Key: 'sec2_score_respect' },
  { key: 'score_premise',  label: '前提超越', sec2Key: 'sec2_score_premise' },
  { key: 'score_passion',  label: '熱量',    sec2Key: 'sec2_score_passion' },
  { key: 'score_thinking', label: '地頭力',  sec2Key: 'sec2_score_thinking' },
  { key: 'score_honest',   label: '素直さ',  sec2Key: 'sec2_score_honest' },
] as const
