// app/api/faq/analyze/route.js
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
      body: JSON.stringify({ message: "FAQ 문서 분석 추가", content, sha })
    }
  );
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) return Response.json({ error: "파일 없음" }, { status: 400 });

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";
    let imagePart = null;

    if (fileName.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else if (fileName.endsWith(".pdf")) {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(s => s.str).join(" ") + "\n";
      }
    } else if (fileName.endsWith(".png") || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || fileName.endsWith(".webp")) {
      const mimeType = fileName.endsWith(".png") ? "image/png" : fileName.endsWith(".webp") ? "image/webp" : "image/jpeg";
      imagePart = { inline_data: { mime_type: mimeType, data: buffer.toString("base64") } };
    } else {
      // pptx, docx는 텍스트 추출이 복잡하므로 base64로 Gemini에 전달
      text = `[파일명: ${file.name}] 이 파일의 내용을 분석해주세요.`;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let parts;

    if (imagePart) {
      const promptText = `이 이미지(스크린샷/문서)의 내용을 분석해서 FAQ Q&A를 최대 20개 만들어주세요.
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
[{"q":"질문1","a":"답변1"}]`;
      parts = [{ text: promptText }, imagePart];
    } else {
      const prompt = `다음 문서 내용을 분석해서 FAQ Q&A를 최대 20개 추출해주세요.
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
[{"q":"질문1","a":"답변1"},{"q":"질문2","a":"답변2"}]

문서 내용:
${text.slice(0, 8000)}`;
      parts = [{ text: prompt }];
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] })
      }
    );
    const geminiData = await res.json();
    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const clean = raw.replace(/```json|```/g, "").trim();
    const qaList = JSON.parse(clean);

    const { content, sha } = await getFileSHA();
    const now = new Date().toLocaleDateString("ko-KR");
    const newItems = qaList.map(r => ({ id: Date.now() + Math.random(), q: r.q, a: r.a, source: file.name, addedAt: now }));
    await saveToGitHub([...content, ...newItems], sha);

    return Response.json({ count: newItems.length });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
