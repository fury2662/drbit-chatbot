// app/api/stats/route.js
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const STATS_PATH = "data/stats.json";

async function getFileSHA() {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${STATS_PATH}`,
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" } }
  );
  if (res.status === 404) return { sha: null, content: [] };
  const data = await res.json();
  return { sha: data.sha, content: JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8')) };
}

async function saveToGitHub(data, sha) {
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${STATS_PATH}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "질문 통계 업데이트", content, sha: sha || undefined })
    }
  );
}

// GET: Top 5 질문 반환
export async function GET() {
  try {
    const { content } = await getFileSHA();
    const counts = {};
    content.forEach(q => { counts[q] = (counts[q] || 0) + 1; });
    const top5 = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([q]) => q);
    return Response.json(top5);
  } catch {
    return Response.json([]);
  }
}

// POST: 질문 기록 저장
export async function POST(request) {
  const { question } = await request.json();
  if (!question?.trim()) return Response.json({ ok: false });
  const { content, sha } = await getFileSHA();
  content.push(question.trim());
  // 최근 1000개만 유지
  const trimmed = content.slice(-1000);
  await saveToGitHub(trimmed, sha);
  return Response.json({ ok: true });
}
