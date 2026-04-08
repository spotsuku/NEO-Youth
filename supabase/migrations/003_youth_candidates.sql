-- NEO ACADEMIA 2期生 ユースダッシュボード
-- Migration 003: youth_candidates + youth_sessions
--
-- 設計意図:
--   1人1レコードでパイプライン全体を管理する。
--   応募フォーム情報・1次面談情報・オンボーディング進捗を統合。
--   将来 candidates / interviews テーブルへ安全に移管できるよう
--   カラム名・型を揃えている。

-- ── ユース候補者（パイプライン統合テーブル）──────────────
create table if not exists youth_candidates (
  id              serial primary key,

  -- 基本情報
  name            text not null unique,
  kana            text,
  email           text,
  type            text,          -- 大学生・専門学生・大学院生 / 社会人
  school          text,          -- 所属（大学・企業名）
  grade           text,          -- 学年・役職

  -- パイプライン
  status          text default '未接触',
    -- 未接触 / アプローチ中 / 説明会参加済 / 応募完了
    -- 参加確定 / 特別選考付与 / 3期生候補 / 対応不要
  yomi            text,          -- SS / S / AA / A
  source          text,          -- 紹介元（Instagram, 1期生紹介, etc.）

  -- 応募フォーム
  applied_at      timestamptz,
  motivation      text,
  interview2_dates text,         -- 2次面接希望日（テキスト）
  interview3_dates text,         -- 3次面接調整状況

  -- 1次面談（リファラルヒアリング）
  referral        text,          -- 紹介者
  interview_handler text,        -- 面談担当
  interview_date  text,          -- 面談実施日
  interview_course text,         -- 進路希望（起業 / 地元企業 / etc.）
  interview_result text,         -- 結果（特別選考枠付与 / 付与なし（一般応募））
  interview_notes text,          -- 面談メモ

  -- オンボーディング
  ob_final_exam       boolean default false,  -- 最終選考
  ob_mail_sent        boolean default false,  -- 合格メール
  ob_payment          boolean default false,  -- 入金
  ob_training         boolean default false,  -- 事前研修
  ob_photo            boolean default false,  -- 写真撮影
  ob_portal           boolean default false,  -- ポータルログイン
  ob_slack            boolean default false,  -- Slack参加
  ob_profile          boolean default false,  -- プロフィール登録
  ob_motivation_written boolean default false, -- 動機記載
  ob_pledge           boolean default false,  -- 誓約書
  ob_handbook         boolean default false,  -- 生徒手���

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- updated_at 自動更新（共通関数は001で定義済み）
create trigger youth_candidates_updated_at
  before update on youth_candidates
  for each row execute function update_updated_at();

-- ── 説明会出席記録 ────────────────────────────
create table if not exists youth_sessions (
  id              serial primary key,
  candidate_name  text not null,
  session_label   text not null,  -- '2026/3/14(土)：12:00〜14:00'
  attended        boolean default false,
  age             text,
  type            text,           -- 大学・専門学生 / 社会人 / その他
  org             text,           -- 所属
  created_at      timestamptz default now()
);

-- ── インデックス ──────────────────────────────
create index if not exists idx_youth_candidates_name   on youth_candidates(name);
create index if not exists idx_youth_candidates_status on youth_candidates(status);
create index if not exists idx_youth_sessions_name     on youth_sessions(candidate_name);

-- ── RLS ───────────────────────────────────
alter table youth_candidates enable row level security;
alter table youth_sessions   enable row level security;

create policy "youth_candidates_read"   on youth_candidates for select using (true);
create policy "youth_candidates_insert" on youth_candidates for insert with check (true);
create policy "youth_candidates_update" on youth_candidates for update using (true);

create policy "youth_sessions_read"     on youth_sessions for select using (true);
create policy "youth_sessions_insert"   on youth_sessions for insert with check (true);
create policy "youth_sessions_update"   on youth_sessions for update using (true);
