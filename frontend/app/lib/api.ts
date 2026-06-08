const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_SECRET = process.env.NEXT_PUBLIC_API_SECRET || '';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOpts } = options;

  let url = `${API_BASE}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    ...fetchOpts,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_SECRET,
      ...fetchOpts.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ─── Posts API ───
export const postsApi = {
  list: (params?: Record<string, string>) =>
    apiFetch<{ posts: any[]; total: number }>('/api/posts', { params }),

  get: (id: string) =>
    apiFetch<{ post: any; auditTrail: any[] }>(`/api/posts/${id}`),

  create: (data: { symbol: string; chartUrl?: string; autoAnalyze?: boolean }) =>
    apiFetch<{ post: any; message: string }>('/api/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { caption?: string; hashtags?: string[]; risk_note?: string }) =>
    apiFetch<{ post: any }>(`/api/posts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  approve: (id: string) =>
    apiFetch<{ post: any; message: string }>(`/api/posts/${id}/approve`, {
      method: 'POST',
    }),

  publish: (id: string, platforms: string[], whatsappRecipient?: string) =>
    apiFetch<{ message: string; jobIds: string[] }>(`/api/posts/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify({ platforms, whatsappRecipient }),
    }),

  retry: (id: string) =>
    apiFetch<{ message: string }>(`/api/posts/${id}/retry`, {
      method: 'POST',
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/api/posts/${id}`, {
      method: 'DELETE',
    }),

  /** Synchronous draft processing — captures screenshot, runs AI, returns complete draft */
  draftProcess: (id: string, chartUrl?: string) =>
    apiFetch<{ post: any; captions: { facebook: string; instagram: string; whatsapp: string }; message: string }>(
      `/api/draft/${id}/process`,
      {
        method: 'POST',
        body: JSON.stringify({ chartUrl }),
      }
    ),

  /** Synchronous publishing — calls platform APIs directly (no Redis required) */
  publishDirect: (id: string, platforms: string[], whatsappRecipient?: string) =>
    apiFetch<{ message: string; results: Record<string, any>; status: string }>(
      `/api/posts/${id}/publish-direct`,
      {
        method: 'POST',
        body: JSON.stringify({ platforms, whatsappRecipient }),
      }
    ),
};

// ─── Logs API ───
export const logsApi = {
  list: (params?: Record<string, string>) =>
    apiFetch<{ logs: any[]; total: number }>('/api/logs', { params }),
};

// ─── Settings API ───
export const settingsApi = {
  get: () => apiFetch<{ settings: any[] }>('/api/settings'),

  update: (data: Record<string, any>) =>
    apiFetch<{ results: Record<string, string> }>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ─── Health API ───
export const healthApi = {
  check: () => apiFetch<{ status: string; checks: Record<string, string> }>('/api/health'),
  platforms: () => apiFetch<{ platforms: Record<string, any> }>('/api/health/platforms'),
};

// ─── Screenshots API ───
export const screenshotsApi = {
  capture: (symbol: string, chartUrl?: string) =>
    apiFetch<{ screenshot: any }>('/api/screenshots/capture', {
      method: 'POST',
      body: JSON.stringify({ symbol, chartUrl }),
    }),
};
