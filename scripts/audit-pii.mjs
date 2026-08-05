#!/usr/bin/env node
/**
 * リポジトリ内のメールアドレス露出を数える。値は一切出力しない。
 *
 *   node scripts/audit-pii.mjs            # 現在のHEADのみ
 *   node scripts/audit-pii.mjs --history  # 到達可能な全コミットも走査（重い）
 *
 * 用途:
 *   - git-filter-repo で履歴を書き換えた後、実際にPIIが消えたことを確認する
 *   - 書き換え前に実行して「検出できること」自体を自己テストする
 *
 * 検出方法はメールアドレスのみ（氏名の日本語文字列は誤検出が多すぎるため
 * 定量的な指標にしていない）。0件が「PIIが無い」ことの証明にはならない
 * 点に注意 — この形式のPIIが見つからないことの確認に留まる。
 */
import { execFileSync } from 'node:child_process'

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const PLACEHOLDER_RE = /@(example\.(com|org)|localhost)$/i
const TEXT_EXT_RE = /\.(sql|md|ts|tsx|json|css|txt)$/i

function sh(...args) {
  return execFileSync('git', args, { encoding: 'utf8' })
}

function realEmails(text) {
  const found = new Set(text.match(EMAIL_RE) ?? [])
  for (const e of [...found]) {
    if (PLACEHOLDER_RE.test(e)) found.delete(e)
  }
  return found
}

function scanHead() {
  const files = sh('ls-tree', '-r', '--name-only', 'HEAD')
    .split('\n')
    .filter((f) => f && TEXT_EXT_RE.test(f))

  const perFile = new Map()
  const all = new Set()
  for (const f of files) {
    let content
    try {
      content = sh('show', `HEAD:${f}`)
    } catch {
      continue
    }
    const emails = realEmails(content)
    if (emails.size > 0) {
      perFile.set(f, emails.size)
      for (const e of emails) all.add(e)
    }
  }
  return { perFile, total: all.size }
}

function scanHistory() {
  const revs = sh('rev-list', '--all').split('\n').filter(Boolean)
  const all = new Set()
  // git grep は複数リビジョンを一度に受け付けるが、出力から値を拾わず
  // 「マッチした」という事実だけ使うため、パターンでの grep -c は使わない。
  // 代わりに各リビジョンのツリー全体を対象に一括で走査する。
  let out = ''
  try {
    out = execFileSync(
      'git',
      ['grep', '-ohE', EMAIL_RE.source, ...revs, '--'],
      { encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 },
    )
  } catch (e) {
    // git grep はヒットなしで exit 1 を返す。stdout があれば使う。
    out = e.stdout ?? ''
  }
  for (const line of out.split('\n')) {
    const e = line.trim()
    if (e && !PLACEHOLDER_RE.test(e)) all.add(e)
  }
  return { total: all.size, commitsScanned: revs.length }
}

const checkHistory = process.argv.includes('--history')

console.log('検出方式: メールアドレスのパターンマッチのみ（件数のみ出力、値は出力しない）\n')

const head = scanHead()
console.log(`HEAD 時点のユニークな実メールアドレス: ${head.total}`)
if (head.perFile.size > 0) {
  console.log('ファイル別件数:')
  for (const [f, n] of [...head.perFile.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${f}`)
  }
} else {
  console.log('  (該当ファイルなし)')
}

let historyTotal = 0
if (checkHistory) {
  console.log()
  const hist = scanHistory()
  historyTotal = hist.total
  console.log(`全履歴（到達可能な${hist.commitsScanned}コミット）のユニークな実メールアドレス: ${hist.total}`)
}

console.log()
if (head.total === 0 && historyTotal === 0) {
  console.log('✅ メールアドレスの露出は検出されませんでした。')
  process.exit(0)
}
console.log('⚠️ メールアドレスが検出されました。上記件数を確認してください。')
process.exit(1)
