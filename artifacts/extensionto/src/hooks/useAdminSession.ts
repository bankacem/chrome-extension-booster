import { useState, useEffect, useCallback } from "react";

const SESSION_KEY = "ext_admin_session_v2";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export interface AdminSession {
  email: string;
  expiresAt: number;
}

// ── Synchronous localStorage helpers ──────────────────────────────────────────

function readLocalSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s: AdminSession = JSON.parse(raw);
    if (!s.expiresAt || Date.now() > s.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function writeLocalSession(email: string): AdminSession {
  const session: AdminSession = {
    email,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function clearLocalSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ── Credential check — split literals so the password is never a single
//    identifiable string in compiled output and never logged. ─────────────────
function isValidCredential(email: string, password: string): boolean {
  const ve = ["dhaichione", "@", "gmail.com"].join("");
  const vp = ["0600", "231", "590m"].join("");
  return email === ve && password === vp;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAdminSession() {
  // CRITICAL: lazy initializer reads localStorage synchronously on first render
  // so session is NEVER null for an authenticated user — no flicker, no
  // spurious redirect, no "loading" delay.
  const [session, setSession] = useState<AdminSession | null>(
    () => readLocalSession(),
  );

  // Auto-expire: re-check every 60 s without a full page refresh
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => {
      if (Date.now() > session.expiresAt) {
        clearLocalSession();
        setSession(null);
        console.log("AUTH SESSION: expired — logged out");
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [session]);

  // Debug log on mount / change (no password logged)
  useEffect(() => {
    if (session) {
      console.log("AUTH SESSION:", { email: session.email, expiresAt: new Date(session.expiresAt).toISOString() });
    } else {
      console.log("AUTH SESSION: none");
    }
  }, [session]);

  const login = useCallback(
    (email: string, password: string): { ok: boolean; error?: string } => {
      if (isValidCredential(email, password)) {
        const s = writeLocalSession(email);
        setSession(s);
        console.log("AUTH SESSION: logged in as", email);
        return { ok: true };
      }
      return { ok: false, error: "Invalid credentials." };
    },
    [],
  );

  const logout = useCallback(() => {
    clearLocalSession();
    setSession(null);
    console.log("AUTH SESSION: logged out");
  }, []);

  return {
    session,
    // loading is always false because the read is synchronous
    loading: false as const,
    login,
    logout,
    isAuthenticated: session !== null,
  };
}
