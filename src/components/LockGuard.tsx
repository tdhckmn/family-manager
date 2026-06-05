import { useState, useEffect } from "react";

const CORRECT_PIN = "9985";

// ── Hook ──────────────────────────────────────────────────────────────────

export function useLock(storageKey: string) {
  const [locked, setLocked] = useState(() => localStorage.getItem(storageKey) === "1");

  // Block browser back / forward while locked
  useEffect(() => {
    if (!locked) return;
    window.history.pushState(null, "", window.location.href);
    const handle = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handle);
    return () => window.removeEventListener("popstate", handle);
  }, [locked]);

  function lock() {
    localStorage.setItem(storageKey, "1");
    setLocked(true);
  }

  function unlock() {
    localStorage.removeItem(storageKey);
    setLocked(false);
  }

  return { locked, lock, unlock };
}

// ── PIN modal ─────────────────────────────────────────────────────────────

const PAD_KEYS = ["1","2","3","4","5","6","7","8","9","⌫","0",""];

interface PinModalProps {
  onSuccess: () => void;
  onCancel: () => void;
  accentColor: string;
  surfaceColor: string;
}

export function PinModal({ onSuccess, onCancel, accentColor, surfaceColor }: PinModalProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [shake, setShake] = useState(false);

  function press(key: string) {
    if (shake) return;
    if (key === "⌫") { setDigits(d => d.slice(0, -1)); return; }
    if (digits.length >= 4) return;

    const next = [...digits, key];
    setDigits(next);

    if (next.length === 4) {
      if (next.join("") === CORRECT_PIN) {
        setTimeout(onSuccess, 120);
      } else {
        setShake(true);
        setTimeout(() => { setDigits([]); setShake(false); }, 650);
      }
    }
  }

  // Physical keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") press(e.key);
      else if (e.key === "Backspace") press("⌫");
      else if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: surfaceColor, borderRadius: 28, padding: "36px 28px 28px", border: `1.5px solid ${accentColor}35`, boxShadow: `0 0 80px ${accentColor}18`, width: 300, textAlign: "center", fontFamily: "'Nunito', sans-serif" }}>

        <div style={{ fontSize: 32, marginBottom: 6 }}>🔒</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 28 }}>
          Enter PIN
        </div>

        {/* Dot indicators */}
        <div style={{ display: "flex", gap: 18, justifyContent: "center", marginBottom: 30, animation: shake ? "pin-shake 0.55s ease" : "none" }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ width: 15, height: 15, borderRadius: "50%", border: `2px solid ${shake ? "#e85470" : accentColor}80`, background: shake ? "#e85470" : digits.length > i ? accentColor : "transparent", transition: "background 0.12s" }} />
          ))}
        </div>

        {/* Number pad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {PAD_KEYS.map((key, i) => {
            if (key === "") return <div key={i} />;
            const isBack = key === "⌫";
            return (
              <button
                key={i}
                onClick={() => press(key)}
                style={{ height: 62, borderRadius: 16, background: isBack ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", fontSize: isBack ? 20 : 24, fontFamily: "'Nunito', sans-serif", fontWeight: 800, cursor: "pointer", transition: "background 0.1s", userSelect: "none", WebkitUserSelect: "none" }}
                onPointerDown={e => (e.currentTarget.style.background = `${accentColor}28`)}
                onPointerUp={e => (e.currentTarget.style.background = isBack ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)")}
                onPointerLeave={e => (e.currentTarget.style.background = isBack ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)")}
              >
                {key}
              </button>
            );
          })}
        </div>

        <button onClick={onCancel} style={{ marginTop: 22, background: "transparent", border: "none", color: "rgba(255,255,255,0.28)", fontSize: 13, cursor: "pointer", fontFamily: "'Nunito', sans-serif", padding: "4px 12px" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Lock button ───────────────────────────────────────────────────────────

interface LockButtonProps {
  locked: boolean;
  accentColor: string;
  onLock: () => void;
  onUnlockRequest: () => void;
}

export function LockButton({ locked, accentColor, onLock, onUnlockRequest }: LockButtonProps) {
  return (
    <button
      onClick={locked ? onUnlockRequest : onLock}
      title={locked ? "Tap to unlock" : "Tap to lock"}
      style={{ position: "fixed", bottom: 18, right: 18, zIndex: 600, background: locked ? `${accentColor}18` : "rgba(255,255,255,0.04)", border: `1px solid ${locked ? accentColor + "50" : "rgba(255,255,255,0.1)"}`, borderRadius: 14, padding: "7px 13px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, opacity: locked ? 0.85 : 0.28, transition: "opacity 0.2s, background 0.2s", userSelect: "none", WebkitUserSelect: "none" }}
      onMouseEnter={e => (e.currentTarget.style.opacity = "0.95")}
      onMouseLeave={e => (e.currentTarget.style.opacity = locked ? "0.85" : "0.28")}
    >
      <span style={{ fontSize: 15 }}>{locked ? "🔒" : "🔓"}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", fontFamily: "'Nunito', sans-serif", letterSpacing: 0.5 }}>
        {locked ? "Locked" : "Lock"}
      </span>
    </button>
  );
}
