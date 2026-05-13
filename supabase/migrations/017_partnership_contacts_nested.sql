-- Migration 017: 団体連携 — 連絡先・ログを先方担当ごとに格納する
--
-- 変更点:
--   旧構造: 行に contact_email/phone/line/messenger と logs を持ち、
--          partner_contacts は [{name, role}] だけ。
--   新構造: 先方担当（=人）ごとに連絡先とログを保持。
--          partner_contacts = [{name, role, email, phone, line, messenger, logs: [{date, content}]}]
--
-- 既存データは、行レベルの contact_* / logs を「最初の先方担当」に集約。
-- 2人目以降は空フィールド付き。冪等（重複実行しても壊れない）。
--
-- 行レベルのカラム (contact_email/phone/line/messenger, logs) は
-- 後方互換のため残置するが、新 API はもう書き込まない。

update youth_partnerships yp
set partner_contacts = sub.merged
from (
  select
    yp2.id,
    jsonb_agg(
      case when t.ord = 1 then
        coalesce(t.contact, '{}'::jsonb) || jsonb_build_object(
          'email',     coalesce(t.contact->>'email',     yp2.contact_email,     ''),
          'phone',     coalesce(t.contact->>'phone',     yp2.contact_phone,     ''),
          'line',      coalesce(t.contact->>'line',      yp2.contact_line,      ''),
          'messenger', coalesce(t.contact->>'messenger', yp2.contact_messenger, ''),
          'logs',      coalesce(t.contact->'logs',       yp2.logs,              '[]'::jsonb)
        )
      else
        coalesce(t.contact, '{}'::jsonb) || jsonb_build_object(
          'email',     coalesce(t.contact->>'email',     ''),
          'phone',     coalesce(t.contact->>'phone',     ''),
          'line',      coalesce(t.contact->>'line',      ''),
          'messenger', coalesce(t.contact->>'messenger', ''),
          'logs',      coalesce(t.contact->'logs',       '[]'::jsonb)
        )
      end
      order by t.ord
    ) as merged
  from youth_partnerships yp2,
       jsonb_array_elements(
         case
           when jsonb_array_length(coalesce(yp2.partner_contacts, '[]'::jsonb)) = 0
             then '[{"name":"","role":""}]'::jsonb
           else yp2.partner_contacts
         end
       ) with ordinality as t(contact, ord)
  group by yp2.id
) sub
where yp.id = sub.id;

-- 注意:
--   以前ここで行レベル列（contact_email/phone/line/messenger, logs）を
--   '' / '[]' に空寄せしていたが、デプロイ反映が遅れている環境で
--   旧 UI が「実施記録なし」しか表示しなくなったため取り消した。
--   今後は行レベルと partner_contacts[0] を二重保持して、
--   旧 UI / 新 UI どちらでも閲覧できるようにする。
--   行レベル列の正式な削除は将来別マイグレーションで行う。
