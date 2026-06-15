import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOverlay } from "../../overlay";
import {
  WISDOM, TRADITION_META, TRADITION_ORDER, WisdomCard, useDailyQuote, quoteKey,
  isQuoteInLibrary, AppIcon,
  type TraditionId, type TraditionMeta, type Quote,
} from "../../components/Wisdom";
import { usePrefs } from "../../prefs";
import {
  PageShell, BORDER, BORDER_HI, TEXT, TEXT_DIM, TEXT_MUTED, FONT, JADE, useIsMobile,
} from "../shared/kit";

// Static totals per tradition (WISDOM never changes)
const TRAD_TOTALS: Record<string, number> = Object.fromEntries(
  TRADITION_ORDER.map(id => [id, WISDOM.filter(q => q.tradition === id).length])
);

export default function WisdomLibrary() {
  const { prefs, updatePrefs } = usePrefs();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TraditionId | "all">("all");
  const [search, setSearch] = useState("");
  const [ponderIdx, setPonderIdx] = useState<number | null>(null);

  // Effective library count (accounting for all three states)
  const libraryCount = useMemo(
    () => WISDOM.filter(q => isQuoteInLibrary(q, prefs)).length,
    [prefs]
  );

  // Per-tradition active count
  const tradCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const id of TRADITION_ORDER) {
      m[id] = WISDOM.filter(q => q.tradition === id && isQuoteInLibrary(q, prefs)).length;
    }
    return m;
  }, [prefs]);

  // Traditions sorted by selection percentage descending
  const sortedTraditions = useMemo(() =>
    [...TRADITION_ORDER].sort((a, b) => {
      const aPct = (tradCounts[a] ?? 0) / (TRAD_TOTALS[a] || 1);
      const bPct = (tradCounts[b] ?? 0) / (TRAD_TOTALS[b] || 1);
      return bPct - aPct;
    }),
  [tradCounts]);

  const quotes = useMemo(() => {
    let qs = filter === "all" ? WISDOM : WISDOM.filter(q => q.tradition === filter);
    if (search.trim()) {
      const s = search.toLowerCase();
      qs = qs.filter(q => q.text.toLowerCase().includes(s) || q.author.toLowerCase().includes(s));
    }
    // Sort by tradition selection percentage (most selected first), stable within each tradition
    return [...qs].sort((a, b) => {
      const aPct = (tradCounts[a.tradition] ?? 0) / (TRAD_TOTALS[a.tradition] || 1);
      const bPct = (tradCounts[b.tradition] ?? 0) / (TRAD_TOTALS[b.tradition] || 1);
      return bPct - aPct;
    });
  }, [filter, search, tradCounts]);

  function toggleQuote(q: Quote) {
    const key = quoteKey(q);
    const inLib = isQuoteInLibrary(q, prefs);
    const tradOn = prefs.wisdomTraditions.includes(q.tradition);
    const disabled = prefs.disabledQuotes ?? [];
    const enabled  = prefs.enabledQuotes  ?? [];

    if (inLib) {
      if (tradOn) {
        // In by default → explicitly disable
        updatePrefs({
          disabledQuotes: [...disabled.filter(k => k !== key), key],
          enabledQuotes:  enabled.filter(k => k !== key),
        });
      } else {
        // Explicitly included from off-tradition → remove
        updatePrefs({ enabledQuotes: enabled.filter(k => k !== key) });
      }
    } else {
      if (!tradOn) {
        // Out by default → explicitly enable
        updatePrefs({
          enabledQuotes:  [...enabled.filter(k => k !== key), key],
          disabledQuotes: disabled.filter(k => k !== key),
        });
      } else {
        // Explicitly disabled from on-tradition → restore default (remove from disabledQuotes)
        updatePrefs({ disabledQuotes: disabled.filter(k => k !== key) });
      }
    }
  }

  function toggleTradition(id: TraditionId) {
    const active = tradCounts[id] ?? 0;
    if (active === 0) {
      // Nothing selected → turn ON: add to rotation, clear any exclusions
      updatePrefs({
        wisdomTraditions: [...prefs.wisdomTraditions, id],
        disabledQuotes: (prefs.disabledQuotes ?? []).filter(k => !k.startsWith(id + ":")),
      });
    } else {
      // Something selected → turn OFF: remove from rotation, clear all individual overrides
      updatePrefs({
        wisdomTraditions: prefs.wisdomTraditions.filter(t => t !== id),
        enabledQuotes:  (prefs.enabledQuotes  ?? []).filter(k => !k.startsWith(id + ":")),
        disabledQuotes: (prefs.disabledQuotes ?? []).filter(k => !k.startsWith(id + ":")),
      });
    }
  }

  const ponder = ponderIdx !== null ? quotes[ponderIdx] : null;
  const dailyQuote = useDailyQuote();

  return (
    <PageShell tool="wisdom" maxWidth={800} headerExtra={
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 12, color: TEXT_DIM, fontWeight: 600 }}>
          {libraryCount} / {WISDOM.length} in library
        </span>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8,
            color: TEXT_DIM, fontSize: 14, cursor: "pointer", lineHeight: 1,
            padding: "4px 9px", fontFamily: FONT,
          }}>✕</button>
      </div>
    }>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Daily wisdom */}
          <WisdomCard quote={dailyQuote} compact noLink />

          {/* Section divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "8px 0 4px" }}>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.2, textTransform: "uppercase", color: TEXT_MUTED, flexShrink: 0 }}>
              Explore
            </span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>

          {/* Context panel */}
          {filter === "all"
            ? <AllTraditionsPanel />
            : (
              <TraditionDetailPanel
                meta={TRADITION_META[filter]}
                tradId={filter}
                quoteCount={WISDOM.filter(q => q.tradition === filter).length}
                activeCount={tradCounts[filter] ?? 0}
                onToggle={() => toggleTradition(filter)}
                onClear={() => setFilter("all")}
              />
            )
          }

          {/* Tradition selector cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 8 }}>
            <AllCard
              selected={filter === "all"}
              libraryCount={libraryCount}
              totalCount={WISDOM.length}
              onSelect={() => setFilter("all")}
            />
            {sortedTraditions.map(id => (
              <TraditionSelectorCard
                key={id}
                meta={TRADITION_META[id]}
                selected={filter === id}
                tradOn={prefs.wisdomTraditions.includes(id)}
                activeCount={tradCounts[id] ?? 0}
                totalCount={TRAD_TOTALS[id]}
                onSelect={() => setFilter(filter === id ? "all" : id)}
              />
            ))}
          </div>

          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search quotes…"
            style={{
              width: "100%", boxSizing: "border-box",
              background: "var(--input-bg)", border: `1px solid ${BORDER}`, borderRadius: 8,
              color: TEXT, fontFamily: FONT, fontSize: 13, padding: "8px 12px", outline: "none",
            }}
          />

          <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600 }}>
            {quotes.length} quote{quotes.length !== 1 ? "s" : ""}
          </div>

          {/* Quote cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {quotes.map((q, i) => {
              const key = quoteKey(q);
              const inLib = isQuoteInLibrary(q, prefs);
              return (
                <QuoteCard
                  key={key}
                  quote={q}
                  meta={TRADITION_META[q.tradition]}
                  inLibrary={inLib}
                  onToggle={() => toggleQuote(q)}
                  onPonder={() => setPonderIdx(i)}
                />
              );
            })}
            {quotes.length === 0 && (
              <div style={{ textAlign: "center", color: TEXT_MUTED, padding: "48px 0", fontSize: 14 }}>
                No quotes match your search.
              </div>
            )}
          </div>

      {ponder && (
        <PonderOverlay
          quote={ponder}
          inLibrary={isQuoteInLibrary(ponder, prefs)}
          hasPrev={ponderIdx! > 0}
          hasNext={ponderIdx! < quotes.length - 1}
          onClose={() => setPonderIdx(null)}
          onPrev={() => setPonderIdx(i => Math.max(0, i! - 1))}
          onNext={() => setPonderIdx(i => Math.min(quotes.length - 1, i! + 1))}
          onToggle={() => toggleQuote(ponder)}
        />
      )}
      </div>
    </PageShell>
  );
}

function AllTraditionsPanel() {
  return (
    <div style={{
      background: "rgba(var(--accent-rgb), 0.06)",
      border: "1px solid rgba(var(--accent-rgb), 0.22)",
      borderRadius: 20, padding: "28px 32px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 80% 50% at 10% 50%, rgba(var(--accent-rgb), 0.10), transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{ position: "relative", display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flexShrink: 0, opacity: 0.88 }}>
          <AppIcon size={54} color="var(--accent)" traditions={[]} appIcon="mountain" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.2, textTransform: "uppercase", color: "var(--accent)", opacity: 0.8, marginBottom: 4 }}>
            The Library
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: TEXT, marginBottom: 3, letterSpacing: -0.3, lineHeight: 1.1 }}>
            Equanimity
          </div>
          <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginBottom: 16, opacity: 0.8, letterSpacing: 0.3 }}>
            Logic · Ethics · Balance · Composure
          </div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.78, color: TEXT_DIM }}>
            Across every culture and century, humanity has returned to the same enduring questions:
            how to face suffering with grace, act with integrity under uncertainty, find meaning
            in an open universe, and cultivate a mind neither shaken by adversity nor hardened by it.
            Equanimity gathers the answers offered by the world's greatest philosophical and spiritual
            traditions — not to prescribe a single path, but to offer a broader map.
            Stoic discipline, Taoist surrender, Buddhist mindfulness, Islamic devotion —
            these are not rivals. They are facets of the same ancient pursuit.
          </p>
        </div>
      </div>
    </div>
  );
}


function AllCard({ selected, libraryCount, totalCount, onSelect }: {
  selected: boolean; libraryCount: number; totalCount: number; onSelect: () => void;
}) {
  const [hov, setHov] = useState(false);
  const active = selected || hov;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 6, padding: "12px 6px",
        background: selected ? `${JADE}18` : hov ? "var(--surface-hi)" : "var(--surface)",
        border: `1.5px solid ${selected ? JADE + "66" : hov ? JADE + "33" : BORDER}`,
        borderRadius: 11, cursor: "pointer", transition: "all 0.18s",
        boxShadow: selected ? `0 2px 14px ${JADE}20` : "none",
        fontFamily: FONT,
      }}
    >
      <div style={{ fontSize: 22, lineHeight: 1, color: active ? JADE : TEXT_MUTED, fontWeight: 900, userSelect: "none" }}>✦</div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: active ? JADE : TEXT, textAlign: "center", lineHeight: 1.2, marginBottom: 1 }}>All</div>
        <div style={{ fontSize: 8.5, color: TEXT_MUTED, textAlign: "center" }}>{libraryCount}/{totalCount}</div>
      </div>
    </button>
  );
}

function TraditionSelectorCard({ meta, selected, tradOn, activeCount, totalCount, onSelect }: {
  meta: (typeof TRADITION_META)[TraditionId];
  selected: boolean;
  tradOn: boolean;
  activeCount: number;
  totalCount: number;
  onSelect: () => void;
}) {
  const [hov, setHov] = useState(false);
  const active = selected || hov;
  const { color, Icon, label, tagline } = meta;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 6, padding: "12px 6px",
        background: selected ? `${color}18` : hov ? "var(--surface-hi)" : "var(--surface)",
        border: `1.5px solid ${selected ? color + "66" : hov ? color + "33" : BORDER}`,
        borderRadius: 11, cursor: "pointer", transition: "all 0.18s",
        boxShadow: selected ? `0 2px 14px ${color}20` : "none",
        fontFamily: FONT, position: "relative", opacity: tradOn || activeCount > 0 ? 1 : 0.55,
      }}
    >
      {selected && (
        <div style={{
          position: "absolute", top: 5, right: 5,
          width: 11, height: 11, borderRadius: "50%",
          background: color,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ color: "#08101f", fontSize: 7, fontWeight: 900, lineHeight: 1 }}>✓</span>
        </div>
      )}
      <Icon size={28} color={active ? color : TEXT_MUTED} />
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: active ? color : TEXT, textAlign: "center", lineHeight: 1.2, marginBottom: 1, transition: "color 0.18s" }}>
          {label}
        </div>
        <div style={{ fontSize: 8.5, color: TEXT_MUTED, textAlign: "center" }}>
          {activeCount}/{totalCount}
        </div>
      </div>
    </button>
  );
}

function interestLevel(activeCount: number, totalCount: number): string {
  if (totalCount === 0 || activeCount === 0) return "Unexplored";
  const pct = activeCount / totalCount;
  if (pct <= 0.20) return "Curious";
  if (pct <= 0.40) return "Exploring";
  if (pct <= 0.60) return "Interested";
  if (pct <= 0.80) return "Inspired";
  return "Devoted";
}

function TraditionDetailPanel({ meta, tradId, quoteCount, activeCount, onToggle, onClear }: {
  meta: (typeof TRADITION_META)[TraditionId];
  tradId: TraditionId;
  quoteCount: number;
  activeCount: number;
  onToggle: () => void;
  onClear: () => void;
}) {
  const { color, Icon, label, tagline, subtitle, description } = meta;

  return (
    <div style={{
      background: `${color}0b`,
      border: `1px solid ${color}33`,
      borderRadius: 20, padding: "28px 32px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse 80% 50% at 10% 50%, ${color}12, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <button
        onClick={onClear}
        title="Show all traditions"
        style={{
          position: "absolute", top: 12, right: 14,
          background: "transparent", border: "none",
          color: TEXT_MUTED, fontSize: 15, cursor: "pointer",
          fontFamily: FONT, fontWeight: 700, padding: "4px 8px",
          lineHeight: 1, opacity: 0.6, transition: "opacity 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = "0.6"}
      >✕</button>

      <div style={{ position: "relative", display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flexShrink: 0, opacity: 0.9 }}>
          <Icon size={54} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.2, textTransform: "uppercase", color, opacity: 0.8, marginBottom: 4 }}>
            {tagline}
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: TEXT, marginBottom: 3, letterSpacing: -0.3, lineHeight: 1.1 }}>
            {label}
          </div>
          <div style={{ fontSize: 11, color, fontWeight: 600, marginBottom: 16, opacity: 0.8, letterSpacing: 0.3 }}>
            {subtitle}
          </div>
          <p style={{ margin: "0 0 18px", fontSize: 13.5, lineHeight: 1.78, color: TEXT_DIM }}>
            {description}
          </p>
          {(() => {
            const level = interestLevel(activeCount, quoteCount);
            const engaged = activeCount > 0;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={onToggle}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontFamily: FONT,
                    fontWeight: 700, fontSize: 12, transition: "all 0.15s",
                    background: engaged ? `${color}18` : "transparent",
                    border: `1.5px solid ${engaged ? color + "66" : BORDER}`,
                    color: engaged ? color : TEXT_MUTED,
                  }}
                  title={engaged ? "Remove all from library" : "Add all to library"}
                >
                  <span style={{ fontSize: 9 }}>{engaged ? "●" : "○"}</span>
                  {level}
                </button>
                <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>
                  {activeCount} of {quoteCount} in your library
                </span>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function QuoteCard({ quote, meta, inLibrary, onToggle, onPonder }: {
  quote: Quote;
  meta: (typeof TRADITION_META)[TraditionId];
  inLibrary: boolean;
  onToggle: () => void;
  onPonder: () => void;
}) {
  const { color, Icon, tagline } = meta;
  const [hov, setHov] = useState(false);

  return (
    <div
      onClick={onPonder}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: inLibrary ? "var(--surface)" : "transparent",
        border: `1px solid ${hov ? (inLibrary ? color + "55" : color + "22") : inLibrary ? BORDER_HI : BORDER}`,
        borderRadius: 14, padding: "14px 16px",
        transition: "border-color 0.15s, background 0.15s",
        position: "relative", overflow: "hidden",
        cursor: "pointer",
      }}>
      {inLibrary && (
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${color}07, transparent 70%)`,
          pointerEvents: "none",
        }} />
      )}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Icon size={14} color={inLibrary ? color : TEXT_MUTED} />
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: 1.8,
            textTransform: "uppercase", color: inLibrary ? color : TEXT_MUTED, opacity: 0.85,
          }}>
            {tagline}
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={e => { e.stopPropagation(); onToggle(); }}
            title={inLibrary ? "Remove from library" : "Add to library"}
            style={{
              background: "transparent", border: "none",
              padding: "2px 4px", cursor: "pointer",
              fontSize: 15, lineHeight: 1,
              color: inLibrary ? color : TEXT_MUTED,
              opacity: inLibrary ? 1 : 0.65,
              transition: "all 0.15s",
            }}>
            {inLibrary ? "★" : "☆"}
          </button>
        </div>
        <p style={{
          fontSize: 13, lineHeight: 1.65,
          color: TEXT_DIM,
          fontStyle: "italic", margin: "0 0 6px",
        }}>
          "{quote.text}"
        </p>
        <p style={{ fontSize: 11, color: TEXT_MUTED, margin: 0, fontWeight: 600 }}>
          — {quote.author}
        </p>
      </div>
    </div>
  );
}

function PonderOverlay({ quote, inLibrary, hasPrev, hasNext, onClose, onPrev, onNext, onToggle }: {
  quote: Quote; inLibrary: boolean; hasPrev: boolean; hasNext: boolean;
  onClose: () => void; onPrev: () => void; onNext: () => void; onToggle: () => void;
}) {
  const meta = TRADITION_META[quote.tradition];
  const { color, Icon, tagline } = meta;
  const narrow = useIsMobile(600);

  useOverlay(narrow);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const DARK_BG   = "#0d1120";
  const DARK_TEXT = "#e2ddd4";
  const DARK_DIM  = "#8a8899";
  const DARK_BDR  = "rgba(255,255,255,0.10)";

  return (
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
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={narrow ? {
          flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
          background: DARK_BG, padding: "60px 28px 52px", position: "relative",
        } : {
          maxWidth: 640, width: "100%", position: "relative",
          background: DARK_BG, border: `1px solid ${color}40`,
          borderRadius: 24, padding: "48px 40px 36px",
          boxShadow: `0 0 80px ${color}22`,
        }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: narrow ? 0 : 24,
          background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${color}12, transparent 70%)`,
          pointerEvents: "none",
        }} />

        <button
          onClick={onClose}
          style={{
            position: narrow ? "fixed" : "absolute",
            top: narrow ? 20 : 14, right: narrow ? 20 : 14,
            zIndex: 2001,
            background: narrow ? "rgba(255,255,255,0.08)" : "transparent",
            border: narrow ? "1px solid rgba(255,255,255,0.12)" : "none",
            borderRadius: narrow ? 20 : 0,
            color: DARK_TEXT, fontSize: 18, cursor: "pointer",
            lineHeight: 1, padding: narrow ? "8px 12px" : "4px 8px",
          }}>✕</button>

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <Icon size={narrow ? 22 : 20} color={color} />
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 2,
              textTransform: "uppercase", color, opacity: 0.85,
            }}>
              {tagline}
            </span>
          </div>
          <blockquote style={{
            margin: 0, padding: 0,
            fontSize: narrow ? "clamp(18px, 5.5vw, 26px)" : "clamp(16px, 3vw, 22px)",
            lineHeight: 1.72, color: DARK_TEXT, fontStyle: "italic", fontWeight: 500,
          }}>
            "{quote.text}"
          </blockquote>
          <p style={{ fontSize: narrow ? 15 : 14, color: DARK_DIM, marginTop: 20, marginBottom: 0, fontWeight: 700 }}>
            — {quote.author}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", marginTop: 28, position: "relative", gap: 10 }}>
          <button
            onClick={e => { e.stopPropagation(); onToggle(); }}
            title={inLibrary ? "Remove from library" : "Add to library"}
            style={{
              background: inLibrary ? `${color}20` : "transparent",
              border: `1.5px solid ${inLibrary ? color + "66" : DARK_BDR}`,
              borderRadius: 20, padding: "7px 16px",
              display: "inline-flex", alignItems: "center", gap: 6,
              cursor: "pointer", fontFamily: FONT, fontWeight: 700, fontSize: 13,
              color: inLibrary ? color : DARK_DIM,
              transition: "all 0.15s",
            }}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>{inLibrary ? "★" : "☆"}</span>
            {inLibrary ? "In library" : "Add to library"}
          </button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              style={{
                background: "transparent",
                border: `1px solid ${hasPrev ? DARK_BDR : "transparent"}`,
                borderRadius: 8,
                color: hasPrev ? DARK_DIM : "transparent",
                fontFamily: FONT, fontWeight: 700, fontSize: 12,
                padding: "7px 14px", cursor: hasPrev ? "pointer" : "default",
              }}>← Prev</button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              style={{
                background: "transparent",
                border: `1px solid ${hasNext ? DARK_BDR : "transparent"}`,
                borderRadius: 8,
                color: hasNext ? DARK_DIM : "transparent",
                fontFamily: FONT, fontWeight: 700, fontSize: 12,
                padding: "7px 14px", cursor: hasNext ? "pointer" : "default",
              }}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
