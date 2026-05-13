-- Migration 022: 社内担当を先方担当ごとに持たせる
--
-- 背景:
--   社内担当は団体全体に1つではなく、先方担当（人）ごとに変わる運用。
--   既存の行レベル internal_handler は「団体全体の担当」として残しつつ、
--   partner_contacts の各要素に internal_handler フィールドを追加する。
--
-- マイグレーション動作:
--   各 partner_contact に internal_handler を追加。
--   既に値があれば保持、無ければ行レベル internal_handler をコピー。
--   行レベル internal_handler はそのまま残置（UI で「団体全体の担当」として参照表示）。
--
-- 冪等: partner_contact->>'internal_handler' を coalesce で見るので再実行可。

update youth_partnerships yp
set partner_contacts = sub.merged
from (
  select
    yp2.id,
    jsonb_agg(
      c.contact || jsonb_build_object(
        'internal_handler',
        coalesce(
          nullif(c.contact->>'internal_handler', ''),
          yp2.internal_handler,
          ''
        )
      )
      order by c.ord
    ) as merged
  from youth_partnerships yp2,
       jsonb_array_elements(coalesce(yp2.partner_contacts, '[]'::jsonb))
         with ordinality as c(contact, ord)
  where jsonb_array_length(coalesce(yp2.partner_contacts, '[]'::jsonb)) > 0
  group by yp2.id
) sub
where yp.id = sub.id;
