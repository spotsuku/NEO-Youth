import { createClient } from '@supabase/supabase-js'
import type { YouthCandidate, YouthSession } from '@/types/dashboard'
import RecruitmentDashboard from '@/components/dashboard/RecruitmentDashboard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return { candidates: [], sessions: [], error: null }
  }

  const supabase = createClient(url, key)

  const [{ data: candidates, error: ce }, { data: sessions, error: se }] = await Promise.all([
    supabase.from('youth_candidates').select('*').order('id'),
    supabase.from('youth_sessions').select('*').order('id'),
  ])

  return {
    candidates: (candidates ?? []) as YouthCandidate[],
    sessions: (sessions ?? []) as YouthSession[],
    error: ce?.message ?? se?.message ?? null,
  }
}

export default async function DashboardPage() {
  const { candidates, sessions, error } = await getData()

  return (
    <RecruitmentDashboard
      candidates={candidates}
      sessions={sessions}
      dbError={error}
    />
  )
}
