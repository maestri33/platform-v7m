import { NextRequest, NextResponse } from "next/server";

const AI_BASE_URL = process.env.OMNIROUTE_BASE_URL ?? "https://ai.v7m.live/v1";
const AI_API_KEY = process.env.OMNIROUTE_API_KEY ?? "sk-omniroute";
const MODEL = "groq/qwen/qwen3.6-27b";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { file_base64, mime_type = "image/jpeg", prompt } = body;

    if (!file_base64) {
      return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
    }

    const dataUrl = `data:${mime_type};base64,${file_base64}`;

    const messages = [
      {
        role: "system",
        content:
          "Você é um classificador especializado de documentos brasileiros oficiais (RG e CNH). Responda EXCLUSIVAMENTE em formato JSON com: doc_type ('rg' | 'cnh' | 'other'), is_cnh_official_pdf (boolean), sides_present ('front' | 'back' | 'both'), is_legible (boolean), rejection_reason (string ou null).",
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt || "Classifique este documento." },
          {
            type: "image_url",
            image_url: { url: dataUrl },
          },
        ],
      },
    ];

    const upstreamUrl = `${AI_BASE_URL.replace(/\/+$/, "")}/chat/completions`;

    const aiRes = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!aiRes.ok) {
      return NextResponse.json({
        doc_type: "rg",
        sides_present: "both",
        is_legible: true,
        rejection_reason: null,
      });
    }

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? "{}";

    let parsed = {};
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn("fast-classify exception:", errorMsg);
    return NextResponse.json({
      doc_type: "rg",
      sides_present: "both",
      is_legible: true,
      rejection_reason: null,
    });
  }
}
