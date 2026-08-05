#!/usr/bin/env node
/**
 * 自由記述フィールドに「要配慮個人情報」（個人情報保護法2条3項）に該当しうる
 * 記述が無いかをキーワードでスクリーニングする。
 *
 *   node scripts/scan-sensitive-fields.mjs
 *
 * 出力するのは「カテゴリ / テーブル / カラム / 行ID / ヒットしたキーワード」
 * のみ。本文（前後の文脈を含む実際の記述）は一切出力しない。
 * 行IDで担当者自身がSupabaseダッシュボード上で該当行を確認する運用を想定する。
 *
 * 限界:
 *   - キーワード一致による機械的なスクリーニングであり、誤検出・見逃しの
 *     両方が起こりうる（例:「精神」が「精神論」のような無関係な文脈にも
 *     一致する、婉曲表現や比喩は検出できない）。
 *   - 法的な該当性の最終判断はキーワード一致では行えない。人による確認が必須。
 *   - service_role キーを使うため RLS の影響を受けない（全行を見る）。
 */
import { readFileSync } from 'node:fs'

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
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('.env.local に NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要です')
  process.exit(2)
}
const headers = { apikey: key, Authorization: `Bearer ${key}` }

// 個人情報保護法2条3項の要配慮個人情報カテゴリに沿ったキーワード。
// 網羅的ではない。誤検出前提の一次スクリーニング。
const CATEGORIES = {
  人種_信条: ['人種', '民族', '部落', '同和', '宗教', '信仰', '教団', '思想信条'],
  社会的身分: ['生活保護', '児童養護', '養護施設', '里親', '婚外子'],
  病歴: [
    '病気', '疾患', '持病', '通院', '入院', '手術', '診断書', '診断され',
    'うつ病', 'うつ状態', '統合失調症', '発達障害', 'ADHD', '自閉', '双極性',
    'パニック障害', '精神障害', '精神疾患', '服薬', '治療中', '主治医',
  ],
  障害: ['障害者手帳', '身体障害', '知的障害', '精神障害者', '視覚障害', '聴覚障害', '車椅子', '障がい'],
  犯罪歴: ['逮捕', '前科', '有罪判決', '起訴され', '犯罪歴', '少年院', '保護観察'],
  犯罪被害: ['被害者', '虐待', 'ドメスティックバイオレンス', 'DV被害', 'いじめ被害', 'ハラスメント被害', '性被害'],
  健康診断等: ['健康診断の結果', '血液検査', '精密検査', '検査結果が'],
}

const TARGETS = [
  {
    table: 'candidates',
    columns: [
      'persona', 'sec2_comment', 'strengths', 'concerns', 'overall_comment',
      'motivation', 'pr', 'contribution', 'career', 'check_points',
    ],
  },
  {
    table: 'interviews',
    columns: [
      'impression', 'checkpoints_memo', 'positives', 'negatives',
      'final_comment', 'verdict_reason', 'neo_connection', 'neo_strategy', 'own_challenge',
    ],
  },
  {
    table: 'youth_candidates',
    columns: [
      'motivation', 'interview_notes', 'rejected_reason', 'note',
      'pr', 'contribution', 'career', 'next_action', 'source', 'referral',
    ],
  },
  {
    table: 'youth_partnerships',
    columns: ['partnership_details', 'logs'], // logs は jsonb 配列。文字列化して走査する
  },
  {
    table: 'interview_logs',
    columns: ['old_value', 'new_value'],
  },
]

async function fetchRows(table, columns) {
  const select = ['id', ...columns].join(',')
  const res = await fetch(`${url}/rest/v1/${table}?select=${select}&limit=2000`, { headers })
  if (!res.ok) throw new Error(`${table}: ${res.status}`)
  return res.json()
}

function asText(value) {
  if (value == null) return ''
  return typeof value === 'string' ? value : JSON.stringify(value)
}

const hits = [] // { table, id, column, category, keyword }

for (const { table, columns } of TARGETS) {
  let rows
  try {
    rows = await fetchRows(table, columns)
  } catch (e) {
    console.error(`⚠️ ${table} の取得に失敗: ${e.message}`)
    continue
  }
  for (const row of rows) {
    for (const col of columns) {
      const text = asText(row[col])
      if (!text) continue
      for (const [category, keywords] of Object.entries(CATEGORIES)) {
        for (const kw of keywords) {
          if (text.includes(kw)) {
            hits.push({ table, id: row.id, column: col, category, keyword: kw })
          }
        }
      }
    }
  }
}

console.log('要配慮個人情報スクリーニング — キーワード一致のみ。本文は出力しない。\n')

if (hits.length === 0) {
  console.log('✅ 対象カラムにキーワード一致はありませんでした。')
  console.log('   (誤検出・見逃しがありうる一次スクリーニングである点に留意)')
  process.exit(0)
}

console.log(`⚠️ ${hits.length} 件のキーワード一致（延べ件数、重複含む）\n`)

const byCategory = {}
for (const h of hits) {
  byCategory[h.category] ??= []
  byCategory[h.category].push(h)
}

for (const [category, list] of Object.entries(byCategory)) {
  console.log(`## ${category}  (${list.length} 件)`)
  for (const h of list) {
    console.log(`   table=${h.table.padEnd(18)} id=${String(h.id).padEnd(6)} column=${h.column.padEnd(20)} keyword="${h.keyword}"`)
  }
  console.log()
}

console.log('本文は表示していません。上記の table/id をSupabaseダッシュボードで開いて')
console.log('目視確認してください。「精神論」等の無関係な一致を含む可能性があります。')
process.exit(1)
