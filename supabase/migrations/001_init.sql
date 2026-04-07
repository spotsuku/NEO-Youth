-- NEO ACADEMIA 2期生 最終面接シート
-- Supabase Migration 001: Initial Schema

-- 候補者テーブル（Excelデータから生成、読み取り専用運用）
create table if not exists candidates (
  id          serial primary key,
  name        text not null unique,
  kana        text,
  org         text,
  persona     text,
  email       text,
  final_date  text,
  doc_score   integer default 0,
  referral    text,

  -- 2次選考
  sec2_group      text,
  sec2_evaluator  text,
  sec2_score_smile      integer default 0,  -- 笑顔
  sec2_score_respect    integer default 0,  -- リスペクト
  sec2_score_premise    integer default 0,  -- 前提超越
  sec2_score_passion    integer default 0,  -- 熱量
  sec2_score_thinking   integer default 0,  -- 地頭力
  sec2_score_honest     integer default 0,  -- 素直さ
  sec2_total      integer default 0,
  sec2_eval       text,   -- A/B/C/D
  sec2_comment    text,

  -- 1次選考評価
  strengths       text,
  concerns        text,
  overall         text,   -- 採用/ボーダー/不採用
  overall_comment text,

  -- 応募書類
  motivation      text,
  pr              text,
  contribution    text,
  career          text,
  check_points    text,

  created_at  timestamptz default now()
);

-- 最終面接記録テーブル（面接官が記入）
create table if not exists interviews (
  id            serial primary key,
  candidate_id  integer references candidates(id) on delete cascade,
  candidate_name text not null,

  -- 面接基本情報
  interview_date  text,
  interviewer     text,

  -- 最終面接採点（6項目 × /4点）
  score_smile     integer check (score_smile between 1 and 4),
  score_respect   integer check (score_respect between 1 and 4),
  score_premise   integer check (score_premise between 1 and 4),
  score_passion   integer check (score_passion between 1 and 4),
  score_thinking  integer check (score_thinking between 1 and 4),
  score_honest    integer check (score_honest between 1 and 4),
  score_total     integer generated always as (
    coalesce(score_smile,0) + coalesce(score_respect,0) +
    coalesce(score_premise,0) + coalesce(score_passion,0) +
    coalesce(score_thinking,0) + coalesce(score_honest,0)
  ) stored,

  -- 面接メモ
  impression      text,  -- 第一印象
  checkpoints_memo text, -- 確認ポイントへの回答
  positives       text,  -- 良かった点
  negatives       text,  -- 懸念点
  final_comment   text,  -- 総評

  -- 最終判定
  verdict         text check (verdict in ('合格', 'ボーダー', '不合格')),
  verdict_reason  text,

  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),

  unique(candidate_name)
);

-- updated_at 自動更新トリガー
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger interviews_updated_at
  before update on interviews
  for each row execute function update_updated_at();

-- RLS（Row Level Security）設定
alter table candidates enable row level security;
alter table interviews enable row level security;

-- candidatesは全員読み取り可能（認証なし）
create policy "candidates_read_all" on candidates
  for select using (true);

-- interviewsは全員読み書き可能（社内ツールのため簡易設定）
-- 本番では認証ユーザーのみに制限することを推奨
create policy "interviews_read_all" on interviews
  for select using (true);

create policy "interviews_insert_all" on interviews
  for insert with check (true);

create policy "interviews_update_all" on interviews
  for update using (true);

-- インデックス
create index if not exists idx_interviews_candidate_name on interviews(candidate_name);
create index if not exists idx_candidates_name on candidates(name);
