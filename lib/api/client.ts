const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3001";

let _authToken: string | null = null;

/** Called by AuthTokenSync to keep the Bearer token fresh */
export function setAuthToken(token: string | null) {
  _authToken = token;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> || {}),
  };

  if (_authToken) {
    headers["Authorization"] = `Bearer ${_authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload?.data as T;
}
