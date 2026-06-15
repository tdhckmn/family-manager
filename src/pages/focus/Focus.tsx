import { useState, useEffect, useRef } from "react";
import { useNoise, NOISE_OPTIONS } from "../../noise";
import { PageShell, BORDER, TEXT, TEXT_DIM, TEXT_MUTED, FONT } from "../shared/kit";
import { Icon } from "../../components/Icon";
import AffirmationsSection from "./AffirmationsSection";

// ── Types ──────────────────────────────────────────────────────────────────────

type PhaseType = "inhale" | "exhale" | "hold-in" | "hold-out";

interface Phase {
  label: string;
  type: PhaseType;
  dur: number;
}

interface Technique {
  id: string;
  label: string;
  desc: string;
  about: string;
  phases: Phase[];
}

// ── Data ───────────────────────────────────────────────────────────────────────

const TECHNIQUES: Technique[] = [
  {
    id: "relax", label: "Relaxing Breath", desc: "6 · 8",
    about: "The extended exhale activates the parasympathetic nervous system, slowing the heart rate and quieting the stress response. Begin here.",
    phases: [
      { label: "Inhale", type: "inhale", dur: 6 },
      { label: "Exhale", type: "exhale", dur: 8 },
    ],
  },
  {
    id: "box", label: "Box Breathing", desc: "4 · 4 · 4 · 4",
    about: "Used by Navy SEALs and high-performance athletes to maintain composure under pressure. Equal phases build a felt sense of control.",
    phases: [
      { label: "Inhale", type: "inhale",   dur: 4 },
      { label: "Hold",   type: "hold-in",  dur: 4 },
      { label: "Exhale", type: "exhale",   dur: 4 },
      { label: "Hold",   type: "hold-out", dur: 4 },
    ],
  },
  {
    id: "478", label: "4-7-8", desc: "4 · 7 · 8",
    about: "Dr. Andrew Weil's technique. The long hold builds a CO₂ tolerance that deepens relaxation and can assist with sleep onset.",
    phases: [
      { label: "Inhale", type: "inhale",  dur: 4 },
      { label: "Hold",   type: "hold-in", dur: 7 },
      { label: "Exhale", type: "exhale",  dur: 8 },
    ],
  },
  {
    id: "equal", label: "Equal Breathing", desc: "4 · 4",
    about: "The gentlest technique — ideal for beginners or moments of mild stress. Simply breathing in and out in equal measure restores balance.",
    phases: [
      { label: "Inhale", type: "inhale", dur: 4 },
      { label: "Exhale", type: "exhale", dur: 4 },
    ],
  },
];

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--surface)", border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden" }}>
      <div style={{ padding: "13px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.8, textTransform: "uppercase", color: accent }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "20px 20px" }}>{children}</div>
    </div>
  );
}

// ── Noise section (consumes global NoiseContext) ───────────────────────────────

function NoiseSection({ accent }: { accent: string }) {
  const { on, noiseType, volume, toggle, setVolume, changeType } = useNoise();

  return (
    <Section title="Noise" accent={accent}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {NOISE_OPTIONS.map(({ type, label, desc }) => {
          const active = noiseType === type;
          return (
            <button key={type} onClick={() => changeType(type)} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, padding: "12px 8px",
              background: active ? `${accent}18` : "var(--surface-hi, var(--surface))",
              border: `1.5px solid ${active ? accent + "66" : BORDER}`,
              borderRadius: 12, cursor: "pointer", fontFamily: FONT, transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: active ? accent : TEXT }}>{label}</span>
              <span style={{ fontSize: 10, color: TEXT_MUTED }}>{desc}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: on ? 14 : 0 }}>
        <button onClick={toggle} style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "10px 20px", flexShrink: 0,
          background: on ? accent : "transparent",
          border: `1.5px solid ${on ? accent : BORDER}`,
          borderRadius: 10, cursor: "pointer", fontFamily: FONT,
          fontWeight: 800, fontSize: 13,
          color: on ? "#06091a" : TEXT, transition: "all 0.15s",
        }}>
          {on ? <Icon name="stop" size={10} /> : <Icon name="play" size={10} />}
          {on ? "On" : "Off"}
        </button>

        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, color: TEXT_MUTED, flexShrink: 0 }}>Vol</span>
          <input type="range" min={0} max={1} step={0.01} value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: accent, cursor: "pointer" }} />
          <span style={{ fontSize: 10, color: TEXT_MUTED, width: 30, textAlign: "right", flexShrink: 0 }}>
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>

      {on && (
        <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, display: "inline-block", flexShrink: 0 }} />
          {NOISE_OPTIONS.find(n => n.type === noiseType)?.label} noise · playing
        </div>
      )}
    </Section>
  );
}

// ── Breathing tool ─────────────────────────────────────────────────────────────

const SCALE_MIN = 0.52;
const SCALE_MAX = 1.0;
const CIRCLE_SIZE = 210;

function BreathingSection({ accent }: { accent: string }) {
  const [techniqueId, setTechniqueId] = useState("relax");
  const [active, setActive] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [label, setLabel] = useState("Ready");
  const [remaining, setRemaining] = useState(0);

  const ringRef     = useRef<HTMLDivElement>(null);
  const glowRef     = useRef<HTMLDivElement>(null);
  const rafRef      = useRef<number>(0);
  const displayRef  = useRef({ label: "Ready", remaining: 0 });
  const techniqueRef = useRef(TECHNIQUES.find(t => t.id === techniqueId)!);

  const technique = TECHNIQUES.find(t => t.id === techniqueId)!;
  useEffect(() => { techniqueRef.current = technique; }, [technique]);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current);
      if (ringRef.current) ringRef.current.style.transform = `scale(${SCALE_MIN})`;
      if (glowRef.current) glowRef.current.style.transform = `scale(${SCALE_MIN})`;
      displayRef.current = { label: "Ready", remaining: 0 };
      setLabel("Ready");
      setRemaining(0);
      setCycles(0);
      return;
    }

    let phaseIdx = 0;
    let phaseStart = performance.now();
    let cycleCount = 0;

    const tick = (now: number) => {
      const t = techniqueRef.current;
      const phase = t.phases[phaseIdx];
      const elapsed = (now - phaseStart) / 1000;

      if (elapsed >= phase.dur) {
        const next = (phaseIdx + 1) % t.phases.length;
        if (next === 0) { cycleCount++; setCycles(cycleCount); }
        phaseIdx = next;
        phaseStart = now;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const progress = elapsed / phase.dur;
      let scale: number;
      if      (phase.type === "inhale")  scale = SCALE_MIN + (SCALE_MAX - SCALE_MIN) * progress;
      else if (phase.type === "exhale")  scale = SCALE_MAX - (SCALE_MAX - SCALE_MIN) * progress;
      else if (phase.type === "hold-in") scale = SCALE_MAX;
      else                               scale = SCALE_MIN;

      if (ringRef.current) ringRef.current.style.transform = `scale(${scale})`;
      if (glowRef.current) glowRef.current.style.transform = `scale(${scale})`;

      const newRemaining = Math.ceil(phase.dur - elapsed);
      if (displayRef.current.label !== phase.label || displayRef.current.remaining !== newRemaining) {
        displayRef.current = { label: phase.label, remaining: newRemaining };
        setLabel(phase.label);
        setRemaining(newRemaining);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  function handleTechniqueChange(id: string) {
    setTechniqueId(id);
    if (active) setActive(false);
  }

  const isHold = label === "Hold";
  const phaseColor = isHold ? TEXT_DIM : accent;

  return (
    <Section title="Breathing" accent={accent}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
        {TECHNIQUES.map(t => {
          const sel = t.id === techniqueId;
          return (
            <button key={t.id} onClick={() => handleTechniqueChange(t.id)} style={{
              textAlign: "left", padding: "10px 12px",
              background: sel ? `${accent}18` : "var(--surface-hi, var(--surface))",
              border: `1.5px solid ${sel ? accent + "66" : BORDER}`,
              borderRadius: 10, cursor: "pointer", fontFamily: FONT, transition: "all 0.15s",
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: sel ? accent : TEXT, marginBottom: 2 }}>{t.label}</div>
              <div style={{ fontSize: 10, color: TEXT_MUTED, letterSpacing: 0.3 }}>{t.desc}</div>
            </button>
          );
        })}
      </div>

      <p style={{ margin: "0 0 28px", fontSize: 12, color: TEXT_DIM, lineHeight: 1.65, fontStyle: "italic" }}>
        {technique.about}
      </p>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
        <div style={{ position: "relative", width: CIRCLE_SIZE, height: CIRCLE_SIZE, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div ref={glowRef} style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: `radial-gradient(circle, ${accent}1a 0%, ${accent}06 55%, transparent 70%)`,
            boxShadow: `0 0 70px ${accent}30, 0 0 140px ${accent}12`,
            transform: `scale(${SCALE_MIN})`,
          }} />
          <div ref={ringRef} style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: `2px solid ${accent}${active ? "77" : "28"}`,
            transition: "border-color 0.4s",
            transform: `scale(${SCALE_MIN})`,
          }} />
          <div style={{ position: "relative", textAlign: "center", userSelect: "none" }}>
            {active ? (
              <>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: phaseColor, marginBottom: 6, transition: "color 0.3s" }}>
                  {label}
                </div>
                <div style={{ fontSize: 44, fontWeight: 900, color: TEXT, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {remaining}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600, letterSpacing: 0.5 }}>
                Press Begin
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <button onClick={() => setActive(a => !a)} style={{
            padding: "11px 40px",
            background: active ? "transparent" : accent,
            border: `2px solid ${active ? BORDER : accent}`,
            borderRadius: 50, cursor: "pointer", fontFamily: FONT,
            fontWeight: 800, fontSize: 14, letterSpacing: 0.5,
            color: active ? TEXT_DIM : "#06091a",
            transition: "all 0.2s",
          }}>
            {active ? "Stop" : "Begin"}
          </button>
          {cycles > 0 && (
            <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600 }}>
              {cycles} cycle{cycles !== 1 ? "s" : ""} complete
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const FOCUS_ACCENT = "#46b6ad";

export default function Focus() {
  const accent = FOCUS_ACCENT;

  return (
    <PageShell tool="focus" maxWidth={640}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <NoiseSection accent={accent} />
        <BreathingSection accent={accent} />
        <AffirmationsSection accent={accent} />
      </div>
    </PageShell>
  );
}
