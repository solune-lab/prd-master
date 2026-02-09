
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { CHAT_SYSTEM_PROMPT, FINAL_PRD_PROMPT } from "../constants";
import { Language, ChatMessage } from "../types";

export class PRDService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  }

  /**
   * 輔助函式：實作指數退避重試邏輯，應對 500 或 網路代理錯誤
   */
  private async callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const isRetryable = 
        error.status === 500 || 
        error.message?.includes('500') || 
        error.message?.includes('xhr') ||
        error.message?.includes('Rpc failed');

      if (retries > 0 && isRetryable) {
        console.warn(`API call failed, retrying in ${delay}ms... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callWithRetry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  /**
   * 使用 Gemini 3 Flash 進行語音轉文字
   */
  async transcribeAudio(base64Data: string, mimeType: string, lang: Language): Promise<string> {
    return this.callWithRetry(async () => {
      const response = await this.ai.models.generateContent({
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

      return response.text?.trim() || "";
    });
  }

  /**
   * 對話邏輯
   */
  async sendMessage(message: string, lang: Language, history: ChatMessage[] = []): Promise<string> {
    return this.callWithRetry(async () => {
      const chat = this.ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: CHAT_SYSTEM_PROMPT(lang),
          temperature: 0.7,
        },
        history: history
      });

      const result = await chat.sendMessage({ message });
      return result.text || "";
    });
  }

  /**
   * 生成 PRD：遵循 PRD Master 2026 規格
   */
  async generateFinalPRD(history: ChatMessage[], lang: Language): Promise<string> {
    return this.callWithRetry(async () => {
      // 使用高品質模型以符合複雜架構設計需求
      const chat = this.ai.chats.create({
        model: "gemini-3-pro-preview",
        config: {
          systemInstruction: CHAT_SYSTEM_PROMPT(lang),
          temperature: 0.3,
        },
        history: history
      });

      // 加強指令：嚴格禁止 Markdown 代碼塊包裝
      const prompt = `CRITICAL: Do NOT wrap your entire response in a markdown code block (like \`\`\`markdown). 
      Start your response immediately with "# PRD:".
      
      ${FINAL_PRD_PROMPT}`;

      const result = await chat.sendMessage({ message: prompt });
      return result.text || "";
    });
  }
}
