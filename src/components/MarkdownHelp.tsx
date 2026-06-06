import { useEffect } from "react";

const BORDER = "rgba(255,255,255,0.10)";
const TEXT = "#dedad0";
const TEXT_DIM = "#7a7890";
const TEXT_MUTED = "#3d3d52";
const JADE = "#5db88a";

const ROWS: { label: string; syntax: string }[] = [
  { label: "Heading",        syntax: "# Heading\n## Subheading" },
  { label: "Bold / italic",  syntax: "**bold**   *italic*" },
  { label: "Bullet list",    syntax: "- item\n- item" },
  { label: "Numbered list",  syntax: "1. first\n2. second" },
  { label: "Checklist",      syntax: "- [ ] todo\n- [x] done" },
  { label: "Link",           syntax: "[label](https://url.com)" },
  { label: "Inline code",    syntax: "`code`" },
  { label: "Code block",     syntax: "```\ncode block\n```" },
  { label: "Quote",          syntax: "> quoted text" },
  { label: "Divider",        syntax: "---" },
];

export default function MarkdownHelp({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 600px)").matches;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1200,
        background: "rgba(3,5,15,0.72)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center",
        padding: isMobile ? 0 : 20, fontFamily: "'Montserrat',sans-serif",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#0b0f22", border: `1px solid ${BORDER}`,
          borderRadius: isMobile ? "20px 20px 0 0" : 18,
          width: "100%", maxWidth: 440, maxHeight: isMobile ? "88vh" : "85vh",
          overflowY: "auto", boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, background: "#0b0f22" }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>Markdown guide</span>
          <button onClick={onClose} aria-label="Close"
            style={{ background: "transparent", border: "none", color: TEXT_DIM, fontSize: 22, lineHeight: 1, cursor: "pointer", padding: "0 4px", fontFamily: "inherit" }}>×</button>
        </div>

        <div style={{ padding: "8px 20px 20px" }}>
          <p style={{ fontSize: 12, color: TEXT_DIM, margin: "10px 0 14px", lineHeight: 1.5 }}>
            Notes support Markdown. Type the syntax on the left to get the result shown.
          </p>
          {ROWS.map(r => (
            <div key={r.label} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "9px 0", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ flexShrink: 0, width: 100, fontSize: 12, fontWeight: 700, color: TEXT }}>{r.label}</span>
              <pre style={{ margin: 0, flex: 1, fontSize: 12, lineHeight: 1.5, color: JADE, fontFamily: "ui-monospace, 'SF Mono', monospace", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{r.syntax}</pre>
            </div>
          ))}
          <p style={{ fontSize: 11, color: TEXT_MUTED, margin: "14px 0 0", lineHeight: 1.5 }}>
            Tip: press ⌘↩ (Ctrl+Enter) to save a note while editing.
          </p>
        </div>
      </div>
    </div>
  );
}
