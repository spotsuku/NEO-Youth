-- Migration 009: オンボーディング変更履歴 + 面談記録テーブル

-- ── オンボーディング変更履歴 ─────────────────────────
create table if not exists youth_ob_logs (
  id              serial primary key,
  candidate_name  text not null,
  field_name      text not null,       -- ob_final_exam etc.
  field_label     text not null,       -- 最終選考 etc.
  new_value       boolean not null,
  changed_at      timestamptz default now()
);

create index if not exists idx_youth_ob_logs_name on youth_ob_logs(candidate_name);

alter table youth_ob_logs enable row level security;
create policy "youth_ob_logs_read"   on youth_ob_logs for select using (true);
create policy "youth_ob_logs_insert" on youth_ob_logs for insert with check (true);

-- ── 面談記録（1候補者に対し複数回） ───────────────────────
create table if not exists youth_interviews (
  id              serial primary key,
  candidate_name  text not null,
  handler         text,                -- 面談担当
  interview_date  text,                -- 面談日
  course          text,                -- 進路希望
  result          text,                -- 結果
  notes           text,                -- 議事録
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger youth_interviews_updated_at
  before update on youth_interviews
  for each row execute function update_updated_at();

create index if not exists idx_youth_interviews_name on youth_interviews(candidate_name);

alter table youth_interviews enable row level security;
create policy "youth_interviews_read"   on youth_interviews for select using (true);
create policy "youth_interviews_insert" on youth_interviews for insert with check (true);
create policy "youth_interviews_update" on youth_interviews for update using (true);
