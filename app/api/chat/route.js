// app/api/chat/route.js
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const FAQ_PATH = "data/faq.json";

async function loadFAQ() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FAQ_PATH}`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" } }
    );
    const data = await res.json();
    return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
  } catch {
    return [];
  }
}

export async function POST(request) {
  const { messages } = await request.json();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ reply: "API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  const faqList = await loadFAQ();
  const faqText = faqList.map(f => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");

  const SYSTEM_PROMPT = `당신은 비트컴퓨터 닥터비트사업부의 친절한 고객지원 AI 챗봇입니다.
의원급 EMR 소프트웨어(U차트, A차트, 비트플러스)를 사용하는 병·의원 고객의 기술 문의에 답변합니다.
고객센터: 02-3486-5432 / 운영: 평일 09:00~18:00

[중요 규칙]
- 반드시 한국어로만 답변하세요. 다른 언어를 절대 섞지 마세요.
- 친절하고 간결하게 답변하세요.
- 아래 FAQ를 최우선으로 참고하여 답변하세요.
- FAQ에 없는 내용은 고객센터(02-3486-5432) 연결을 안내하세요.

[FAQ]
${faqText}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

  const geminiMessages = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: geminiMessages,
      generationConfig: { maxOutputTokens: 1500 }
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.candidates?.[0]) {
    const errMsg = data.error?.message || JSON.stringify(data);
    return Response.json({ reply: "오류: " + errMsg }, { status: 500 });
  }

  const reply = data.candidates[0].content.parts[0].text;
  return Response.json({ reply });
}
