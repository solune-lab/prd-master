
import { HarmBlockThreshold, HarmCategory } from '@google/genai';
import { getGeminiClient } from '@/lib/gemini';
import { CHAT_SYSTEM_PROMPT } from '@/constants';
import { detectLanguageFromText } from '@/lib/detect-lang';

export const runtime = 'edge';

const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
const MAX_RETRIES = 2;

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.message || !body.lang) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { message, history, lang } = body;
    const ai = getGeminiClient();
    const chatHistory = Array.isArray(history) ? history : [];
    const effectiveLang = detectLanguageFromText(message, lang);

    let lastError: string | null = null;

    for (const model of MODELS) {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
        try {
          const chat = ai.chats.create({
            model,
            config: {
              systemInstruction: CHAT_SYSTEM_PROMPT(effectiveLang),
              temperature: 0.7,
              safetySettings: SAFETY_SETTINGS,
            },
            history: chatHistory
          });

          const stream = await chat.sendMessageStream({ message });

          const encoder = new TextEncoder();
          const readable = new ReadableStream({
            async start(controller) {
              try {
                for await (const chunk of stream) {
                  const text = chunk.text;
                  if (text) {
                    controller.enqueue(encoder.encode(text));
                  }
                }
                controller.close();
              } catch (err: any) {
                console.error('[chat] Stream error:', err?.message || err);
                controller.error(err);
              }
            }
          });

          return new Response(readable, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Transfer-Encoding': 'chunked',
              'Cache-Control': 'no-cache',
            },
          });
        } catch (err: any) {
          const status = err?.status || 'unknown';
          lastError = `[${status}] ${err?.message || `Unknown error from ${model}`}`;
          console.warn(`[chat] ${model} attempt ${attempt + 1} failed (HTTP ${status}):`, err?.message);
          if (err?.status && err.status >= 400 && err.status < 500 && err.status !== 429) break;
        }
      }
    }

    console.error('[chat] All models/retries exhausted:', lastError);
    return new Response(JSON.stringify({ error: 'AI service temporarily unavailable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[chat] Unexpected error:', error?.message || error);
    const status = error?.status || 500;
    const message = error?.message?.includes('500') || error?.message?.includes('INTERNAL')
      ? 'AI service temporarily unavailable'
      : (error?.message || 'Internal server error');
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
