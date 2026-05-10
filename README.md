# 職務経歴書管理システム

職務経歴書を作成、管理するためのシステムです。
HTML プレビューと PDF 出力を行うことができます。
通常モードでは `FastAPI + SQLite + Next.js` で動作し、デモモードでは `Next.js` 単体で動作します。

<p align="center">
  <a href="https://resume-builder-kappa-sooty.vercel.app/" target="_blank" rel="noopener noreferrer">
    <img src="https://img.shields.io/badge/Live%20Demo-Open%20on%20Vercel-111827?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo on Vercel" />
  </a>
</p>

## 機能

- プロフィール、自己PR、在籍履歴、プロジェクト、スキル、資格の編集 の管理
- プレビュー表示
- PDF 出力
- JSON バックアップのインポート / エクスポート
- セクション順やページ分割の設定

## ディレクトリ構成

```text
resume-builder/
  backend/      FastAPI + SQLite
  frontend/     Next.js
  start.sh      ローカルでの起動スクリプト
  example.json  サンプル用jsonデータ
```

## 動作モード

### 通常モード

バックエンドとフロントエンドを両方起動して使います。  
データは SQLite に保存されます。

### デモモード

`Next.js` 単体で動作します。  
データはサーバーに保存されず、ブラウザの `localStorage` にのみ保存されます。

特性:

- バックエンド不要
- Vercel にそのまま公開可能
- 個人情報がサーバーに残らない
- データはブラウザごとに分離される
- シークレットモードやストレージ削除で消える

## ローカル起動

### 通常モード

```bash
cd resume-builder
./start.sh
```

フロントエンドとバックエンドが同時に起動します。

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
- Framework Preset: `Next.js`
- Environment Variable: `NEXT_PUBLIC_DEMO_MODE=true`

注意:

- `NEXT_PUBLIC_API_URL` は設定しません
- PDF はサーバー生成ではなく、ブラウザの印刷ダイアログ経由で出力します

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
| `NEXT_PUBLIC_API_URL` | 通常モード時のバックエンド URL |

### バックエンド

| 変数名 | 説明 |
|---|---|
| `DATABASE_URL` | SQLite などの接続先 |
| `FRONTEND_URL` | CORS 許可するフロントエンド URL |

## 備考

- デモモードの PDF 出力はブラウザ依存です
- プレビューと PDF の見た目は可能な限り揃えていますが、完全一致は保証しません
