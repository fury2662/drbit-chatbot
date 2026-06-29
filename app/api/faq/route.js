// app/api/faq/route.js
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const FAQ_PATH = join(process.cwd(), 'data', 'faq.json');

function loadFAQ() {
  try {
    return JSON.parse(readFileSync(FAQ_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveFAQ(data) {
  writeFileSync(FAQ_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// GET: 전체 FAQ 조회
export async function GET() {
  const faq = loadFAQ();
  return Response.json(faq);
}

// POST: FAQ 추가
export async function POST(request) {
  const { q, a } = await request.json();
  const faq = loadFAQ();
  const newItem = { id: Date.now(), q, a };
  faq.push(newItem);
  saveFAQ(faq);
  return Response.json(newItem);
}

// PUT: FAQ 수정
export async function PUT(request) {
  const { id, q, a } = await request.json();
  const faq = loadFAQ();
  const idx = faq.findIndex(f => f.id === id);
  if (idx === -1) return Response.json({ error: '없음' }, { status: 404 });
  faq[idx] = { id, q, a };
  saveFAQ(faq);
  return Response.json(faq[idx]);
}

// DELETE: FAQ 삭제
export async function DELETE(request) {
  const { id } = await request.json();
  const faq = loadFAQ();
  const filtered = faq.filter(f => f.id !== id);
  saveFAQ(filtered);
  return Response.json({ ok: true });
}
