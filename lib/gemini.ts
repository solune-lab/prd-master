
import { GoogleGenAI } from "@google/genai";

export const runtime = 'edge';

// 確保 API_KEY 只在伺服器端讀取
export const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }
  return new GoogleGenAI({ apiKey });
};
