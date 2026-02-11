
import { NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';

export const runtime = 'edge';

const MAX_BASE64_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav'];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.base64Data || !body.mimeType || !body.lang) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { base64Data, mimeType, lang } = body;

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json({ error: 'Unsupported audio format' }, { status: 400 });
    }

    if (base64Data.length > MAX_BASE64_SIZE) {
      return NextResponse.json({ error: 'Audio file too large (max 10MB)' }, { status: 413 });
    }

    const ai = getGeminiClient();
    const MODELS = ["gemini-3-flash-preview", "gemini-2.5-flash"];

    const contentParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      },
      {
        text: `You are a professional transcription assistant.
        Please transcribe the provided audio into ${lang} text with extreme precision.
        Important:
        1. If the speaker uses English technical terms (e.g., "API", "React", "Frontend", "PRD", "Microservices"), keep them in English.
        2. Maintain the context of product design and engineering.
        3. Output ONLY the plain text of the transcription. No preamble.`
      }
    ];

    for (const model of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: { parts: contentParts },
          config: { temperature: 0.1 }
        });
        const text = response.text?.trim();
        if (text) {
          return NextResponse.json({ text });
        }
        console.warn(`[transcribe] Empty response from ${model}`);
      } catch (err: any) {
        console.warn(`[transcribe] ${model} failed:`, err?.message);
        if (err?.status && err.status >= 400 && err.status < 500) break;
      }
    }

    return NextResponse.json({ text: "" });
  } catch (error: any) {
    console.error('[transcribe] Gemini error:', error?.message || error);
    const message = error?.message?.includes('500') || error?.message?.includes('INTERNAL')
      ? 'AI transcription service temporarily unavailable'
      : (error?.message || 'Transcription failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
