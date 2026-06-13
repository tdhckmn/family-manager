import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import StarField from "../../components/StarField";
import {
  WISDOM, TRADITION_META, TRADITION_ORDER,
  type TraditionId, type Quote,
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

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: FONT, color: TEXT, position: "relative" }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Header — right padding reserves space for the fixed gear button */}
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

        <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 80px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Tradition filter pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <FilterPill
              label="All"
              count={WISDOM.length}
              active={filter === "all"}
              color={JADE}
              onClick={() => setFilter("all")}
            />
            {TRADITION_ORDER.map(id => {
              const meta = TRADITION_META[id];
              return (
                <FilterPill
                  key={id}
                  label={meta.tagline}
                  count={WISDOM.filter(q => q.tradition === id).length}
                  active={filter === id}
                  color={meta.color}
                  icon={<meta.Icon size={13} color={filter === id ? meta.color : TEXT_MUTED} />}
                  onClick={() => setFilter(filter === id ? "all" : id)}
                />
              );
            })}
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

function FilterPill({ label, count, active, color, icon, onClick }: {
  label: string; count: number; active: boolean; color: string;
  icon?: React.ReactNode; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "5px 12px", borderRadius: 20, cursor: "pointer",
      fontFamily: FONT, fontSize: 11, fontWeight: 700,
      background: active ? `${color}18` : "var(--surface)",
      border: `1px solid ${active ? color + "55" : BORDER}`,
      color: active ? color : TEXT_DIM,
      transition: "all 0.15s",
    }}>
      {icon}
      {label}
      <span style={{ opacity: 0.5, fontWeight: 600 }}>{count}</span>
    </button>
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

  // Always dark — immersive overlay regardless of app theme
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
