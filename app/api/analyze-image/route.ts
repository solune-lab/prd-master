
import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'edge';

const MAX_BASE64_SIZE = 15 * 1024 * 1024; // ~11MB raw image, under Groq's 20MB request limit
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const OCR_PROMPT_BY_LANG: Record<string, string> = {
  zh: '你是一個 OCR 文字辨識引擎。逐字擷取這張圖片中所有可辨識的文字,依照原本畫面上的排列順序輸出。只輸出擷取到的文字本身,不要加任何說明、翻譯、描述或建議。如果圖片中沒有任何文字,輸出「(圖片中未偵測到文字)」。',
  en: 'You are an OCR text recognition engine. Extract all readable text from this image verbatim, in the order it appears. Output only the extracted text itself — no explanations, translations, descriptions, or suggestions. If the image contains no text, output "(no text detected in image)".',
};

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowed = await checkRateLimit(user.id, 'analyze-image', 5, 60);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests, please slow down' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.base64Data || !body.mimeType || !body.lang) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { base64Data, mimeType, lang } = body;

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json({ error: 'Unsupported image format' }, { status: 400 });
    }

    if (base64Data.length > MAX_BASE64_SIZE) {
      return NextResponse.json({ error: 'Image file too large (max 11MB)' }, { status: 413 });
    }

    const langCode = lang.split('-')[0] || 'en';
    const promptText = OCR_PROMPT_BY_LANG[langCode] || OCR_PROMPT_BY_LANG.en;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('[analyze-image] GROQ_API_KEY is not set');
      return NextResponse.json({ error: 'Server misconfiguration: API key missing' }, { status: 500 });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            ],
          },
        ],
        temperature: 0,
        max_completion_tokens: 2048,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[analyze-image] Groq API error (${response.status}):`, errorData);
      return NextResponse.json(
        { error: `OCR failed: ${response.statusText}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim();

    if (text) {
      return NextResponse.json({ text });
    }

    console.warn('[analyze-image] Empty response from Groq');
    return NextResponse.json(
      { error: 'OCR resulted in empty text. Please try again.' },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('[analyze-image] Groq error:', error?.message || error);
    const message = error?.message?.includes('500') || error?.message?.includes('INTERNAL')
      ? 'AI OCR service temporarily unavailable'
      : (error?.message || 'OCR failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
