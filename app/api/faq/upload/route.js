// app/api/faq/upload/route.js
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
      body: JSON.stringify({ message: "FAQ 업로드 추가", content, sha })
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

    let rows = [];

    if (fileName.endsWith(".csv")) {
      const text = buffer.toString("utf-8");
      const lines = text.split("\n").filter(l => l.trim());
      rows = lines.slice(1).map(line => {
        const cols = line.split(",");
        return { q: cols[0]?.trim().replace(/^"|"$/g, ""), a: cols[1]?.trim().replace(/^"|"$/g, "") };
      });
    } else {
      // xlsx
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buffer, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      rows = data.slice(1).map(row => ({ q: String(row[0] || "").trim(), a: String(row[1] || "").trim() }));
    }

    const valid = rows.filter(r => r.q && r.a);
    if (valid.length === 0) return Response.json({ error: "유효한 데이터 없음" }, { status: 400 });

    const { content, sha } = await getFileSHA();
    const newItems = valid.map(r => ({ id: Date.now() + Math.random(), q: r.q, a: r.a }));
    await saveToGitHub([...content, ...newItems], sha);

    return Response.json({ count: valid.length });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
