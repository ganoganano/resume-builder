# 職務経歴書管理システム

職務経歴書を構造化データとして管理し、編集・再利用・出力をしやすくするためのシステムです。
スプレッドシートや PDF ベースの管理で起きやすい、更新の手間、レイアウト調整、データ再利用のしづらさを減らすことを目的としています。

このシステムで解決したい課題:

- 職務経歴書の更新のたびにレイアウト調整が発生する
- PDF やスプレッドシートでは AI や他システムで再利用しづらい
- 保存形式ごとに内容を転記・変換する手間がかかる

<p align="center">
  <a href="https://resume-builder-kappa-sooty.vercel.app/preview" target="_blank" rel="noopener noreferrer">
    <img src="https://img.shields.io/badge/Live%20Demo-Open%20on%20Vercel-111827?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo on Vercel" />
  </a>
</p>

## 機能

- 職務経歴書を構成する要素の編集
  - プロフィール
  - 自己PR
  - 在籍履歴
  - プロジェクト
  - スキル
  - 資格
- プレビュー表示
- PDF出力
- JSON形式でのインポート / エクスポート
- セクション順やページ分割の設定

### Todo

- [ ] バックエンドにMCPサーバーを実装
- [ ] 各転職サイトなどに合わせたテンプレート機能
- [ ] gemini APIへのリクエスト機能

## ディレクトリ構成

```text
resume-builder/
  backend/      FastAPI + SQLite
  frontend/     Next.js
  docker-compose.yml
  example.json  サンプル用jsonデータ
```

## 動作モード

### 通常モード

バックエンドとフロントエンドを両方起動して使います。  
データは SQLite に保存されます。

### デモモード

`Next.js` 単体で動作します。  
データはサーバーに保存されず、ブラウザの `localStorage` にのみ保存されます。

- デモモードの特性
  - バックエンド不要
  - Vercel にそのまま公開可能
  - 個人情報がサーバーに残らない
  - データはブラウザごとに分離される
  - ブラウザのシークレットモードやlocal storage削除で情報が消える

## 起動方法

### 通常モード

起動:

```bash
docker compose up --build
```

- フロントエンド: `http://localhost:3000`
- バックエンド: ホストには公開されず、Docker ネットワーク内で `frontend` からのみ接続されます
- SQLite: Docker volume `resume_data` に保存されます

停止:

```bash
docker compose down
```

データ削除:

```bash
docker compose down -v
```

### デモモード

```bash
cd resume-builder/frontend
npm install
NEXT_PUBLIC_DEMO_MODE=true npm run dev
```

このモードではバックエンドは不要です。

## Vercel でデモ公開

このアプリはデモモードで Vercel に公開できます。

設定値:

- Root Directory: `resume-builder/frontend`
- Root Directory: `frontend`
- Framework Preset: `Next.js`
- Environment Variable: `NEXT_PUBLIC_DEMO_MODE=true`

注意:

- `NEXT_PUBLIC_API_URL` は設定しません
- PDFはブラウザの印刷ダイアログ経由で出力します
  - 見た目が崩れる可能性があります

## バックアップ

設定画面から JSON をインポート / エクスポートできます。

- 通常モード: バックエンド API 経由で保存・復元
- デモモード: `localStorage` の内容を JSON として保存・復元
- example.json がサンプルなので参考にしてください

## 環境変数

### フロントエンド

| 変数名 | 説明 |
|---|---|
| `NEXT_PUBLIC_DEMO_MODE` | `true` のときデモモードで動作 |
| `NEXT_PUBLIC_API_URL` | ブラウザから直接参照する外部バックエンド URL。通常の Docker Compose 起動では不要 |
| `INTERNAL_API_URL` | Next.js サーバーがバックエンドへ接続する内部 URL。Docker Compose では `http://backend:8000` |

### バックエンド

| 変数名 | 説明 |
|---|---|
| `DATABASE_URL` | SQLite などの接続先 |
| `FRONTEND_URL` | CORS 許可するブラウザ公開 URL |

## 備考

- デモモードのPDF出力はブラウザ依存です
- プレビューとPDFの見た目は可能な限り揃えていますが、完全一致は保証しません
