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

    // 웹페이지 가져오기
    const pageRes = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await pageRes.text();

    // HTML 태그 제거
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);

    // Gemini로 Q&A 추출
    const apiKey = process.env.GEMINI_API_KEY;
    const prompt = `다음 웹페이지 내용을 분석해서 FAQ Q&A를 최대 20개 추출해주세요.
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
[{"q":"질문1","a":"답변1"},{"q":"질문2","a":"답변2"}]

웹페이지 내용:
${text}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const geminiData = await res.json();
    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const clean = raw.replace(/```json|```/g, "").trim();
    const qaList = JSON.parse(clean);

    const { content, sha } = await getFileSHA();
    const newItems = qaList.map(r => ({ id: Date.now() + Math.random(), q: r.q, a: r.a }));
    await saveToGitHub([...content, ...newItems], sha);

    return Response.json({ count: newItems.length });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
