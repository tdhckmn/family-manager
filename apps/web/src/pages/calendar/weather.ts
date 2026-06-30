import { useState, useEffect } from "react";
import type { IconName } from "../../components/Icon";
import { YELLOW, BLUE, TEAL, LAV, TEXT_DIM } from "../shared/kit";

// Weather comes from WeatherAPI.com (free tier: 1M calls/mo, commercial use OK),
// called directly from the browser. The key ships in the bundle — use a FREE-TIER
// key with NO billing attached, so the worst case of exposure is an exhausted
// quota (weather stops), never a charge. We also cache per location for an hour.
const KEY = import.meta.env.VITE_WEATHERAPI_KEY as string | undefined;

export const UNIT_KEY = "fm.weatherUnit";
export const ZIP_KEY = "fm.weatherZip";
const COORDS_KEY = "fm.weatherCoords";
const CACHE_PREFIX = "fm.weatherCache.";
const CACHE_MS = 60 * 60 * 1000; // 1 hour

export type Unit = "F" | "C";

export interface DayWeather {
  date: string;            // YYYY-MM-DD
  code: number;
  maxC: number; maxF: number;
  minC: number; minF: number;
}
export interface WeatherData {
  location: string;        // resolved place name, e.g. "Ann Arbor"
  current: { code: number; isDay: boolean; tempC: number; tempF: number } | null;
  daily: Record<string, DayWeather>;
}
export type WeatherStatus = "loading" | "ok" | "denied" | "error";

/** Pick the temperature for the chosen unit. */
export function temp(unit: Unit, c: number, f: number): number {
  return unit === "C" ? c : f;
}

// ── WeatherAPI condition codes → our icon set ──────────────────────────────
// Reference: https://www.weatherapi.com/docs/weather_conditions.json
const THUNDER = new Set([1087, 1273, 1276, 1279, 1282]);
const SNOW = new Set([
  1066, 1069, 1072, 1114, 1117, 1147, 1168, 1171, 1204, 1207, 1210, 1213,
  1216, 1219, 1222, 1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264,
]);
const RAIN = new Set([
  1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1195, 1198, 1201,
  1240, 1243, 1246,
]);
const FOG = new Set([1030, 1135, 1147]);

/** Map a WeatherAPI condition code to a display icon, label, and accent color. */
export function weatherInfo(code: number, isDay = true): { icon: IconName; label: string; color: string } {
  if (code === 1000) return isDay
    ? { icon: "sun", label: "Clear", color: YELLOW }
    : { icon: "moon", label: "Clear", color: LAV };
  if (THUNDER.has(code)) return { icon: "cloudLightning", label: "Thunderstorm", color: LAV };
  if (SNOW.has(code)) return { icon: "cloudSnow", label: "Snow", color: TEAL };
  if (RAIN.has(code)) return { icon: "cloudRain", label: "Rain", color: BLUE };
  if (FOG.has(code)) return { icon: "cloudFog", label: "Fog", color: TEXT_DIM };
  if (code === 1003) return { icon: "cloudSun", label: "Partly cloudy", color: YELLOW };
  return { icon: "cloud", label: "Cloudy", color: TEXT_DIM };
}

interface ApiDay { date: string; day: {
  condition: { code: number };
  maxtemp_c: number; maxtemp_f: number; mintemp_c: number; mintemp_f: number;
} }

function parse(j: {
  location?: { name?: string };
  current?: { condition: { code: number }; is_day: number; temp_c: number; temp_f: number };
  forecast?: { forecastday?: ApiDay[] };
}): WeatherData {
  const daily: Record<string, DayWeather> = {};
  (j.forecast?.forecastday ?? []).forEach(fd => {
    daily[fd.date] = {
      date: fd.date,
      code: fd.day.condition.code,
      maxC: Math.round(fd.day.maxtemp_c), maxF: Math.round(fd.day.maxtemp_f),
      minC: Math.round(fd.day.mintemp_c), minF: Math.round(fd.day.mintemp_f),
    };
  });
  return {
    location: j.location?.name ?? "",
    current: j.current
      ? {
          code: j.current.condition.code,
          isDay: j.current.is_day === 1,
          tempC: Math.round(j.current.temp_c),
          tempF: Math.round(j.current.temp_f),
        }
      : null,
    daily,
  };
}

// Serve a cached forecast for this location if it's under an hour old, so repeated
// visits don't burn the quota (and keep working briefly if the API is down).
function readCache(q: string): WeatherData | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + q);
    if (!raw) return null;
    const { t, data } = JSON.parse(raw);
    if (Date.now() - t > CACHE_MS) return null;
    return data as WeatherData;
  } catch { return null; }
}

async function fetchWeather(q: string): Promise<WeatherData> {
  if (!KEY) throw new Error("VITE_WEATHERAPI_KEY is not set");
  const url = `https://api.weatherapi.com/v1/forecast.json`
    + `?key=${KEY}&q=${encodeURIComponent(q)}&days=3&aqi=no&alerts=no`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`weather ${res.status}`);
  const data = parse(await res.json());
  try { localStorage.setItem(CACHE_PREFIX + q, JSON.stringify({ t: Date.now(), data })); } catch { /* quota */ }
  return data;
}

/**
 * Fetches a forecast. If `zip` (a ZIP or city) is provided, uses it; otherwise
 * asks the browser for geolocation once and caches the coordinates so later
 * visits load instantly without re-prompting. Re-runs whenever `zip` changes.
 * Degrades to status "denied" when no location is available, "error" if the key
 * is missing or the request fails.
 */
export function useWeather(zip: string): { data: WeatherData | null; status: WeatherStatus } {
  const [data, setData] = useState<WeatherData | null>(null);
  const [status, setStatus] = useState<WeatherStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    const run = (q: string) => {
      const cached = readCache(q);
      if (cached) { setData(cached); setStatus("ok"); }
      return fetchWeather(q)
        .then(d => { if (!cancelled) { setData(d); setStatus("ok"); } })
        .catch(() => { if (!cancelled && !cached) setStatus("error"); });
    };

    const z = zip.trim();
    if (z) { run(z); return () => { cancelled = true; }; }

    // No manual location → use geolocation. Reuse cached coords immediately.
    const coords = localStorage.getItem(COORDS_KEY);
    if (coords) run(coords);

    if (!("geolocation" in navigator)) {
      if (!coords) setStatus("denied");
      return () => { cancelled = true; };
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const q = `${pos.coords.latitude},${pos.coords.longitude}`;
        localStorage.setItem(COORDS_KEY, q);
        run(q);
      },
      () => { if (!coords) setStatus("denied"); },
      { timeout: 8000, maximumAge: 3_600_000 },
    );

    return () => { cancelled = true; };
  }, [zip]);

  return { data, status };
}
