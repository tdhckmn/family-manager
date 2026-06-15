import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { Icon } from "../../components/Icon";
import { UserProfile } from "../../components/GlobalHeader";
import StarField from "../../components/StarField";
import { type Theme } from "../../theme";
import { useHousehold, subIsActive, daysLeft, HouseholdPerson } from "../../household";
import {
  Panel, BG, BORDER, BORDER_HI, TEXT, TEXT_DIM, TEXT_MUTED,
  JADE, BLUE, SURFACE, DANGER, YELLOW, INK, FONT, btn,
} from "../shared/kit";
import { useGCal, fetchCalendars, type GCalCalendar } from "../../gcal";
import { usePrefs } from "../../prefs";
import { APP_ICON_REGISTRY } from "../../components/Wisdom";

const ACCENT_PRESETS = [
  { color: "#5db88a", label: "Jade" },
  { color: "#46b6ad", label: "Teal" },
  { color: "#5b8fd4", label: "Blue" },
  { color: "#a78bfa", label: "Lavender" },
  { color: "#e070a8", label: "Rose" },
  { color: "#d4a45b", label: "Gold" },
  { color: "#e07a3c", label: "Ember" },
];

const PAGE_OPTIONS = [
  { key: "home",        label: "Home",      desc: "Above the navigation grid" },
  { key: "notes",       label: "Notes",     desc: "Above the notes list" },
  { key: "finance",     label: "Finances",  desc: "Above monthly goals" },
  { key: "calendar",    label: "Today",     desc: "Above the day view" },
  { key: "chores",      label: "Chores",    desc: "Above the chores board" },
  { key: "food",        label: "Meals",     desc: "Above the meal planner" },
  { key: "maintenance", label: "Home Care", desc: "Above maintenance tasks" },
  { key: "focus",       label: "Focus",     desc: "Above the breathing exercises" },
];

interface HouseholdDoc {
  members: string[];
  people: HouseholdPerson[];
  inviteCode: string | null;
  inviteExpiresAt: string | null;
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function Settings() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [copied, setCopied] = useState(false);
  const { prefs, updatePrefs } = usePrefs();
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const household = useHousehold();
  const isOwner = household.role === "owner";
  const active = subIsActive(household.subStatus);
  const kioskUrl = `${window.location.origin}/app/calendar?kiosk=true`;

  // ── Household members + invite ────────────────────────────────────────────
  const [hhDoc, setHhDoc] = useState<HouseholdDoc | null>(null);
  const [memberEmails, setMemberEmails] = useState<Record<string, string>>({});
  const [generatingCode, setGeneratingCode] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // People management state
  const [addingPerson, setAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editingPersonName, setEditingPersonName] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return onSnapshot(doc(db, "users", household.householdId, "meta", "household"), snap => {
      if (snap.exists()) setHhDoc(snap.data() as HouseholdDoc);
    });
  }, [household.householdId]);

  useEffect(() => {
    if (!hhDoc?.members) return;
    const otherUids = hhDoc.members.filter(uid => uid !== user?.uid);
    Promise.all(
      otherUids.map(async uid => {
        const snap = await getDoc(doc(db, "registrations", uid));
        return [uid, (snap.data()?.email as string) ?? uid] as [string, string];
      })
    ).then(entries => {
      // Include the current user's email directly from auth — no registration lookup needed
      const all = Object.fromEntries(entries);
      if (user?.uid && user.email) all[user.uid] = user.email;
      setMemberEmails(all);
    });
  }, [hhDoc?.members, user?.uid, user?.email]);

  useEffect(() => {
    if (addingPerson) setTimeout(() => addInputRef.current?.focus(), 50);
  }, [addingPerson]);

  useEffect(() => {
    if (editingPersonId) setTimeout(() => editInputRef.current?.focus(), 50);
  }, [editingPersonId]);

  const hhRef = doc(db, "users", household.householdId, "meta", "household");

  async function addPerson() {
    const name = newPersonName.trim();
    if (!name || !hhDoc) return;
    const people = hhDoc.people ?? [];
    await updateDoc(hhRef, { people: [...people, { id: randomId(), name }] });
    setNewPersonName("");
    setAddingPerson(false);
  }

  async function deletePerson(id: string) {
    if (!hhDoc) return;
    const people = (hhDoc.people ?? []).filter(p => p.id !== id);
    await updateDoc(hhRef, { people });
  }

  async function savePerson(id: string) {
    const name = editingPersonName.trim();
    if (!name || !hhDoc) return;
    const people = (hhDoc.people ?? []).map(p => p.id === id ? { ...p, name } : p);
    await updateDoc(hhRef, { people });
    setEditingPersonId(null);
  }

  async function linkAccount(personId: string, uid: string | null) {
    if (!hhDoc) return;
    const people = (hhDoc.people ?? []).map(p => {
      if (p.id === personId) {
        const next = { ...p };
        if (uid) next.linkedUid = uid; else delete next.linkedUid;
        return next;
      }
      // Unlink from any other person that had this uid
      if (uid && p.linkedUid === uid) {
        const next = { ...p };
        delete next.linkedUid;
        return next;
      }
      return p;
    });
    await updateDoc(hhRef, { people });
  }

  async function claimAsSelf(personId: string) {
    await linkAccount(personId, user?.uid ?? null);
    if (user) {
      await updateDoc(doc(db, "users", user.uid, "meta", "profile"), { householdPersonId: personId });
    }
  }

  async function unlinkSelf(personId: string) {
    await linkAccount(personId, null);
    if (user) {
      await updateDoc(doc(db, "users", user.uid, "meta", "profile"), { householdPersonId: null });
    }
  }

  async function updatePersonColor(id: string, color: string) {
    if (!hhDoc) return;
    const people = (hhDoc.people ?? []).map(p => p.id === id ? { ...p, color } : p);
    await updateDoc(hhRef, { people });
  }

  async function generateInvite() {
    if (!isOwner) return;
    setGeneratingCode(true);
    try {
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 72 * 3_600_000).toISOString();
      await updateDoc(doc(db, "users", household.householdId, "meta", "household"), { inviteCode: code, inviteExpiresAt: expiresAt });
      await setDoc(doc(db, "invites", code), { ownerUid: household.householdId, expiresAt, createdAt: new Date().toISOString() });
    } finally {
      setGeneratingCode(false);
    }
  }
  async function revokeInvite() {
    await updateDoc(doc(db, "users", household.householdId, "meta", "household"), { inviteCode: null, inviteExpiresAt: null });
  }
  function copyInviteLink() {
    const code = hhDoc?.inviteCode;
    if (!code) return;
    navigator.clipboard.writeText(`Join my Equanimity household!\nVisit ${window.location.origin}/join and enter code: ${code}`);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  const inviteExpired = hhDoc?.inviteExpiresAt ? new Date(hhDoc.inviteExpiresAt) < new Date() : false;
  const inviteHoursLeft = hhDoc?.inviteExpiresAt
    ? Math.max(0, Math.ceil((new Date(hhDoc.inviteExpiresAt).getTime() - Date.now()) / 3_600_000))
    : 0;

  function copyKioskUrl() {
    navigator.clipboard.writeText(kioskUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: FONT, color: TEXT, position: "relative" }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ padding: "14px 20px", minHeight: 60, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12, boxSizing: "border-box" }}>
          <Link to="/app" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, opacity: 0.7, flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7"}>
            ← Home
          </Link>
          <div style={{ width: 1, height: 14, background: BORDER, flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT }}>Settings</span>
        </div>

        <div style={{ maxWidth: 620, margin: "0 auto", width: "100%", padding: "24px 20px 80px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Account */}
          <Panel title="Account" icon={<Icon name="shield" size={15} />} accent={JADE}>
            <div style={{ borderRadius: 12, background: "var(--surface)", border: `1px solid ${BORDER}`, overflow: "hidden" }}>
              <UserProfile user={user} />
            </div>
            <button
              onClick={() => signOut(auth).catch(console.error)}
              style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, width: "100%", justifyContent: "center", background: "transparent", border: `1px solid ${DANGER}44`, borderRadius: 10, color: DANGER, fontSize: 13, fontWeight: 700, padding: "11px 0", cursor: "pointer", fontFamily: FONT, transition: "all 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = `${DANGER}12`}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}>
              <Icon name="signout" size={15} /> Sign out
            </button>
          </Panel>

          {/* Subscription — household owner manages billing */}
          {isOwner && (
            <Panel title="Subscription" icon={<Icon name="card" size={15} />} accent={active ? JADE : YELLOW}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--surface)", border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: active ? JADE : YELLOW }}>
                    {household.isOverride ? "Access granted"
                      : household.subStatus === "active" ? "Active"
                      : household.subStatus === "trialing" ? `Trial — ${daysLeft(household.trialEndsAt)}d left`
                      : household.subStatus === "past_due" ? "Past due"
                      : household.subStatus === "cancelled" ? "Canceled"
                      : "No subscription"}
                  </div>
                  {household.periodEndsAt && <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>renews {household.periodEndsAt}</div>}
                </div>
                <Link to="/app/subscribe"
                  style={{ fontSize: 12, fontWeight: 700, color: INK, background: active ? JADE : YELLOW, textDecoration: "none", padding: "7px 14px", borderRadius: 8 }}>
                  {active ? "Manage" : "Subscribe"}
                </Link>
              </div>
            </Panel>
          )}

          {/* Household — people roster + invite */}
          <Panel title="Household" icon={<Icon name="home" size={15} />} accent={JADE}>

            {/* People roster */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: TEXT_DIM, marginBottom: 10 }}>Members</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {(hhDoc?.people ?? []).map(person => {
                const isMe = person.linkedUid === user?.uid;
                const linkedEmail = person.linkedUid
                  ? (person.linkedUid === user?.uid ? user?.email : memberEmails[person.linkedUid])
                  : null;
                const isClaimed = !!person.linkedUid;
                const iMineAlready = !!(hhDoc?.people ?? []).find(p => p.linkedUid === user?.uid && p.id !== person.id);
                const isEditing = editingPersonId === person.id;
                const color = person.color ?? "#5db88a";

                return (
                  <div key={person.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--surface)", border: `1px solid ${isMe ? JADE + "55" : BORDER}`, borderRadius: 10 }}>

                    {/* Color swatch — always visible, clickable by owner */}
                    <label style={{ position: "relative", flexShrink: 0, cursor: isOwner ? "pointer" : "default" }}>
                      <span style={{ display: "block", width: 18, height: 18, borderRadius: "50%", background: color, border: "2px solid rgba(255,255,255,0.15)" }} />
                      {isOwner && (
                        <input type="color" value={color} onChange={e => updatePersonColor(person.id, e.target.value)}
                          style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", padding: 0, border: "none" }} />
                      )}
                    </label>

                    {/* Name / edit input */}
                    {isEditing ? (
                      <input ref={editInputRef} value={editingPersonName}
                        onChange={e => setEditingPersonName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") savePerson(person.id); if (e.key === "Escape") setEditingPersonId(null); }}
                        style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: TEXT, fontFamily: FONT, fontWeight: 700, fontSize: 13 }} />
                    ) : (
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: isMe ? JADE : TEXT }}>{person.name}</span>
                    )}

                    {/* Account link status */}
                    {!isEditing && (
                      <span style={{ fontSize: 11, color: isMe ? JADE : TEXT_DIM, fontStyle: linkedEmail ? "normal" : "italic" }}>
                        {isMe ? "you" : linkedEmail ?? "no account"}
                      </span>
                    )}

                    {/* Actions */}
                    {isEditing ? (
                      <button onClick={() => savePerson(person.id)} style={{ background: JADE, border: "none", borderRadius: 6, color: INK, fontFamily: FONT, fontWeight: 700, fontSize: 11, padding: "4px 10px", cursor: "pointer" }}>Save</button>
                    ) : (
                      <>
                        {!isMe && !isClaimed && !iMineAlready && (
                          <button onClick={() => claimAsSelf(person.id)}
                            style={{ background: "transparent", border: `1px solid ${JADE}55`, borderRadius: 6, color: JADE, fontFamily: FONT, fontWeight: 600, fontSize: 11, padding: "4px 10px", cursor: "pointer", whiteSpace: "nowrap" }}>
                            This is me
                          </button>
                        )}
                        {isMe && (
                          <button onClick={() => unlinkSelf(person.id)}
                            style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT_DIM, fontFamily: FONT, fontWeight: 600, fontSize: 11, padding: "4px 10px", cursor: "pointer", whiteSpace: "nowrap" }}>
                            Unlink
                          </button>
                        )}
                        {isOwner && (
                          <>
                            <button onClick={() => { setEditingPersonId(person.id); setEditingPersonName(person.name); }}
                              style={{ background: "transparent", border: "none", color: TEXT_DIM, cursor: "pointer", fontSize: 13, padding: "2px 6px", lineHeight: 1 }}>✎</button>
                            <button onClick={() => deletePerson(person.id)}
                              style={{ background: "transparent", border: "none", color: DANGER, cursor: "pointer", fontSize: 18, padding: "2px 4px", lineHeight: 1, opacity: 0.5 }}>×</button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add person */}
            {isOwner && (
              <div style={{ marginTop: 10 }}>
                {addingPerson ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      ref={addInputRef}
                      value={newPersonName}
                      onChange={e => setNewPersonName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addPerson(); if (e.key === "Escape") { setAddingPerson(false); setNewPersonName(""); } }}
                      placeholder="Name"
                      style={{ flex: 1, background: "var(--input-bg)", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontFamily: FONT, fontSize: 13, padding: "9px 12px", outline: "none" }}
                    />
                    <button onClick={addPerson} style={{ background: JADE, border: "none", borderRadius: 8, color: INK, fontFamily: FONT, fontWeight: 700, fontSize: 13, padding: "9px 16px", cursor: "pointer" }}>Add</button>
                    <button onClick={() => { setAddingPerson(false); setNewPersonName(""); }} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_DIM, fontFamily: FONT, fontSize: 13, padding: "9px 12px", cursor: "pointer" }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setAddingPerson(true)}
                    style={{ background: "transparent", border: `1px dashed ${BORDER}`, borderRadius: 8, color: TEXT_DIM, fontFamily: FONT, fontWeight: 600, fontSize: 12, padding: "9px 16px", cursor: "pointer", width: "100%", textAlign: "center" }}>
                    + Add member
                  </button>
                )}
              </div>
            )}

            {/* Invite section */}
            {isOwner && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: TEXT_DIM, marginBottom: 10 }}>Invite account access</div>
                <div style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 14, lineHeight: 1.5 }}>
                  Share a code with anyone who needs their own login. They visit{" "}
                  <code style={{ background: "var(--surface-hi)", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>/join</code>{" "}
                  and enter it to access this household.
                </div>

                {hhDoc?.inviteCode && !inviteExpired ? (
                  <>
                    <div style={{ background: "var(--surface)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 6, color: JADE }}>{hhDoc.inviteCode}</div>
                        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}>Expires in {inviteHoursLeft}h</div>
                      </div>
                      <button onClick={copyInviteLink}
                        style={{ background: inviteCopied ? `${JADE}22` : "var(--surface-hi)", border: `1px solid ${inviteCopied ? JADE + "55" : BORDER}`, borderRadius: 8, color: inviteCopied ? JADE : TEXT_DIM, fontFamily: FONT, fontWeight: 700, fontSize: 12, padding: "8px 14px", cursor: "pointer" }}>
                        {inviteCopied ? "Copied!" : "Copy link"}
                      </button>
                    </div>
                    <button onClick={revokeInvite} style={{ background: "transparent", border: "none", color: DANGER, fontSize: 12, cursor: "pointer", fontFamily: FONT, fontWeight: 600 }}>
                      Revoke code
                    </button>
                  </>
                ) : (
                  <>
                    {hhDoc?.inviteCode && inviteExpired && (
                      <div style={{ fontSize: 12, color: YELLOW, marginBottom: 12 }}>Previous invite code expired.</div>
                    )}
                    <button onClick={generateInvite} disabled={generatingCode}
                      style={{ background: JADE, border: "none", borderRadius: 10, color: INK, fontFamily: FONT, fontWeight: 700, fontSize: 13, padding: "11px 22px", cursor: "pointer", opacity: generatingCode ? 0.7 : 1 }}>
                      {generatingCode ? "Generating…" : "Generate Invite Code"}
                    </button>
                  </>
                )}
              </div>
            )}
          </Panel>

          {/* Appearance */}
          <Panel title="Appearance" icon={<Icon name="sparkles" size={15} />} accent={prefs.accentColor}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: TEXT_DIM, marginBottom: 10 }}>Accent Color</div>
            <div style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 14, lineHeight: 1.5 }}>
              Tints the ambient background glow and the home screen icon.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {ACCENT_PRESETS.map(({ color, label }) => {
                const active = prefs.accentColor === color;
                return (
                  <button
                    key={color}
                    title={label}
                    onClick={() => updatePrefs({ accentColor: color })}
                    style={{
                      width: 32, height: 32, borderRadius: "50%", border: `2.5px solid ${active ? "#fff" : "transparent"}`,
                      background: color, cursor: "pointer", padding: 0,
                      boxShadow: active ? `0 0 0 1px ${color}, 0 0 12px ${color}55` : "none",
                      transition: "all 0.15s", flexShrink: 0,
                    }}
                  />
                );
              })}
              {/* Custom color picker */}
              <label title="Custom color" style={{ position: "relative", width: 32, height: 32, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
                background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
                border: `2.5px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <input
                  type="color"
                  value={prefs.accentColor}
                  onChange={e => updatePrefs({ accentColor: e.target.value })}
                  style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
                />
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: TEXT_DIM }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: prefs.accentColor, flexShrink: 0 }} />
              <span style={{ fontFamily: "monospace", fontSize: 11 }}>{prefs.accentColor}</span>
            </div>

            <div style={{ height: 1, background: BORDER, margin: "18px 0 16px" }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: TEXT_DIM, marginBottom: 10 }}>App Icon</div>
            <div style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 14, lineHeight: 1.5 }}>
              Symbol shown at the top of the home screen.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {/* Auto option */}
              <button
                onClick={() => updatePrefs({ appIcon: "" })}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 4, padding: "8px 6px", width: 62, borderRadius: 9, cursor: "pointer",
                  fontFamily: FONT, border: `1.5px solid ${!prefs.appIcon ? prefs.accentColor + "88" : BORDER}`,
                  background: !prefs.appIcon ? `${prefs.accentColor}14` : "var(--surface)",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1, color: !prefs.appIcon ? prefs.accentColor : TEXT_DIM, fontWeight: 700 }}>~</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: !prefs.appIcon ? prefs.accentColor : TEXT_DIM }}>Auto</span>
              </button>
              {APP_ICON_REGISTRY.map(({ id, label, Icon }) => {
                const sel = prefs.appIcon === id;
                return (
                  <button
                    key={id}
                    onClick={() => updatePrefs({ appIcon: id })}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      gap: 4, padding: "8px 6px", width: 62, borderRadius: 9, cursor: "pointer",
                      fontFamily: FONT, border: `1.5px solid ${sel ? prefs.accentColor + "88" : BORDER}`,
                      background: sel ? `${prefs.accentColor}14` : "var(--surface)",
                      transition: "all 0.15s",
                    }}
                  >
                    <Icon size={24} color={sel ? prefs.accentColor : "var(--text-muted)"} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: sel ? prefs.accentColor : TEXT_DIM, textAlign: "center", lineHeight: 1.2 }}>{label}</span>
                  </button>
                );
              })}
            </div>
          </Panel>

          {/* Wisdom */}
          <Panel title="Wisdom" icon={<Icon name="book" size={15} />} accent={prefs.accentColor}>
            <Link
              to="/app/wisdom"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderRadius: 12,
                background: `${prefs.accentColor}0e`,
                border: `1px solid ${prefs.accentColor}33`,
                textDecoration: "none", marginBottom: 20,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${prefs.accentColor}18`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${prefs.accentColor}0e`; }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: prefs.accentColor, marginBottom: 2 }}>Wisdom Library</div>
                <div style={{ fontSize: 11, color: TEXT_DIM }}>Curate traditions and individual quotes</div>
              </div>
              <span style={{ fontSize: 16, color: prefs.accentColor, opacity: 0.7 }}>↗</span>
            </Link>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: TEXT_DIM, marginBottom: 10 }}>Show On</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PAGE_OPTIONS.map(({ key, label, desc }) => {
                const active = prefs.wisdomPages.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => {
                      const next = active
                        ? prefs.wisdomPages.filter(p => p !== key)
                        : [...prefs.wisdomPages, key];
                      updatePrefs({ wisdomPages: next });
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "11px 14px", borderRadius: 10,
                      background: active ? `${prefs.accentColor}0e` : "var(--surface)",
                      border: `1px solid ${active ? prefs.accentColor + "44" : BORDER}`,
                      cursor: "pointer", textAlign: "left", fontFamily: FONT,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      border: `2px solid ${active ? prefs.accentColor : BORDER}`,
                      background: active ? prefs.accentColor : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}>
                      {active && <span style={{ color: INK, fontSize: 11, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: active ? prefs.accentColor : TEXT }}>{label}</div>
                      <div style={{ fontSize: 11, color: TEXT_MUTED }}>{desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          {/* Weather */}
          <Panel title="Weather" icon={<Icon name="sun" size={15} />} accent={YELLOW}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: TEXT_DIM, marginBottom: 8 }}>Temperature</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["F", "C"] as const).map(u => {
                    const active = prefs.tempUnit === u;
                    return (
                      <button key={u} onClick={() => updatePrefs({ tempUnit: u })}
                        style={{ padding: "8px 20px", borderRadius: 10, border: `1px solid ${active ? YELLOW : BORDER}`, background: active ? `${YELLOW}18` : "transparent", color: active ? YELLOW : TEXT_DIM, fontFamily: FONT, fontSize: 13, fontWeight: 800, cursor: "pointer", transition: "all 0.15s" }}>
                        °{u}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: TEXT_DIM, marginBottom: 8 }}>Location</div>
                <SettingsZipInput zip={prefs.weatherZip} onZip={z => updatePrefs({ weatherZip: z })} />
              </div>
            </div>
          </Panel>

          {/* Theme */}
          <Panel title="Theme" icon={<Icon name="sparkles" size={15} />} accent={JADE}>
            <div style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 12 }}>
              Choose how Equanimity looks. Your choice is saved on this device.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <ThemeOption label="Dark" value="dark" current={prefs.theme} onPick={(t) => updatePrefs({ theme: t })}
                swatchBg="#06091a" swatchSurface="rgba(255,255,255,0.12)" swatchText="#dedad0" />
              <ThemeOption label="Light" value="light" current={prefs.theme} onPick={(t) => updatePrefs({ theme: t })}
                swatchBg="#f2f0e8" swatchSurface="rgba(20,22,45,0.10)" swatchText="#23222e" />
            </div>
          </Panel>

          {/* Focus page — temporary entry point */}
          <Panel title="Focus" icon={<Icon name="sparkles" size={15} />} accent={prefs.accentColor}>
            <p style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.65, margin: "0 0 14px" }}>
              Noise generation and guided breathing techniques to reduce stress and restore focus.
            </p>
            <Link to="/app/focus"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: prefs.accentColor, color: INK, textDecoration: "none", fontFamily: FONT, fontWeight: 800, fontSize: 13 }}>
              Open Focus →
            </Link>
          </Panel>

          {/* Google Calendar */}
          <GCalSettingsPanel />

          {/* Kiosk / wall-display mode */}
          <Panel title="Kiosk Mode" icon={<Icon name="calendar" size={15} />} accent={YELLOW}>
            <p style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.65, margin: "0 0 12px" }}>
              Open this URL on a wall-mounted display or tablet to show a full-screen clock and Today view. The device must be signed in to your account.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <div style={{ flex: 1, background: "var(--input-bg)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 12, color: TEXT_MUTED, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {kioskUrl}
              </div>
              <button onClick={copyKioskUrl}
                style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: copied ? JADE : "var(--surface-hi)", color: copied ? INK : TEXT, fontFamily: FONT, fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.15s", flexShrink: 0 }}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div style={{ marginTop: 10 }}>
              <a href={kioskUrl} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: YELLOW, textDecoration: "none", fontWeight: 600 }}>
                Open kiosk view ↗
              </a>
            </div>
          </Panel>

        </div>
      </div>
    </div>
  );
}


function GCalSettingsPanel() {
  const { prefs, updatePrefs } = usePrefs();
  const { token, status, authError, clientConfigured, connect, disconnect } = useGCal();
  const [calendars, setCalendars] = useState<GCalCalendar[]>([]);
  const [calLoading, setCalLoading] = useState(false);

  useEffect(() => {
    if (!token) { setCalendars([]); return; }
    setCalLoading(true);
    fetchCalendars(token)
      .then(cals => {
        setCalendars(cals);
        setCalLoading(false);
        // Auto-enable the primary calendar on first connect
        if ((prefs.gcalEnabledCalendars ?? []).length === 0) {
          const primary = cals.find(c => c.primary);
          if (primary) updatePrefs({ gcalEnabledCalendars: [primary.id] });
        }
      })
      .catch(() => setCalLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const enabled = prefs.gcalEnabledCalendars ?? [];
  const toggle = (id: string) => {
    const next = enabled.includes(id) ? enabled.filter(x => x !== id) : [...enabled, id];
    updatePrefs({ gcalEnabledCalendars: next });
  };

  const isConnected = status === "connected";
  const isLoading = status === "loading";

  return (
    <Panel title="Google Calendar" icon={<Icon name="calendar" size={15} />} accent={BLUE}>
      {!clientConfigured ? (
        <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.6 }}>
          Add <code style={{ background: "var(--surface-hi)", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>VITE_GOOGLE_CLIENT_ID</code> to your <code style={{ background: "var(--surface-hi)", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>.env</code> file to enable this integration. Create an OAuth 2.0 Client ID at <strong>console.cloud.google.com</strong> with the Google Calendar API enabled.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 14, lineHeight: 1.5 }}>
            {isConnected
              ? "Connected. Choose which calendars to show on the Today view."
              : "Connect to show today's Google Calendar events alongside your other tasks."}
          </div>

          {/* Connect / disconnect */}
          {isConnected ? (
            <button
              onClick={disconnect}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px",
                borderRadius: 10, border: `1px solid ${DANGER}44`, background: "transparent",
                color: DANGER, fontFamily: FONT, fontWeight: 700, fontSize: 13, cursor: "pointer",
                marginBottom: calendars.length > 0 ? 16 : 0, transition: "background 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${DANGER}12`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              Disconnect Google Calendar
            </button>
          ) : (
            <>
              <button
                onClick={connect}
                disabled={isLoading}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px",
                  borderRadius: 10, border: "none", background: BLUE,
                  color: "#fff", fontFamily: FONT, fontWeight: 700, fontSize: 13,
                  cursor: isLoading ? "default" : "pointer", opacity: isLoading ? 0.7 : 1,
                  marginBottom: authError ? 10 : 0, transition: "opacity 0.15s",
                }}
              >
                {isLoading ? "Connecting…" : "Connect Google Calendar"}
              </button>
              {authError && (
                <div style={{ fontSize: 12, color: DANGER, marginTop: 8 }}>{authError}</div>
              )}
            </>
          )}

          {/* Calendar selector */}
          {isConnected && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {calLoading && <div style={{ fontSize: 13, color: TEXT_DIM }}>Loading calendars…</div>}
              {!calLoading && calendars.map(cal => {
                const on = enabled.includes(cal.id);
                return (
                  <button
                    key={cal.id}
                    onClick={() => toggle(cal.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                      borderRadius: 10, border: `1px solid ${on ? cal.backgroundColor + "66" : BORDER}`,
                      background: on ? `${cal.backgroundColor}0f` : SURFACE,
                      cursor: "pointer", textAlign: "left", fontFamily: FONT, transition: "all 0.15s",
                    }}
                  >
                    <span style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      border: `2px solid ${on ? cal.backgroundColor : BORDER}`,
                      background: on ? cal.backgroundColor : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}>
                      {on && <span style={{ color: "#fff", fontSize: 11, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                    </span>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: cal.backgroundColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: on ? TEXT : TEXT_DIM, flex: 1 }}>
                      {cal.summary}
                      {cal.primary && <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600, marginLeft: 6 }}>primary</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

function SettingsZipInput({ zip, onZip }: { zip: string; onZip: (z: string) => void }) {
  const [draft, setDraft] = useState(zip);
  useEffect(() => { setDraft(zip); }, [zip]);
  function commit() { if (draft.trim() !== zip) onZip(draft.trim()); }
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") { commit(); (e.target as HTMLInputElement).blur(); } }}
        placeholder="ZIP code or city name"
        style={{ flex: 1, background: "var(--input-bg)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "9px 12px", color: TEXT, fontSize: 14, fontFamily: FONT, outline: "none", boxSizing: "border-box" }}
      />
      {zip && (
        <button type="button" onClick={() => { setDraft(""); onZip(""); }} title="Use device location"
          style={{ ...btn("transparent", TEXT_DIM, BORDER), padding: "9px 12px", flexShrink: 0 }}>
          <Icon name="target" size={14} /> Use location
        </button>
      )}
    </div>
  );
}

function ThemeOption({ label, value, current, onPick, swatchBg, swatchSurface, swatchText }: {
  label: string; value: Theme; current: Theme; onPick: (t: Theme) => void;
  swatchBg: string; swatchSurface: string; swatchText: string;
}) {
  const active = current === value;
  return (
    <button onClick={() => onPick(value)}
      style={{ textAlign: "left", padding: 10, borderRadius: 14, cursor: "pointer", fontFamily: FONT,
        background: active ? "var(--surface-hi)" : "transparent",
        border: `1.5px solid ${active ? JADE : BORDER}`, transition: "all 0.15s" }}>
      <div style={{ height: 64, borderRadius: 9, background: swatchBg, border: `1px solid ${BORDER_HI}`, padding: 8, display: "flex", flexDirection: "column", gap: 5, overflow: "hidden" }}>
        <div style={{ height: 8, width: "60%", borderRadius: 3, background: swatchText, opacity: 0.85 }} />
        <div style={{ height: 6, width: "85%", borderRadius: 3, background: swatchSurface }} />
        <div style={{ height: 6, width: "70%", borderRadius: 3, background: swatchSurface }} />
        <div style={{ marginTop: "auto", height: 10, width: 34, borderRadius: 5, background: JADE }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 9 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: active ? JADE : TEXT }}>{label}</span>
        {active && (
          <span style={{ width: 18, height: 18, borderRadius: "50%", background: JADE, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: INK, fontSize: 11, fontWeight: 800, lineHeight: 1 }}>✓</span>
          </span>
        )}
      </div>
    </button>
  );
}
