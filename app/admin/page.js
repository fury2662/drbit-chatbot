"use client";
import { useState, useEffect, useRef } from "react";

const TABS = ["📋 FAQ 관리", "📊 엑셀/CSV", "📄 문서 업로드", "🌐 URL 학습"];

export default function AdminPage() {
  const [tab, setTab] = useState(0);
  const [faqs, setFaqs] = useState([]);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [editQ, setEditQ] = useState("");
  const [editA, setEditA] = useState("");
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("ok");
  const [url, setUrl] = useState("");
  const fileRef = useRef();
  const docRef = useRef();

  useEffect(() => { fetchFAQ(); }, []);

  async function fetchFAQ() {
    const res = await fetch("/api/faq");
    setFaqs(await res.json());
  }

  function notify(text, type = "ok") {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(""), 3000);
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

  async function uploadExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    notify("⏳ 업로드 중...", "info");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/faq/upload", { method: "POST", body: fd });
    const data = await res.json();
    await fetchFAQ();
    setLoading(false);
    if (data.count) notify(`✅ ${data.count}개 FAQ가 추가됐어요!`);
    else notify("❌ 오류: " + (data.error || "알 수 없음"), "err");
    fileRef.current.value = "";
  }

  async function uploadDoc(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    notify("⏳ AI가 문서를 분석 중... 잠시만요!", "info");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/faq/analyze", { method: "POST", body: fd });
    const data = await res.json();
    await fetchFAQ();
    setLoading(false);
    if (data.count > 0) notify(`✅ AI가 ${data.count}개 Q&A를 추출했어요!`);
    else if (data.error) notify("❌ 오류: " + data.error, "err");
    else notify("⚠️ 추출된 Q&A가 없어요.", "err");
    docRef.current.value = "";
  }

  async function learnURL() {
    if (!url.trim()) return;
    setLoading(true);
    notify("⏳ AI가 웹페이지를 분석 중... 잠시만요!", "info");
    const res = await fetch("/api/faq/crawl", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
    const data = await res.json();
    await fetchFAQ();
    setLoading(false);
    if (data.count > 0) notify(`✅ AI가 ${data.count}개 Q&A를 추출했어요!`);
    else if (data.error) notify("❌ 오류: " + data.error, "err");
    else notify("⚠️ 추출된 Q&A가 없어요. 다른 페이지를 시도해보세요.", "err");
    setUrl("");
  }

  const filtered = faqs.filter(f => !search || f.q?.includes(search) || f.a?.includes(search));

  const msgBg = msgType === "err" ? "#ffebee" : msgType === "info" ? "#e3f2fd" : "#e8f5e9";
  const msgColor = msgType === "err" ? "#c62828" : msgType === "info" ? "#1565c0" : "#2e7d32";

  return (
    <div style={{ fontFamily: "Malgun Gothic, sans-serif", minHeight: "100vh", background: "#f5f7fa" }}>
      <div style={{ background: "#1a56a0", color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22 }}>🛠️</span>
        <h2 style={{ margin: 0, fontSize: 18 }}>FAQ 관리자 페이지</h2>
        <span style={{ marginLeft: "auto", fontSize: 13, opacity: 0.8 }}>총 {faqs.length}개 FAQ</span>
      </div>

      {msg && <div style={{ background: msgBg, color: msgColor, padding: "10px 24px", fontSize: 14 }}>{msg}</div>}

      {/* 탭 */}
      <div style={{ display: "flex", background: "#fff", borderBottom: "2px solid #e0e0e0" }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            padding: "12px 20px", border: "none", cursor: "pointer", fontSize: 14,
            background: tab === i ? "#1a56a0" : "#fff",
            color: tab === i ? "#fff" : "#555",
            borderBottom: tab === i ? "2px solid #1a56a0" : "none",
            fontFamily: "Malgun Gothic, sans-serif"
          }}>{t}</button>
        ))}
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>

        {/* 탭1: FAQ 관리 */}
        {tab === 0 && <>
          <div style={{ background: "#fff", borderRadius: 8, padding: 20, marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            <h3 style={{ margin: "0 0 12px", color: "#1a56a0", fontSize: 15 }}>➕ 새 FAQ 추가</h3>
            <input value={newQ} onChange={e => setNewQ(e.target.value)} placeholder="질문" style={inp} />
            <textarea value={newA} onChange={e => setNewA(e.target.value)} placeholder="답변" rows={3} style={{ ...inp, resize: "vertical" }} />
            <button onClick={addFAQ} disabled={loading} style={btn("#1a56a0")}>{loading ? "저장 중..." : "추가"}</button>
          </div>

          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 질문/답변 검색" style={{ ...inp, marginBottom: 12 }} />
          <div style={{ color: "#888", fontSize: 13, marginBottom: 12 }}>총 {filtered.length}개 (최신순)</div>

          {[...filtered].reverse().map(f => (
            <div key={f.id} style={{ background: "#fff", borderRadius: 8, padding: 16, marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              {editId === f.id ? <>
                <input value={editQ} onChange={e => setEditQ(e.target.value)} style={inp} />
                <textarea value={editA} onChange={e => setEditA(e.target.value)} rows={4} style={{ ...inp, resize: "vertical" }} />
                <button onClick={updateFAQ} disabled={loading} style={btn("#2e7d32")}>저장</button>
                <button onClick={() => setEditId(null)} style={{ ...btn("#888"), marginLeft: 8 }}>취소</button>
              </> : <>
                <div style={{ fontWeight: "bold", color: "#1a56a0", marginBottom: 6 }}>Q. {f.q}</div>
                <div style={{ color: "#444", fontSize: 14, whiteSpace: "pre-wrap" }}>A. {f.a}</div>
                {(f.source || f.addedAt) && (
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>
                    {f.addedAt && `📅 ${f.addedAt}`}{f.source && ` · 출처: ${f.source.length > 50 ? f.source.slice(0, 50) + "..." : f.source}`}
                  </div>
                )}
                <div style={{ marginTop: 10 }}>
                  <button onClick={() => { setEditId(f.id); setEditQ(f.q); setEditA(f.a); }} style={btn("#f57c00")}>수정</button>
                  <button onClick={() => deleteFAQ(f.id)} style={{ ...btn("#c62828"), marginLeft: 8 }}>삭제</button>
                </div>
              </>}
            </div>
          ))}
        </>}

        {/* 탭2: 엑셀/CSV */}
        {tab === 1 && <div style={{ background: "#fff", borderRadius: 8, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <h3 style={{ color: "#1a56a0", marginTop: 0 }}>📊 엑셀/CSV 업로드</h3>
          <p style={{ color: "#555", fontSize: 14 }}>엑셀 또는 CSV 파일을 업로드하면 FAQ가 자동으로 추가돼요.</p>
          <div style={{ background: "#f0f7ff", borderRadius: 6, padding: 16, marginBottom: 20, fontSize: 13, color: "#444" }}>
            <b>파일 형식:</b><br />
            첫 번째 열: 질문<br />
            두 번째 열: 답변<br />
            첫 번째 행은 헤더(질문, 답변)로 인식해요.
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={uploadExcel} disabled={loading}
            style={{ display: "block", marginBottom: 12 }} />
          <p style={{ color: "#888", fontSize: 12 }}>지원 형식: .xlsx, .xls, .csv</p>
        </div>}

        {/* 탭3: 문서 업로드 */}
        {tab === 2 && <div style={{ background: "#fff", borderRadius: 8, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <h3 style={{ color: "#1a56a0", marginTop: 0 }}>📄 문서 업로드</h3>
          <p style={{ color: "#555", fontSize: 14 }}>PDF, PPT, Word, 스크린샷(이미지)을 올리면 AI가 내용을 분석해서 Q&A를 자동으로 만들어요.</p>
          <div style={{ background: "#fff8e1", borderRadius: 6, padding: 16, marginBottom: 20, fontSize: 13, color: "#444" }}>
            <b>⚠️ 참고사항:</b><br />
            - AI가 문서/이미지 내용을 분석해서 Q&A를 자동 추출해요<br />
            - 로그인이 필요한 화면은 캡처(스크린샷)해서 올려주세요<br />
            - 추가된 후 FAQ 관리 탭에서 수정 가능해요
          </div>
          <input ref={docRef} type="file" accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp" onChange={uploadDoc} disabled={loading}
            style={{ display: "block", marginBottom: 12 }} />
          <p style={{ color: "#888", fontSize: 12 }}>지원 형식: .pdf, .pptx, .docx, .txt, .png, .jpg</p>
        </div>}

        {/* 탭4: URL 학습 */}
        {tab === 3 && <div style={{ background: "#fff", borderRadius: 8, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <h3 style={{ color: "#1a56a0", marginTop: 0 }}>🌐 URL 학습</h3>
          <p style={{ color: "#555", fontSize: 14 }}>웹페이지 주소를 입력하면 AI가 내용을 분석해서 Q&A를 자동으로 만들어요.</p>
          <div style={{ background: "#f3e5f5", borderRadius: 6, padding: 16, marginBottom: 20, fontSize: 13, color: "#444" }}>
            <b>⚠️ 참고사항:</b><br />
            - 로그인이 필요한 페이지는 접근 불가해요<br />
            - 공개된 웹페이지만 분석 가능해요
          </div>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/faq" style={{ ...inp, marginBottom: 12 }} />
          <button onClick={learnURL} disabled={loading || !url.trim()} style={btn("#7b1fa2")}>
            {loading ? "분석 중..." : "학습 시작"}
          </button>
        </div>}

      </div>
      <div style={{ textAlign: "center", color: "#aaa", fontSize: 12, padding: "16px 0" }}>Developed by 이영진</div>
    </div>
  );
}

const inp = { display: "block", width: "100%", padding: "9px 12px", marginBottom: 8, borderRadius: 6, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box", fontFamily: "Malgun Gothic, sans-serif", color: "#222" };
const btn = (bg) => ({ background: bg, color: "#fff", border: "none", borderRadius: 6, padding: "9px 20px", cursor: "pointer", fontSize: 14, fontFamily: "Malgun Gothic, sans-serif" });
