-- NEO ACADEMIA 2期生 ユースダッシュボード
-- Migration 005: candidates テーブルから youth_candidates へ全員同期
--
-- 004で投入済みの16名は ON CONFLICT DO NOTHING で保持。
-- candidates テーブルに存在するが youth_candidates にない候補者を追加。
-- persona (学生・起業型 etc.) → type に正規化。
-- status は全員 '応募完了'（最終面接段階に到達済みのため）。

insert into youth_candidates (name, kana, email, type, school, status, source, motivation) values
  ('義優香', 'よしゆうか', 'y10_a8_r7_t5@icloud.com', '社会人', '株式会社トライアルホールディングス 広報部', '応募完了', '知人からの紹介', null),
  ('國政雄太郎', 'くにまさ　ゆうたろう', 'xkunimasa@gmail.com', '大学生・専門学生・大学院生', '福岡大学 商学部第二部3年', '応募完了', 'ゼミの先生の紹介', null),
  ('新戸亜依', 'しんとあい', 'oshuzusuzu@gmail.com', '社会人', '太平洋商事株式会社', '応募完了', '知り合い',
   'NEO福岡の実践型プログラムに参加を希望した理由は、地域の現場に入り、実際に課題解決に取り組んでいる方々と直接関わりながら学びたいと考えたためです。'),
  ('秋穂朱花', 'あきほあやか', 'ak23a1su@apu.ac.jp', '大学生・専門学生・大学院生', '立命館アジア太平洋大学 国際経営学部3年', '応募完了', null, null),
  ('西岡恭侑', 'にしおかやすゆき', 'yasuyukinishioka961@gmail.com', '大学生・専門学生・大学院生', '九州大学 工学部3年', '応募完了', null, null),
  ('桑野櫻子', 'くわの さくらこ', null, '大学生・専門学生・大学院生', '福岡大学 法学部2年', '応募完了', null, null),
  ('岡村俊亮', 'おかむらしゅんすけ', 'shun.okmr@icloud.com', '大学生・専門学生・大学院生', '九州大学 薬学部4年', '応募完了', '知人の紹介', null),
  ('大宅花奈', 'おおやかな', 'kanaoya112@gmail.com', '大学生・専門学生・大学院生', '西南学院大学 法学部2年', '応募完了', '事務局紹介', null),
  ('藤松拓実', 'ふじまつたくみ', 'takumigoodjob@gmail.com', '大学生・専門学生・大学院生', 'Monash University Malaysia 1年', '応募完了', '浩江さん', null),
  ('吉田将吾', 'よしだしょうご', 'usho3910@gmail.com', '大学生・専門学生・大学院生', '九州産業大学 商学部3年', '応募完了', null, null),
  ('中村綾音', 'なかむらあやね', 'ayanenaka0829@icloud.com', '大学生・専門学生・大学院生', '九州大学 共創学部2年', '応募完了', null, null),
  ('渕脇大翔', 'ふちわきやまと', 'y326688@gmail.com', '大学生・専門学生・大学院生', '九州産業大学 商学部2年', '応募完了', null, null),
  ('新飼然生', 'しんかい　ぜんしょう', 'mjaeoo9129@yahoo.co.jp', '大学生・専門学生・大学院生', '福岡大学 商学部2年', '応募完了', '森田先生', null),
  ('杉本光', 'すぎもと ひかる', 'h.sugimoto2005@gmail.com', '大学生・専門学生・大学院生', '西南学院大学 商学部3年', '応募完了', 'Instagram', null),
  ('相良七海', 'さがらななみ', 'nanami.sagara6@gmail.com', '大学生・専門学生・大学院生', '北九州市立大学 地域創生学群1年', '応募完了', null, null),
  ('北村一樹', null, null, '大学生・専門学生・大学院生', null, '応募完了', null, null),
  ('岩崎俊太', 'イワサキシュンタ', 'popodog3916@gmail.com', '大学生・専門学生・大学院生', '九州大学 経済学部3年', '応募完了', null, null),
  ('倉光志歩', 'くらみつしほ', 'bunsin57fgj@gmail.com', '大学生・専門学生・大学院生', '九州産業大学 芸術学部3年', '応募完了', null, null),
  ('苅北沙絢', 'かりきたさあや', 'saaya.karikita@icloud.com', '大学生・専門学生・大学院生', '西南学院大学 経済学部国際経済学科2年生', '応募完了', null, null),
  ('城川士道', 'しろかわしどう', 's.s313@icloud.com', '大学生・専門学生・大学院生', '西南学院大学 商学部3年', '応募完了', null, null),
  ('西原鷹太', 'にしはらようた', 'youta_1125@icloud.com', '大学生・専門学生・大学院生', '福岡大学 商学部二部2年', '応募完了', null, null),
  ('今村大智', 'いまむらだいち', 'daichijincun@gmail.com', '大学生・専門学生・大学院生', '西南学院大学 法学部4年', '応募完了', '知人からの紹介', null),
  ('貝田美奈子', 'かいだみなこ', 'mkaida1204@gmail.com', '社会人', '福岡市', '応募完了', null, null)
on conflict (name) do nothing;

-- 004で投入済みだが candidates テーブルにも存在する候補者の
-- school（所属）を candidates テーブルの org に合わせて更新
-- （candidates 側がより正確な所属情報を持つため）
update youth_candidates set school = '九州大学 芸術工学府M1' where name = '松井克之';
update youth_candidates set school = '日本経済大学 経営学部2年' where name = '太田圭吾';
update youth_candidates set school = '九州工業大学大学院 情報工学府M1' where name = '東原陽世';
update youth_candidates set school = '立命館アジア太平洋大学 サステナビリティ観光学部4年' where name = '中田莉那';
update youth_candidates set school = '九州大学 農学部1年' where name = '大西雄大';
update youth_candidates set school = '九州大学 共創学部2年' where name = '松下優司';
update youth_candidates set school = '九州産業大学 芸術学部2年' where name = '茂山和寛';
update youth_candidates set school = '九州産業大学 理工学部情報科学科1年' where name = '三坪煌';
