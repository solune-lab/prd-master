
import { DEEPSEEK_API_URL, getDeepSeekApiKey } from '@/lib/gemini';
import { FINAL_PRD_PROMPT } from '@/constants';

export const runtime = 'edge';

const MODELS = ["deepseek-v4-flash"];
const MAX_RETRIES = 2;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.history)) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { history } = body;

    if (history.length < 2) {
      return new Response(JSON.stringify({ error: 'Not enough conversation history' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = getDeepSeekApiKey();
    const trigger = `Based on the conversation history above, NOW output the final PRD document in English.\n\nCRITICAL:\n- The PRD MUST be written entirely in English, regardless of what language the user used in the conversation.\n- Do NOT ask any more questions.\n- Do NOT output progress markers like "[Currently: XX%]" or "[目前進度：XX%]".\n- Do NOT wrap your entire response in a markdown code block.\n- Start IMMEDIATELY with "# PRD:" and follow the Mandatory Output Structure exactly.`;

    const messages = [
      { role: 'system', content: FINAL_PRD_PROMPT },
      ...history.map((h: any) => ({
        role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user',
        content: Array.isArray(h.parts) ? h.parts.map((p: any) => p.text).join('') : (h.content ?? h.text ?? ''),
      })),
      { role: 'user', content: trigger },
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
              temperature: 0.3,
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
