-- =============================================
-- 023: アプリ利用者テーブル（ロール管理）
--   role: 'admin'  = 管理者（評価・面談記録の閲覧、ユーザー管理が可能）
--         'member' = 一般（評価関連は閲覧不可）
-- =============================================

create table if not exists app_users (
  id bigserial primary key,
  email text not null unique,
  name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS を有効化しポリシーは作成しない
-- → service_role（サーバーAPI）経由でのみ読み書き可能
alter table app_users enable row level security;

-- 初期管理者: 三木智弘
insert into app_users (email, name, role)
values ('tomohiro_miki@sportsnation.jp', '三木智弘', 'admin')
on conflict (email) do update
  set role = 'admin',
      name = excluded.name,
      updated_at = now();
