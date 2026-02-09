
import { NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';
import { CHAT_SYSTEM_PROMPT, FINAL_PRD_PROMPT } from '@/constants';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { history, lang } = await req.json();
    const ai = getGeminiClient();
    
    const chat = ai.chats.create({
      model: "gemini-3-pro-preview",
      config: {
        systemInstruction: CHAT_SYSTEM_PROMPT(lang),
        temperature: 0.3,
      },
      history: history
    });

    const prompt = `CRITICAL: Do NOT wrap your entire response in a markdown code block. Start immediately with "# PRD:".\n\n${FINAL_PRD_PROMPT}`;
    const result = await chat.sendMessage({ message: prompt });
    
    return NextResponse.json({ text: result.text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
