import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// 選考パイプラインを一括アーカイブ（毎年の選考締切時に使用）。
// deleted_at is null かつ selection_archived_at is null の行のみが対象なので、
// 複数回実行しても安全（既にアーカイブ済みの行は再度触らない）。
export async function POST() {
  const { data, error } = await supabase
    .from('youth_candidates')
    .update({ selection_archived_at: new Date().toISOString() })
    .is('deleted_at', null)
    .is('selection_archived_at', null)
    .select('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ archived: data?.length ?? 0, names: (data ?? []).map((d) => d.name) })
}
