#!/usr/bin/env node
/**
 * anon キー単体で各テーブルにアクセスできるかを検証する。
 *
 *   node scripts/verify-rls.mjs
 *
 * 026 / 027 の適用前後で実行して結果を比較する。
 * 個人情報は一切出力しない（件数・HTTPステータス・可否のみ）。
 *
 * 期待される結果:
 *   027 適用前 … READ 10/10、WRITE 10/10 が通る（脆弱）
 *   027 適用後 … READ は 200 だが 0 件、WRITE は 401/403 で拒否
 *
 * 注意: service_role キーは RLS を設計上バイパスするため、このスクリプトは
 *       anon キーしか使わない。service_role で動くサーバー経路の露出は
 *       このスクリプトでは検出できない（Vercel 側の対処が必要）。
 */
import { readFileSync } from 'node:fs'

const TABLES = [
  'candidates',
  'interviews',
  'interview_logs',
  'youth_candidates',
  'youth_sessions',
  'youth_ob_logs',
  'youth_interviews',
  'youth_partnerships',
  'step_history',
  'select_options',
]

function loadEnv(path = '.env.local') {
  const env = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const i = t.indexOf('=')
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')
  }
  return env
}

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const svc = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !anon || !svc) {
  console.error(
    '.env.local に NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY が必要です',
  )
  process.exit(2)
}

const ok = (s) => s >= 200 && s < 300
const hdr = (key) => ({ apikey: key, Authorization: `Bearer ${key}` })

/** count=exact で総件数を取る。RLS 適用後の可視件数が返る。 */
async function count(table, key) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, {
    headers: { ...hdr(key), Prefer: 'count=exact' },
  })
  if (!ok(res.status)) return { status: res.status, total: null }
  const total = Number(res.headers.get('content-range')?.split('/').pop() ?? 0)
  return { status: res.status, total: Number.isNaN(total) ? null : total }
}

/** 空配列を POST する。INSERT 権限の有無だけを見て、行は作らない。 */
async function probeWrite(table) {
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...hdr(anon), 'Content-Type': 'application/json' },
    body: '[]',
  })
  return res.status
}

console.log(`target : ${new URL(url).host}`)
console.log('方式   : anon の可視件数を service_role の実件数と突き合わせて遮断を判定する')
console.log('         （027 適用後は「200・0件」になるため、件数だけでは空テーブルと区別できない）\n')
console.log('table                 実件数  anon可視  READ状態      WRITE  判定')
console.log('-'.repeat(72))

let exposedRead = 0
let exposedWrite = 0
let inconclusive = 0

for (const t of TABLES) {
  const actual = await count(t, svc)
  const seen = await count(t, anon)
  const wStatus = await probeWrite(t)

  const canWrite = ok(wStatus)
  if (canWrite) exposedWrite++

  let readState
  let readExposed = false
  if (actual.total === null) {
    readState = `service_role失敗(${actual.status})`
    inconclusive++
  } else if (actual.total === 0) {
    // 実データが無いテーブルは、この方式では読み取り遮断を確認できない
    readState = '判定不能(実データ0件)'
    inconclusive++
  } else if (!ok(seen.status)) {
    readState = `拒否(${seen.status})`
  } else if (seen.total === 0) {
    readState = '遮断(0件)'
  } else if (seen.total < actual.total) {
    readState = `部分公開(${seen.total}件)`
    readExposed = true
  } else {
    readState = `全件公開(${seen.total}件)`
    readExposed = true
  }
  if (readExposed) exposedRead++

  const verdict = !readExposed && !canWrite ? 'OK' : '⚠️'
  console.log(
    `${t.padEnd(20)}${String(actual.total ?? '-').padStart(7)}${String(seen.total ?? '-').padStart(9)}  ` +
      `${readState.padEnd(20)}${String(wStatus).padStart(5)}   ${verdict}`,
  )
}

console.log('-'.repeat(72))
console.log(`anon から読める（実データあり）テーブル: ${exposedRead}`)
console.log(`anon から書き込めるテーブル            : ${exposedWrite} / ${TABLES.length}`)
if (inconclusive) {
  console.log(`実データ0件のため読み取り判定不能      : ${inconclusive}（書き込み判定は有効）`)
}

if (exposedRead === 0 && exposedWrite === 0) {
  console.log('\n✅ anon キー単体での読み取り・書き込みは全テーブルで拒否されています。')
  process.exit(0)
}
console.log('\n❌ anon キーでアクセスできるテーブルが残っています。027 が未適用の可能性があります。')
process.exit(1)
