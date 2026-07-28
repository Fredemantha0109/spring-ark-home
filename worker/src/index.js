export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, history } = body || {};
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contents = [];
    if (Array.isArray(history)) {
      for (const turn of history.slice(-10)) {
        if (turn && turn.role && turn.text) {
          contents.push({
            role: turn.role === "user" ? "user" : "model",
            parts: [{ text: String(turn.text) }],
          });
        }
      }
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    const payload = {
      contents,
      systemInstruction: {
        parts: [
          {
            text:
              "あなたはサッカー(フットボール)全般に詳しいアシスタントです。日本語で、簡潔かつ正確に答えてください。" +
              "最新の試合結果・移籍情報・順位など現在の情報が必要な場合はGoogle検索の結果を根拠にして答え、" +
              "分からないことは推測せず分からないと伝えてください。",
          },
        ],
      },
      tools: [{ google_search: {} }],
    };

    let upstream;
    try {
      upstream = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY,
          },
          body: JSON.stringify(payload),
        }
      );
    } catch (e) {
      return new Response(JSON.stringify({ error: "fetch_failed", detail: String(e) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(JSON.stringify({ error: "upstream_error", detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await upstream.json();
    const candidate = data?.candidates?.[0];
    const text =
      candidate?.content?.parts?.map((p) => p.text || "").join("") ||
      "(応答を取得できませんでした)";
    const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map((c) => (c?.web?.uri ? { title: c.web.title || c.web.uri, uri: c.web.uri } : null))
      .filter(Boolean);

    return new Response(JSON.stringify({ reply: text, sources }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  },
};
