-- 全候補者のステータスを応募完了に統一
-- 面談のみで登録されていた7名（アプローチ中・特別選考付与）も応募者として扱う
update youth_candidates set status = '応募完了' where status != '応募完了';
