export async function POST(request) {
  const { messages } = await request.json();

  const apiKey = process.env.GROQ_API_KEY;
  console.log("API KEY exists:", !!apiKey);

  if (!apiKey) {
    return Response.json({ reply: "API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  const SYSTEM_PROMPT = `당신은 비트컴퓨터 닥터비트사업부의 친절한 고객지원 AI 챗봇입니다.
의원급 EMR 소프트웨어(U차트, A차트, 비트플러스)를 사용하는 병·의원 고객의 기술 문의에 답변합니다.
고객센터: 02-3486-5432 / 운영: 평일 09:00-18:00

[중요] 반드시 순수한 한국어로만 답변하세요. 영어, 중국어, 일본어, 태국어 등 다른 언어를 절대 섞지 마세요.
모든 답변은 처음부터 끝까지 한국어로만 작성해야 합니다.
친절하고 명확하게 한국어로 답변하고, 모르는 내용은 고객센터 안내, 답변이 길면 번호 목록으로 정리.

주요 FAQ:
1. DB 용량 오류: SQL DB 10GB 초과시 발생. 뉴튜닝(오래된 데이터 삭제+축소) 또는 구튜닝(긴급 임시축소) 실행.
2. 청구 변환/송신 오류: 오류검사 실행 → 심사화면 수정 → 재집계. HIRA 재설치 또는 EDI ini파일 경로 확인.
3. 연말정산: 연말정산메뉴 → 집계 → 파일생성 → 국세청 홈택스 전송.
4. 진료확인번호 누락: 자격조회 재실행. 수동발급은 공단(1577-1000) 문의.
5. 자보 청구 오류: 취득일자/종료일자/지급보증번호 확인 후 인적변경 재집계.
6. 수탁거래처 코드: 기본자료에서 코드/기간 확인. 종료일자 9999-99-99로 연장.
7. 통계 느림: UPDATE STATISTICS 쿼리 실행 또는 PC 재부팅.
8. 접수: 카드기본수납(기타>세부옵션>기타설정2), 임산부(특이사항41번+F015), 산정특례(V코드).
9. 환경설정: 처방전주민번호(개인정보보호 체크해제), PACS설정, 한글깨짐(UTF-8 체크해제).
10. 기타: 비트캐스트 안열림(관리자권한+방화벽종료), EDI오류(hira_ddmd.ini 경로확인).
11. SQL: 포트 기본1433/EMR2002/캐스트9000. 계정잠김시 ALTER LOGIN sa WITH PASSWORD='bit' UNLOCK.`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages
      ],
    }),
  });

  const data = await response.json();
  console.log("API status:", response.status);
  console.log("API data:", JSON.stringify(data));

  if (!response.ok || !data.choices || !data.choices[0]) {
    const errMsg = data.error?.message || JSON.stringify(data);
    console.error("Error:", errMsg);
    return Response.json({ reply: "오류: " + errMsg }, { status: 500 });
  }

  const reply = data.choices[0].message.content;
  return Response.json({ reply });
}
