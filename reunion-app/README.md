# reunion-app

帰国後 再会スケジュール管理アプリ（Vite + React + TypeScript）。

- 公開URL: https://fredemantha0109.github.io/spring-ark-home/reunion/
- ビルド成果物: リポジトリ直下の `reunion/`（`vite.config.ts` の `outDir`）
- 実データ: `reunion/data/people.json` / `reunion/data/meetings.json`
  配信パスそのものが実データの置き場所。アプリからの書き込みは GitHub Contents API で
  このファイルを直接更新するため、更新後の再ビルドは不要。

## 開発

```
npm install
npm run dev       # http://localhost:5173/spring-ark-home/reunion/
npm run build     # ../reunion/ へ出力（reunion/data は消さない）
npm run preview
```

`npm run dev` ではデータファイルを取得できないため、`src/data/seed.ts` のシードで動作する
（画面上部に注意バナーが出る）。

## GitHub トークン

書き込みには Fine-grained personal access token が必要。アプリの「入力」タブ →
「設定 — GitHub トークン」で登録すると、その端末の localStorage にのみ保存される。

- Repository access: `Fredemantha0109/spring-ark-home` のみ
- Permissions: Contents → Read and write

トークンをリポジトリや `.env` に置かないこと。Vite の `import.meta.env.VITE_*` は
公開されるJSバンドルへそのまま埋め込まれるため、秘密情報には使えない。
