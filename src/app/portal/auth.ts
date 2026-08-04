"use client";

// Lightweight client-side worker session for the web portal. The worker JWT
// (issued by /api/mobile/auth/*) is kept in localStorage and sent as a Bearer
// token to the existing /api/mobile/portal/* endpoints — the same API the
// mobile app uses. Card data and Square tokens never touch this layer.

const TOKEN_KEY = "lovetap_worker_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// Fetch helper that attaches the worker token and signals 401s to the caller.
export async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init.headers || {}),
    },
  });
  return res;
}
