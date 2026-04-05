import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 501 }
    );
  }

  const { weakIntervals, currentLesson, count } = await req.json();
  if (!count || typeof count !== "number") {
    return NextResponse.json(
      { error: "count is required" },
      { status: 400 }
    );
  }

  const weakDesc = weakIntervals
    ? Object.entries(weakIntervals)
        .map(([k, v]) => `${k}: ${Math.round((v as number) * 100)}% accuracy`)
        .join(", ")
    : "no specific weaknesses";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a piano sight-reading coach. Return ONLY a JSON object with a \"questions\" array. Each question has: type (noteNaming or interval), clef (treble or bass), notes (array of pitch strings like C4 or F3), correctAnswer (string), answerOptions (array of 5 strings). Focus 60% of questions on the student's weak areas.",
        },
        {
          role: "user",
          content: `Generate ${count} drill questions for a student at lesson ${currentLesson || 1}. Their weak areas: ${weakDesc}. Mix note naming and interval identification. Return valid JSON only.`,
        },
      ],
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json(
      { error: "OpenAI API error", detail: errText },
      { status: res.status }
    );
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json(
      { error: "Failed to parse AI response", raw: content },
      { status: 500 }
    );
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON from AI", raw: content },
      { status: 500 }
    );
  }
}
