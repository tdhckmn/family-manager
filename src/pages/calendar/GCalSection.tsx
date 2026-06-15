import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { fetchCalendars, fetchTodayEvents, useGCal, type GCalEvent } from "../../gcal";
import { usePrefs } from "../../prefs";
import { BLUE, BORDER, SURFACE, TEXT, TEXT_DIM, TEXT_MUTED, FONT } from "../shared/kit";

function fmtTime(dt: string): string {
  return new Date(dt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const promptRow: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
  borderRadius: 10, background: `${BLUE}0d`, border: `1px solid ${BLUE}33`,
  textDecoration: "none",
};

export default function GCalSection() {
  const { token, isConnected } = useGCal();
  const { prefs } = usePrefs();
  const calKey = (prefs.gcalEnabledCalendars ?? []).join(",");

  const [events, setEvents] = useState<GCalEvent[]>([]);
  const [loadingEvts, setLoadingEvts] = useState(false);
  const [evtError, setEvtError] = useState<string | null>(null);

  useEffect(() => {
    const calIds = calKey ? calKey.split(",") : [];
    if (!token || calIds.length === 0) { setEvents([]); return; }
    let cancelled = false;
    setLoadingEvts(true);
    setEvtError(null);
    fetchCalendars(token)
      .then(cals => {
        const colorMap = new Map(cals.map(c => [c.id, c.backgroundColor]));
        return fetchTodayEvents(token, calIds, colorMap);
      })
      .then(evts => { if (!cancelled) { setEvents(evts); setLoadingEvts(false); } })
      .catch(() => { if (!cancelled) { setEvtError("Failed to load events"); setLoadingEvts(false); } });
    return () => { cancelled = true; };
  }, [token, calKey]);

  const header = (
    <a
      href="https://calendar.google.com"
      target="_blank"
      rel="noreferrer"
      style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, textDecoration: "none" }}
    >
      <Icon name="calendar" size={16} color={BLUE} />
      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: TEXT }}>
        Google Calendar
      </span>
      <Icon name="chevronDown" size={13} color={TEXT_MUTED} style={{ transform: "rotate(-90deg)", opacity: 0.5 }} />
    </a>
  );

  const cardStyle: React.CSSProperties = {
    background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 16px",
  };

  if (!isConnected) {
    return (
      <div style={cardStyle}>
        {header}
        <Link to="/app/settings" style={promptRow}>
          <span style={{ fontSize: 13, color: TEXT_DIM }}>Connect Google Calendar in</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: BLUE }}>Settings <Icon name="external" size={13} /></span>
        </Link>
      </div>
    );
  }

  if (!calKey) {
    return (
      <div style={cardStyle}>
        {header}
        <Link to="/app/settings" style={promptRow}>
          <span style={{ fontSize: 13, color: TEXT_DIM }}>Choose calendars to show in</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: BLUE }}>Settings <Icon name="external" size={13} /></span>
        </Link>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      {header}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {loadingEvts && (
          <div style={{ fontSize: 13, color: TEXT_MUTED, padding: "6px 0" }}>Loading events…</div>
        )}
        {evtError && (
          <div style={{ fontSize: 13, color: "#e05555", padding: "6px 0" }}>{evtError}</div>
        )}
        {!loadingEvts && !evtError && events.length === 0 && (
          <div style={{ fontSize: 13, color: TEXT_MUTED, padding: "6px 0" }}>No events today</div>
        )}
        {!loadingEvts && events.map(evt => (
          <a
            key={evt.id}
            href={evt.htmlLink}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              borderRadius: 10, background: "var(--surface)", border: `1px solid ${BORDER}`,
              textDecoration: "none", transition: "border-color 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = evt.calendarColor + "55"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = BORDER; }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: evt.calendarColor, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: TEXT_MUTED, flexShrink: 0, minWidth: 54, fontFamily: FONT }}>
              {evt.allDay ? "All day" : fmtTime(evt.start.dateTime!)}
            </span>
            <span style={{ fontSize: 14, color: TEXT, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {evt.summary}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
