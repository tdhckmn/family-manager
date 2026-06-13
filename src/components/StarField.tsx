import { useMemo } from "react";
import { useTheme } from "../theme";
import { usePrefs } from "../prefs";

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Ambient page background: soft corner gradients + twinkling stars.
 * Fixed, non-interactive, sits behind page content (zIndex 0).
 * Dark-only — glow/stars are tuned for the dark canvas, skipped in light mode.
 */
export default function StarField({ count = 45 }: { count?: number }) {
  const [theme] = useTheme();
  const { prefs } = usePrefs();
  const accent = prefs.accentColor;

  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1 + Math.random() * 2,
      delay: Math.random() * 8,
      duration: 4 + Math.random() * 6,
      op: 0.12 + Math.random() * 0.3,
    })), [count]);

  if (theme === "light") return null;

  const orbs = [
    {
      size: 700,
      background: `radial-gradient(circle, ${hexToRgba(accent, 0.55)} 0%, ${hexToRgba(accent, 0.18)} 40%, transparent 70%)`,
      top: "-20%", left: "-10%", delay: "0s", duration: "9s",
    },
    {
      size: 600,
      background: "radial-gradient(circle, rgba(91,143,212,0.38) 0%, rgba(91,143,212,0.10) 40%, transparent 70%)",
      bottom: "-15%", right: "-5%", delay: "-3s", duration: "11s",
    },
    {
      size: 500,
      background: "radial-gradient(circle, rgba(70,182,173,0.30) 0%, transparent 70%)",
      top: "40%", left: "45%", delay: "-6s", duration: "13s",
    },
  ];

  return (
    <>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `radial-gradient(ellipse 55% 35% at 10% 0%, ${hexToRgba(accent, 0.18)} 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 90% 100%, rgba(20,40,80,0.22) 0%, transparent 60%)` }} />

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }} aria-hidden>
        {orbs.map((o, i) => (
          <div key={i} style={{
            position: "absolute", borderRadius: "50%", filter: "blur(70px)", opacity: 0,
            width: o.size, height: o.size, background: o.background,
            top: (o as { top?: string }).top, left: (o as { left?: string }).left,
            right: (o as { right?: string }).right, bottom: (o as { bottom?: string }).bottom,
            animation: `orbPulse ${o.duration} ease-in-out infinite`, animationDelay: o.delay,
          }} />
        ))}
      </div>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {particles.map(p => (
          <div key={p.id} style={{
            position: "absolute", borderRadius: "50%",
            background: hexToRgba(accent, 0.5),
            width: p.size, height: p.size, left: `${p.left}%`, top: `${p.top}%`,
            animation: `twinkle ${p.duration}s ${p.delay}s infinite`,
            ["--op" as string]: p.op,
          }} />
        ))}
      </div>
    </>
  );
}
