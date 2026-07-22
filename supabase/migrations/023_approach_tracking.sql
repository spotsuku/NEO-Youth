-- Migration 023: アプローチ管理（ユースDB改修）
--
-- 背景:
--   応募前の「アプローチ対象者」を7段階ファネルで追跡する仕組みと、
--   学校連携（youth_partnerships）の契約管理・資料添付を追加する。
--
-- 方針:
--   既存テーブル・既存データは一切変更しない。新しいカラム／テーブルとして
--   共存させる（既存の status / FlowTab の選考フローとは別軸の「step」を追加）。
--   物理テーブル名・APIパスは変更しない（表示ラベルのみ別途「学校連携」に変更）。

-- ── youth_candidates: アプローチ管理カラムを追加 ──────────────
alter table youth_candidates
  add column if not exists step             text default '未観測',
    -- 対象外 / 未観測 / イベント参加（1回） / イベント参加（複数回） /
    -- 1on1実施 / アカデミア興味あり / アカデミア参加口頭内諾
  add column if not exists entry_year       int,          -- 入学年度（学年自動算出に使用）
  add column if not exists course_length    int default 3, -- 規定年数（超過で「卒業」判定）
  add column if not exists next_action      text,         -- ネクストアクション
  add column if not exists na_due_date      date,         -- NA期限
  add column if not exists na_written_at    date,         -- NA記入日（更新時に自動セット、手動上書き可）
  add column if not exists contact_method   text,         -- 連絡手段（select_optionsより）
  add column if not exists inflow_source    text,         -- 流入経路（select_optionsより）
  add column if not exists note             text,         -- 備考（URLはUI側で自動リンク化）
  add column if not exists partner_id       uuid references youth_partnerships(id),
  add column if not exists archived         boolean not null default false;

create index if not exists idx_youth_candidates_step     on youth_candidates(step);
create index if not exists idx_youth_candidates_archived on youth_candidates(archived);

-- ── step_history: ステップ変更履歴（ファネル分析用） ──────────────
create table if not exists step_history (
  id                  serial primary key,
  youth_candidate_id  int references youth_candidates(id) on delete cascade,
  from_step           text,
  to_step             text,
  changed_at          timestamptz default now(),
  changed_by          text
);

create index if not exists idx_step_history_candidate on step_history(youth_candidate_id);
create index if not exists idx_step_history_changed_at on step_history(changed_at);

-- step 変更時に自動記録するトリガー
-- changed_by は API 層から `set_config('app.changed_by', <name>, true)` で受け渡す
-- （ログイン機能がないため、クライアントが localStorage の「操作者名」を送る運用）
create or replace function log_step_history()
returns trigger as $$
begin
  if old.step is distinct from new.step then
    insert into step_history (youth_candidate_id, from_step, to_step, changed_by)
    values (new.id, old.step, new.step, nullif(current_setting('app.changed_by', true), ''));
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists youth_candidates_step_history on youth_candidates;
create trigger youth_candidates_step_history
  after update on youth_candidates
  for each row execute function log_step_history();

alter table step_history enable row level security;
drop policy if exists "step_history_read" on step_history;
drop policy if exists "step_history_insert" on step_history;
create policy "step_history_read"   on step_history for select using (true);
create policy "step_history_insert" on step_history for insert with check (true);

-- ── select_options: 連絡手段／流入経路の編集可能な選択肢マスタ ──────────────
create table if not exists select_options (
  id          serial primary key,
  list_key    text not null check (list_key in ('contact_method', 'inflow_source')),
  value       text not null,
  sort_order  int default 0,
  created_at  timestamptz default now(),
  unique (list_key, value)
);

alter table select_options enable row level security;
drop policy if exists "select_options_read"   on select_options;
drop policy if exists "select_options_insert" on select_options;
drop policy if exists "select_options_update" on select_options;
drop policy if exists "select_options_delete" on select_options;
create policy "select_options_read"   on select_options for select using (true);
create policy "select_options_insert" on select_options for insert with check (true);
create policy "select_options_update" on select_options for update using (true);
create policy "select_options_delete" on select_options for delete using (true);

insert into select_options (list_key, value, sort_order)
select * from (values
  ('contact_method', 'LINE', 1),
  ('contact_method', 'メール', 2),
  ('contact_method', '電話', 3),
  ('contact_method', 'Instagram DM', 4),
  ('contact_method', 'X DM', 5),
  ('contact_method', '対面', 6),
  ('contact_method', 'その他', 7),
  ('inflow_source', 'イベント', 1),
  ('inflow_source', '紹介', 2),
  ('inflow_source', 'SNS', 3),
  ('inflow_source', '学校連携', 4),
  ('inflow_source', '問い合わせ', 5),
  ('inflow_source', 'その他', 6)
) as seed(list_key, value, sort_order)
where not exists (select 1 from select_options);

-- ── youth_partnerships（学校連携）: 契約管理・資料添付カラムを追加 ──────────────
alter table youth_partnerships
  add column if not exists is_contracted boolean not null default false,
  add column if not exists logo_url      text,
  add column if not exists documents     jsonb not null default '[]'::jsonb;
    -- documents: [{ "name": "...", "url": "...", "uploaded_at": "..." }]

create index if not exists idx_youth_partnerships_is_contracted on youth_partnerships(is_contracted);

-- ── Storage: ロゴ・資料アップロード用バケット ──────────────
insert into storage.buckets (id, name, public)
select 'partner-assets', 'partner-assets', true
where not exists (select 1 from storage.buckets where id = 'partner-assets');

drop policy if exists "partner_assets_read"   on storage.objects;
drop policy if exists "partner_assets_insert" on storage.objects;
drop policy if exists "partner_assets_update" on storage.objects;
drop policy if exists "partner_assets_delete" on storage.objects;

create policy "partner_assets_read"   on storage.objects for select using (bucket_id = 'partner-assets');
create policy "partner_assets_insert" on storage.objects for insert with check (bucket_id = 'partner-assets');
create policy "partner_assets_update" on storage.objects for update using (bucket_id = 'partner-assets');
create policy "partner_assets_delete" on storage.objects for delete using (bucket_id = 'partner-assets');
