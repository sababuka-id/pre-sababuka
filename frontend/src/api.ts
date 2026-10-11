import type { ApiErrorBody } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const CSRF_KEY = "sababuka.csrf";
const PREVIEW_ROLE_KEY = "sababuka.preview.role";
const PREVIEW_ORGANIZATION_KEY = "sababuka.preview.organization";

export function setRolePreview(role: string, organizationId?: string): void {
  sessionStorage.setItem(PREVIEW_ROLE_KEY, role);
  if (organizationId) sessionStorage.setItem(PREVIEW_ORGANIZATION_KEY, organizationId);
  else sessionStorage.removeItem(PREVIEW_ORGANIZATION_KEY);
}

export function clearRolePreview(): void {
  sessionStorage.removeItem(PREVIEW_ROLE_KEY);
  sessionStorage.removeItem(PREVIEW_ORGANIZATION_KEY);
}

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
  const previewRole = sessionStorage.getItem(PREVIEW_ROLE_KEY);
  const previewOrganization = sessionStorage.getItem(PREVIEW_ORGANIZATION_KEY);
  if (previewRole) headers.set("X-SABABUKA-Preview-Role", previewRole);
  if (previewOrganization) headers.set("X-SABABUKA-Preview-Organization", previewOrganization);
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
  if (options.mutation && typeof window !== "undefined") window.dispatchEvent(new CustomEvent("sababuka:notifications-changed"));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function apiPath(path: string): string {
  return `${API_BASE}${path}`;
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}
