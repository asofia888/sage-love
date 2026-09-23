# `api/` — HTTP エンドポイント専用

このディレクトリには **`export default` の handler を持つファイルだけ** を置くこと。

Vercel は `api/` 配下の `.ts` を **1ファイル = 1 Serverless Function** に変換する。
ヘルパーやデータモジュールをここに置くと関数数を消費し、プランの上限
（Hobby は 1 デプロイあたり 12 関数）を超えた時点で **ビルドは成功するのに
デプロイだけが Error になる**。ビルドログは正常に見えるので原因が分かりにくい。

実例: 聖者プロンプトを `api/prompts/`（8ファイル）に置いたところ、
`api/` 配下が 12 → 20 になり、3回連続でデプロイが失敗した（2026-09-23）。

サーバー専用のライブラリは **`server/`** に置き、ここからは `../server/...`
で import する。`server/` はルーティングされないので、ファイルをいくつ足しても
関数数は増えない。

現在のエンドポイント:

| パス | ファイル |
|---|---|
| `POST /api/chat` | `chat.ts` |
| `GET /api/health` | `health.ts` |
| `GET /api/admin/stats` | `admin/stats.ts`（`ADMIN_TOKEN` 必須） |
