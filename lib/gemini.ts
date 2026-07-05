
export const runtime = 'edge';

export const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

export const getDeepSeekApiKey = () => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY environment variable");
  }
  return apiKey;
};
