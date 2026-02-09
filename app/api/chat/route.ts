
import { NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';
import { CHAT_SYSTEM_PROMPT } from '@/constants';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { message, history, lang } = await req.json();
    const ai = getGeminiClient();
    
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: CHAT_SYSTEM_PROMPT(lang),
        temperature: 0.7,
      },
      history: history
    });

    const result = await chat.sendMessage({ message });
    return NextResponse.json({ text: result.text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
