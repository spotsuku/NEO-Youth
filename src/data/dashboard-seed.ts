import type {
  DashboardApplicant,
  DashboardInterview,
  OnboardingRecord,
  Partnership,
  SessionRecord,
  StatusData,
  YomiData,
} from '@/types/dashboard'

export const APPLICANTS: DashboardApplicant[] = [
  {
    name: '大西雄大', kana: 'おおにしたけひろ', email: 'takkekyupy@gmail.com', ts: '2026-03-10',
    type: '大学生・専門学生・大学院生', school: '九州大学', grade: '農学部 1年生',
    motivation: '僕は将来、環境ビジネスで世界を動かすリーダーになると決めています。しかし、現時点では「根拠のない自信」しか持ち合わせておらず、理想と実力の乖離に強い危機感を抱いています。',
    interview2: '候補日①：2026/03/30(月) 19:00~21:00, 候補日②：2026/04/01(水) 19:00~21:00',
    interview3: '上記の日程で調整可能', source: 'None',
  },
  {
    name: '東原 陽世', kana: 'ひがしばら　ようせい', email: 'yousei1171@outlook.jp', ts: '2026-03-13',
    type: '大学生・専門学生・大学院生', school: '九州工業大学大学院', grade: '情報工学府　情報創成工学専攻　新修士1年',
    motivation: '志願した理由は、１つ目は将来のビジョンと重なった点と２つ目は福岡を愛している点があります。',
    interview2: '候補日①：2026/03/30(月) 19:00~21:00, 候補日②：2026/04/01(水) 19:00~21:00, 候補日③：2026/04/04(土) 13:00~15:00, 候補日④：2026/04/04(土) 17:00~19:00',
    interview3: '上記の日程で調整可能', source: 'None',
  },
  {
    name: '茂山和寛', kana: 'しげやまかずひろ', email: '0510012762kazu@gmail.com', ts: '2026-03-15',
    type: '大学生・専門学生・大学院生', school: '九州産業大学', grade: '芸術学部二年生',
    motivation: 'NEO ACADEMIAに応募した動機は、１期生に一般生として参加しNeo事務局の方やユース選抜の同期の何でも楽しんで挑戦できる空気感と熱量に感動したので',
    interview2: '候補日②：2026/04/01(水) 19:00~21:00, 候補日③：2026/04/04(土) 13:00~15:00, 候補日④：2026/04/04(土) 17:00~19:00',
    interview3: '上記の日程で調整可能', source: 'None',
  },
  {
    name: '松下優司', kana: 'まつしたゆうじ', email: 'yousi6150@gmail.com', ts: '2026-03-17',
    type: '大学生・専門学生・大学院生', school: '九州大学', grade: '共創学部2年生',
    motivation: '本プログラムを志望した直接の契機は、九州大学アルティメット部の先輩であり、実際に第一期に参加されていた山本健志様からの強い勧めです。',
    interview2: '候補日①：2026/03/30(月) 19:00~21:00', interview3: '希望日時あり', source: 'None',
  },
  {
    name: '太田圭吾', kana: 'おおたけいご', email: 'keigo6018o@gmail.com', ts: '2026-03-18',
    type: '大学生・専門学生・大学院生', school: '日本経済大学', grade: '経営学2年',
    motivation: 'NEO AWARDで味わった圧倒的な挫折と悲しさが、私のすべての原動力です。自分の力不足を痛感したあの日から「素直に学び、即座に社会でアウトプットする」ことを自身のルールとしました。',
    interview2: '候補日③：2026/04/04(土) 13:00~15:00, 候補日④：2026/04/04(土) 17:00~19:00',
    interview3: '上記の日程で調整可能', source: 'NEO ACADEMIA 1期生からの紹介',
  },
  {
    name: '原口知佳', kana: 'はらぐちともか', email: 'tomoka.2013@icloud.com', ts: '2026-03-18',
    type: '社会人', school: '九州大学病院', grade: '看護師',
    motivation: '私には尊敬している人が多くいますが、その中でも特に「こんな人になりたい」と心から目指している人が一人います。私は、その人に少しでも近づくために、NEO ACADEMIAに応募します。',
    interview2: '候補日③：2026/04/04(土) 13:00~15:00, 候補日④：2026/04/04(土) 17:00~19:00',
    interview3: '全ての日程で調整が難しい', source: 'NEO ACADEMIA 1期生からの紹介',
  },
  {
    name: '松井克之', kana: 'まついかつゆき', email: 'matsui.katsuyuki.328@s.kyushu-u.ac.jp', ts: '2026-03-18',
    type: '大学生・専門学生・大学院生', school: '九州大学', grade: '芸術工学府1年生',
    motivation: '私は「デザインの力」を用いて、誰もがより過ごしやすいと感じる社会を創りたいと考え、本プログラムを志望します。',
    interview2: '候補日③：2026/04/04(土) 13:00~15:00, 候補日④：2026/04/04(土) 17:00~19:00',
    interview3: '上記の日程で調整可能', source: 'None',
  },
  {
    name: '藤田　陸', kana: 'ふじた　りく', email: 'ricyuma@icloud.com', ts: '2026-03-20',
    type: '社会人', school: '', grade: '',
    motivation: '去年参加できたなかったので参加したい',
    interview2: '候補日②：2026/04/01(水) 19:00~21:00, 候補日③：2026/04/04(土) 13:00~15:00, 候補日④：2026/04/04(土) 17:00~19:00',
    interview3: '上記の日程で調整可能', source: 'Instagram',
  },
  {
    name: '中田莉那', kana: 'なかだりな', email: 'nakadarina0605@gmail.com', ts: '2026-03-21',
    type: '大学生・専門学生・大学院生', school: '立命館アジア太平洋大学', grade: 'サステナビリティ観光学部新4回生',
    motivation: '理数科から藝大受験、宅浪、そしてAPUという既存の型に揺われない歩みの中で、私は常に「正解を学ぶ」のではなく「自ら正解を創る」生き方を希求してきました。',
    interview2: '候補日③：2026/04/04(土) 13:00~15:00, 候補日④：2026/04/04(土) 17:00~19:00',
    interview3: '希望日時あり', source: 'その他',
  },
]

export const INTERVIEWS: DashboardInterview[] = [
  {
    name: '藤本優凪', kana: 'ふじもと ゆうな', referral: '橡木彩乃', handler: '三木浩汰',
    org: '山口大学教育学部', date: '2026-02-10', type: '大学生', course: '地元企業',
    result: '付与なし（一般応募）', notes: '特別選考枠付与でもよいが、本人が進路に悩んでいるらしく、一般で応募するとのこと。',
  },
  {
    name: '中西あやね', kana: 'なかにし あやね', referral: '橡木彩乃', handler: '三木浩汰',
    org: '大分大学', date: '2026-02-12', type: '大学生', course: '地元企業',
    result: '付与なし（一般応募）', notes: 'tabippo02026代表。トビタテ15期（大学）。海外への関心が強い。アクティブな子。',
  },
  {
    name: '中西けいと', kana: 'なかにし けいと', referral: '橡木彩乃', handler: '三木浩汰',
    org: '九州大学経済学2年', date: '2026-02-13', type: '大学生', course: '起業',
    result: '付与なし（一般応募）', notes: '2/1時点：2期生興味050％ QSIS共同代表。 博運社採択。',
  },
  {
    name: 'キム ヨンウ', kana: 'きむ よんう', referral: '橡木彩乃', handler: '三木浩汰',
    org: '北九州市立大学1年生', date: '2026-02-14', type: '大学生', course: '起業',
    result: '付与なし（一般応募）', notes: '2/1時点：2期生興味050％。起業している（香水）。三坂こうくんと友達。AWARD複数応募。',
  },
  {
    name: '平田匠', kana: 'ひらた たくみ', referral: '橡木彩乃', handler: '三木浩汰',
    org: 'V&E create', date: '2026-02-14', type: '社会人', course: '起業',
    result: '特別選考枠付与', notes: '2/1時点：2期生興味100％。中村学園大学卒業、のち起業。CICによくいて、大豆チップスを製造・販売。',
  },
  {
    name: '近藤大輝', kana: 'こんどう だいき', referral: '橡木彩乃', handler: '三木浩汰',
    org: 'HARE株式会社', date: '2026-02-14', type: '社会人', course: '起業',
    result: '特別選考枠付与', notes: '2/1時点：2期生興味050％。株式会社ハレで働いているが、転職を考えていて上司も応援している。',
  },
  {
    name: '三坪煌', kana: 'みつぼ こう', referral: '橡木彩乃', handler: '三木浩汰',
    org: '九州産業大学1年', date: '2026-02-18', type: '大学生', course: '起業',
    result: '特別選考枠付与', notes: '2/1時点：2期生興味050％ 起業に興味あり。 タカトリ採択。 キムくんの高校での友達。Flab第３回優勝。',
  },
]

export const ONBOARDING: OnboardingRecord[] = [
  { email: 'takkekyupy@gmail.com', name: '大西雄大', final_exam: false, mail_sent: false, payment: false, training: false, photo: false, portal: false, slack: false, profile: false, motivation_written: false, pledge: false, handbook: false },
  { email: 'yousei1171@outlook.jp', name: '東原 陽世', final_exam: false, mail_sent: false, payment: false, training: false, photo: false, portal: false, slack: false, profile: false, motivation_written: false, pledge: false, handbook: false },
  { email: '0510012762kazu@gmail.com', name: '茂山和寛', final_exam: false, mail_sent: false, payment: false, training: false, photo: false, portal: false, slack: false, profile: false, motivation_written: false, pledge: false, handbook: false },
  { email: 'yousi6150@gmail.com', name: '松下優司', final_exam: false, mail_sent: false, payment: false, training: false, photo: false, portal: false, slack: false, profile: false, motivation_written: false, pledge: false, handbook: false },
  { email: 'keigo6018o@gmail.com', name: '太田圭吾', final_exam: false, mail_sent: false, payment: false, training: false, photo: false, portal: false, slack: false, profile: false, motivation_written: false, pledge: false, handbook: false },
  { email: 'tomoka.2013@icloud.com', name: '原口知佳', final_exam: false, mail_sent: false, payment: false, training: false, photo: false, portal: false, slack: false, profile: false, motivation_written: false, pledge: false, handbook: false },
  { email: 'matsui.katsuyuki.328@s.kyushu-u.ac.jp', name: '松井克之', final_exam: false, mail_sent: false, payment: false, training: false, photo: false, portal: false, slack: false, profile: false, motivation_written: false, pledge: false, handbook: false },
  { email: 'ricyuma@icloud.com', name: '藤田 陸', final_exam: false, mail_sent: false, payment: false, training: false, photo: false, portal: false, slack: false, profile: false, motivation_written: false, pledge: false, handbook: false },
  { email: 'nakadarina0605@gmail.com', name: '中田莉那', final_exam: false, mail_sent: false, payment: false, training: false, photo: false, portal: false, slack: false, profile: false, motivation_written: false, pledge: false, handbook: false },
]

export const SESSIONS: SessionRecord[] = [
  { attended: true, name: '木村光希', age: '18', type: 'その他', org: '福岡県立須恵高等学校', session: '2026/3/14(土)：12:00〜14:00' },
  { attended: true, name: '岩崎俊太', age: '', type: '大学・専門学生', org: '九州大学', session: '2026/3/14(土)：12:00〜14:00' },
  { attended: true, name: '安部こと葉', age: '16', type: 'その他', org: '福岡雙葉高等学校', session: '2026/3/14(土)：13:00〜14:00' },
  { attended: true, name: '大宅 花奈', age: '20', type: '大学・専門学生', org: '西南学院大学', session: '2026/3/18(水)：19:00〜20:00' },
  { attended: true, name: '中村綾音', age: '19', type: '大学・専門学生', org: '九州大学', session: '2026/3/18(水)：19:00〜20:00' },
  { attended: false, name: '川津葵', age: '19', type: '大学・専門学生', org: '中村学園大学', session: '2026/3/18(水)：19:00〜20:00' },
  { attended: true, name: '相良七海', age: '18', type: '大学・専門学生', org: '北九州市立大学', session: '2026/3/18(水)：19:00〜21:00' },
  { attended: true, name: '藤井 誠人', age: '20', type: '大学・専門学生', org: '福岡工業大学', session: '2026/3/3(火)：19:00〜20:00' },
  { attended: true, name: '今村大智', age: '22', type: '大学・専門学生', org: '西南学院大学', session: '2026/3/3(火)：19:00〜20:00' },
  { attended: true, name: '木下茉莉花', age: '', type: '', org: '九州大学 共創学部', session: '2026/3/3(火)' },
  { attended: true, name: '倉光志歩', age: '', type: '', org: '九州産業大学芸術学部', session: '2026/3/3(火)' },
  { attended: true, name: '鳥飼龍幸', age: '', type: '', org: '福岡工業大学', session: '2026/3/3(火)' },
  { attended: true, name: '原口知佳', age: '', type: '', org: '九州大学病院', session: '2026/3/7(土)' },
  { attended: true, name: '茂山和寛', age: '', type: '', org: '九州産業大学', session: '2026/3/7(土)' },
  { attended: true, name: '藤本優凪', age: '', type: '', org: '山口大学', session: '2026/3/7(土)' },
]

export const STATUS_DATA: StatusData[] = [
  { status: '応募完了', count: 41, color: 'var(--accent)' },
  { status: '説明会・イベント参加済', count: 33, color: 'var(--accent2)' },
  { status: 'アプローチ中', count: 55, color: 'var(--gold)' },
  { status: '3期生候補', count: 11, color: '#b04fff' },
  { status: '対応不要', count: 193, color: 'var(--muted2)' },
  { status: '未接触', count: 80, color: 'var(--border)' },
]

export const YOMI_DATA: YomiData[] = [
  { yomi: 'SS 口頭内諾', count: 25, color: 'var(--accent)' },
  { yomi: 'S 説明会・面談', count: 32, color: 'var(--accent2)' },
  { yomi: 'AA イベント複数', count: 32, color: 'var(--gold)' },
  { yomi: 'A イベント単発', count: 223, color: 'var(--muted)' },
]

export const PARTNERSHIPS: Partnership[] = [
  {
    id: 'p-1',
    university: '九州大学',
    partnerContacts: [
      { name: '田中 一郎', role: '共創学部 准教授' },
      { name: '佐藤 花子', role: 'キャリア支援センター' },
    ],
    internalHandler: '三木浩汰',
    contact: {
      email: 'tanaka@kyushu-u.ac.jp',
      phone: '092-000-0000',
      line: 'kyudai_tanaka',
      messenger: '',
    },
    partnershipDetails: '授業連携・インターン紹介・共同イベント開催',
    logs: [
      { date: '2026-02-14', content: '共創学部1年生向け授業で三木が講演実施（テーマ：起業家精神）' },
      { date: '2026-03-10', content: 'キャリア支援センターでNEO ACADEMIA説明会を実施' },
    ],
  },
  {
    id: 'p-2',
    university: '九州産業大学',
    partnerContacts: [
      { name: '山田 太郎', role: '芸術学部 教授' },
    ],
    internalHandler: '橡木彩乃',
    contact: {
      email: 'yamada@kyusan-u.ac.jp',
      phone: '092-111-1111',
      line: '',
      messenger: 'yamada.taro',
    },
    partnershipDetails: 'アート・デザイン領域での連携、ポートフォリオ講座',
    logs: [
      { date: '2026-03-07', content: '芸術学部学生向け説明会を開催' },
    ],
  },
  {
    id: 'p-3',
    university: '立命館アジア太平洋大学',
    partnerContacts: [
      { name: '鈴木 美咲', role: 'サステナビリティ観光学部 講師' },
    ],
    internalHandler: '三木浩汰',
    contact: {
      email: 'suzuki@apu.ac.jp',
      phone: '',
      line: '',
      messenger: '',
    },
    partnershipDetails: '地方創生領域での共同プロジェクト検討',
    logs: [],
  },
]

export const KANBAN_COLS = [
  { key: '応募完了', label: '応募完了', count: 41, color: 'var(--accent)' },
  { key: 'アプローチ中', label: 'アプローチ中', count: 55, color: 'var(--accent2)' },
  { key: '説明会参加済', label: '説明会参加済', count: 33, color: 'var(--gold)' },
  { key: '参加確定', label: '参加確定', count: 3, color: 'var(--accent2)' },
  { key: '特別選考付与', label: '特別選考付与', count: 1, color: 'var(--gold)' },
  { key: '未接触', label: '未接触', count: 80, color: 'var(--muted)' },
  { key: '3期生候補', label: '3期生候補', count: 11, color: '#b04fff' },
  { key: '対応不要', label: '対応不要', count: 193, color: 'var(--muted2)' },
]
