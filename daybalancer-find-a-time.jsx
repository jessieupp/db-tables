import { useState, useEffect, useCallback } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am - 8pm

const COLORS = {
  primary: "#1B6896",
  primaryDark: "#154F74",
  primaryLight: "#E8F2F9",
  green: "#4CAF7D",
  greenLight: "#E8F5EE",
  teal: "#2A8FA8",
  orange: "#E8732A",
  light: "#F5F7FA",
  border: "#DCE3EA",
  dark: "#2C3A47",
  muted: "#6B7C8D",
  white: "#FFFFFF",
};

const participantColors = [
  "#1B6896", "#4CAF7D", "#E8732A",
  "#2A8FA8", "#7B68EE", "#E8418D",
  "#F5A623", "#52B788", "#4A90D9",
];

function formatHour(h) {
  if (h === 12) return "12 pm";
  if (h > 12) return `${h - 12} pm`;
  return `${h} am`;
}

function slotKey(day, hour) {
  return `${day}-${hour}`;
}

export default function FindATime() {
  const [sessions, setSessions] = useState({});
  const [currentSession, setCurrentSession] = useState(null);
  const [view, setView] = useState("home"); // home | create | join | enter | results
  const [sessionCode, setSessionCode] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null); // "add" or "remove"
  const [joinCode, setJoinCode] = useState("");
  const [activeParticipant, setActiveParticipant] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [copied, setCopied] = useState(false);

  // Load sessions from storage on mount
  useEffect(() => {
    async function load() {
      try {
        const result = await window.storage.get("db-findatime-sessions");
        if (result) setSessions(JSON.parse(result.value));
      } catch {}
    }
    load();
  }, []);

  // Save sessions whenever they change
  useEffect(() => {
    async function save() {
      if (Object.keys(sessions).length === 0) return;
      try {
        await window.storage.set("db-findatime-sessions", JSON.stringify(sessions));
      } catch {}
    }
    save();
  }, [sessions]);

  function generateCode() {
    const words = ["oak","river","bloom","sky","stone","moss","tide","grove","glow","dawn"];
    const pick = () => words[Math.floor(Math.random() * words.length)];
    return `${pick()}-${pick()}-${Math.floor(100 + Math.random() * 900)}`;
  }

  function createSession() {
    if (!sessionTitle.trim()) return;
    const code = generateCode();
    const session = { code, title: sessionTitle.trim(), participants: [] };
    setSessions(prev => ({ ...prev, [code]: session }));
    setCurrentSession(session);
    setSessionCode(code);
    setView("enter");
  }

  function joinSession() {
    const code = joinCode.trim().toLowerCase();
    if (sessions[code]) {
      setCurrentSession(sessions[code]);
      setSessionCode(code);
      setView("enter");
      setLoadError("");
    } else {
      setLoadError("We couldn't find that session. Double-check the code.");
    }
  }

  function submitAvailability() {
    if (!participantName.trim()) return;
    const participant = {
      name: participantName.trim(),
      slots: Array.from(selectedSlots),
      color: participantColors[(currentSession.participants.length) % participantColors.length],
    };
    const updated = {
      ...currentSession,
      participants: [...currentSession.participants, participant],
    };
    setSessions(prev => ({ ...prev, [sessionCode]: updated }));
    setCurrentSession(updated);
    setActiveParticipant(participant);
    setView("results");
  }

  // Grid interaction
  const handleSlotMouseDown = useCallback((key) => {
    const next = !selectedSlots.has(key);
    setDragMode(next ? "add" : "remove");
    setIsDragging(true);
    setSelectedSlots(prev => {
      const s = new Set(prev);
      next ? s.add(key) : s.delete(key);
      return s;
    });
  }, [selectedSlots]);

  const handleSlotMouseEnter = useCallback((key) => {
    if (!isDragging) return;
    setSelectedSlots(prev => {
      const s = new Set(prev);
      dragMode === "add" ? s.add(key) : s.delete(key);
      return s;
    });
  }, [isDragging, dragMode]);

  useEffect(() => {
    const up = () => setIsDragging(false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  // Compute overlap data for results
  function getOverlapData() {
    if (!currentSession) return {};
    const map = {};
    currentSession.participants.forEach(p => {
      p.slots.forEach(slot => {
        if (!map[slot]) map[slot] = [];
        map[slot].push(p);
      });
    });
    return map;
  }

  function getBestTimes() {
    const overlap = getOverlapData();
    const total = currentSession?.participants.length || 0;
    if (total === 0) return [];
    const sorted = Object.entries(overlap)
      .sort((a, b) => b[1].length - a[1].length)
      .filter(([, ps]) => ps.length > 1);
    return sorted.slice(0, 5);
  }

  function copyCode() {
    navigator.clipboard.writeText(sessionCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const overlap = getOverlapData();
  const maxOverlap = Math.max(...Object.values(overlap).map(p => p.length), 1);
  const totalParticipants = currentSession?.participants.length || 0;

  // ─── Styles ────────────────────────────────────────────────────────
  const styles = {
    app: {
      fontFamily: "'Nunito Sans', 'Segoe UI', sans-serif",
      background: COLORS.light,
      minHeight: "100vh",
      color: COLORS.dark,
      userSelect: "none",
    },
    header: {
      padding: "14px 28px",
      background: COLORS.primary,
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    logo: {
      fontFamily: "'Nunito Sans', sans-serif",
      fontSize: "22px",
      fontWeight: "800",
      letterSpacing: "-0.3px",
      color: COLORS.white,
    },
    logoAccent: { color: "#7DD3F7" },
    tagline: {
      fontSize: "12px",
      color: "rgba(255,255,255,0.7)",
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    },
    card: {
      background: COLORS.white,
      borderRadius: "12px",
      border: `1px solid ${COLORS.border}`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      padding: "28px",
    },
    btn: (bg = COLORS.primary, fg = "white") => ({
      background: bg,
      color: fg,
      border: "none",
      borderRadius: "8px",
      padding: "11px 22px",
      fontSize: "14px",
      fontWeight: "700",
      cursor: "pointer",
      transition: "background 0.15s, transform 0.1s",
      fontFamily: "inherit",
      letterSpacing: "0.01em",
    }),
    input: {
      width: "100%",
      border: `1.5px solid ${COLORS.border}`,
      borderRadius: "8px",
      padding: "11px 16px",
      fontSize: "15px",
      fontFamily: "inherit",
      background: COLORS.white,
      outline: "none",
      boxSizing: "border-box",
      color: COLORS.dark,
    },
    label: {
      fontSize: "12px",
      fontWeight: "700",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      marginBottom: "6px",
      display: "block",
      color: COLORS.muted,
    },
    sectionTitle: {
      fontFamily: "'Nunito Sans', sans-serif",
      fontSize: "26px",
      fontWeight: "800",
      marginBottom: "8px",
      color: COLORS.dark,
    },
    chip: (color) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      background: color + "18",
      border: `1px solid ${color}44`,
      borderRadius: "20px",
      padding: "4px 12px",
      fontSize: "12px",
      fontWeight: "700",
      color: color,
      letterSpacing: "0.02em",
    }),
  };

  // ─── Views ──────────────────────────────────────────────────────────

  if (view === "home") return (
    <div style={styles.app}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={styles.header}>
        <div>
          <div style={styles.logo}>Day<span style={styles.logoAccent}>Balancer</span></div>
          <div style={styles.tagline}>Find a time · Together</div>
        </div>
      </div>
      <div style={{ maxWidth: "520px", margin: "64px auto", padding: "0 24px" }}>
        <div style={{ marginBottom: "48px" }}>
          <h1 style={{ ...styles.sectionTitle, fontSize: "40px", lineHeight: 1.1, marginBottom: "16px" }}>
            When works<br />for everyone?
          </h1>
          <p style={{ color: COLORS.muted, fontSize: "16px", lineHeight: 1.6 }}>
            Create a session, share the link, and let your people mark when they're free. 
            No logins, no hassle - just clarity.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <button
            style={{ ...styles.btn(COLORS.primary), width: "100%", padding: "16px", fontSize: "16px" }}
            onMouseEnter={e => {  }}
            onMouseLeave={e => {  }}
            onClick={() => setView("create")}
          >
            + Create a new session
          </button>
          <button
            style={{ ...styles.btn("white", COLORS.dark), width: "100%", padding: "16px", fontSize: "16px" }}
            onMouseEnter={e => {  }}
            onMouseLeave={e => {  }}
            onClick={() => setView("join")}
          >
            Join with a code
          </button>
        </div>
        <div style={{ marginTop: "64px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {["No sign-up needed", "Works across time zones", "See who's free at a glance"].map((t, i) => (
            <span key={t} style={styles.chip([COLORS.primary, COLORS.green, COLORS.primary][i])}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );

  if (view === "create") return (
    <div style={styles.app}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={styles.header}>
        <button onClick={() => setView("home")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px" }}>←</button>
        <div style={styles.logo}>Day<span style={styles.logoAccent}>Balancer</span></div>
      </div>
      <div style={{ maxWidth: "480px", margin: "48px auto", padding: "0 24px" }}>
        <div style={styles.card}>
          <h2 style={{ ...styles.sectionTitle, marginBottom: "24px" }}>Name your session</h2>
          <div style={{ marginBottom: "24px" }}>
            <label style={styles.label}>What are you scheduling?</label>
            <input
              style={styles.input}
              placeholder="e.g. Team check-in, Coffee chat, Sprint planning..."
              value={sessionTitle}
              onChange={e => setSessionTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createSession()}
              autoFocus
            />
          </div>
          <button
            style={{ ...styles.btn(COLORS.primary), width: "100%" }}
            onClick={createSession}
          >
            Create session →
          </button>
        </div>
      </div>
    </div>
  );

  if (view === "join") return (
    <div style={styles.app}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={styles.header}>
        <button onClick={() => setView("home")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px" }}>←</button>
        <div style={styles.logo}>Day<span style={styles.logoAccent}>Balancer</span></div>
      </div>
      <div style={{ maxWidth: "480px", margin: "48px auto", padding: "0 24px" }}>
        <div style={styles.card}>
          <h2 style={{ ...styles.sectionTitle, marginBottom: "24px" }}>Join a session</h2>
          <div style={{ marginBottom: "24px" }}>
            <label style={styles.label}>Session code</label>
            <input
              style={styles.input}
              placeholder="e.g. oak-river-247"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && joinSession()}
              autoFocus
            />
            {loadError && <p style={{ color: COLORS.teal, marginTop: "8px", fontSize: "14px" }}>{loadError}</p>}
          </div>
          <button style={{ ...styles.btn(COLORS.primary), width: "100%" }} onClick={joinSession}>
            Join →
          </button>
        </div>
      </div>
    </div>
  );

  if (view === "enter") return (
    <div style={styles.app}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={styles.header}>
        <div>
          <div style={styles.logo}>Day<span style={styles.logoAccent}>Balancer</span></div>
          <div style={styles.tagline}>{currentSession?.title}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "13px", color: COLORS.muted }}>Code:</span>
          <button
            onClick={copyCode}
            style={{ ...styles.btn(copied ? COLORS.green : "white", COLORS.dark), padding: "8px 14px", fontSize: "13px" }}
          >
            {copied ? "✓ Copied!" : sessionCode}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
        {/* Name input */}
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", marginBottom: "24px", flexWrap: "wrap" }}>
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label style={styles.label}>Your name</label>
            <input
              style={styles.input}
              placeholder="How should we call you?"
              value={participantName}
              onChange={e => setParticipantName(e.target.value)}
            />
          </div>
          <button
            style={{ ...styles.btn(COLORS.primary), whiteSpace: "nowrap" }}
            onClick={submitAvailability}
          >
            Save my availability →
          </button>
          {currentSession?.participants.length > 0 && (
            <button
              style={{ ...styles.btn("white", COLORS.dark), whiteSpace: "nowrap" }}
              onClick={() => setView("results")}
            >
              View results
            </button>
          )}
        </div>

        <p style={{ color: COLORS.muted, fontSize: "14px", marginBottom: "16px" }}>
          Click and drag to mark when you're free. Green = available.
        </p>

        {/* Grid */}
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: `56px repeat(7, 1fr)`, gap: "2px", minWidth: "600px" }}>
            {/* Header row */}
            <div />
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: "center", fontWeight: "600", fontSize: "13px", padding: "8px 0", letterSpacing: "0.04em" }}>{d}</div>
            ))}
            {/* Time rows */}
            {HOURS.map(h => (
              <>
                <div key={`h-${h}`} style={{ fontSize: "11px", color: COLORS.muted, textAlign: "right", paddingRight: "8px", paddingTop: "4px", lineHeight: "28px" }}>
                  {formatHour(h)}
                </div>
                {DAYS.map((d, di) => {
                  const key = slotKey(d, h);
                  const isSelected = selectedSlots.has(key);
                  return (
                    <div
                      key={key}
                      onMouseDown={() => handleSlotMouseDown(key)}
                      onMouseEnter={() => handleSlotMouseEnter(key)}
                      style={{
                        height: "28px",
                        borderRadius: "4px",
                        background: isSelected ? COLORS.green : "#EEF2F6",
                        border: isSelected ? `1.5px solid ${COLORS.primaryDark}` : "1.5px solid transparent",
                        cursor: "pointer",
                        transition: "background 0.1s",
                        position: "relative",
                      }}
                    />
                  );
                })}
              </>
            ))}
          </div>
        </div>

        {/* Already responded */}
        {currentSession?.participants.length > 0 && (
          <div style={{ marginTop: "24px" }}>
            <label style={styles.label}>Already responded</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {currentSession.participants.map(p => (
                <span key={p.name} style={styles.chip(p.color)}><span style={{ width: "8px", height: "8px", borderRadius: "50%", background: p.color, display: "inline-block" }} />{p.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (view === "results") {
    const bestTimes = getBestTimes();
    return (
      <div style={styles.app}>
        <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <div style={styles.header}>
          <div>
            <div style={styles.logo}>Day<span style={styles.logoAccent}>Balancer</span></div>
            <div style={styles.tagline}>{currentSession?.title}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <button style={{ ...styles.btn("white", COLORS.dark), padding: "8px 14px", fontSize: "13px" }} onClick={copyCode}>
              {copied ? "✓ Copied!" : `Share: ${sessionCode}`}
            </button>
            <button style={{ ...styles.btn(COLORS.primary), padding: "8px 14px", fontSize: "13px" }} onClick={() => { setSelectedSlots(new Set()); setParticipantName(""); setView("enter"); }}>
              + Add my availability
            </button>
          </div>
        </div>

        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "24px", display: "grid", gridTemplateColumns: "1fr 280px", gap: "24px" }}>
          {/* Main grid */}
          <div>
            <h2 style={{ ...styles.sectionTitle, marginBottom: "4px" }}>Availability overview</h2>
            <p style={{ color: COLORS.muted, fontSize: "14px", marginBottom: "20px" }}>
              {totalParticipants} {totalParticipants === 1 ? "person has" : "people have"} responded. Darker = more people free.
            </p>
            <div style={{ overflowX: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: `56px repeat(7, 1fr)`, gap: "2px", minWidth: "560px" }}>
                <div />
                {DAYS.map(d => (
                  <div key={d} style={{ textAlign: "center", fontWeight: "600", fontSize: "13px", padding: "8px 0" }}>{d}</div>
                ))}
                {HOURS.map(h => (
                  <>
                    <div key={`rh-${h}`} style={{ fontSize: "11px", color: COLORS.muted, textAlign: "right", paddingRight: "8px", paddingTop: "4px", lineHeight: "28px" }}>{formatHour(h)}</div>
                    {DAYS.map((d) => {
                      const key = slotKey(d, h);
                      const ps = overlap[key] || [];
                      const ratio = ps.length / Math.max(totalParticipants, 1);
                      const bg = ps.length === 0 ? "#EEEEEE"
                        : ratio === 1 ? COLORS.primary
                        : ratio >= 0.66 ? COLORS.primary
                        : ratio >= 0.33 ? COLORS.green
                        : "#C8E6C9";
                      return (
                        <div
                          key={key}
                          title={ps.length > 0 ? ps.map(p => p.name).join(", ") : "No one free"}
                          style={{
                            height: "28px",
                            borderRadius: "4px",
                            background: bg,
                            border: ps.length > 0 ? `1.5px solid ${COLORS.dark}33` : "1.5px solid transparent",
                            cursor: ps.length > 0 ? "pointer" : "default",
                            position: "relative",
                          }}
                        />
                      );
                    })}
                  </>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
              {[
                { color: "#EEF2F6", label: "No one" },
                { color: "#B8DEB8", label: "Some" },
                { color: COLORS.green, label: "Many" },
                { color: COLORS.primary, label: "Most" },
                { color: COLORS.primary, label: "Everyone" },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: COLORS.muted }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "3px", background: color, border: "1.5px solid COLORS.dark33" }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Best times */}
            <div style={styles.card}>
              <h3 style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: "18px", marginBottom: "16px" }}>
                Best times
              </h3>
              {bestTimes.length === 0 ? (
                <p style={{ color: COLORS.muted, fontSize: "14px" }}>Add more people to find overlaps.</p>
              ) : (
                bestTimes.map(([key, ps]) => {
                  const [day, hour] = key.split("-");
                  return (
                    <div key={key} style={{ marginBottom: "12px", padding: "10px 12px", background: COLORS.light, borderRadius: "8px", border: `1.5px solid ${COLORS.dark}22` }}>
                      <div style={{ fontWeight: "600", fontSize: "14px" }}>{day} · {formatHour(parseInt(hour))}</div>
                      <div style={{ fontSize: "12px", color: COLORS.muted, marginTop: "2px" }}>
                        {ps.map(p => p.name).join(", ")} ({ps.length}/{totalParticipants})
                      </div>
                      <div style={{ marginTop: "6px", height: "4px", borderRadius: "2px", background: "#EEF2F6", overflow: "hidden" }}>
                        <div style={{ width: `${(ps.length / totalParticipants) * 100}%`, height: "100%", background: ps.length === totalParticipants ? COLORS.primary : COLORS.green, borderRadius: "2px" }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Participants */}
            <div style={styles.card}>
              <h3 style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: "18px", marginBottom: "16px" }}>
                Who's responded
              </h3>
              {currentSession?.participants.map(p => (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                  <span style={{ fontSize: "14px", fontWeight: "500" }}>{p.name}</span>
                  <span style={{ fontSize: "12px", color: COLORS.muted, marginLeft: "auto" }}>{p.slots.length} slots</span>
                </div>
              ))}
              {totalParticipants === 0 && <p style={{ color: COLORS.muted, fontSize: "14px" }}>No responses yet.</p>}
            </div>

            {/* Share */}
            <div style={{ ...styles.card, background: COLORS.primary, border: "none" }}>
              <p style={{ color: "white", fontSize: "14px", marginBottom: "12px", fontWeight: "600" }}>
                Invite others to share their availability
              </p>
              <div style={{ background: "white", borderRadius: "8px", padding: "10px 14px", fontSize: "16px", fontWeight: "700", letterSpacing: "0.05em", textAlign: "center", marginBottom: "10px" }}>
                {sessionCode}
              </div>
              <button
                style={{ ...styles.btn("white", COLORS.dark), width: "100%", fontSize: "13px" }}
                onClick={copyCode}
              >
                {copied ? "✓ Copied to clipboard" : "Copy session code"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
