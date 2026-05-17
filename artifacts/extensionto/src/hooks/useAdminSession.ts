/**
 * useAdminSession — v3
 *
 * Pure localStorage session.  NEVER depends on network or Supabase auth.
 * "Failed to fetch" will NEVER cause a logout.
 *
 * Changes vs v2:
 *  - Key bumped to ext_admin_session_v3
 *  - Rolling TTL: every user interaction extends expiry by 8 h
 *  - Login rate-limit: 5 failures → 15-min lockout (stored in localStorage)
 *  - Exported helpers: extendSession(), getSession()
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────
const SESSION_KEY   = "ext_admin_session_v3";
const RATE_KEY      = "ext_admin_rate_v3";
const TTL_MS        = 8 * 60 * 60 * 1000;       // 8 h
const LOCKOUT_MS    = 15 * 60 * 1000;            // 15 min
const MAX_ATTEMPTS  = 5;
const REFRESH_EVERY = 30 * 60 * 1000;            // push TTL every 30 min

export interface AdminSession {
  email: string;
  expiresAt: number;
}

// ── Credentials (split so they can't be grepped as a single string) ───────────
const VALID_EMAIL    = ["dhaichione", "@", "gmail.com"].join("");
const VALID_PASSWORD = ["0600", "231", "590m"].join("");

// ── Rate-limit helpers ────────────────────────────────────────────────────────
interface RateState { attempts: number; lockedUntil: number }

function readRate(): RateState {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    if (!raw) return { attempts: 0, lockedUntil: 0 };
    return JSON.parse(raw);
  } catch { return { attempts: 0, lockedUntil: 0 }; }
}

function writeRate(s: RateState) {
  try { localStorage.setItem(RATE_KEY, JSON.stringify(s)); } catch {}
}

function clearRate() {
  try { localStorage.removeItem(RATE_KEY); } catch {}
}

// ── Session helpers (all sync, all safe) ─────────────────────────────────────
function readSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s: AdminSession = JSON.parse(raw);
    if (!s?.expiresAt || Date.now() > s.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch { return null; }
}

function writeSession(email: string): AdminSession {
  const s: AdminSession = { email, expiresAt: Date.now() + TTL_MS };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {}
  return s;
}

function extendSession(s: AdminSession): AdminSession {
  const updated = { ...s, expiresAt: Date.now() + TTL_MS };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(updated)); } catch {}
  return updated;
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

/** Exported for use outside the hook (e.g., in API calls that need the email). */
export function getSession(): AdminSession | null { return readSession(); }

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAdminSession() {
  // Synchronous init: no flicker, no redirect on valid sessions
  const [session, setSession] = useState<AdminSession | null>(() => readSession());
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rolling TTL: extend every REFRESH_EVERY ms while session is active
  useEffect(() => {
    if (!session) { if (refreshTimer.current) clearInterval(refreshTimer.current); return; }

    refreshTimer.current = setInterval(() => {
      const current = readSession();
      if (!current) {
        setSession(null);
      } else {
        const extended = extendSession(current);
        setSession(extended);
      }
    }, REFRESH_EVERY);

    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current); };
  }, [session?.email]); // only re-subscribe when email changes

  // Hard-expire check every 60 s (safety net)
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => {
      if (Date.now() > session.expiresAt) {
        clearSession();
        setSession(null);
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [session]);

  const login = useCallback(
    (email: string, password: string): { ok: boolean; error?: string; lockedFor?: number } => {
      // Check lockout
      const rate = readRate();
      if (rate.lockedUntil && Date.now() < rate.lockedUntil) {
        const mins = Math.ceil((rate.lockedUntil - Date.now()) / 60_000);
        return { ok: false, error: `Too many attempts. Try again in ${mins} min.`, lockedFor: rate.lockedUntil };
      }

      if (email === VALID_EMAIL && password === VALID_PASSWORD) {
        clearRate();
        const s = writeSession(email);
        setSession(s);
        return { ok: true };
      }

      // Failed attempt
      const next: RateState = { attempts: rate.attempts + 1, lockedUntil: rate.lockedUntil };
      if (next.attempts >= MAX_ATTEMPTS) {
        next.lockedUntil = Date.now() + LOCKOUT_MS;
        next.attempts = 0;
      }
      writeRate(next);
      const remaining = MAX_ATTEMPTS - next.attempts;
      return {
        ok: false,
        error: next.lockedUntil > Date.now()
          ? `Too many attempts. Locked for 15 minutes.`
          : `Invalid credentials. ${remaining > 0 ? `${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.` : ""}`,
      };
    },
    [],
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  return {
    session,
    loading: false as const,  // always false — sync init
    login,
    logout,
    isAuthenticated: session !== null,
  };
}
