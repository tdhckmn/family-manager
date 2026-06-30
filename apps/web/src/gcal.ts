// Google Calendar OAuth + REST API
// Setup: add VITE_GOOGLE_CLIENT_ID to .env
//   1. Enable Google Calendar API in Google Cloud Console
//   2. Create OAuth 2.0 Client ID (Web application)
//   3. Authorized JS origins: http://localhost:5173, https://myequanimity.web.app

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth";

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || "";
const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const API = "https://www.googleapis.com/calendar/v3";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GCalToken {
  accessToken: string;
  expiresAt: number; // ms since epoch
}

export interface GCalCalendar {
  id: string;
  summary: string;
  backgroundColor: string;
  primary: boolean;
}

export interface GCalEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
  calendarId: string;
  calendarColor: string;
  allDay: boolean;
}

export type GCalStatus = "disconnected" | "loading" | "connected" | "error";

// ── Token storage ─────────────────────────────────────────────────────────────

const tKey = (uid: string) => `eq_gcal_${uid}`;

function readToken(uid: string): GCalToken | null {
  try {
    const raw = localStorage.getItem(tKey(uid));
    if (!raw) return null;
    const t = JSON.parse(raw) as GCalToken;
    if (t.expiresAt < Date.now() + 120_000) return null; // expire if <2 min remain
    return t;
  } catch { return null; }
}

function saveToken(uid: string, t: GCalToken) {
  try { localStorage.setItem(tKey(uid), JSON.stringify(t)); } catch { /* quota */ }
}

function dropToken(uid: string) {
  localStorage.removeItem(tKey(uid));
}

// ── GIS loader ────────────────────────────────────────────────────────────────

type TokenCb = (r: { access_token?: string; expires_in?: number; error?: string }) => void;
interface TokenClient { requestAccessToken(o?: { prompt?: string }): void; }

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: { initTokenClient(c: { client_id: string; scope: string; callback: TokenCb }): TokenClient };
      };
    };
  }
}

let _gisLoading = false;
const _gisQ: Array<() => void> = [];

function loadGIS(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  return new Promise(resolve => {
    _gisQ.push(resolve);
    if (_gisLoading) return;
    _gisLoading = true;
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = s.onerror = () => _gisQ.splice(0).forEach(cb => cb());
    document.head.appendChild(s);
  });
}

// ── OAuth ─────────────────────────────────────────────────────────────────────

export async function requestGCalToken(uid: string): Promise<GCalToken> {
  if (!CLIENT_ID) throw new Error("VITE_GOOGLE_CLIENT_ID is not configured");
  await loadGIS();
  if (!window.google?.accounts) throw new Error("Google Identity Services unavailable");
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: resp => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error ?? "No access token returned"));
          return;
        }
        const t: GCalToken = {
          accessToken: resp.access_token,
          expiresAt: Date.now() + (resp.expires_in ?? 3600) * 1000,
        };
        saveToken(uid, t);
        resolve(t);
      },
    });
    client.requestAccessToken({ prompt: "" });
  });
}

// ── REST helpers ──────────────────────────────────────────────────────────────

async function get<T>(token: GCalToken, path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  if (!res.ok) throw new Error(`Calendar API ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchCalendars(token: GCalToken): Promise<GCalCalendar[]> {
  const data = await get<{
    items: Array<{ id: string; summary: string; backgroundColor: string; primary?: boolean }>;
  }>(token, "/users/me/calendarList?minAccessRole=reader&fields=items(id,summary,backgroundColor,primary)");
  return (data.items ?? []).map(c => ({
    id: c.id,
    summary: c.summary,
    backgroundColor: c.backgroundColor ?? "#4285f4",
    primary: !!c.primary,
  }));
}

export async function fetchTodayEvents(
  token: GCalToken,
  calendarIds: string[],
  colorMap: Map<string, string>,
): Promise<GCalEvent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tMin = today.toISOString();
  const tMax = new Date(today.getTime() + 86_400_000).toISOString();
  const tz = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);

  const settled = await Promise.allSettled(
    calendarIds.map(calId =>
      get<{
        items: Array<{
          id: string;
          summary?: string;
          start: { dateTime?: string; date?: string };
          end: { dateTime?: string; date?: string };
          htmlLink: string;
        }>;
      }>(
        token,
        `/calendars/${encodeURIComponent(calId)}/events?timeMin=${tMin}&timeMax=${tMax}&singleEvents=true&orderBy=startTime&timeZone=${tz}&fields=items(id,summary,start,end,htmlLink)`,
      ).then(data =>
        (data.items ?? []).map(e => ({
          id: `${calId}::${e.id}`,
          summary: e.summary ?? "(no title)",
          start: e.start,
          end: e.end,
          htmlLink: e.htmlLink,
          calendarId: calId,
          calendarColor: colorMap.get(calId) ?? "#4285f4",
          allDay: !!e.start.date && !e.start.dateTime,
        }) as GCalEvent)
      )
    )
  );

  const all: GCalEvent[] = [];
  for (const r of settled) if (r.status === "fulfilled") all.push(...r.value);
  return all.sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    const aT = a.start.dateTime ?? a.start.date ?? "";
    const bT = b.start.dateTime ?? b.start.date ?? "";
    return aT.localeCompare(bT);
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGCal() {
  const user = useAuth();
  const uid = user.uid;
  const [token, setToken] = useState<GCalToken | null>(() => readToken(uid));
  const [status, setStatus] = useState<GCalStatus>(() => readToken(uid) ? "connected" : "disconnected");
  const [authError, setAuthError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setStatus("loading");
    setAuthError(null);
    try {
      const t = await requestGCalToken(uid);
      setToken(t);
      setStatus("connected");
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Connection failed");
      setStatus("error");
    }
  }, [uid]);

  const disconnect = useCallback(() => {
    dropToken(uid);
    setToken(null);
    setStatus("disconnected");
    setAuthError(null);
  }, [uid]);

  // Automatically expire the token when it's about to lapse
  useEffect(() => {
    if (!token) return;
    const delay = token.expiresAt - Date.now() - 60_000;
    if (delay <= 0) { disconnect(); return; }
    const id = setTimeout(() => { setToken(null); setStatus("disconnected"); }, delay);
    return () => clearTimeout(id);
  }, [token, disconnect]);

  return {
    token,
    status,
    authError,
    isConnected: status === "connected",
    clientConfigured: !!CLIENT_ID,
    connect,
    disconnect,
  };
}
