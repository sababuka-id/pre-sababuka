import type { ApiErrorBody } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const CSRF_KEY = "sababuka.csrf";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export function setCsrfToken(token: string | null): void {
  if (token) sessionStorage.setItem(CSRF_KEY, token);
  else sessionStorage.removeItem(CSRF_KEY);
}

export function getCsrfToken(): string | null {
  return sessionStorage.getItem(CSRF_KEY);
}

export async function api<T>(
  path: string,
  options: RequestInit & { mutation?: boolean } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (options.mutation) {
    const token = getCsrfToken();
    if (token) headers.set("X-CSRF-Token", token);
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = await response.json() as ApiErrorBody;
    } catch {
      // The fallback below keeps network/proxy errors understandable.
    }
    throw new ApiClientError(
      response.status,
      body?.error.code ?? "HTTP_ERROR",
      body?.error.message ?? `Permintaan gagal (${response.status}).`,
      body?.error.request_id,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function apiPath(path: string): string {
  return `${API_BASE}${path}`;
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}
