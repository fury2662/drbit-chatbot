// app/api/notice/route.js
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const NOTICE_PATH = "data/notice.json";

async function getFileSHA() {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${NOTICE_PATH}`,
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" } }
  );
  if (res.status === 404) return { sha: null, content: [] };
  const data = await res.json();
  return { sha: data.sha, content: JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8')) };
}

async function saveToGitHub(data, sha) {
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${NOTICE_PATH}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "공지사항 업데이트", content, sha: sha || undefined })
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
  const { title, body, important } = await request.json();
  const { content, sha } = await getFileSHA();
  const now = new Date().toLocaleDateString("ko-KR");
  const newItem = { id: Date.now(), title, body, important: !!important, createdAt: now, active: true };
  content.push(newItem);
  await saveToGitHub(content, sha);
  return Response.json(newItem);
}

export async function PUT(request) {
  const { id, title, body, important, active } = await request.json();
  const { content, sha } = await getFileSHA();
  const idx = content.findIndex(n => n.id === id);
  if (idx === -1) return Response.json({ error: "없음" }, { status: 404 });
  content[idx] = { ...content[idx], title, body, important: !!important, active: !!active };
  await saveToGitHub(content, sha);
  return Response.json(content[idx]);
}

export async function DELETE(request) {
  const { id } = await request.json();
  const { content, sha } = await getFileSHA();
  const filtered = content.filter(n => n.id !== id);
  await saveToGitHub(filtered, sha);
  return Response.json({ ok: true });
}
