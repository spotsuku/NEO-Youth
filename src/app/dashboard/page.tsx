import { createClient } from '@supabase/supabase-js'
import type { YouthCandidate, YouthSession } from '@/types/dashboard'
import RecruitmentDashboard from '@/components/dashboard/RecruitmentDashboard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export interface VerdictRecord {
  candidate_name: string
  verdict: '合格' | 'ボーダー' | '不合格' | null
  score_total: number | null
}

async function getData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return { candidates: [], sessions: [], verdicts: [], promotedNames: [], error: null }
  }

  const supabase = createClient(url, key)

  const [
    { data: candidates, error: ce },
    { data: sessions, error: se },
    { data: verdicts, error: ve },
    { data: finalSheet, error: fe },
  ] = await Promise.all([
    supabase.from('youth_candidates').select('*').order('id'),
    supabase.from('youth_sessions').select('*').order('id'),
    supabase.from('interviews').select('candidate_name, verdict, score_total'),
    supabase.from('candidates').select('name'),
  ])

  return {
    candidates: (candidates ?? []) as YouthCandidate[],
    sessions: (sessions ?? []) as YouthSession[],
    verdicts: (verdicts ?? []) as VerdictRecord[],
    promotedNames: ((finalSheet ?? []) as { name: string }[]).map((r) => r.name),
    error: ce?.message ?? se?.message ?? ve?.message ?? fe?.message ?? null,
  }
}

export default async function DashboardPage() {
  const { candidates, sessions, verdicts, promotedNames, error } = await getData()

  // verdict を Map に変換
  const verdictMap: Record<string, VerdictRecord> = {}
  for (const v of verdicts) {
    if (v.verdict) verdictMap[v.candidate_name] = v
  }

  return (
    <RecruitmentDashboard
      candidates={candidates}
      sessions={sessions}
      verdictMap={verdictMap}
      promotedNames={promotedNames}
      dbError={error}
    />
  )
}
