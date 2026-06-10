import { useMemo } from "react";
import { useTheme } from "../theme";

/**
 * Ambient page background: soft corner gradients + twinkling stars.
 * Fixed, non-interactive, and sits behind page content (zIndex 0).
 * Used on every page so the look is consistent app-wide.
 * Dark-only — the glow/stars are tuned for the dark canvas, so we skip it in light mode.
 */
export default function StarField({ count = 45 }: { count?: number }) {
  const [theme] = useTheme();
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

  return (
    <>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 55% 35% at 10% 0%, rgba(40,90,70,0.22) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 90% 100%, rgba(20,40,80,0.25) 0%, transparent 60%)" }} />

      {/* Glowing orbs — soft, slowly pulsing radial blooms (ported from the Ultraphonics hero) */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }} aria-hidden>
        {ORBS.map((o, i) => (
          <div key={i} style={{
            position: "absolute", borderRadius: "50%", filter: "blur(70px)", opacity: 0,
            width: o.size, height: o.size, background: o.background,
            top: o.top, left: o.left, right: o.right, bottom: o.bottom,
            animation: `orbPulse ${o.duration} ease-in-out infinite`, animationDelay: o.delay,
          }} />
        ))}
      </div>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {particles.map(p => (
          <div key={p.id} style={{ position: "absolute", borderRadius: "50%", background: "rgba(93,184,138,0.55)", width: p.size, height: p.size, left: `${p.left}%`, top: `${p.top}%`, animation: `twinkle ${p.duration}s ${p.delay}s infinite`, ["--op" as string]: p.op }} />
        ))}
      </div>
    </>
  );
}

// Three blurred radial orbs in the app palette (green / blue / teal).
const ORBS: {
  size: number; background: string; duration: string; delay: string;
  top?: string; left?: string; right?: string; bottom?: string;
}[] = [
  { size: 700, background: "radial-gradient(circle, rgba(93,184,138,0.60) 0%, rgba(93,184,138,0.20) 40%, transparent 70%)", top: "-20%", left: "-10%", delay: "0s", duration: "9s" },
  { size: 600, background: "radial-gradient(circle, rgba(91,143,212,0.40) 0%, rgba(91,143,212,0.12) 40%, transparent 70%)", bottom: "-15%", right: "-5%", delay: "-3s", duration: "11s" },
  { size: 500, background: "radial-gradient(circle, rgba(70,182,173,0.34) 0%, transparent 70%)", top: "40%", left: "45%", delay: "-6s", duration: "13s" },
];
