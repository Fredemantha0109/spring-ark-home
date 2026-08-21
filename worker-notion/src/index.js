/**
 * Notion API プロキシ (notion-proxy)
 *
 * ARK Home のブラウザ側から Notion API を叩くための最小プロキシ。
 * ブラウザに NOTION_TOKEN を置かないために存在する。
 *
 * 経緯:
 *   2026-08、Surge から GitHub Pages へ移行した際、Worker 側の CORS 許可
 *   オリジンが Surge のまま取り残され、Pages 側から全ての Notion 呼び出しが
 *   ブロックされていた（左サイドバー「Today's Tasks」が読み込みエラー）。
 *   ドメインを変えたら ALLOWED_ORIGINS を必ず追加すること。
 */

// CORS を許可するオリジン。ここに無いオリジンからのブラウザ呼び出しは
// ブラウザ側でブロックされる。ドメイン移行時はここを更新する。
const ALLOWED_ORIGINS = [
  'https://fredemantha0109.github.io',  // GitHub Pages（現行の本番）
  'https://spring-ark-home.surge.sh',   // Surge（移行前・まだ併存）
  'http://localhost:8000',              // ローカル確認用
  'http://127.0.0.1:8000',
];

const ALLOWED_METHODS = 'GET, POST, PATCH, OPTIONS';

// ワイルドカードにしていないのは、このプロキシが書き込み権限付きの
// トークンを注入するため。* にすると URL を知る誰でも Notion を読み書きできる。

function corsHeadersFor(origin) {
  const h = {
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': 'Content-Type, Notion-Version',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
  }
  return h;
}

function jsonError(code, message, status, headers) {
  return new Response(JSON.stringify({ object: 'error', status, code, message }), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeadersFor(origin);
    const url = new URL(request.url);

    // プリフライト
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (!ALLOWED_METHODS.includes(request.method)) {
      return jsonError('method_not_allowed', `Method not allowed: ${request.method}`, 405, cors);
    }

    // /v1/ 以外には通さない（何でも中継する開いたプロキシにしないため）
    if (!url.pathname.startsWith('/v1/')) {
      return jsonError('invalid_path', 'Only /v1/* is proxied.', 404, cors);
    }

    // 既存の Worker がどの名前でシークレットを持っていても動くようにしておく
    const token = env.NOTION_TOKEN || env.NOTION_API_KEY || env.NOTION_SECRET;
    if (!token) {
      return jsonError(
        'missing_token',
        'NOTION_TOKEN is not set on this Worker. Run: npx wrangler secret put NOTION_TOKEN',
        500,
        cors
      );
    }

    const upstreamUrl = `https://api.notion.com${url.pathname}${url.search}`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': request.headers.get('Notion-Version') || '2022-06-28',
    };
    const hasBody = request.method === 'POST' || request.method === 'PATCH';
    if (hasBody) headers['Content-Type'] = 'application/json';

    let upstream;
    try {
      upstream = await fetch(upstreamUrl, {
        method: request.method,
        headers,
        body: hasBody ? await request.text() : undefined,
      });
    } catch (e) {
      return jsonError('upstream_unreachable', String(e), 502, cors);
    }

    // Notion のレスポンスをそのまま返す。エラー応答にも CORS を付けるのが重要で、
    // 付け忘れるとブラウザ側では原因不明の "Failed to fetch" になる。
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...cors,
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
      },
    });
  },
};
