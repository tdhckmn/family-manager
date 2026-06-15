// Minimal stroke icon set (replaces emoji throughout the app).
// All icons share a 24×24 viewBox and inherit color via `currentColor`.

export type IconName =
  | "home" | "wallet" | "check" | "chart" | "calendar" | "list"
  | "shield" | "bag" | "flow" | "bank" | "droplet" | "card"
  | "gear" | "chevronDown" | "chevronLeft" | "chevronRight" | "chevronUp"
  | "external" | "plus" | "signout" | "book"
  | "utensils" | "star" | "clock" | "pencil" | "x"
  | "wrench" | "sparkles" | "repeat" | "trash" | "target"
  | "play" | "stop" | "warning" | "checkMark" | "tv"
  | "sun" | "moon" | "cloud" | "cloudSun" | "cloudRain" | "cloudSnow" | "cloudLightning" | "cloudFog";

export function Icon({ name, size = 16, color = "currentColor", strokeWidth = 1.8, style }: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}) {
  const p = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: color, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    style: { flexShrink: 0, display: "block", ...style },
  };
  switch (name) {
    case "home":
      return <svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>;
    case "wallet":
      return <svg {...p}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><circle cx="16.5" cy="14.5" r="1" /></svg>;
    case "check":
      return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>;
    case "chart":
      return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 12V3" /><path d="M12 12l7 5" /></svg>;
    case "calendar":
      return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18" /><path d="M8 3v4" /><path d="M16 3v4" /></svg>;
    case "list":
      return <svg {...p}><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3.5 6h.01" /><path d="M3.5 12h.01" /><path d="M3.5 18h.01" /></svg>;
    case "shield":
      return <svg {...p}><path d="M12 3 5 6v5c0 4 3 7 7 8 4-1 7-4 7-8V6z" /></svg>;
    case "bag":
      return <svg {...p}><path d="M6 8h12l-1 11.5H7z" /><path d="M9 8a3 3 0 0 1 6 0" /></svg>;
    case "flow":
      return <svg {...p}><path d="M3 12h4l3 7 4-14 3 7h4" /></svg>;
    case "bank":
      return <svg {...p}><path d="M3 9 12 4l9 5" /><path d="M5 10v7" /><path d="M19 10v7" /><path d="M9 10v7" /><path d="M15 10v7" /><path d="M3 20h18" /></svg>;
    case "droplet":
      return <svg {...p}><path d="M12 3s6 5.5 6 10a6 6 0 0 1-12 0c0-4.5 6-10 6-10z" /></svg>;
    case "card":
      return <svg {...p}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /><path d="M7 15h3" /></svg>;
    case "gear":
      return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
    case "chevronDown":
      return <svg {...p}><path d="m6 9 6 6 6-6" /></svg>;
    case "chevronLeft":
      return <svg {...p}><path d="m15 18-6-6 6-6" /></svg>;
    case "chevronRight":
      return <svg {...p}><path d="m9 18 6-6-6-6" /></svg>;
    case "chevronUp":
      return <svg {...p}><path d="m18 15-6-6-6 6" /></svg>;
    case "external":
      return <svg {...p}><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg>;
    case "plus":
      return <svg {...p}><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
    case "signout":
      return <svg {...p}><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></svg>;
    case "book":
      return <svg {...p}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 5v14" /></svg>;
    case "utensils":
      return <svg {...p}><path d="M8 3v5a2 2 0 0 0 2 2H8v7" /><path d="M6 3v16" /><path d="M10 3v16" /><path d="M17 3v16" /><path d="M15 3a2 2 0 0 1 2 2v4h-4V5a2 2 0 0 1 2-2z" /></svg>;
    case "star":
      return <svg {...p}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></svg>;
    case "clock":
      return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>;
    case "pencil":
      return <svg {...p}><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>;
    case "x":
      return <svg {...p}><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>;
    case "wrench":
      return <svg {...p}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8 7.2 20l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.2-2.2z" /></svg>;
    case "sparkles":
      return <svg {...p}><path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /><path d="M18 15l.9 2.1 2.1.9-2.1.9L18 21l-.9-2.1-2.1-.9 2.1-.9z" /></svg>;
    case "repeat":
      return <svg {...p}><path d="M17 2l3 3-3 3" /><path d="M4 11V9a4 4 0 0 1 4-4h12" /><path d="M7 22l-3-3 3-3" /><path d="M20 13v2a4 4 0 0 1-4 4H4" /></svg>;
    case "trash":
      return <svg {...p}><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13" /><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" /></svg>;
    case "target":
      return <svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>;
    case "sun":
      return <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.9 4.9l1.4 1.4" /><path d="M17.7 17.7l1.4 1.4" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M4.9 19.1l1.4-1.4" /><path d="M17.7 6.3l1.4-1.4" /></svg>;
    case "moon":
      return <svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;
    case "cloud":
      return <svg {...p}><path d="M7 18a4 4 0 0 1-.5-7.97 5.5 5.5 0 0 1 10.6 1.02A3.5 3.5 0 0 1 17 18z" /></svg>;
    case "cloudSun":
      return <svg {...p}><path d="M12 3v1.5" /><path d="M5.6 5.6l1 1" /><path d="M3 12h1.5" /><path d="M18.4 5.6l-1 1" /><path d="M8.2 8.2a4 4 0 1 1 5.6 5.6" /><path d="M7 20a3.5 3.5 0 0 1-.4-6.98 4.5 4.5 0 0 1 8.7.98A3 3 0 0 1 16 20z" /></svg>;
    case "cloudRain":
      return <svg {...p}><path d="M7 15a4 4 0 0 1-.5-7.97 5.5 5.5 0 0 1 10.6 1.02A3.5 3.5 0 0 1 17 15z" /><path d="M8 19l-1 2" /><path d="M12 19l-1 2" /><path d="M16 19l-1 2" /></svg>;
    case "cloudSnow":
      return <svg {...p}><path d="M7 15a4 4 0 0 1-.5-7.97 5.5 5.5 0 0 1 10.6 1.02A3.5 3.5 0 0 1 17 15z" /><path d="M8 19h.01" /><path d="M12 19h.01" /><path d="M16 19h.01" /><path d="M10 21h.01" /><path d="M14 21h.01" /></svg>;
    case "cloudLightning":
      return <svg {...p}><path d="M7 15a4 4 0 0 1-.5-7.97 5.5 5.5 0 0 1 10.6 1.02A3.5 3.5 0 0 1 17 15z" /><path d="M12 13l-2 4h3l-2 4" /></svg>;
    case "cloudFog":
      return <svg {...p}><path d="M7 13a4 4 0 0 1-.5-7.97 5.5 5.5 0 0 1 10.6 1.02A3.5 3.5 0 0 1 17 13z" /><path d="M6 17h12" /><path d="M8 21h10" /></svg>;
    case "play":
      return <svg {...p}><polygon points="5 3 19 12 5 21 5 3" /></svg>;
    case "stop":
      return <svg {...p}><rect x="4" y="4" width="16" height="16" rx="2" /></svg>;
    case "warning":
      return <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
    case "checkMark":
      return <svg {...p}><polyline points="20 6 9 17 4 12" /></svg>;
    case "tv":
      return <svg {...p}><rect x="2" y="7" width="20" height="15" rx="2" /><polyline points="17 2 12 7 7 2" /></svg>;
  }
}
