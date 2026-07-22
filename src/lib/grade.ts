// 入学年度から学年を算出する（日本の学年暦、4/1切替）
//
// 年度 = 対象日が1〜3月なら「年 − 1」、4〜12月なら「年」
// 学年 = 現在年度 − entry_year + 1
// 学年が courseLength を超えたら「卒業」

export function fiscalYear(date: Date): number {
  const y = date.getFullYear()
  const m = date.getMonth() + 1 // 1-12
  return m <= 3 ? y - 1 : y
}

export function calcGrade(
  entryYear: number | null | undefined,
  courseLength = 3,
  today: Date = new Date(),
): string | null {
  if (!entryYear) return null
  const grade = fiscalYear(today) - entryYear + 1
  if (grade < 1) return null // 入学年度が未来（データ不整合）
  if (grade > courseLength) return '卒業'
  return `${grade}年`
}
