"use client";
import { useState, useEffect } from "react";

export default function AdminPage() {
  const [faqs, setFaqs] = useState([]);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [editQ, setEditQ] = useState("");
  const [editA, setEditA] = useState("");
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchFAQ(); }, []);

  async function fetchFAQ() {
    const res = await fetch("/api/faq");
    setFaqs(await res.json());
  }

  function notify(text) {
    setMsg(text);
    setTimeout(() => setMsg(""), 2000);
  }

  async function addFAQ() {
    if (!newQ.trim() || !newA.trim()) return;
    setLoading(true);
    await fetch("/api/faq", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: newQ, a: newA }) });
    setNewQ(""); setNewA("");
    await fetchFAQ();
    setLoading(false);
    notify("✅ FAQ가 추가됐어요!");
  }

  async function updateFAQ() {
    setLoading(true);
    await fetch("/api/faq", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, q: editQ, a: editA }) });
    setEditId(null);
    await fetchFAQ();
    setLoading(false);
    notify("✅ 수정됐어요!");
  }

  async function deleteFAQ(id) {
    if (!confirm("삭제할까요?")) return;
    setLoading(true);
    await fetch("/api/faq", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await fetchFAQ();
    setLoading(false);
    notify("🗑️ 삭제됐어요!");
  }

  const filtered = faqs.filter(f => f.q?.includes(search) || f.a?.includes(search));

  return (
    <div style={{ fontFamily: "Malgun Gothic, sans-serif", maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h2 style={{ color: "#1a56a0", borderBottom: "2px solid #1a56a0", paddingBottom: 8 }}>
        🛠️ FAQ 관리자 페이지
      </h2>
      {msg && <div style={{ background: "#e8f5e9", padding: "8px 16px", borderRadius: 6, marginBottom: 12, color: "#2e7d32" }}>{msg}</div>}

      {/* 새 FAQ 추가 */}
      <div style={{ background: "#f0f7ff", borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 12px", color: "#1a56a0" }}>➕ 새 FAQ 추가</h3>
        <input value={newQ} onChange={e => setNewQ(e.target.value)} placeholder="질문" style={inputStyle} />
        <textarea value={newA} onChange={e => setNewA(e.target.value)} placeholder="답변" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        <button onClick={addFAQ} disabled={loading} style={btnStyle("#1a56a0")}>
          {loading ? "저장 중..." : "추가"}
        </button>
      </div>

      {/* 검색 */}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 질문/답변 검색" style={{ ...inputStyle, marginBottom: 16 }} />
      <div style={{ color: "#666", marginBottom: 8, fontSize: 14 }}>총 {filtered.length}개</div>

      {/* FAQ 목록 */}
      {filtered.map(f => (
        <div key={f.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 12, background: "#fff" }}>
          {editId === f.id ? (
            <>
              <input value={editQ} onChange={e => setEditQ(e.target.value)} style={inputStyle} />
              <textarea value={editA} onChange={e => setEditA(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
              <button onClick={updateFAQ} disabled={loading} style={btnStyle("#2e7d32")}>저장</button>
              <button onClick={() => setEditId(null)} style={{ ...btnStyle("#888"), marginLeft: 8 }}>취소</button>
            </>
          ) : (
            <>
              <div style={{ fontWeight: "bold", marginBottom: 6, color: "#1a56a0" }}>Q. {f.q}</div>
              <div style={{ color: "#444", whiteSpace: "pre-wrap", fontSize: 14 }}>A. {f.a}</div>
              <div style={{ marginTop: 10 }}>
                <button onClick={() => { setEditId(f.id); setEditQ(f.q); setEditA(f.a); }} style={btnStyle("#f57c00")}>수정</button>
                <button onClick={() => deleteFAQ(f.id)} style={{ ...btnStyle("#c62828"), marginLeft: 8 }}>삭제</button>
              </div>
            </>
          )}
        </div>
      ))}
      <div style={{ textAlign: "center", color: "#aaa", fontSize: 12, marginTop: 24 }}>Developed by 이영진</div>
    </div>
  );
}

const inputStyle = { display: "block", width: "100%", padding: "8px 12px", marginBottom: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 14, boxSizing: "border-box" };
const btnStyle = (bg) => ({ background: bg, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", cursor: "pointer", fontSize: 14 });
