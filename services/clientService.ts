import { Language, ChatMessage } from "../types";
import { apiUrl } from "@/lib/api";

export type ServiceErrorCode = 'TIMEOUT' | 'NETWORK' | 'SERVER' | 'UNKNOWN';

export class ServiceError extends Error {
  code: ServiceErrorCode;
  constructor(message: string, code: ServiceErrorCode) {
    super(message);
    this.code = code;
    this.name = 'ServiceError';
  }
}

export class ClientPRDService {
  /**
   * Helper: gets the current session token from Supabase browser client.
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return {};
    return { Authorization: `Bearer ${session.access_token}` };
  }

  /**
   * Fetch with timeout + retry (exponential backoff).
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    { timeoutMs = 30000, maxRetries = 2, initialDelayMs = 1000 } = {}
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);

        if (res.status >= 500 && attempt < maxRetries) {
          lastError = new ServiceError(`Server error (${res.status})`, 'SERVER');
          continue;
        }

        return res;
      } catch (err: any) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
          lastError = new ServiceError('Request timed out', 'TIMEOUT');
        } else {
          lastError = new ServiceError(
            err.message || 'Network error',
            'NETWORK'
          );
        }
        if (attempt >= maxRetries) break;
      }
    }

    throw lastError || new ServiceError('Request failed', 'UNKNOWN');
  }

  /**
   * Parse response JSON and throw typed error if needed.
   */
  private async parseResponse<T extends string>(res: Response, field: T): Promise<any> {
    if (!res.ok) {
      let msg = `Server error (${res.status})`;
      try {
        const data = await res.json();
        if (data.error) msg = data.error;
      } catch {}
      throw new ServiceError(msg, 'SERVER');
    }

    const data = await res.json();
    if (data.error) throw new ServiceError(data.error, 'SERVER');
    return data[field];
  }

  /**
   * Read a streaming text/plain response, calling onChunk for each piece.
   * Returns the full accumulated text.
   */
  private async readStream(
    res: Response,
    onChunk?: (chunk: string, accumulated: string) => void
  ): Promise<string> {
    if (!res.ok) {
      // Try to parse error from JSON body
      let msg = `Server error (${res.status})`;
      try {
        const data = await res.json();
        if (data.error) msg = data.error;
      } catch {}
      throw new ServiceError(msg, 'SERVER');
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new ServiceError('No response body', 'SERVER');
    }

    const decoder = new TextDecoder();
    let accumulated = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      accumulated += text;
      onChunk?.(text, accumulated);
    }

    if (!accumulated) {
      throw new ServiceError('Empty response from AI', 'SERVER');
    }

    return accumulated;
  }

  // --- AI API methods (streaming) ---

  async sendMessage(
    message: string,
    lang: Language,
    history: ChatMessage[] = [],
    onChunk?: (chunk: string, accumulated: string) => void
  ): Promise<string> {
    const res = await this.fetchWithRetry(apiUrl('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, lang, history }),
    }, { timeoutMs: 30000, maxRetries: 2 });
    return this.readStream(res, onChunk);
  }

  async generateFinalPRD(
    history: ChatMessage[],
    lang: Language,
    onChunk?: (chunk: string, accumulated: string) => void
  ): Promise<string> {
    const res = await this.fetchWithRetry(apiUrl('/api/finalize'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history, lang }),
    }, { timeoutMs: 180000, maxRetries: 1 });
    return this.readStream(res, onChunk);
  }

  async transcribeAudio(base64Data: string, mimeType: string, lang: Language): Promise<string> {
    const res = await this.fetchWithRetry(apiUrl('/api/transcribe'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data, mimeType, lang }),
    }, { timeoutMs: 30000, maxRetries: 2 });
    const text = await this.parseResponse(res, 'text');
    if (!text) {
      throw new ServiceError('No transcription result received', 'SERVER');
    }
    return text;
  }

  // --- Stripe methods ---

  async createCheckoutSession(tier: 'STARTER' | 'PRO_MONTHLY' | 'PRO_YEARLY'): Promise<string> {
    // Wait for Supabase session to be ready (retry up to 3s)
    let headers: HeadersInit = {};
    for (let i = 0; i < 6; i++) {
      headers = await this.getAuthHeaders();
      if ((headers as Record<string, string>)['Authorization']) break;
      await new Promise(r => setTimeout(r, 500));
    }
    if (!(headers as Record<string, string>)['Authorization']) {
      throw new Error('Not authenticated. Please log in and try again.');
    }

    const res = await this.fetchWithRetry(apiUrl('/api/stripe/checkout'), {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
    }, { timeoutMs: 15000, maxRetries: 2 });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (!data.url) throw new Error('No checkout URL returned. Please try again.');
    return data.url;
  }

  async createPortalSession(): Promise<string> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(apiUrl('/api/stripe/portal'), {
      method: 'POST',
      headers,
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.url;
  }

  // --- Profile methods ---

  async getProfile(accessToken?: string): Promise<any> {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : await this.getAuthHeaders();
    const res = await fetch(apiUrl('/api/profile'), { headers });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.profile;
  }

  async updateProfile(fields: Record<string, any>): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(apiUrl('/api/profile'), {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.profile;
  }

  // --- Usage tracking ---

  async logUsage(action_type: string, details?: Record<string, any>): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(apiUrl('/api/usage'), {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_type, details }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.profile;
  }

  // --- Projects (PRD history) ---

  async listProjects(): Promise<any[]> {
    const headers = await this.getAuthHeaders();
    if (!(headers as Record<string, string>)['Authorization']) return [];
    const res = await fetch(apiUrl('/api/projects'), { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  }

  async saveProject(item: {
    id: string;
    title: string;
    content: string;
    mode: string;
    language: string;
    isUnlocked: boolean;
  }): Promise<void> {
    const headers = await this.getAuthHeaders();
    if (!(headers as Record<string, string>)['Authorization']) return;
    await fetch(apiUrl('/api/projects'), {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  }

  async updateProjectUnlock(id: string, isUnlocked: boolean): Promise<void> {
    const headers = await this.getAuthHeaders();
    if (!(headers as Record<string, string>)['Authorization']) return;
    await fetch(apiUrl('/api/projects'), {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isUnlocked }),
    });
  }

  async deleteProject(id: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    if (!(headers as Record<string, string>)['Authorization']) return;
    await fetch(apiUrl(`/api/projects?id=${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers,
    });
  }

  // --- Referral ---

  async applyReferralCode(code: string): Promise<{ success: boolean; message: string }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(apiUrl('/api/referral/apply'), {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }
}
