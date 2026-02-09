
import { Language, ChatMessage } from "../types";

export class ClientPRDService {
  async sendMessage(message: string, lang: Language, history: ChatMessage[] = []): Promise<string> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, lang, history }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.text;
  }

  async generateFinalPRD(history: ChatMessage[], lang: Language): Promise<string> {
    const res = await fetch('/api/finalize', {
      method: 'POST',
      body: JSON.stringify({ history, lang }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.text;
  }

  async transcribeAudio(base64Data: string, mimeType: string, lang: Language): Promise<string> {
    const res = await fetch('/api/transcribe', {
      method: 'POST',
      body: JSON.stringify({ base64Data, mimeType, lang }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.text;
  }
}
