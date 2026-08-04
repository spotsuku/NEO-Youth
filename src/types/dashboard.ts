// youth_candidates テーブルと 1:1 対応
export interface YouthCandidate {
  id: number
  name: string
  kana: string | null
  email: string | null
  type: string | null
  school: string | null
  grade: string | null

  // パイプライン
  status: string
  yomi: string | null
  source: string | null
  rejected_at: string | null
  rejected_reason: string | null

  // 応募フォーム
  applied_at: string | null
  motivation: string | null
  pr: string | null
  contribution: string | null
  career: string | null
  interview2_dates: string | null
  interview3_dates: string | null

  // 1次面談
  referral: string | null
  interview_handler: string | null
  interview_date: string | null
  interview_course: string | null
  interview_result: string | null
  interview_notes: string | null

  // オンボーディング
  ob_final_exam: boolean
  ob_mail_sent: boolean
  ob_payment: boolean
  ob_training: boolean
  ob_photo: boolean
  ob_portal: boolean
  ob_slack: boolean
  ob_profile: boolean
  ob_motivation_written: boolean
  ob_pledge: boolean
  ob_handbook: boolean
  ob_pass_criteria: boolean

  attended_session: boolean

  // アプローチ管理（ユースDB改修）
  step: string | null
  entry_year: number | null
  course_length: number | null
  next_action: string | null
  na_due_date: string | null
  na_written_at: string | null
  contact_method: string | null
  inflow_source: string | null
  note: string | null
  partner_id: string | null
  archived: boolean

  // 選考パイプラインのアーカイブ（年度締切時にセット）
  // アプローチ管理専用の `archived` とは別軸。null = 選考データとして表示対象
  selection_archived_at: string | null

  created_at: string
  updated_at: string
}

// step_history テーブルと 1:1 対応
export interface StepHistoryEntry {
  id: number
  youth_candidate_id: number
  from_step: string | null
  to_step: string | null
  changed_at: string
  changed_by: string | null
}

// select_options テーブルと 1:1 対応
export interface SelectOption {
  id: number
  list_key: 'contact_method' | 'inflow_source'
  value: string
  sort_order: number
}

// アプローチ管理: 7段階ステップ（この順序で固定）
export const APPROACH_STEPS = [
  '対象外',
  '未観測',
  'イベント参加（1回）',
  'イベント参加（複数回）',
  '1on1実施',
  'アカデミア興味あり',
  'アカデミア参加口頭内諾',
] as const

export type ApproachStep = (typeof APPROACH_STEPS)[number]

export const APPROACH_STEP_COLORS: Record<string, string> = {
  '対象外': 'var(--bd2)',
  '未観測': 'var(--mu)',
  'イベント参加（1回）': 'var(--gold)',
  'イベント参加（複数回）': 'var(--blu)',
  '1on1実施': 'var(--blu)',
  'アカデミア興味あり': 'var(--grn)',
  'アカデミア参加口頭内諾': 'var(--grn)',
}

// youth_sessions テーブルと 1:1 対応
export interface YouthSession {
  id: number
  candidate_name: string
  session_label: string
  attended: boolean
  age: string | null
  type: string | null
  org: string | null
  created_at: string
}

// youth_ob_logs テーブル
export interface YouthObLog {
  id: number
  candidate_name: string
  field_name: string
  field_label: string
  new_value: boolean
  changed_at: string
}

// youth_interviews テーブル（1候補者に複数回）
export interface YouthInterview {
  id: number
  candidate_name: string
  handler: string | null
  interview_date: string | null
  course: string | null
  result: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// 概要タブ用の集計データ（クライアント算出）
export interface StatusData {
  status: string
  count: number
  color: string
}

export interface YomiData {
  yomi: string
  count: number
  color: string
}

// 学校連携（youth_partnerships テーブル）は PartnershipsTab 内で
// 独自に Row 型を定義しているため、ここでは型を公開しない。

// オンボーディングのフィールド定義
export const OB_LABELS: Record<string, string> = {
  ob_final_exam: '最終選考',
  ob_mail_sent: '合格メール',
  ob_payment: '入金',
  ob_training: '事前研修',
  ob_photo: '写真撮影',
  ob_portal: 'ポータルログイン',
  ob_slack: 'Slack参加',
  ob_profile: 'プロフィール登録',
  ob_motivation_written: '動機記載',
  ob_pledge: '誓約書',
  ob_handbook: '生徒手帳',
  ob_pass_criteria: '合格基準',
}

export const OB_FIELDS = Object.keys(OB_LABELS) as (keyof Pick<
  YouthCandidate,
  'ob_final_exam' | 'ob_mail_sent' | 'ob_payment' | 'ob_training' |
  'ob_photo' | 'ob_portal' | 'ob_slack' | 'ob_profile' |
  'ob_motivation_written' | 'ob_pledge' | 'ob_handbook' | 'ob_pass_criteria'
>)[]
