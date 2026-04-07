import { createClient } from '@supabase/supabase-js'
import { Candidate, Interview } from '@/types'
import InterviewDashboard from '@/components/InterviewDashboard'

// キャッシュなし・常に最新データを取得
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error('Missing env vars:', { url: !!url, key: !!key })
    return { candidates: [], interviews: [], error: '環境変数が設定されていません' }
  }

  const supabase = createClient(url, key)

  const [{ data: candidates, error: ce }, { data: interviews, error: ie }] = await Promise.all([
    supabase.from('candidates').select('*').order('id'),
    supabase.from('interviews').select('*'),
  ])

  if (ce) console.error('candidates error:', ce)
  if (ie) console.error('interviews error:', ie)

  return {
    candidates: (candidates ?? []) as Candidate[],
    interviews: (interviews ?? []) as Interview[],
    error: ce?.message ?? ie?.message ?? null,
  }
}

export default async function Page() {
  const { candidates, interviews, error } = await getData()

  if (error) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'monospace', color: '#c0392b' }}>
        <h2>データ取得エラー</h2>
        <pre style={{ background: '#fee', padding: '1rem', borderRadius: '6px', marginTop: '1rem' }}>
          {error}
        </pre>
        <p style={{ marginTop: '1rem', color: '#666' }}>
          Vercelの Environment Variables を確認してください。<br />
          NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
        </p>
      </div>
    )
  }

  if (candidates.length === 0) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'monospace', color: '#c4882a' }}>
        <h2>候補者データが0件です</h2>
        <p style={{ marginTop: '1rem', color: '#666' }}>
          Supabase の SQL Editor で<br />
          <code>supabase/migrations/002_seed_candidates.sql</code> を実行してください。
        </p>
      </div>
    )
  }

  return <InterviewDashboard candidates={candidates} initialInterviews={interviews} />
}
