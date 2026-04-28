export async function POST(request) {
  const { messages } = await request.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log("API KEY exists:", !!apiKey);

  if (!apiKey) {
    return Response.json({ reply: "API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  const SYSTEM_PROMPT = "You are a helpful customer support assistant for BitComputer DrBit division. Answer in Korean. Products: U-Chart, A-Chart, BitPlus. Support phone: 02-3486-5432. Hours: weekdays 09:00-18:00. Help with EMR software issues including billing errors, DB capacity, chart issues, and general technical support.";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });

  const data = await response.json();
  console.log("API status:", response.status);
  console.log("API data:", JSON.stringify(data));

  if (!response.ok || !data.content || !data.content[0]) {
    const errMsg = data.error?.message || JSON.stringify(data);
    console.error("Error:", errMsg);
    return Response.json({ reply: "오류: " + errMsg }, { status: 500 });
  }

  return Response.json({ reply: data.content[0].text });
}
