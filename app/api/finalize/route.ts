
import { HarmBlockThreshold, HarmCategory } from '@google/genai';
import { getGeminiClient } from '@/lib/gemini';
import { FINAL_PRD_PROMPT } from '@/constants';
import { detectLanguageFromText } from '@/lib/detect-lang';
import { Language } from '@/types';

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
    if (!body || !Array.isArray(body.history) || !body.lang) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { history, lang } = body;

    if (history.length < 2) {
      return new Response(JSON.stringify({ error: 'Not enough conversation history' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ai = getGeminiClient();
    const userText = history
      .filter((m: any) => m?.role === 'user')
      .map((m: any) => (m?.parts || []).map((p: any) => p?.text || '').join(' '))
      .join('\n');
    const effectiveLang = detectLanguageFromText(userText, lang);
    const langLabel =
      effectiveLang === Language.ZH_TW ? 'Traditional Chinese (繁體中文)' :
      effectiveLang === Language.ZH_CN ? 'Simplified Chinese (简体中文)' :
      effectiveLang === Language.JA ? 'Japanese (日本語)' :
      effectiveLang === Language.KO ? 'Korean (한국어)' :
      effectiveLang === Language.FR ? 'French (Français)' :
      effectiveLang === Language.DE ? 'German (Deutsch)' :
      effectiveLang === Language.IT ? 'Italian (Italiano)' :
      effectiveLang === Language.ES ? 'Spanish (Español)' :
      effectiveLang === Language.PT ? 'Portuguese (Português)' :
      effectiveLang === Language.RU ? 'Russian (Русский)' :
      effectiveLang === Language.AR ? 'Arabic (العربية)' :
      'English';
    const trigger = `Based on the conversation history above, NOW output the final PRD document in ${langLabel}.\n\nCRITICAL:\n- Do NOT ask any more questions.\n- Do NOT output progress markers like "[Currently: XX%]" or "[目前進度：XX%]".\n- Do NOT wrap your entire response in a markdown code block.\n- Start IMMEDIATELY with "# PRD:" and follow the Mandatory Output Structure exactly.`;

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
              systemInstruction: FINAL_PRD_PROMPT,
              temperature: 0.3,
              safetySettings: SAFETY_SETTINGS,
            },
            history: history
          });

          const stream = await chat.sendMessageStream({ message: trigger });

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
                console.error('[finalize] Stream error:', err?.message || err);
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
          console.warn(`[finalize] ${model} attempt ${attempt + 1} failed (HTTP ${status}):`, err?.message);
          if (err?.status && err.status >= 400 && err.status < 500 && err.status !== 429) break;
        }
      }
    }

    console.error('[finalize] All models/retries exhausted:', lastError);
    return new Response(JSON.stringify({ error: 'AI service temporarily unavailable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[finalize] Unexpected error:', error?.message || error);
    const message = error?.message?.includes('500') || error?.message?.includes('INTERNAL')
      ? 'AI service temporarily unavailable'
      : (error?.message || 'PRD generation failed');
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
