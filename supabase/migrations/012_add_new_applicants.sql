-- Migration 012: 応募フォームからの新規6名追加

insert into youth_candidates (name, kana, email, type, school, grade, status, applied_at, source) values
  ('宮本 航聖', 'みやもと こうせい', 'jasc78.kmiyamoto@gmail.com', '大学生・専門学生・大学院生', '九州大学', '共創学部 1年生', '応募完了', '2026-03-22', '知人からの紹介'),
  ('濱田晃輔', 'はまだこうすけ', 'hamakosrr09@gmail.com', '大学生・専門学生・大学院生', '福岡大学', '工学部2年生', '応募完了', '2026-03-22', '知人からの紹介'),
  ('清田隼利', 'きよたはやと', 'kiyota0929apple@gmail.com', '社会人', '匠ギャラリー', '運営', '応募完了', '2026-03-22', 'その他'),
  ('山上 理貴', 'やまがみ りき', 'yamariki0201@gmail.com', '社会人', '株式会社理貴の趣味部屋', '代表', '応募完了', '2026-03-22', '知人からの紹介'),
  ('清尾海斗', 'せいおかいと', '99kaito21@gmail.com', '社会人', 'フリーランス', '映像制作', '応募完了', '2026-03-22', 'Instagram'),
  ('照屋拓実', 'てるやたくみ', 'takumi0229suki@gmail.com', '大学生・専門学生・大学院生', '福岡大学', '法学部4年生', '応募完了', '2026-03-22', 'NEO ACADEMIA 1期生からの紹介')
on conflict (name) do nothing;
