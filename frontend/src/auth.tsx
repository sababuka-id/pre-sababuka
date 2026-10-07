import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiClientError, jsonBody, setCsrfToken } from "./api";
import type { CurrentUser, MenuItem } from "./types";

interface LoginInput {
  identifier: string;
  password: string;
  mfa_code?: string;
  recovery_code?: string;
}

interface AuthState {
  user: CurrentUser | null;
  menu: MenuItem[];
  loading: boolean;
  login(input: LoginInput): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const current = await api<CurrentUser>("/me");
      const effectiveMenu = await api<{ data: MenuItem[] }>("/me/menu");
      setUser(current);
      setMenu(effectiveMenu.data);
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.status !== 401) throw error;
      setUser(null);
      setMenu([]);
      setCsrfToken(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (input: LoginInput) => {
    const session = await api<{ user: CurrentUser; csrf_token: string }>("/auth/login", {
      method: "POST",
      body: jsonBody(input),
    });
    setCsrfToken(session.csrf_token);
    setUser(session.user);
    const effectiveMenu = await api<{ data: MenuItem[] }>("/me/menu");
    setMenu(effectiveMenu.data);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api<void>("/auth/logout", { method: "POST", mutation: true });
    } finally {
      setCsrfToken(null);
      setUser(null);
      setMenu([]);
    }
  }, []);

  const value = useMemo(() => ({ user, menu, loading, login, logout, refresh }), [user, menu, loading, login, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth harus digunakan di dalam AuthProvider.");
  return context;
}
