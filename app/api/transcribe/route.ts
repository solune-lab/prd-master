import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'edge';

const MAX_BASE64_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav'];

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowed = await checkRateLimit(user.id, 'transcribe', 5, 60);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests, please slow down' }, { status: 429 });
    }

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

    // Convert base64 to File object using edge-compatible method
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Determine extension safely
    const cleanMimeType = mimeType.split(';')[0]; 
    const ext = cleanMimeType.split('/')[1] || 'webm';
    
    const file = new File([bytes], `audio.${ext}`, { type: cleanMimeType });

    const langCode = lang.split('-')[0] || 'en';
    const promptByLang: Record<string, string> = {
      zh: '以下是關於產品設計與工程的對話,請精準轉錄為中文,專有名詞與英文技術詞彙保留原文。',
      en: 'The following is a product design and engineering conversation. Transcribe with extreme precision; keep technical terms in English.',
    };

    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', langCode);
    formData.append('prompt', promptByLang[langCode] || promptByLang.en);
    formData.append('temperature', '0.1');

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('[transcribe] GROQ_API_KEY is not set');
      return NextResponse.json({ error: 'Server misconfiguration: API key missing' }, { status: 500 });
    }

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[transcribe] Groq API error (${response.status}):`, errorData);
      return NextResponse.json(
        { error: `Transcription failed: ${response.statusText}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const text = data.text?.trim();

    if (text) {
      console.log(`[transcribe] Success with Groq model`);
      return NextResponse.json({ text });
    }

    console.warn(`[transcribe] Empty response from Groq`);
    return NextResponse.json(
      { error: 'Transcription resulted in empty text. Please try again.' },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('[transcribe] Groq error:', error?.message || error);
    const message = error?.message?.includes('500') || error?.message?.includes('INTERNAL')
      ? 'AI transcription service temporarily unavailable'
      : (error?.message || 'Transcription failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
