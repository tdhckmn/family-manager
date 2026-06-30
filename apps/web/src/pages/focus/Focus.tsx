import { useState, useEffect, useRef } from "react";
import { useNoise, NOISE_OPTIONS, type NoiseType } from "../../noise";
import { usePrefs } from "../../prefs";
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

// ── Voice helper ───────────────────────────────────────────────────────────────

function speakPhase(label: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(label);

  const voices = window.speechSynthesis.getVoices();
  const en = voices.filter(v => v.lang.startsWith("en"));
  // Non-local voices (Chrome's neural/Google voices) sound most natural
  const remote = en.filter(v => !v.localService);
  // Fall back to known high-quality local voices
  const natural = en.find(v => ["Samantha", "Ava", "Karen", "Moira", "Susan"].some(n => v.name.includes(n)));
  const voice = remote[0] ?? natural ?? en[0] ?? null;
  if (voice) utt.voice = voice;

  utt.rate = 0.82;
  utt.pitch = 1.0;
  utt.volume = 0.85;
  window.speechSynthesis.speak(utt);
}

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

// ── Noise section ──────────────────────────────────────────────────────────────

function NoiseSection({ accent }: { accent: string }) {
  const { on, noiseType, volume, toggle, setVolume, changeType } = useNoise();
  const { prefs, updatePrefs } = usePrefs();

  // Apply saved prefs on first mount (type + volume only; don't auto-start audio)
  const initDone = useRef(false);
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    if (prefs.focusNoiseType && prefs.focusNoiseType !== noiseType) changeType(prefs.focusNoiseType as NoiseType);
    if (prefs.focusNoiseVolume !== volume) setVolume(prefs.focusNoiseVolume);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist changes back to prefs
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!initDone.current) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      updatePrefs({ focusNoiseType: noiseType, focusNoiseVolume: volume });
    }, 600);
    return () => { if (saveRef.current) clearTimeout(saveRef.current); };
  }, [noiseType, volume]); // eslint-disable-line react-hooks/exhaustive-deps

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

    </Section>
  );
}

// ── Breathing tool ─────────────────────────────────────────────────────────────

const SCALE_MIN = 0.52;
const SCALE_MAX = 1.0;
const CIRCLE_SIZE = 210;

function BreathingSection({ accent }: { accent: string }) {
  const { prefs, updatePrefs } = usePrefs();

  const [techniqueId, setTechniqueId] = useState(prefs.focusBreathingId || "relax");
  const [voiceGuide, setVoiceGuide] = useState(prefs.focusVoiceGuide ?? false);
  const [active, setActive] = useState(false);
  const [label, setLabel] = useState("Ready");
  const [remaining, setRemaining] = useState(0);

  const ringRef    = useRef<HTMLDivElement>(null);
  const glowRef    = useRef<HTMLDivElement>(null);
  const bgGlowRef  = useRef<HTMLDivElement>(null);
  const rafRef     = useRef<number>(0);
  const displayRef = useRef({ label: "Ready", remaining: 0 });

  // Refs so RAF closure always sees latest values
  const techniqueRef  = useRef(TECHNIQUES.find(t => t.id === techniqueId)!);
  const voiceRef      = useRef(voiceGuide);

  const technique = TECHNIQUES.find(t => t.id === techniqueId)!;
  useEffect(() => { techniqueRef.current = technique; }, [technique]);
  useEffect(() => { voiceRef.current = voiceGuide; }, [voiceGuide]);

  function handleTechniqueChange(id: string) {
    setTechniqueId(id);
    updatePrefs({ focusBreathingId: id });
    if (active) setActive(false);
  }

  function handleVoiceToggle() {
    const next = !voiceGuide;
    setVoiceGuide(next);
    updatePrefs({ focusVoiceGuide: next });
    if (!next) window.speechSynthesis?.cancel();
  }

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current);
      if (ringRef.current)   ringRef.current.style.transform  = `scale(${SCALE_MIN})`;
      if (glowRef.current)   glowRef.current.style.transform  = `scale(${SCALE_MIN})`;
      if (bgGlowRef.current) bgGlowRef.current.style.opacity  = "0";
      displayRef.current = { label: "Ready", remaining: 0 };
      setLabel("Ready");
      setRemaining(0);
      window.speechSynthesis?.cancel();
      return;
    }

    let phaseIdx = 0;
    let phaseStart = performance.now();

    // Announce first phase
    if (voiceRef.current) speakPhase(techniqueRef.current.phases[0].label);

    const tick = (now: number) => {
      const t = techniqueRef.current;
      const phase = t.phases[phaseIdx];
      const elapsed = (now - phaseStart) / 1000;

      if (elapsed >= phase.dur) {
        const next = (phaseIdx + 1) % t.phases.length;
        phaseIdx = next;
        phaseStart = now;
        if (voiceRef.current) speakPhase(t.phases[phaseIdx].label);
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const progress = elapsed / phase.dur;
      let scale: number;
      if      (phase.type === "inhale")   scale = SCALE_MIN + (SCALE_MAX - SCALE_MIN) * progress;
      else if (phase.type === "exhale")   scale = SCALE_MAX - (SCALE_MAX - SCALE_MIN) * progress;
      else if (phase.type === "hold-in")  scale = SCALE_MAX;
      else                                scale = SCALE_MIN;

      if (ringRef.current)  ringRef.current.style.transform  = `scale(${scale})`;
      if (glowRef.current)  glowRef.current.style.transform  = `scale(${scale})`;

      // Background glow: 0 at min scale → 1 at max scale
      const glowT = (scale - SCALE_MIN) / (SCALE_MAX - SCALE_MIN);
      if (bgGlowRef.current) bgGlowRef.current.style.opacity = (0.15 + glowT * 0.85).toFixed(3);

      const newRemaining = Math.ceil(phase.dur - elapsed);
      if (displayRef.current.label !== phase.label || displayRef.current.remaining !== newRemaining) {
        displayRef.current = { label: phase.label, remaining: newRemaining };
        setLabel(phase.label);
        setRemaining(newRemaining);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.speechSynthesis?.cancel();
    };
  }, [active]);

  const isHold = label === "Hold";
  const phaseColor = isHold ? TEXT_DIM : accent;

  return (
    <div style={{ position: "relative", background: "var(--surface)", border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden" }}>
      {/* Animated background glow — driven by breathing scale */}
      <div ref={bgGlowRef} style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `radial-gradient(ellipse 130% 110% at 50% 60%, ${accent}cc 0%, ${accent}66 30%, ${accent}22 60%, transparent 82%)`,
        opacity: 0,
        willChange: "opacity",
      }} />

      {/* Section header */}
      <div style={{ position: "relative", zIndex: 1, padding: "13px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.8, textTransform: "uppercase", color: accent }}>
          Breathing
        </span>
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, padding: "20px 20px" }}>
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
                <button onClick={() => setActive(true)} style={{
                  background: "none", border: "none", padding: 8, cursor: "pointer", opacity: 0.3,
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.15s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.6")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "0.3")}
                >
                  <Icon name="play" size={20} color={accent} strokeWidth={1.6} />
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <button onClick={() => setActive(a => !a)} style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              background: active ? `${accent}1a` : accent,
              border: `1.5px solid ${active ? accent + "66" : accent}`,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}>
              <Icon name={active ? "stop" : "play"} size={18} color={active ? accent : "#06091a"} strokeWidth={2.2} />
            </button>
            <button
              onClick={handleVoiceToggle}
              title={voiceGuide ? "Voice guide on — click to disable" : "Voice guide off — click to enable"}
              style={{
                width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                background: voiceGuide ? `${accent}1a` : "transparent",
                border: `1.5px solid ${voiceGuide ? accent + "66" : BORDER}`,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
            >
              <Icon name={voiceGuide ? "volume" : "volumeX"} size={15} color={voiceGuide ? accent : TEXT_MUTED} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Focus() {
  const { prefs } = usePrefs();
  const accent = prefs.accentColor || "#46b6ad";

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
