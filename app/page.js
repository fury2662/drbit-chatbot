"use client";
import { useState, useRef, useEffect } from "react";

const QUICK_BTNS = [
  { label: "💾 DB 용량 오류", msg: "청구 집계 시 DB 용량 오류가 납니다" },
  { label: "📤 변환·송신 오류", msg: "청구 변환/송신이 안 됩니다" },
  { label: "📋 연말정산", msg: "연말정산 소득공제 집계 방법을 알려주세요" },
  { label: "🔢 진료확인번호", msg: "진료확인번호 누락 오류가 납니다" },
  { label: "📞 고객센터", msg: "고객센터 전화번호를 알려주세요" },
];

function getTime() {
  const d = new Date();
  return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
}

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "bot", text: "안녕하세요! 비트컴퓨터 닥터비트사업부 고객지원 AI입니다 😊\nU차트, A차트, 비트플러스 관련 기술 문의를 도와드립니다.\n궁금하신 내용을 편하게 질문해 주세요!", time: getTime() },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [history, setHistory] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function sendMessage(text) {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;
    setInput("");
    setShowQuick(false);
    setMessages((prev) => [...prev, { role: "user", text: msg, time: getTime() }]);
    const newHistory = [...history, { role: "user", content: msg }];
    setHistory(newHistory);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory }),
      });
      const data = await res.json();
      const reply = data.reply || "응답을 받지 못했습니다.";
      setHistory((prev) => [...prev, { role: "assistant", content: reply }]);
      setMessages((prev) => [...prev, { role: "bot", text: reply, time: getTime() }]);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: "오류가 발생했습니다.\n고객센터(02-3486-5432)로 문의해 주세요.", time: getTime() }]);
    }
    setIsLoading(false);
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f0f4f8", fontFamily: "'Noto Sans KR', sans-serif" }}>
      <div style={{ width: 440, height: 680, background: "#fff", borderRadius: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* 헤더 */}
        <div style={{ background: "linear-gradient(135deg,#1a56db,#1e429f)", color: "#fff", padding: "18px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, background: "rgba(255,255,255,0.2)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏥</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>닥터비트 고객지원 AI</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 3 }}>
              <span style={{ display: "inline-block", width: 7, height: 7, background: "#84e1bc", borderRadius: "50%", marginRight: 5 }} />
              U차트 · A차트 · 비트플러스 지원
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>DRBIT</div>
        </div>

        {/* 메시지 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 8, flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: m.role === "user" ? "#dbeafe" : "#e1effe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                {m.role === "user" ? "👤" : "🤖"}
              </div>
              <div style={{ maxWidth: "75%" }}>
                <div style={{ padding: "10px 14px", borderRadius: 14, fontSize: 13.5, lineHeight: 1.65, borderBottomLeftRadius: m.role === "bot" ? 4 : 14, borderBottomRightRadius: m.role === "user" ? 4 : 14, background: m.role === "user" ? "#1a56db" : "#f3f4f6", color: m.role === "user" ? "#fff" : "#1f2937", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {m.text}
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4, textAlign: m.role === "user" ? "right" : "left" }}>{m.time}</div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "#e1effe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
              <div style={{ background: "#f3f4f6", padding: "12px 16px", borderRadius: 14, borderBottomLeftRadius: 4, display: "flex", gap: 5, alignItems: "center" }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{ width: 7, height: 7, background: "#9ca3af", borderRadius: "50%", display: "inline-block", animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 빠른 질문 */}
        {showQuick && (
          <div style={{ padding: "0 16px 10px" }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, fontWeight: 500 }}>자주 묻는 질문</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {QUICK_BTNS.map((b, i) => (
                <button key={i} onClick={() => sendMessage(b.msg)} style={{ background: "#eff6ff", color: "#1a56db", border: "1px solid #bfdbfe", padding: "5px 11px", borderRadius: 20, fontSize: 12, cursor: "pointer" }}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 입력창 */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="문의 내용을 입력하세요... (Shift+Enter: 줄바꿈)"
            rows={1}
            style={{ flex: 1, border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "9px 13px", fontSize: 13.5, resize: "none", outline: "none", fontFamily: "inherit", maxHeight: 90, lineHeight: 1.5, boxSizing: "border-box", color: "#1f2937", background: "#ffffff" }}
          />
          <button onClick={() => sendMessage()} disabled={isLoading || !input.trim()} style={{ width: 40, height: 40, background: isLoading || !input.trim() ? "#93c5fd" : "#1a56db", border: "none", borderRadius: 10, color: "#fff", fontSize: 17, cursor: isLoading || !input.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            ➤
          </button>
        </div>
      </div>
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} } textarea::placeholder { color: #9ca3af; }`}</style>
    </div>
  );
}
