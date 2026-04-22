-- Migration 016: 団体連携（大学・団体との提携管理）テーブル
--
-- 背景:
--   PartnershipsTab は当初 localStorage のみに保存していたため、
--   ユーザー間で編集が共有されなかった。他タブ（youth_candidates など）
--   と同じように Supabase を SSOT として全ユーザーで同期させる。
--
-- 設計:
--   partner_contacts（先方担当・複数）と logs（実施内容ログ・複数）は
--   JSONB で1行にまとめる。Excel風 UI で行ごとに編集されるため、
--   正規化よりも行単位の読み書きの方が単純で高速。
--
--   例:
--     partner_contacts = [{ "name": "田中 一郎", "role": "共創学部 准教授" }, ...]
--     logs             = [{ "date": "2026-02-14", "content": "..." }, ...]

create table if not exists youth_partnerships (
  id                  uuid primary key default gen_random_uuid(),
  university          text,
  partner_contacts    jsonb not null default '[]'::jsonb,
  internal_handler    text,
  contact_email       text,
  contact_phone       text,
  contact_line        text,
  contact_messenger   text,
  partnership_details text,
  logs                jsonb not null default '[]'::jsonb,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create trigger youth_partnerships_updated_at
  before update on youth_partnerships
  for each row execute function update_updated_at();

create index if not exists idx_youth_partnerships_university on youth_partnerships(university);
create index if not exists idx_youth_partnerships_created    on youth_partnerships(created_at);

-- ── RLS ───────────────────────────────────
alter table youth_partnerships enable row level security;

create policy "youth_partnerships_read"   on youth_partnerships for select using (true);
create policy "youth_partnerships_insert" on youth_partnerships for insert with check (true);
create policy "youth_partnerships_update" on youth_partnerships for update using (true);
create policy "youth_partnerships_delete" on youth_partnerships for delete using (true);

-- ── 初期データ（既存 seed 3件） ───────────────────
-- 既に行がある場合は二重投入しない（初回のみ実行される）
insert into youth_partnerships (university, partner_contacts, internal_handler, contact_email, contact_phone, contact_line, contact_messenger, partnership_details, logs)
select * from (values
  (
    '九州大学',
    '[{"name":"田中 一郎","role":"共創学部 准教授"},{"name":"佐藤 花子","role":"キャリア支援センター"}]'::jsonb,
    '三木浩汰',
    'tanaka@kyushu-u.ac.jp', '092-000-0000', 'kyudai_tanaka', '',
    '授業連携・インターン紹介・共同イベント開催',
    '[{"date":"2026-02-14","content":"共創学部1年生向け授業で三木が講演実施（テーマ：起業家精神）"},{"date":"2026-03-10","content":"キャリア支援センターでNEO ACADEMIA説明会を実施"}]'::jsonb
  ),
  (
    '九州産業大学',
    '[{"name":"山田 太郎","role":"芸術学部 教授"}]'::jsonb,
    '橡木彩乃',
    'yamada@kyusan-u.ac.jp', '092-111-1111', '', 'yamada.taro',
    'アート・デザイン領域での連携、ポートフォリオ講座',
    '[{"date":"2026-03-07","content":"芸術学部学生向け説明会を開催"}]'::jsonb
  ),
  (
    '立命館アジア太平洋大学',
    '[{"name":"鈴木 美咲","role":"サステナビリティ観光学部 講師"}]'::jsonb,
    '三木浩汰',
    'suzuki@apu.ac.jp', '', '', '',
    '地方創生領域での共同プロジェクト検討',
    '[]'::jsonb
  )
) as seed(university, partner_contacts, internal_handler, contact_email, contact_phone, contact_line, contact_messenger, partnership_details, logs)
where not exists (select 1 from youth_partnerships);
