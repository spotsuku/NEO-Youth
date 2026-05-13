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
    console.error('[promote-final] youth_candidates fetch error:', ye)
    return NextResponse.json({
      step: 'fetch_youth',
      error: ye.message,
      code: ye.code,
      details: ye.details,
      hint: ye.hint,
    }, { status: 500 })
  }
  if (!youth) {
    return NextResponse.json({ step: 'fetch_youth', error: '候補者が見つかりません' }, { status: 404 })
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

  // 3) 既存行があれば UPDATE、無ければ INSERT（明示的に分岐）
  //    upsert(onConflict) が環境によって権限問題を起こしたケースを回避するため。
  const { data: existing, error: xe } = await supabase
    .from('candidates')
    .select('id')
    .eq('name', name)
    .limit(1)
    .maybeSingle()

  if (xe) {
    console.error('[promote-final] candidates lookup error:', xe)
    return NextResponse.json({
      step: 'lookup_candidates',
      error: xe.message,
      code: xe.code,
      details: xe.details,
      hint: xe.hint,
    }, { status: 500 })
  }

  if (existing) {
    const { data, error } = await supabase
      .from('candidates')
      .update(payload)
      .eq('name', name)
      .select()
    if (error) {
      console.error('[promote-final] candidates UPDATE error:', {
        candidate: name,
        payload,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json({
        step: 'update_candidates',
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        payload,
      }, { status: 500 })
    }
    return NextResponse.json({ promoted: name, action: 'updated', candidate: data?.[0] ?? null })
  }

  const { data, error } = await supabase
    .from('candidates')
    .insert(payload)
    .select()

  if (error) {
    console.error('[promote-final] candidates INSERT error:', {
      candidate: name,
      payload,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return NextResponse.json({
      step: 'insert_candidates',
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      payload,
    }, { status: 500 })
  }

  return NextResponse.json({ promoted: name, action: 'inserted', candidate: data?.[0] ?? null })
}

