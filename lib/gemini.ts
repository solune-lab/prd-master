
import { GoogleGenAI } from "@google/genai";

export const runtime = 'edge';

// 確保 API_KEY 只在伺服器端讀取
export const getGeminiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("Missing API_KEY environment variable");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};
