// app/api/feedback/route.js
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const FEEDBACK_PATH = "data/feedback.json";

async function getFileSHA() {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${FEEDBACK_PATH}`,
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" } }
  );
  if (res.status === 404) return { sha: null, content: [] };
  const data = await res.json();
  return { sha: data.sha, content: JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8')) };
}

async function saveToGitHub(data, sha) {
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${FEEDBACK_PATH}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "피드백 저장", content, sha: sha || undefined })
    }
  );
}

export async function GET() {
  try {
    const { content } = await getFileSHA();
    return Response.json(content);
  } catch {
    return Response.json([]);
  }
}

export async function POST(request) {
  const { question, answer, time } = await request.json();
  const { content, sha } = await getFileSHA();
  const newItem = { id: Date.now(), question, answer, time, corrected: null };
  content.push(newItem);
  await saveToGitHub(content, sha);
  return Response.json(newItem);
}

export async function PUT(request) {
  const { id, corrected } = await request.json();
  const { content, sha } = await getFileSHA();
  const idx = content.findIndex(f => f.id === id);
  if (idx === -1) return Response.json({ error: "없음" }, { status: 404 });
  content[idx].corrected = corrected;
  await saveToGitHub(content, sha);
  return Response.json(content[idx]);
}

export async function DELETE(request) {
  const { id } = await request.json();
  const { content, sha } = await getFileSHA();
  const filtered = content.filter(f => f.id !== id);
  await saveToGitHub(filtered, sha);
  return Response.json({ ok: true });
}
