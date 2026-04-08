export interface DashboardApplicant {
  name: string
  kana: string
  email: string
  ts: string
  type: string
  school: string
  grade: string
  motivation: string
  interview2: string
  interview3: string
  source: string
}

export interface DashboardInterview {
  name: string
  kana: string
  referral: string
  handler: string
  org: string
  date: string
  type: string
  course: string
  result: string
  notes: string
}

export interface OnboardingRecord {
  email: string
  name: string
  final_exam: boolean
  mail_sent: boolean
  payment: boolean
  training: boolean
  photo: boolean
  portal: boolean
  slack: boolean
  profile: boolean
  motivation_written: boolean
  pledge: boolean
  handbook: boolean
}

export interface SessionRecord {
  attended: boolean
  name: string
  age: string
  type: string
  org: string
  session: string
}

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

export const OB_LABELS: Record<string, string> = {
  final_exam: '最終選考',
  mail_sent: '合格メール',
  payment: '入金',
  training: '事前研修',
  photo: '写真撮影',
  portal: 'ポータルログイン',
  slack: 'Slack参加',
  profile: 'プロフィール登録',
  motivation_written: '動機記載',
  pledge: '誓約書',
  handbook: '生徒手帳',
}

export const OB_FIELDS = Object.keys(OB_LABELS) as (keyof Omit<OnboardingRecord, 'email' | 'name'>)[]
