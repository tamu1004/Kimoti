# Kimoti（Web版 MVP）

カップル向け「今、話しかけていいか」を共有する Web アプリです。プッシュ通知・ウィジェットは対象外です。

## セットアップ

### 1. 依存関係

```bash
npm install
```

### 2. Supabase（リージョン: Tokyo / ap-northeast-1）

1. [Supabase](https://supabase.com) でプロジェクトを作成する
2. Authentication → Sign In / Providers で Anonymous Sign-Ins を有効化する
3. SQL Editor で `supabase/migrations/20261003000000_init.sql` を実行する
4. Database → Replication で `current_signals` / `reactions` / `couple_members` が Realtime publication に入っていることを確認する

### 3. 環境変数

`.env.example` をコピーして `.env.local` を作る。

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

値は Project Settings → API の Project URL と anon public key。

メール認証は使わず、Supabaseの匿名ユーザーでセッションを作ります。ブラウザーのデータを消去するとアカウントに戻れないため、試用中はログアウト・サイトデータ消去をしないでください。

### 4. 起動

```bash
npm run dev
npm test
```

## Vercel デプロイ

1. このリポジトリを GitHub / Git に載せる
2. [Vercel](https://vercel.com) で Import
3. Environment Variables に `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を入れる
4. デプロイ後の URL を Supabase の Redirect URLs と Site URL に追加する

Framework Preset は Vite のままで問題ありません。SPA 用の rewrite は `vercel.json` にあります。

## ディレクトリ

- `src/domain/` React 非依存の型・判定ロジック
- `src/api/` Supabase 呼び出し
- `src/features/` `src/pages/` `src/components/` 画面

## 受け入れ確認（2アカウント）

- ペアリングできること、3人目は入れないこと
- 合図が Realtime で相手に届くこと
- `bad_cooldown` は期限なしで送れないこと
- 期限超過で再確認モーダルが出ること
- `expires_at` 後は「状態不明」になること
- 共有停止中は相手に内容が見えないこと
- 催促・既読・未更新の表示がないこと
