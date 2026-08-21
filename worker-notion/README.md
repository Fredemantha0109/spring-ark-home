# notion-proxy

ARK Home のブラウザ側から Notion API を叩くためのプロキシ Worker。
ブラウザに `NOTION_TOKEN` を置かないために存在する。

デプロイ先: `https://notion-proxy.y-furuya0109.workers.dev`

## なぜこのディレクトリがあるか

この Worker はもともとリポジトリ外で管理されていたため、壊れたときに
原因が追えなかった。2026-08 の GitHub Pages 移行では、Worker 側の CORS
許可オリジンが Surge のまま取り残され、Pages 側からの Notion 呼び出しが
すべてブロックされていた（左サイドバー「Today's Tasks」が読み込みエラー、
「気にかけたい」の放置日数の自動取得も不能）。
同じことを繰り返さないためにソースをここに置いている。

## デプロイ

```
cd worker-notion
npx wrangler deploy
```

`name` は既存の Worker と同じ `notion-proxy` にしてあるので、上書き更新に
なる。**シークレットは Worker に紐づいて残るので、再デプロイしても
`NOTION_TOKEN` を入れ直す必要はない。** 未設定の場合のみ:

```
npx wrangler secret put NOTION_TOKEN
```

シークレット名が `NOTION_API_KEY` / `NOTION_SECRET` でも動くようにしてある。

## ドメインを変えたとき

`src/index.js` の `ALLOWED_ORIGINS` に新しいオリジンを追加してから
デプロイする。**ここを忘れると、ブラウザ側は原因不明の
`TypeError: Failed to fetch` になるだけで、何も手掛かりが出ない。**

ワイルドカード `*` にしていないのは、このプロキシが書き込み権限付きの
トークンを注入するため。`*` にすると URL を知る誰でも Notion を読み書きできる。

## 動作確認

```
# ブラウザからの呼び出しを模す（200 が返ればCORS OK）
curl -si -X OPTIONS https://notion-proxy.y-furuya0109.workers.dev/v1/pages/xxx \
  -H 'Origin: https://fredemantha0109.github.io' | head -5
```

`access-control-allow-origin` が返っていれば直っている。

## Notion 側の共有設定

`404 object_not_found` が返る場合は Worker ではなく Notion 側の問題。
対象ページを開き `⋯` → 「接続」→ `spring-ark-home` を追加する。
インテグレーションに共有されていないページは API から見えない。
