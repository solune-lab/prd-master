
import { NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { base64Data, mimeType, lang } = await req.json();
    const ai = getGeminiClient();
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
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
        ]
      },
      config: {
        temperature: 0.1,
      }
    });

    return NextResponse.json({ text: response.text?.trim() || "" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
