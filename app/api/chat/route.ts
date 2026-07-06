
import { DEEPSEEK_API_URL, getDeepSeekApiKey } from '@/lib/gemini';
import { CHAT_SYSTEM_PROMPT } from '@/constants';
import { detectLanguageFromText } from '@/lib/detect-lang';

export const runtime = 'edge';

const MODELS = ["deepseek-v4-pro"];
const MAX_RETRIES = 2;

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
    const apiKey = getDeepSeekApiKey();
    const chatHistory = Array.isArray(history) ? history : [];
    const effectiveLang = detectLanguageFromText(message, lang);

    const messages = [
      { role: 'system', content: CHAT_SYSTEM_PROMPT(effectiveLang) },
      ...chatHistory.map((h: any) => ({
        role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user',
        content: Array.isArray(h.parts) ? h.parts.map((p: any) => p.text).join('') : (h.content ?? h.text ?? ''),
      })),
      { role: 'user', content: message },
    ];

    let lastError: string | null = null;

    for (const model of MODELS) {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
        try {
          const upstream = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages,
              temperature: 0.7,
              stream: true,
            }),
          });

          if (!upstream.ok || !upstream.body) {
            const errText = await upstream.text().catch(() => '');
            throw Object.assign(new Error(errText || `Upstream error from ${model}`), { status: upstream.status });
          }

          const encoder = new TextEncoder();
          const decoder = new TextDecoder();
          const reader = upstream.body.getReader();

          const readable = new ReadableStream({
            async start(controller) {
              let buffer = '';
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split('\n');
                  buffer = lines.pop() || '';
                  for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data:')) continue;
                    const data = trimmed.slice(5).trim();
                    if (data === '[DONE]') continue;
                    try {
                      const parsed = JSON.parse(data);
                      const text = parsed.choices?.[0]?.delta?.content;
                      if (text) controller.enqueue(encoder.encode(text));
                    } catch {
                      // ignore malformed SSE chunk
                    }
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
