import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import StarField from "../../components/StarField";
import {
  WISDOM, TRADITION_META, TRADITION_ORDER, WisdomCard, quoteOfDay, AppIcon,
  type TraditionId, type TraditionMeta, type Quote,
} from "../../components/Wisdom";
import { usePrefs } from "../../prefs";
import {
  BG, BORDER, BORDER_HI, TEXT, TEXT_DIM, TEXT_MUTED, FONT, JADE,
} from "../shared/kit";

type SortKey = "tradition" | "author" | "text";

function quoteKey(q: Quote): string {
  return `${q.tradition}:${q.text.slice(0, 40)}`;
}

export default function WisdomLibrary() {
  const { prefs, updatePrefs } = usePrefs();
  const [filter, setFilter] = useState<TraditionId | "all">("all");
  const [sort, setSort] = useState<SortKey>("tradition");
  const [search, setSearch] = useState("");
  const [ponderIdx, setPonderIdx] = useState<number | null>(null);

  const disabled = useMemo(() => new Set(prefs.disabledQuotes ?? []), [prefs.disabledQuotes]);

  const quotes = useMemo(() => {
    let qs = filter === "all" ? WISDOM : WISDOM.filter(q => q.tradition === filter);
    if (search.trim()) {
      const s = search.toLowerCase();
      qs = qs.filter(q => q.text.toLowerCase().includes(s) || q.author.toLowerCase().includes(s));
    }
    const sorted = [...qs];
    if (sort === "tradition") {
      sorted.sort((a, b) => TRADITION_ORDER.indexOf(a.tradition) - TRADITION_ORDER.indexOf(b.tradition));
    } else if (sort === "author") {
      sorted.sort((a, b) => a.author.localeCompare(b.author));
    } else {
      sorted.sort((a, b) => a.text.localeCompare(b.text));
    }
    return sorted;
  }, [filter, sort, search]);

  function toggleQuote(q: Quote) {
    const key = quoteKey(q);
    const current = prefs.disabledQuotes ?? [];
    updatePrefs({
      disabledQuotes: disabled.has(key)
        ? current.filter(k => k !== key)
        : [...current, key],
    });
  }

  const enabledTotal = WISDOM.filter(q => !disabled.has(quoteKey(q))).length;
  const ponder = ponderIdx !== null ? quotes[ponderIdx] : null;
  const dailyQuote = quoteOfDay(prefs.wisdomTraditions, prefs.disabledQuotes);

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: FONT, color: TEXT, position: "relative" }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 1 }}>

        <div style={{ padding: "14px 62px 14px 20px", minHeight: 60, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12, boxSizing: "border-box" }}>
          <Link to="/app" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, opacity: 0.7, flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7"}>
            ← Home
          </Link>
          <div style={{ width: 1, height: 14, background: BORDER, flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT }}>Wisdom Library</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: TEXT_DIM, fontWeight: 600 }}>
            {enabledTotal} / {WISDOM.length} enabled
          </span>
        </div>

        <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px 80px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Daily wisdom + rotation controls */}
          <DailyWisdomSection
            quote={dailyQuote}
            activeTraditions={prefs.wisdomTraditions}
            onToggle={(id) => {
              const current = prefs.wisdomTraditions;
              updatePrefs({
                wisdomTraditions: current.includes(id)
                  ? current.filter(t => t !== id)
                  : [...current, id],
              });
            }}
          />

          {/* Section divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "8px 0 4px" }}>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.2, textTransform: "uppercase", color: TEXT_MUTED, flexShrink: 0 }}>
              Explore
            </span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>

          {/* Context panel — mission when all selected, tradition detail when one is active */}
          {filter === "all"
            ? <AllTraditionsPanel />
            : (
              <TraditionDetailPanel
                meta={TRADITION_META[filter]}
                quoteCount={quotes.length}
                onClear={() => setFilter("all")}
              />
            )
          }

          {/* Tradition selector cards (compact) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
            gap: 8,
          }}>
            <AllCard
              selected={filter === "all"}
              count={WISDOM.length}
              onSelect={() => setFilter("all")}
            />
            {TRADITION_ORDER.map(id => (
              <TraditionSelectorCard
                key={id}
                meta={TRADITION_META[id]}
                selected={filter === id}
                onSelect={() => setFilter(filter === id ? "all" : id)}
              />
            ))}
          </div>

          {/* Sort + search */}
          <div style={{ display: "flex", gap: 10 }}>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              style={{
                background: "var(--surface)", border: `1px solid ${BORDER}`, borderRadius: 8,
                color: TEXT, fontFamily: FONT, fontSize: 12, fontWeight: 700,
                padding: "8px 28px 8px 12px", cursor: "pointer", flexShrink: 0,
                appearance: "none", outline: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23777'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
              }}>
              <option value="tradition">By tradition</option>
              <option value="author">By author</option>
              <option value="text">A – Z</option>
            </select>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search quotes…"
              style={{
                flex: 1, background: "var(--input-bg)", border: `1px solid ${BORDER}`, borderRadius: 8,
                color: TEXT, fontFamily: FONT, fontSize: 13, padding: "8px 12px", outline: "none",
              }}
            />
          </div>

          <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600 }}>
            {quotes.length} quote{quotes.length !== 1 ? "s" : ""}
          </div>

          {/* Quote cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {quotes.map((q, i) => {
              const meta = TRADITION_META[q.tradition];
              const key = quoteKey(q);
              const off = disabled.has(key);
              const tradOff = !prefs.wisdomTraditions.includes(q.tradition);
              return (
                <QuoteCard
                  key={key}
                  quote={q}
                  meta={meta}
                  off={off}
                  tradOff={tradOff}
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

        </div>
      </div>

      {ponder && (
        <PonderOverlay
          quote={ponder}
          hasPrev={ponderIdx! > 0}
          hasNext={ponderIdx! < quotes.length - 1}
          onClose={() => setPonderIdx(null)}
          onPrev={() => setPonderIdx(i => Math.max(0, i! - 1))}
          onNext={() => setPonderIdx(i => Math.min(quotes.length - 1, i! + 1))}
        />
      )}
    </div>
  );
}

function AllTraditionsPanel() {
  return (
    <div style={{
      background: "rgba(var(--accent-rgb), 0.06)",
      border: "1px solid rgba(var(--accent-rgb), 0.22)",
      borderRadius: 20,
      padding: "28px 32px",
      position: "relative",
      overflow: "hidden",
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

function DailyWisdomSection({ quote, activeTraditions, onToggle }: {
  quote: Quote;
  activeTraditions: string[];
  onToggle: (id: TraditionId) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <WisdomCard quote={quote} compact noLink />
      <div style={{ padding: "0 2px" }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color: TEXT_MUTED, marginBottom: 8 }}>
          Daily rotation
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {TRADITION_ORDER.map(id => (
            <RotationPill
              key={id}
              meta={TRADITION_META[id]}
              active={activeTraditions.includes(id)}
              onToggle={() => onToggle(id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RotationPill({ meta, active, onToggle }: {
  meta: TraditionMeta; active: boolean; onToggle: () => void;
}) {
  const [hov, setHov] = useState(false);
  const { color, Icon, label } = meta;
  const lit = active || hov;

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "4px 10px 4px 7px",
        background: active ? `${color}18` : hov ? "var(--surface-hi)" : "var(--surface)",
        border: `1px solid ${active ? color + "55" : hov ? color + "33" : BORDER}`,
        borderRadius: 20, cursor: "pointer", fontFamily: FONT,
        transition: "all 0.15s",
      }}
    >
      <Icon size={12} color={lit ? color : TEXT_MUTED} />
      <span style={{ fontSize: 10.5, fontWeight: 700, color: lit ? color : TEXT_DIM, transition: "color 0.15s" }}>
        {label}
      </span>
    </button>
  );
}

function AllCard({ selected, count, onSelect }: {
  selected: boolean; count: number; onSelect: () => void;
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
        <div style={{ fontSize: 8.5, color: TEXT_MUTED, textAlign: "center" }}>{count}</div>
      </div>
    </button>
  );
}

function TraditionSelectorCard({ meta, selected, onSelect }: {
  meta: (typeof TRADITION_META)[TraditionId];
  selected: boolean;
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
        fontFamily: FONT, position: "relative",
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
        <div style={{ fontSize: 8.5, color: TEXT_MUTED, textAlign: "center", lineHeight: 1.3 }}>
          {tagline}
        </div>
      </div>
    </button>
  );
}

function TraditionDetailPanel({ meta, quoteCount, onClear }: {
  meta: (typeof TRADITION_META)[TraditionId];
  quoteCount: number;
  onClear: () => void;
}) {
  const { color, Icon, label, tagline, subtitle, description } = meta;

  return (
    <div style={{
      background: `${color}0b`,
      border: `1px solid ${color}33`,
      borderRadius: 20,
      padding: "28px 32px",
      position: "relative",
      overflow: "hidden",
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
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: 2.2, textTransform: "uppercase",
            color, opacity: 0.8, marginBottom: 4,
          }}>
            {tagline}
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: TEXT, marginBottom: 3, letterSpacing: -0.3, lineHeight: 1.1 }}>
            {label}
          </div>
          <div style={{ fontSize: 11, color, fontWeight: 600, marginBottom: 16, opacity: 0.8, letterSpacing: 0.3 }}>
            {subtitle}
          </div>
          <p style={{
            margin: "0 0 14px", fontSize: 13.5, lineHeight: 1.78, color: TEXT_DIM,
          }}>
            {description}
          </p>
          <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600 }}>
            {quoteCount} quote{quoteCount !== 1 ? "s" : ""} in this collection
          </div>
        </div>
      </div>
    </div>
  );
}

function QuoteCard({ quote, meta, off, tradOff, onToggle, onPonder }: {
  quote: Quote;
  meta: (typeof TRADITION_META)[TraditionId];
  off: boolean;
  tradOff: boolean;
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
        background: "var(--surface)",
        border: `1px solid ${hov && !off ? color + "55" : off ? BORDER : BORDER_HI}`,
        borderRadius: 14, padding: "14px 16px",
        opacity: off ? 0.42 : 1,
        transition: "opacity 0.2s, border-color 0.15s",
        position: "relative", overflow: "hidden",
        cursor: "pointer",
      }}>
      {!off && (
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${color}07, transparent 70%)`,
          pointerEvents: "none",
        }} />
      )}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Icon size={14} color={off ? TEXT_MUTED : color} />
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: 1.8,
            textTransform: "uppercase", color: off ? TEXT_MUTED : color, opacity: 0.85,
          }}>
            {tagline}
          </span>
          {tradOff && !off && (
            <span style={{ fontSize: 9, color: TEXT_MUTED, fontWeight: 600, marginLeft: 4 }}>
              · tradition off
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={e => { e.stopPropagation(); onToggle(); }}
            style={{
              background: off ? "transparent" : `${color}1a`,
              border: `1px solid ${off ? BORDER : color + "44"}`,
              borderRadius: 20, padding: "3px 10px",
              cursor: "pointer", fontFamily: FONT,
              fontSize: 10, fontWeight: 700,
              color: off ? TEXT_MUTED : color,
              transition: "all 0.15s",
            }}>
            {off ? "off" : "on"}
          </button>
        </div>
        <p style={{
          fontSize: 13, lineHeight: 1.65,
          color: off ? TEXT_MUTED : TEXT,
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

function PonderOverlay({ quote, hasPrev, hasNext, onClose, onPrev, onNext }: {
  quote: Quote; hasPrev: boolean; hasNext: boolean;
  onClose: () => void; onPrev: () => void; onNext: () => void;
}) {
  const meta = TRADITION_META[quote.tradition];
  const { color, Icon, tagline } = meta;

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
        background: "rgba(3,5,20,0.94)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 640, width: "100%", position: "relative",
          background: DARK_BG, border: `1px solid ${color}40`,
          borderRadius: 24, padding: "48px 40px 36px",
          boxShadow: `0 0 80px ${color}22`,
        }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: 24,
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${color}12, transparent 70%)`,
          pointerEvents: "none",
        }} />

        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 14, right: 14,
            background: "transparent", border: "none",
            color: DARK_DIM, fontSize: 18, cursor: "pointer",
            lineHeight: 1, padding: "4px 8px",
          }}>✕</button>

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <Icon size={20} color={color} />
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 2,
              textTransform: "uppercase", color, opacity: 0.85,
            }}>
              {tagline}
            </span>
          </div>
          <blockquote style={{
            margin: 0, padding: 0,
            fontSize: "clamp(16px, 3vw, 22px)", lineHeight: 1.72,
            color: DARK_TEXT, fontStyle: "italic", fontWeight: 500,
          }}>
            "{quote.text}"
          </blockquote>
          <p style={{ fontSize: 14, color: DARK_DIM, marginTop: 20, marginBottom: 0, fontWeight: 700 }}>
            — {quote.author}
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, position: "relative" }}>
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
  );
}
