import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// youth_candidates の1人を candidates テーブル（最終面接シート用）に UPSERT する。
// status === '最終面接' の候補者をダッシュボードから「最終面接シート」へ
// 連携するためのエンドポイント。
export async function POST(
  _req: NextRequest,
  { params }: { params: { name: string } },
) {
  const name = decodeURIComponent(params.name)

  // 1) youth_candidates から該当者を取得
  const { data: youth, error: ye } = await supabase
    .from('youth_candidates')
    .select('*')
    .eq('name', name)
    .limit(1)
    .maybeSingle()

  if (ye) {
    return NextResponse.json({ error: ye.message }, { status: 500 })
  }
  if (!youth) {
    return NextResponse.json({ error: '候補者が見つかりません' }, { status: 404 })
  }

  // 2) candidates テーブル用にマッピング
  //    sec2_*, doc_score, persona, final_date 等は最終面接シート側で記入する想定なので未設定。
  const payload = {
    name: youth.name,
    kana: youth.kana ?? null,
    org: youth.school ?? null,
    email: youth.email ?? null,
    referral: youth.referral ?? null,
    motivation: youth.motivation ?? null,
    pr: youth.pr ?? null,
    contribution: youth.contribution ?? null,
    career: youth.career ?? null,
  }

  // 3) name をユニークキーとして UPSERT（既に存在すれば応募書類だけ上書き）
  const { data, error } = await supabase
    .from('candidates')
    .upsert(payload, { onConflict: 'name' })
    .select()

  if (error) {
    console.error('[promote-final] supabase error:', {
      name,
      payload,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return NextResponse.json({
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    }, { status: 500 })
  }

  return NextResponse.json({ promoted: name, candidate: data?.[0] ?? null })
}
