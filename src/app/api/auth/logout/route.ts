import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/auth'

export async function POST() {
  const supabase = createServerSupabase()
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
