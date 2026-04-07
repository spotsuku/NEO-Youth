# NEO ACADEMIA 2期生 最終面接シート

NEO ACADEMIA 第2期生の最終面接選考管理システムです。  
Next.js 14 (App Router) + Supabase + Vercel 構成。

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **データベース**: Supabase (PostgreSQL)
- **デプロイ**: Vercel
- **言語**: TypeScript

## セットアップ

### 1. Supabase プロジェクト設定

1. [supabase.com](https://supabase.com) でプロジェクト作成
2. SQL Editor で以下の順番にマイグレーションを実行：

```sql
-- ① テーブル作成
supabase/migrations/001_init.sql

-- ② 候補者データ投入（32名）
supabase/migrations/002_seed_candidates.sql
```

3. Project Settings → API から以下をコピー：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role)

### 2. ローカル開発

```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local
# .env.local を編集して Supabase の値を入力

# 開発サーバー起動
npm run dev
```

→ http://localhost:3000 でアクセス

### 3. Vercel デプロイ

1. GitHub にプッシュ
2. [vercel.com](https://vercel.com) でリポジトリをインポート
3. Environment Variables に以下を設定：

| 変数名 | 値 |
|--------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |

4. Deploy → 完了

## ファイル構成

```
neo-interview/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── candidates/route.ts        # GET /api/candidates
│   │   │   └── interviews/
│   │   │       ├── route.ts               # GET /api/interviews
│   │   │       └── [name]/route.ts        # PUT /api/interviews/:name
│   │   ├── layout.tsx
│   │   ├── page.tsx                       # Server Component (データfetch)
│   │   └── globals.css
│   ├── components/
│   │   ├── InterviewDashboard.tsx         # クライアント状態管理
│   │   ├── Sidebar.tsx                    # 候補者リスト・フィルター
│   │   ├── CandidateSheet.tsx             # 1人1ページの面接シート
│   │   └── *.module.css
│   ├── lib/
│   │   └── supabase.ts
│   └── types/
│       └── index.ts
├── supabase/
│   └── migrations/
│       ├── 001_init.sql                   # テーブル定義
│       └── 002_seed_candidates.sql        # 32名データ
├── .env.example
└── README.md
```

## データ更新

候補者データを変更する場合は `supabase/migrations/002_seed_candidates.sql` を  
Supabase SQL Editor で再実行（UPSERT なので重複しません）。

## 主な機能

- **32名の候補者**を左サイドバーから選択
- **2次選考採点**グラフ表示（笑顔/リスペクト/前提超越/熱量/地頭力/素直さ）
- **確認ポイント**チェックリスト（選考シートから自動抽出）
- **最終面接採点**（6項目×4点 = 24点満点、合計自動計算）
- **面接メモ**インライン記入（第一印象・良かった点・懸念点・総評）
- **最終判定**（合格/ボーダー/不合格）
- **Supabase に自動保存**（リアルタイム反映）
- **フィルター**（A合格圏/B要審議/C敗者復活/D不合格）・検索
- **印刷対応**（@media print）
