// app/api/faq/crawl/route.js
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const FAQ_PATH = "data/faq.json";

async function getFileSHA() {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${FAQ_PATH}`,
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" } }
  );
  const data = await res.json();
  return { sha: data.sha, content: JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8')) };
}

async function saveToGitHub(faqData, sha) {
  const content = Buffer.from(JSON.stringify(faqData, null, 2)).toString('base64');
  await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${FAQ_PATH}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "FAQ URL 학습 추가", content, sha })
    }
  );
}

export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url) return Response.json({ error: "URL 없음" }, { status: 400 });

    const pageRes = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await pageRes.text();

    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // 이미지 URL 추출 (상대경로 -> 절대경로 변환)
    const imgMatches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
    const baseUrl = new URL(url);
    const imageUrls = imgMatches.map(m => {
      try { return new URL(m[1], baseUrl).href; } catch { return null; }
    }).filter(Boolean).slice(0, 20); // 최대 20장

    const apiKey = process.env.GEMINI_API_KEY;
    let qaList = [];

    if (text.length > 50) {
      // 텍스트가 충분하면 텍스트 기반 분석
      const prompt = `다음 웹페이지 내용을 분석해서 FAQ Q&A를 최대 20개 추출해주세요.
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
[{"q":"질문1","a":"답변1"}]

웹페이지 내용:
${text.slice(0, 8000)}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
      );
      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      qaList = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } else if (imageUrls.length > 0) {
      // 텍스트가 없으면 이미지 기반 분석 (매뉴얼 이미지 등)
      const imageParts = [];
      for (const imgUrl of imageUrls) {
        try {
          const imgRes = await fetch(imgUrl);
          const buf = Buffer.from(await imgRes.arrayBuffer());
          const mimeType = imgUrl.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
          imageParts.push({ inline_data: { mime_type: mimeType, data: buf.toString("base64") } });
        } catch { /* 개별 이미지 실패 시 skip */ }
      }

      const promptText = `이 이미지들은 매뉴얼 페이지입니다. 내용을 분석해서 FAQ 형태의 Q&A를 최대 20개 만들어주세요.
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
[{"q":"질문1","a":"답변1"}]`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: promptText }, ...imageParts] }] })
        }
      );
      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      qaList = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } else {
      return Response.json({ error: "분석할 텍스트나 이미지가 없습니다" }, { status: 400 });
    }

    const { content, sha } = await getFileSHA();
    const now = new Date().toLocaleDateString("ko-KR");
    const newItems = qaList.map(r => ({ id: Date.now() + Math.random(), q: r.q, a: r.a, source: url, addedAt: now }));
    await saveToGitHub([...content, ...newItems], sha);

    return Response.json({ count: newItems.length });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
