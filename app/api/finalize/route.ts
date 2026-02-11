
import { getGeminiClient } from '@/lib/gemini';
import { CHAT_SYSTEM_PROMPT, FINAL_PRD_PROMPT } from '@/constants';

export const runtime = 'edge';

const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite-preview-06-17"];
const MAX_RETRIES = 2;

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
    const prompt = `CRITICAL: Do NOT wrap your entire response in a markdown code block. Start immediately with "# PRD:".\n\n${FINAL_PRD_PROMPT}`;

    let lastError: string | null = null;

    for (const model of MODELS) {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const chat = ai.chats.create({
            model,
            config: {
              systemInstruction: CHAT_SYSTEM_PROMPT(lang),
              temperature: 0.3,
            },
            history: history
          });

          const stream = await chat.sendMessageStream({ message: prompt });

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
          lastError = err?.message || `Unknown error from ${model}`;
          console.warn(`[finalize] ${model} attempt ${attempt + 1} failed:`, lastError);
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
