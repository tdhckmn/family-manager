import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AFFIRMATION_CATEGORIES, type AffirmationCategory } from "../../affirmations";
import { BORDER, TEXT, TEXT_DIM, TEXT_MUTED, FONT, useIsMobile } from "../shared/kit";

// ── Category selector card ─────────────────────────────────────────────────────

function CategoryCard({ cat, selected, accent, onSelect }: {
  cat: AffirmationCategory; selected: boolean; accent: string; onSelect: () => void;
}) {
  const [hov, setHov] = useState(false);
  const active = selected || hov;
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "8px 10px",
        background: active ? `${accent}18` : "var(--surface-hi, var(--surface))",
        border: `1.5px solid ${active ? accent + "66" : BORDER}`,
        borderRadius: 10, cursor: "pointer", fontFamily: FONT,
        transition: "all 0.15s",
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 800, color: active ? accent : TEXT_DIM, textAlign: "center", lineHeight: 1.3 }}>
        {cat.shortLabel}
      </span>
    </button>
  );
}

// ── Ponder overlay ─────────────────────────────────────────────────────────────

function PonderOverlay({ text, category, hasPrev, hasNext, accent, onClose, onPrev, onNext }: {
  text: string; category: AffirmationCategory;
  hasPrev: boolean; hasNext: boolean; accent: string;
  onClose: () => void; onPrev: () => void; onNext: () => void;
}) {
  const narrow = useIsMobile(600);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const DARK_BG  = "#0d1120";
  const DARK_TEXT = "#e2ddd4";
  const DARK_DIM  = "#8a8899";
  const DARK_BDR  = "rgba(255,255,255,0.10)";

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: narrow ? DARK_BG : "rgba(3,5,20,0.94)",
        backdropFilter: narrow ? undefined : "blur(12px)",
        display: "flex",
        alignItems: narrow ? "stretch" : "center",
        justifyContent: narrow ? "stretch" : "center",
        padding: narrow ? 0 : 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={narrow ? {
          flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
          background: DARK_BG, padding: "60px 28px 52px", position: "relative",
        } : {
          maxWidth: 620, width: "100%", position: "relative",
          background: DARK_BG, border: `1px solid ${accent}40`,
          borderRadius: 24, padding: "48px 40px 36px",
          boxShadow: `0 0 80px ${accent}22`,
        }}
      >
        <div style={{
          position: "absolute", inset: 0, borderRadius: narrow ? 0 : 24,
          background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${accent}10, transparent 70%)`,
          pointerEvents: "none",
        }} />

        <button
          onClick={onClose}
          style={{
            position: "absolute", top: narrow ? 20 : 14, right: narrow ? 20 : 14,
            background: "transparent", border: "none",
            color: DARK_DIM, fontSize: 20, cursor: "pointer",
            lineHeight: 1, padding: "4px 8px",
          }}
        >✕</button>

        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.2, textTransform: "uppercase", color: accent, opacity: 0.75, marginBottom: 6 }}>
            {category.label}
          </div>
          <div style={{ fontSize: 11, color: DARK_DIM, fontWeight: 600, marginBottom: 28, fontStyle: "italic" }}>
            {category.focus}
          </div>
          <blockquote style={{
            margin: 0, padding: 0,
            fontSize: narrow ? "clamp(18px, 5.5vw, 26px)" : "clamp(16px, 3vw, 22px)",
            lineHeight: 1.72, color: DARK_TEXT, fontStyle: "italic", fontWeight: 500,
          }}>
            "{text}"
          </blockquote>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 32, position: "relative", gap: 8 }}>
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            style={{
              background: "transparent",
              border: `1px solid ${hasPrev ? DARK_BDR : "transparent"}`,
              borderRadius: 8, color: hasPrev ? DARK_DIM : "transparent",
              fontFamily: FONT, fontWeight: 700, fontSize: 12,
              padding: "7px 14px", cursor: hasPrev ? "pointer" : "default",
            }}
          >← Prev</button>
          <button
            onClick={onNext}
            disabled={!hasNext}
            style={{
              background: "transparent",
              border: `1px solid ${hasNext ? DARK_BDR : "transparent"}`,
              borderRadius: 8, color: hasNext ? DARK_DIM : "transparent",
              fontFamily: FONT, fontWeight: 700, fontSize: 12,
              padding: "7px 14px", cursor: hasNext ? "pointer" : "default",
            }}
          >Next →</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Section ────────────────────────────────────────────────────────────────────

export default function AffirmationsSection({ accent }: { accent: string }) {
  const [categoryId, setCategoryId] = useState(AFFIRMATION_CATEGORIES[0].id);
  const [ponderIdx, setPonderIdx] = useState<number | null>(null);

  const category = AFFIRMATION_CATEGORIES.find(c => c.id === categoryId)!;
  const affirmations = category.affirmations;
  const ponder = ponderIdx !== null ? affirmations[ponderIdx] : null;

  return (
    <div style={{ background: "var(--surface)", border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "13px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.8, textTransform: "uppercase", color: accent }}>
          Affirmations
        </span>
      </div>

      <div style={{ padding: "20px" }}>
        {/* Category selector */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 6, marginBottom: 18 }}>
          {AFFIRMATION_CATEGORIES.map(cat => (
            <CategoryCard
              key={cat.id}
              cat={cat}
              selected={cat.id === categoryId}
              accent={accent}
              onSelect={() => { setCategoryId(cat.id); setPonderIdx(null); }}
            />
          ))}
        </div>

        {/* Focus line */}
        <p style={{ margin: "0 0 16px", fontSize: 11, color: accent, fontWeight: 700, opacity: 0.8, letterSpacing: 0.3, fontStyle: "italic" }}>
          {category.focus}
        </p>

        {/* Affirmation list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {affirmations.map((text, i) => (
            <button
              key={i}
              onClick={() => setPonderIdx(i)}
              style={{
                width: "100%", textAlign: "left", padding: "12px 14px",
                background: "transparent",
                border: `1px solid ${BORDER}`, borderRadius: 10,
                color: TEXT_DIM, fontFamily: FONT, fontSize: 13, lineHeight: 1.65,
                cursor: "pointer", transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = accent + "55";
                (e.currentTarget as HTMLButtonElement).style.color = TEXT;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER;
                (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM;
              }}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      {ponder !== null && ponderIdx !== null && (
        <PonderOverlay
          text={ponder}
          category={category}
          hasPrev={ponderIdx > 0}
          hasNext={ponderIdx < affirmations.length - 1}
          accent={accent}
          onClose={() => setPonderIdx(null)}
          onPrev={() => setPonderIdx(i => Math.max(0, i! - 1))}
          onNext={() => setPonderIdx(i => Math.min(affirmations.length - 1, i! + 1))}
        />
      )}
    </div>
  );
}
