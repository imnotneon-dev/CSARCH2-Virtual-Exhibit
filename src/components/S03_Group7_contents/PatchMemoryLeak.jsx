import { useState, useEffect, useRef, useMemo } from "react";

const TOTAL_TIME = 90; // seconds - shared countdown (the "limited time")
const MAX_CONCURRENT = 2; // engineers available at once (the "limited resources")

const ACTIONS = [
  { id: "osPatch", label: "Apply OS Patch", short: "OS Patch" },
  { id: "browserUpdate", label: "Install Browser Update", short: "Browser Update" },
  { id: "kernelIsolation", label: "Enable Kernel Isolation", short: "Kernel Isolation" },
  { id: "monitoring", label: "Deploy Security Monitoring", short: "Monitor" },
  { id: "ignore", label: "Ignore Risk", short: "Ignore" },
];

const SYSTEMS = [
  {
    id: 1,
    name: "Banking Server",
    risk: "Critical",
    riskLevel: 4,
    description: "Processes financial transactions. A breach exposes account data for millions.",
    correctActions: ["osPatch", "kernelIsolation"],
    baseTime: 18,
  },
  {
    id: 2,
    name: "Cloud Database",
    risk: "Critical",
    riskLevel: 4,
    description: "Stores encrypted customer records. Speculative execution can bypass encryption.",
    correctActions: ["kernelIsolation", "osPatch"],
    baseTime: 20,
  },
  {
    id: 3,
    name: "Hospital Records",
    risk: "High",
    riskLevel: 3,
    description: "Patient data protected by HIPAA. A breach carries legal and human consequences.",
    correctActions: ["osPatch", "kernelIsolation"],
    baseTime: 14,
  },
  {
    id: 4,
    name: "Government Portal",
    risk: "High",
    riskLevel: 3,
    description: "Public-facing services with citizen data. Privileged kernel access is a vector.",
    correctActions: ["osPatch", "kernelIsolation"],
    baseTime: 16,
  },
  {
    id: 5,
    name: "Web Browser",
    risk: "Medium",
    riskLevel: 2,
    description: "JavaScript can exploit Spectre through high-resolution timers in the browser.",
    correctActions: ["browserUpdate"],
    baseTime: 10,
  },
];

function getRiskClass(risk) {
  if (risk === "Critical") return "risk-critical";
  if (risk === "High") return "risk-high";
  return "risk-medium";
}

// How long an action takes on a given system.
function getActionTime(system, actionId) {
  if (actionId === "ignore") return 3;
  if (actionId === "monitoring") return Math.round(system.baseTime * 0.5);
  return system.baseTime; // full effort whether the patch is right or wrong for this system
}

// What state the system ends up in once the action finishes.
function getActionResult(system, actionId) {
  if (actionId === "ignore") return "ignored";
  if (actionId === "monitoring") return "monitored";
  if (system.correctActions.includes(actionId)) return "secured";
  return "wasted"; // wrong patch for this system - time spent, nothing gained
}

const STATUS_META = {
  vulnerable: { chip: "chip-vulnerable", label: "Vulnerable" },
  busy: { chip: "chip-busy", label: "Working…" },
  secured: { chip: "chip-secured", label: "Secured" },
  monitored: { chip: "chip-monitored", label: "Monitored (Partial)" },
  wasted: { chip: "chip-wasted", label: "Misapplied Patch" },
  ignored: { chip: "chip-ignored", label: "Ignored" },
};

const EXPOSED_STATUSES = new Set(["vulnerable", "busy", "ignored", "wasted"]);

function getOutcome(systems) {
  const critical = systems.filter((s) => s.riskLevel >= 4);
  const criticalExposed = critical.some((s) => EXPOSED_STATUSES.has(s.status));
  const criticalSecured = critical.every((s) => s.status === "secured");
  const allFullySecured = systems.every((s) => s.status === "secured");
  const allAtLeastMitigated = systems.every(
    (s) => s.status === "secured" || s.status === "monitored"
  );

  if (criticalExposed) {
    return {
      type: "incident",
      label: "Major Security Incident",
      color: "var(--red)",
      detail:
        "One or more critical systems were left exposed. Attackers had a clear path to sensitive data.",
    };
  }

  if (criticalSecured && allFullySecured) {
    return {
      type: "secure",
      label: "Secure Infrastructure",
      color: "var(--green)",
      detail: "Every system was fully patched before the deadline. No exploitable surface remained.",
    };
  }

  if (criticalSecured && allAtLeastMitigated) {
    return {
      type: "secure",
      label: "Secure Infrastructure",
      color: "var(--green)",
      detail: "Critical systems were fully patched and the rest were at least monitored.",
    };
  }

  return {
    type: "partial",
    label: "Partial Breach",
    color: "var(--amber)",
    detail:
      "Critical systems held, but some systems were missed, misconfigured, or only partially covered.",
  };
}

function freshSystems() {
  return SYSTEMS.map((s) => ({ ...s, status: "vulnerable", activeAction: null, progress: 0 }));
}

// deterministic pseudo-random spread for the particle burst, seeded by index
function seeded(i, salt) {
  const x = Math.sin(i * 999 + salt * 7.13) * 10000;
  return x - Math.floor(x);
}

export default function PatchMemoryLeak() {
  const [systems, setSystems] = useState(freshSystems);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [gameOver, setGameOver] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [blockedMessage, setBlockedMessage] = useState("");
  const [started, setStarted] = useState(false);
  const [flash, setFlash] = useState(""); // 'secure' | 'incident' | 'partial' | ''
  const [runKey, setRunKey] = useState(0); // bumps to re-trigger entrance animations
  const timerRef = useRef(null);
  const actionTimers = useRef({});
  const systemsRef = useRef(systems);

  systemsRef.current = systems;

  useEffect(() => {
    if (!started) return undefined;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  useEffect(() => {
    return () => {
      Object.values(actionTimers.current).forEach(clearInterval);
    };
  }, []);

  function startGame() {
    setStarted(true);
  }

  function endGame() {
    setGameOver(true);
    Object.values(actionTimers.current).forEach(clearInterval);
    actionTimers.current = {};
    const result = getOutcome(systemsRef.current);
    setOutcome(result);
    setFlash(result.type);
    window.setTimeout(() => setFlash(""), 900);
  }

  function busyCount(list) {
    return list.filter((s) => s.status === "busy").length;
  }

  function startAction(systemId, actionId) {
    if (!started || gameOver) return;
    const sys = systems.find((s) => s.id === systemId);
    if (!sys || sys.status === "secured" || sys.status === "busy") return;
    if (busyCount(systems) >= MAX_CONCURRENT) {
      setBlockedMessage("All available engineers are busy. Wait for a task to finish.");
      window.setTimeout(() => setBlockedMessage(""), 2200);
      return;
    }

    setBlockedMessage("");
    setSystems((prev) =>
      prev.map((s) =>
        s.id === systemId ? { ...s, status: "busy", activeAction: actionId, progress: 0 } : s
      )
    );

    const duration = getActionTime(sys, actionId) * 1000;
    const interval = 150;
    const steps = Math.max(1, Math.round(duration / interval));
    let step = 0;

    actionTimers.current[systemId] = setInterval(() => {
      step += 1;
      const progress = Math.min(100, Math.round((step / steps) * 100));
      setSystems((prev) =>
        prev.map((s) => (s.id === systemId ? { ...s, progress } : s))
      );

      if (step >= steps) {
        clearInterval(actionTimers.current[systemId]);
        delete actionTimers.current[systemId];

        setSystems((prev) => {
          const updated = prev.map((s) =>
            s.id === systemId
              ? { ...s, status: getActionResult(sys, actionId), activeAction: null, progress: 100 }
              : s
          );
          if (updated.every((s) => s.status === "secured")) {
            // Perfect run - no need to wait out the clock.
            window.setTimeout(endGame, 0);
          }
          return updated;
        });
      }
    }, interval);
  }

  function reset() {
    clearInterval(timerRef.current);
    Object.values(actionTimers.current).forEach(clearInterval);
    actionTimers.current = {};
    setSystems(freshSystems());
    setTimeLeft(TOTAL_TIME);
    setGameOver(false);
    setOutcome(null);
    setBlockedMessage("");
    setFlash("");
    setRunKey((k) => k + 1);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const securedCount = systems.filter((s) => s.status === "secured").length;
  const activeEngineers = busyCount(systems);
  const timePct = Math.max(0, Math.min(100, (timeLeft / TOTAL_TIME) * 100));
  const timeUrgency = timeLeft <= 10 ? "critical" : timeLeft < 20 ? "warn" : "ok";

  const particles = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, i) => ({
        left: 4 + seeded(i, 1) * 92,
        delay: seeded(i, 2) * 0.35,
        drift: -60 + seeded(i, 3) * 120,
        size: 5 + seeded(i, 4) * 7,
        dur: 1.1 + seeded(i, 5) * 0.9,
      })),
    [runKey]
  );

  return (
    <section className="patch-game">
      <div className={`game-frame ${flash ? `flash-${flash}` : ""} ${timeUrgency === "critical" && started && !gameOver ? "shake" : ""}`}>
        <div className="scanlines" aria-hidden="true" />
        <div className="vignette" aria-hidden="true" />

        {!started ? (
          <div className="briefing">
            <header>
              <strong>Incident Response Console — Jan 3, 2018</strong>
              <span className="watch"><i className="live-dot" />Standby</span>
            </header>

            <div className="briefing-body">
              <p className="eyebrow reveal-item" style={{ "--d": "0s" }}><i className="eyebrow-dash" />Mission Briefing</p>
              <h3 className="briefing-title reveal-item" style={{ "--d": "0.06s" }}>Patch the Memory Leak</h3>
              <p className="briefing-lede reveal-item" style={{ "--d": "0.12s" }}>
                You're a cybersecurity engineer on January 3, 2018 — the day Spectre and Meltdown went
                public. Five systems are exposed to speculative-execution side-channel attacks. Secure as
                many as you can before the window closes.
              </p>

              <div className="brief-grid reveal-item" style={{ "--d": "0.18s" }}>
                <div className="brief-block">
                  <span className="brief-block-label">How To Play</span>
                  <ol className="brief-steps">
                    <li>You have <strong>{MAX_CONCURRENT} engineers</strong> and <strong>{TOTAL_TIME} seconds</strong> — only {MAX_CONCURRENT} systems can be worked on at once.</li>
                    <li>Pick an action for each vulnerable system. Every action costs time, shown on its button.</li>
                    <li>The right patch fully secures a system. The wrong one wastes the time and leaves it exposed.</li>
                    <li>Monitoring is faster but only ever partial — it never fully secures a system.</li>
                    <li>Ignoring a system is nearly instant, but leaves it fully vulnerable.</li>
                    <li>Keep every critical system secured to end with a Secure Infrastructure result.</li>
                  </ol>
                </div>

                <div className="brief-block">
                  <span className="brief-block-label">Your Options, Per System</span>
                  <ul className="brief-actions">
                    <li>
                      <strong>Apply OS Patch</strong>
                      <span>Correct fix for most server-side kernel vulnerabilities.</span>
                    </li>
                    <li>
                      <strong>Install Browser Update</strong>
                      <span>Correct fix for browser-based Spectre exploits.</span>
                    </li>
                    <li>
                      <strong>Enable Kernel Isolation</strong>
                      <span>Correct fix for kernel-boundary leaks on servers.</span>
                    </li>
                    <li>
                      <strong>Deploy Security Monitoring</strong>
                      <span>Quick partial coverage — reduces exposure without fully patching.</span>
                    </li>
                    <li>
                      <strong>Ignore Risk</strong>
                      <span>Costs almost no time, but leaves the system fully exposed.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <p className="briefing-hint reveal-item" style={{ "--d": "0.24s" }}>
                No two systems share the exact same fix. Match the patch to the vulnerability — guessing
                wrong burns your window just as fast as guessing right.
              </p>

              <button className="start-btn reveal-item" style={{ "--d": "0.3s" }} onClick={startGame}>
                <span>Start Incident Response</span>
              </button>
            </div>
          </div>
        ) : (
        <>
        <header>
          <strong>Incident Response Console — Jan 3, 2018</strong>
          <span className={gameOver ? "watch" : timeUrgency === "critical" ? "alert pulse-text" : timeUrgency === "warn" ? "alert" : "watch"}>
            {!gameOver && <i className={`live-dot ${timeUrgency === "critical" ? "dot-red" : ""}`} />}
            {gameOver ? (outcome?.label ?? "Done") : `${mm}:${ss} remaining`}
          </span>
        </header>

        <div className="time-rail" aria-hidden="true">
          <div className={`time-rail-fill urgency-${timeUrgency}`} style={{ width: `${timePct}%` }} />
        </div>

        <div className="status-bar">
          <div className="stat">
            Secured: <span className="stat-value" style={{ color: "var(--green)" }}>{securedCount} / {systems.length}</span>
          </div>
          <div className="stat">
            Time: <span className="stat-value" style={{ color: timeLeft < 20 ? "var(--red)" : "var(--amber)" }}>{mm}:{ss}</span>
          </div>
          <div className="stat engineers-stat">
            Engineers:
            <span className="engineer-slots">
              {Array.from({ length: MAX_CONCURRENT }).map((_, i) => (
                <i key={i} className={`engineer-dot ${i < activeEngineers ? "engineer-busy" : "engineer-idle"}`} />
              ))}
            </span>
          </div>
          <div className="stat">
            Critical: <span className="stat-value" style={{ color: "var(--red)" }}>
              {systems.filter((s) => s.riskLevel >= 4 && s.status === "secured").length} / {systems.filter((s) => s.riskLevel >= 4).length} patched
            </span>
          </div>
        </div>

        {blockedMessage && <div className="blocked-banner">{blockedMessage}</div>}

        <div className="systems-list">
          {systems.map((sys, idx) => {
            const meta = STATUS_META[sys.status];
            const locked = gameOver || sys.status === "secured" || sys.status === "busy";
            const capacityFull = busyCount(systems) >= MAX_CONCURRENT;

            return (
              <div
                key={`${runKey}-${sys.id}`}
                className={`system-row status-${sys.status}`}
                style={{ "--row-delay": `${idx * 0.06}s` }}
              >
                <div className="row-info">
                  <div className="row-top">
                    <span className={`chip ${meta.chip}`} key={sys.status}>
                      {sys.status === "busy"
                        ? `Working: ${ACTIONS.find((a) => a.id === sys.activeAction)?.short ?? ""}`
                        : meta.label}
                    </span>
                    <span className={`risk-tag ${getRiskClass(sys.risk)}`}>
                      {sys.riskLevel >= 4 && <i className="risk-dot" />}
                      {sys.risk} Risk
                    </span>
                  </div>
                  <div className="sys-name">{sys.name}</div>
                  <div className="sys-desc">{sys.description}</div>

                  {sys.status === "busy" && (
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${sys.progress}%` }}>
                        <span className="progress-shimmer" />
                      </div>
                      <span className="progress-label">{sys.progress}%</span>
                    </div>
                  )}
                </div>

                <div className="row-actions">
                  {ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      className={`action-btn action-${action.id}`}
                      onClick={() => startAction(sys.id, action.id)}
                      disabled={locked || (capacityFull && sys.status !== "busy")}
                      title={`${action.label} — ${getActionTime(sys, action.id)}s`}
                    >
                      <span>{action.short}</span>
                      <em>{getActionTime(sys, action.id)}s</em>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {gameOver && outcome && (
          <div className={`outcome-banner ${outcome.type}`}>
            {outcome.type === "secure" && (
              <div className="particles" aria-hidden="true">
                {particles.map((p, i) => (
                  <span
                    key={i}
                    className="particle"
                    style={{
                      left: `${p.left}%`,
                      "--drift": `${p.drift}px`,
                      "--size": `${p.size}px`,
                      "--dur": `${p.dur}s`,
                      animationDelay: `${p.delay}s`,
                    }}
                  />
                ))}
              </div>
            )}
            <div className="outcome-label" style={{ color: outcome.color }}>{outcome.label}</div>
            <div className="outcome-detail">{outcome.detail}</div>
            <button className="reset-btn" onClick={reset}>Try Again</button>
          </div>
        )}

        <footer>
          <span>
            Only {MAX_CONCURRENT} engineers are available at once, and every action — even ignoring a
            system — takes time. Choose the right patch for each system: the wrong one wastes your window,
            monitoring only partially covers the risk, and ignoring a critical system invites a major incident.
          </span>
        </footer>
        </>
        )}
      </div>

      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500&display=swap');

        .patch-game {
          --green: #00ff9d;
          --green-dim: #00b374;
          --red: #ff3c55;
          --amber: #ffb627;
          --cyan: #54c7ff;
          --panel: #0d131c;
          --card: #121a26;
          --line: rgba(0,255,157,0.14);
          --line-soft: rgba(255,255,255,0.06);
          --text: #eef4fa;
          --muted: #7c8ba3;
          --font-display: 'Space Grotesk', ui-sans-serif, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, monospace;
          --font-body: 'Inter', ui-sans-serif, sans-serif;
          color: var(--text);
          font-family: var(--font-body);
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          margin: 0 auto;
        }
        .patch-game *, .patch-game *::before, .patch-game *::after {
          box-sizing: border-box;
        }

        .game-frame {
          position: relative;
          background:
            radial-gradient(1200px 400px at 10% -10%, rgba(0,255,157,0.05), transparent 60%),
            radial-gradient(900px 400px at 100% 0%, rgba(255,60,85,0.05), transparent 55%),
            linear-gradient(180deg, #0f1620, #080c12);
          border: 1px solid var(--line);
          box-shadow: 0 24px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.03);
          overflow: hidden;
          transition: box-shadow 0.4s ease;
        }

        .scanlines {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 3;
          background: repeating-linear-gradient(
            to bottom,
            rgba(255,255,255,0) 0px,
            rgba(255,255,255,0) 2px,
            rgba(0,0,0,0.06) 3px,
            rgba(0,0,0,0.06) 3px
          );
          mix-blend-mode: overlay;
          opacity: 0.5;
        }

        .vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 3;
          box-shadow: inset 0 0 140px rgba(0,0,0,0.55);
        }

        .game-frame.flash-secure::after,
        .game-frame.flash-incident::after,
        .game-frame.flash-partial::after {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 4;
          pointer-events: none;
          animation: screenFlash 0.9s ease-out forwards;
        }
        .game-frame.flash-secure::after { background: var(--green); }
        .game-frame.flash-incident::after { background: var(--red); }
        .game-frame.flash-partial::after { background: var(--amber); }
        @keyframes screenFlash {
          0% { opacity: 0.28; }
          100% { opacity: 0; }
        }

        .game-frame.shake {
          animation: consoleShake 0.5s ease-in-out infinite;
        }
        @keyframes consoleShake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(1px, -1px); }
          50% { transform: translate(-1px, 1px); }
          75% { transform: translate(1px, 1px); }
        }

        .game-frame header, .game-frame footer {
          position: relative;
          z-index: 2;
          align-items: center;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 22px;
          border-bottom: 1px solid var(--line-soft);
          font-family: var(--font-mono);
          font-size: 0.76rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .game-frame header strong {
          overflow-wrap: break-word;
          font-weight: 500;
        }

        .game-frame footer {
          border-bottom: 0;
          border-top: 1px solid var(--line-soft);
          color: var(--muted);
          font-size: 0.72rem;
          text-transform: none;
          letter-spacing: 0;
          line-height: 1.6;
          font-family: var(--font-body);
        }

        .live-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--green);
          margin-right: 8px;
          box-shadow: 0 0 0 0 rgba(0,255,157,0.5);
          animation: livePulse 2s ease-out infinite;
          vertical-align: middle;
        }
        .live-dot.dot-red {
          background: var(--red);
          animation: livePulseRed 0.9s ease-out infinite;
        }
        @keyframes livePulse {
          0% { box-shadow: 0 0 0 0 rgba(0,255,157,0.45); }
          70% { box-shadow: 0 0 0 7px rgba(0,255,157,0); }
          100% { box-shadow: 0 0 0 0 rgba(0,255,157,0); }
        }
        @keyframes livePulseRed {
          0% { box-shadow: 0 0 0 0 rgba(255,60,85,0.55); }
          70% { box-shadow: 0 0 0 8px rgba(255,60,85,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,60,85,0); }
        }

        .safe { color: var(--green); }
        .watch { color: var(--amber); display: flex; align-items: center; }
        .alert { color: var(--red); display: flex; align-items: center; }
        .pulse-text { animation: textPulse 0.6s ease-in-out infinite; }
        @keyframes textPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }

        .time-rail {
          position: relative;
          z-index: 2;
          height: 3px;
          width: 100%;
          background: rgba(255,255,255,0.05);
          overflow: hidden;
        }
        .time-rail-fill {
          height: 100%;
          transition: width 1s linear, background-color 0.6s ease;
        }
        .time-rail-fill.urgency-ok { background: var(--green-dim); }
        .time-rail-fill.urgency-warn { background: var(--amber); }
        .time-rail-fill.urgency-critical {
          background: var(--red);
          animation: railPulse 0.6s ease-in-out infinite;
        }
        @keyframes railPulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.6); }
        }

        .status-bar {
          position: relative;
          z-index: 2;
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
          padding: 12px 22px;
          border-bottom: 1px solid var(--line-soft);
        }

        .stat {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .stat-value {
          transition: color 0.3s ease;
        }

        .engineer-slots {
          display: inline-flex;
          gap: 5px;
        }
        .engineer-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          transition: background 0.25s ease, box-shadow 0.25s ease;
        }
        .engineer-dot.engineer-idle {
          background: rgba(255,255,255,0.1);
          border: 1px solid var(--line-soft);
        }
        .engineer-dot.engineer-busy {
          background: var(--amber);
          box-shadow: 0 0 8px rgba(255,182,39,0.7);
          animation: enginePulse 1s ease-in-out infinite;
        }
        @keyframes enginePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.25); }
        }

        .blocked-banner {
          position: relative;
          z-index: 2;
          background: rgba(255, 60, 85, 0.1);
          border-bottom: 1px solid var(--line-soft);
          color: var(--red);
          font-family: var(--font-mono);
          font-size: 0.72rem;
          letter-spacing: 0.04em;
          padding: 10px 22px;
          text-transform: uppercase;
          animation: bannerIn 0.25s ease;
        }
        @keyframes bannerIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── SYSTEMS LIST ── */
        .systems-list {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
        }

        .system-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 210px;
          gap: 1.5rem;
          align-items: center;
          padding: 1.25rem 22px;
          border-bottom: 1px solid var(--line-soft);
          transition: background 0.3s ease, box-shadow 0.3s ease;
          min-width: 0;
          animation: rowIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-delay: var(--row-delay, 0s);
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .system-row:last-child { border-bottom: none; }
        .system-row.status-secured { background: rgba(0,255,157,0.045); box-shadow: inset 3px 0 0 var(--green-dim); }
        .system-row.status-busy { background: rgba(255,182,39,0.045); box-shadow: inset 3px 0 0 var(--amber); }
        .system-row.status-monitored { background: rgba(84,199,255,0.045); box-shadow: inset 3px 0 0 var(--cyan); }
        .system-row.status-wasted { background: rgba(255,60,85,0.035); box-shadow: inset 3px 0 0 var(--red); }
        .system-row.status-ignored { background: rgba(255,60,85,0.05); box-shadow: inset 3px 0 0 rgba(124,139,163,0.6); }
        .system-row.status-vulnerable:hover { background: rgba(255,255,255,0.02); }

        .row-info {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .row-top {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .chip {
          font-family: var(--font-mono);
          font-size: 0.58rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 2px 7px;
          white-space: nowrap;
          animation: chipPop 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes chipPop {
          from { transform: scale(0.85); opacity: 0.4; }
          to { transform: scale(1); opacity: 1; }
        }

        .chip-vulnerable { background: rgba(255,60,85,0.18); color: var(--red); }
        .chip-busy { background: rgba(255,182,39,0.18); color: var(--amber); }
        .chip-secured { background: rgba(0,255,157,0.14); color: var(--green); }
        .chip-monitored { background: rgba(84,199,255,0.16); color: var(--cyan); }
        .chip-wasted { background: rgba(255,60,85,0.14); color: var(--red); }
        .chip-ignored { background: rgba(124,139,163,0.16); color: var(--muted); }

        .risk-tag {
          font-family: var(--font-mono);
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
        }

        .risk-dot {
          display: inline-block;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--red);
          margin-right: 5px;
          animation: livePulseRed 1.4s ease-out infinite;
        }

        .risk-critical { color: var(--red); }
        .risk-high { color: var(--amber); }
        .risk-medium { color: #8edfff; }

        .sys-name {
          font-family: var(--font-display);
          font-size: 0.98rem;
          font-weight: 600;
          line-height: 1.3;
          letter-spacing: -0.01em;
        }

        .sys-desc {
          font-size: 0.8rem;
          color: var(--muted);
          line-height: 1.55;
          max-width: 60ch;
        }

        .progress-track {
          height: 6px;
          background: rgba(255,255,255,0.07);
          position: relative;
          overflow: hidden;
          margin-top: 6px;
          border-radius: 3px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--green-dim), var(--amber));
          transition: width 0.15s linear;
          position: relative;
          overflow: hidden;
          border-radius: 3px;
        }

        .progress-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            100deg,
            transparent 20%,
            rgba(255,255,255,0.35) 50%,
            transparent 80%
          );
          background-size: 200% 100%;
          animation: shimmerMove 1.1s linear infinite;
        }
        @keyframes shimmerMove {
          from { background-position: 150% 0; }
          to { background-position: -50% 0; }
        }

        .progress-label {
          position: absolute;
          right: 4px;
          top: -14px;
          font-family: var(--font-mono);
          font-size: 0.6rem;
          color: var(--amber);
        }

        .row-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
          min-width: 0;
          width: 100%;
          justify-self: start;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          min-width: 0;
          width: 100%;
          font-family: var(--font-mono);
          font-size: 0.58rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          padding: 6px 7px;
          border: 1px solid var(--line-soft);
          background: rgba(0,0,0,0.25);
          color: var(--text);
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease, color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
          white-space: nowrap;
          overflow: hidden;
          position: relative;
        }

        .action-btn span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }

        .action-btn em {
          flex-shrink: 0;
          font-style: normal;
          color: var(--muted);
          font-size: 0.56rem;
          transition: color 0.15s ease;
        }

        .action-btn:hover:not(:disabled) {
          border-color: var(--green);
          color: var(--green);
          background: rgba(0,255,157,0.06);
          box-shadow: 0 0 0 1px rgba(0,255,157,0.15), 0 4px 14px rgba(0,255,157,0.08);
          transform: translateY(-1px);
        }
        .action-btn:hover:not(:disabled) em { color: var(--green); }
        .action-btn:active:not(:disabled) { transform: translateY(0) scale(0.97); }
        .action-btn.action-ignore:hover:not(:disabled) {
          border-color: var(--red);
          color: var(--red);
          background: rgba(255,60,85,0.06);
          box-shadow: 0 0 0 1px rgba(255,60,85,0.15), 0 4px 14px rgba(255,60,85,0.08);
        }
        .action-btn.action-ignore:hover:not(:disabled) em { color: var(--red); }
        .action-btn:disabled { opacity: 0.32; cursor: default; }
        .action-btn:focus-visible {
          outline: 1px solid var(--green);
          outline-offset: 2px;
        }

        .outcome-banner {
          position: relative;
          z-index: 2;
          padding: 2rem 22px;
          border-bottom: 1px solid var(--line-soft);
          display: grid;
          gap: 10px;
          overflow: hidden;
          animation: outcomeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes outcomeIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .particle {
          position: absolute;
          top: -10px;
          width: var(--size);
          height: var(--size);
          background: var(--green);
          border-radius: 2px;
          opacity: 0;
          animation: fall var(--dur) ease-in forwards;
        }
        .particle:nth-child(3n) { background: var(--cyan); border-radius: 50%; }
        .particle:nth-child(5n) { background: var(--amber); }
        @keyframes fall {
          0% { opacity: 0; transform: translate(0, -10px) rotate(0deg); }
          10% { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--drift), 220px) rotate(240deg); }
        }

        .outcome-label {
          font-family: var(--font-display);
          font-size: 1.35rem;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .outcome-detail {
          color: var(--muted);
          font-size: 0.9rem;
          line-height: 1.6;
        }

        .reset-btn {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border: 1px solid var(--line-soft);
          background: transparent;
          color: var(--muted);
          padding: 8px 20px;
          cursor: pointer;
          width: fit-content;
          transition: all 0.2s ease;
        }

        .reset-btn:hover { border-color: var(--green); color: var(--green); box-shadow: 0 0 16px rgba(0,255,157,0.15); }
        .reset-btn:focus-visible { outline: 1px solid var(--green); outline-offset: 2px; }

        /* ── BRIEFING SCREEN ── */
        .briefing-body {
          position: relative;
          z-index: 2;
          padding: 26px 22px 30px;
        }

        .reveal-item {
          animation: revealUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-delay: var(--d, 0s);
        }
        @keyframes revealUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .briefing .eyebrow {
          color: var(--green);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          margin: 0 0 8px;
          text-transform: uppercase;
          display: flex;
          align-items: center;
        }
        .eyebrow-dash {
          display: inline-block;
          width: 20px;
          height: 1px;
          background: var(--green);
          margin-right: 10px;
        }

        .briefing-title {
          font-family: var(--font-display);
          font-size: clamp(1.3rem, 3vw, 1.7rem);
          font-weight: 700;
          margin: 0 0 14px;
          letter-spacing: -0.01em;
        }

        .briefing-lede {
          color: var(--muted);
          font-size: 0.92rem;
          line-height: 1.7;
          margin: 0 0 26px;
          max-width: 68ch;
        }

        .brief-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .brief-block-label {
          color: var(--amber);
          display: block;
          font-family: var(--font-mono);
          font-size: 0.66rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          margin-bottom: 12px;
          text-transform: uppercase;
        }

        .brief-steps {
          display: grid;
          gap: 10px;
          margin: 0;
          padding-left: 20px;
        }

        .brief-steps li {
          color: var(--muted);
          font-size: 0.85rem;
          line-height: 1.55;
        }

        .brief-steps strong {
          color: var(--text);
        }

        .brief-actions {
          display: grid;
          gap: 10px;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .brief-actions li {
          border: 1px solid var(--line-soft);
          display: grid;
          gap: 4px;
          padding: 10px 12px;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .brief-actions li:hover {
          border-color: rgba(0,255,157,0.3);
          background: rgba(0,255,157,0.03);
        }

        .brief-actions strong {
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 0.76rem;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .brief-actions span {
          color: var(--muted);
          font-size: 0.8rem;
          line-height: 1.45;
        }

        .briefing-hint {
          background: rgba(255, 182, 39, 0.07);
          border-left: 2px solid var(--amber);
          color: #dbe7f5;
          font-size: 0.84rem;
          line-height: 1.6;
          margin: 0 0 26px;
          padding: 12px 16px;
        }

        .start-btn {
          position: relative;
          background: var(--green);
          border: 1px solid var(--green);
          color: #06110c;
          cursor: pointer;
          font-family: var(--font-mono);
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          padding: 13px 26px;
          text-transform: uppercase;
          transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
          overflow: hidden;
        }

        .start-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%);
          background-size: 250% 100%;
          background-position: 150% 0;
          transition: background-position 0.6s ease;
        }

        .start-btn:hover {
          background: transparent;
          color: var(--green);
          box-shadow: 0 0 24px rgba(0,255,157,0.25);
          transform: translateY(-1px);
        }
        .start-btn:hover::before { background-position: -50% 0; }
        .start-btn:active { transform: translateY(0) scale(0.98); }
        .start-btn:focus-visible { outline: 1px solid var(--green); outline-offset: 3px; }

        @media (max-width: 720px) {
          .brief-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .system-row {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          .row-actions {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .game-frame header, .game-frame footer, .status-bar, .system-row, .outcome-banner, .blocked-banner {
            padding-left: 16px;
            padding-right: 16px;
          }
          .status-bar { gap: 1rem; }
          .row-actions {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .patch-game *, .patch-game *::before, .patch-game *::after {
            animation: none !important;
            transition: none !important;
          }
          .scanlines, .vignette { opacity: 0.3; }
        }
      `}</style>
    </section>
  );
}