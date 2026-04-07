import { createClient } from '@supabase/supabase-js'
import { Candidate, Interview } from '@/types'
import InterviewDashboard from '@/components/InterviewDashboard'

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: candidates }, { data: interviews }] = await Promise.all([
    supabase.from('candidates').select('*').order('id'),
    supabase.from('interviews').select('*'),
  ])

  return {
    candidates: (candidates ?? []) as Candidate[],
    interviews: (interviews ?? []) as Interview[],
  }
}

export default async function Page() {
  const { candidates, interviews } = await getData()
  return <InterviewDashboard candidates={candidates} initialInterviews={interviews} />
}
