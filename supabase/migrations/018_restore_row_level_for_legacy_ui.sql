-- Migration 018: 017 でクリアした行レベル列を partner_contacts[0] から復元
--
-- 017 は連絡先・ログを partner_contacts[0] に移し、行レベル列を空にした。
-- しかし旧 UI（デプロイ反映待ち / キャッシュ）はまだ行レベルを読んでいるため、
-- 「実施記録なし」「LINE ID」などのプレースホルダしか出ない状況になった。
--
-- このマイグレーションは partner_contacts[0] の値を行レベルにも書き戻し、
-- 旧 UI と新 UI のどちらでも正しく表示されるようにする（二重保存）。
--
-- 副作用:
--   - 旧 UI から行を編集すると行レベルだけ更新され、partner_contacts と
--     乖離する可能性がある。新 UI のデプロイ完了後は旧 UI を使わないこと。
--
-- 冪等: partner_contacts[0] に値があれば行レベルへコピー、なければ '' / '[]'。

update youth_partnerships set
  contact_email     = coalesce(partner_contacts->0->>'email',     ''),
  contact_phone     = coalesce(partner_contacts->0->>'phone',     ''),
  contact_line      = coalesce(partner_contacts->0->>'line',      ''),
  contact_messenger = coalesce(partner_contacts->0->>'messenger', ''),
  logs              = coalesce(partner_contacts->0->'logs',       '[]'::jsonb)
where jsonb_array_length(coalesce(partner_contacts, '[]'::jsonb)) > 0;
