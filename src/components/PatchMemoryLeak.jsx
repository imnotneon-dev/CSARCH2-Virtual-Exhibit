import { useState, useEffect, useRef } from "react";

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

export default function PatchMemoryLeak() {
  const [systems, setSystems] = useState(freshSystems);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [gameOver, setGameOver] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [blockedMessage, setBlockedMessage] = useState("");
  const [started, setStarted] = useState(false);
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
    setOutcome(getOutcome(systemsRef.current));
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

  return (
    <section className="patch-game">
      <div className="game-frame">
        {!started ? (
          <div className="briefing">
            <header>
              <strong>Incident Response Console - Jan 3, 2018</strong>
              <span className="watch">Standby</span>
            </header>

            <div className="briefing-body">
              <p className="eyebrow">Mission Briefing</p>
              <h3 className="briefing-title">Patch the Memory Leak</h3>
              <p className="briefing-lede">
                You're a cybersecurity engineer on January 3, 2018 - the day Spectre and Meltdown went
                public. Five systems are exposed to speculative-execution side-channel attacks. Secure as
                many as you can before the window closes.
              </p>

              <div className="brief-grid">
                <div className="brief-block">
                  <span className="brief-block-label">How To Play</span>
                  <ol className="brief-steps">
                    <li>You have <strong>{MAX_CONCURRENT} engineers</strong> and <strong>{TOTAL_TIME} seconds</strong> - only {MAX_CONCURRENT} systems can be worked on at once.</li>
                    <li>Pick an action for each vulnerable system. Every action costs time, shown on its button.</li>
                    <li>The right patch fully secures a system. The wrong one wastes the time and leaves it exposed.</li>
                    <li>Monitoring is faster but only ever partial - it never fully secures a system.</li>
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
                      <span>Quick partial coverage - reduces exposure without fully patching.</span>
                    </li>
                    <li>
                      <strong>Ignore Risk</strong>
                      <span>Costs almost no time, but leaves the system fully exposed.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <p className="briefing-hint">
                No two systems share the exact same fix. Match the patch to the vulnerability - guessing
                wrong burns your window just as fast as guessing right.
              </p>

              <button className="start-btn" onClick={startGame}>
                Start Incident Response
              </button>
            </div>
          </div>
        ) : (
        <>
        <header>
          <strong>Incident Response Console - Jan 3, 2018</strong>
          <span className={timeLeft < 20 ? "alert" : "watch"}>
            {gameOver ? (outcome?.label ?? "Done") : `${mm}:${ss} remaining`}
          </span>
        </header>

        <div className="status-bar">
          <div className="stat">
            Secured: <span style={{ color: "var(--green)" }}>{securedCount} / {systems.length}</span>
          </div>
          <div className="stat">
            Time: <span style={{ color: timeLeft < 20 ? "var(--red)" : "var(--amber)" }}>{mm}:{ss}</span>
          </div>
          <div className="stat">
            Engineers: <span style={{ color: activeEngineers >= MAX_CONCURRENT ? "var(--red)" : "var(--amber)" }}>
              {activeEngineers} / {MAX_CONCURRENT} active
            </span>
          </div>
          <div className="stat">
            Critical: <span style={{ color: "var(--red)" }}>
              {systems.filter((s) => s.riskLevel >= 4 && s.status === "secured").length} / {systems.filter((s) => s.riskLevel >= 4).length} patched
            </span>
          </div>
        </div>

        {blockedMessage && <div className="blocked-banner">{blockedMessage}</div>}

        <div className="systems-list">
          {systems.map((sys) => {
            const meta = STATUS_META[sys.status];
            const locked = gameOver || sys.status === "secured" || sys.status === "busy";
            const capacityFull = busyCount(systems) >= MAX_CONCURRENT;

            return (
              <div key={sys.id} className={`system-row status-${sys.status}`}>
                <div className="row-info">
                  <div className="row-top">
                    <span className={`chip ${meta.chip}`}>
                      {sys.status === "busy"
                        ? `Working: ${ACTIONS.find((a) => a.id === sys.activeAction)?.short ?? ""}`
                        : meta.label}
                    </span>
                    <span className={`risk-tag ${getRiskClass(sys.risk)}`}>{sys.risk} Risk</span>
                  </div>
                  <div className="sys-name">{sys.name}</div>
                  <div className="sys-desc">{sys.description}</div>

                  {sys.status === "busy" && (
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${sys.progress}%` }} />
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
                      title={`${action.label} - ${getActionTime(sys, action.id)}s`}
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
            <div className="outcome-label" style={{ color: outcome.color }}>{outcome.label}</div>
            <div className="outcome-detail">{outcome.detail}</div>
            <button className="reset-btn" onClick={reset}>Try Again</button>
          </div>
        )}

        <footer>
          <span>
            Only {MAX_CONCURRENT} engineers are available at once, and every action - even ignoring a
            system - takes time. Choose the right patch for each system: the wrong one wastes your window,
            monitoring only partially covers the risk, and ignoring a critical system invites a major incident.
          </span>
        </footer>
        </>
        )}
      </div>

      <style>{`
        .patch-game {
          --green: #25f39a;
          --red: #ff3c55;
          --amber: #f6b73c;
          --cyan: #54c7ff;
          --panel: #101723;
          --line: #243348;
          --text: #f4f7fb;
          --muted: #8ba0ba;
          color: var(--text);
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          margin: 0 auto;
        }
        .patch-game *, .patch-game *::before, .patch-game *::after {
          box-sizing: border-box;
        }

        .game-frame {
          background: linear-gradient(180deg, #121a28, #0b111a);
          border: 1px solid var(--line);
          box-shadow: 0 24px 80px rgba(0,0,0,0.35);
          overflow: hidden;
        }

        .game-frame header, .game-frame footer {
          align-items: center;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 22px;
          border-bottom: 1px solid var(--line);
          font-family: "Courier New", monospace;
          font-size: 0.76rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .game-frame header strong {
          overflow-wrap: break-word;
        }

        .game-frame footer {
          border-bottom: 0;
          border-top: 1px solid var(--line);
          color: var(--muted);
          font-size: 0.72rem;
          text-transform: none;
          letter-spacing: 0;
          line-height: 1.6;
        }

        .safe { color: var(--green); }
        .watch { color: var(--amber); }
        .alert { color: var(--red); }

        .status-bar {
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
          padding: 12px 22px;
          border-bottom: 1px solid var(--line);
        }

        .stat {
          font-family: "Courier New", monospace;
          font-size: 0.7rem;
          color: var(--muted);
        }

        .blocked-banner {
          background: rgba(255, 60, 85, 0.1);
          border-bottom: 1px solid var(--line);
          color: var(--red);
          font-family: "Courier New", monospace;
          font-size: 0.72rem;
          letter-spacing: 0.04em;
          padding: 10px 22px;
          text-transform: uppercase;
        }

        /* ── SYSTEMS LIST ── */
        .systems-list {
          display: flex;
          flex-direction: column;
        }

        .system-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 210px;
          gap: 1.5rem;
          align-items: center;
          padding: 1.25rem 22px;
          border-bottom: 1px solid var(--line);
          transition: background 0.2s;
          min-width: 0;
        }

        .system-row:last-child { border-bottom: none; }
        .system-row.status-secured { background: rgba(37,243,154,0.04); }
        .system-row.status-busy { background: rgba(246,183,60,0.04); }
        .system-row.status-monitored { background: rgba(84,199,255,0.04); }
        .system-row.status-wasted { background: rgba(255,60,85,0.03); }
        .system-row.status-ignored { background: rgba(255,60,85,0.05); }

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
          font-family: "Courier New", monospace;
          font-size: 0.58rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 2px 7px;
          white-space: nowrap;
        }

        .chip-vulnerable { background: rgba(255,60,85,0.18); color: var(--red); }
        .chip-busy { background: rgba(246,183,60,0.18); color: var(--amber); }
        .chip-secured { background: rgba(37,243,154,0.12); color: var(--green); }
        .chip-monitored { background: rgba(84,199,255,0.16); color: var(--cyan); }
        .chip-wasted { background: rgba(255,60,85,0.14); color: var(--red); }
        .chip-ignored { background: rgba(139,160,186,0.16); color: var(--muted); }

        .risk-tag {
          font-family: "Courier New", monospace;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .risk-critical { color: var(--red); }
        .risk-high { color: var(--amber); }
        .risk-medium { color: #8edfff; }

        .sys-name {
          font-size: 0.95rem;
          font-weight: 600;
          line-height: 1.3;
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
        }

        .progress-fill {
          height: 100%;
          background: var(--amber);
          transition: width 0.15s;
        }

        .progress-label {
          position: absolute;
          right: 4px;
          top: -14px;
          font-family: "Courier New", monospace;
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
          font-family: "Courier New", monospace;
          font-size: 0.58rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          padding: 6px 7px;
          border: 1px solid var(--line);
          background: rgba(0,0,0,0.25);
          color: var(--text);
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          overflow: hidden;
        }

        .action-btn span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }

        .action-btn em {
          flex-shrink: 0;
        }

        .action-btn em {
          font-style: normal;
          color: var(--muted);
          font-size: 0.56rem;
        }

        .action-btn:hover:not(:disabled) { border-color: var(--green); color: var(--green); }
        .action-btn:hover:not(:disabled) em { color: var(--green); }
        .action-btn.action-ignore:hover:not(:disabled) { border-color: var(--red); color: var(--red); }
        .action-btn.action-ignore:hover:not(:disabled) em { color: var(--red); }
        .action-btn:disabled { opacity: 0.35; cursor: default; }

        .outcome-banner {
          padding: 2rem 22px;
          border-bottom: 1px solid var(--line);
          display: grid;
          gap: 10px;
        }

        .outcome-label {
          font-family: "Courier New", monospace;
          font-size: 1.3rem;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .outcome-detail {
          color: var(--muted);
          font-size: 0.9rem;
          line-height: 1.6;
        }

        .reset-btn {
          font-family: "Courier New", monospace;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border: 1px solid var(--line);
          background: transparent;
          color: var(--muted);
          padding: 8px 20px;
          cursor: pointer;
          width: fit-content;
          transition: all 0.2s;
        }

        .reset-btn:hover { border-color: var(--green); color: var(--green); }

        /* ── BRIEFING SCREEN ── */
        .briefing-body {
          padding: 26px 22px 30px;
        }

        .briefing .eyebrow {
          color: var(--green);
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          margin: 0 0 8px;
          text-transform: uppercase;
        }

        .briefing-title {
          font-size: clamp(1.3rem, 3vw, 1.7rem);
          font-weight: 700;
          margin: 0 0 14px;
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
          font-family: "Courier New", ui-monospace, monospace;
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
          border: 1px solid rgba(139, 160, 186, 0.18);
          display: grid;
          gap: 4px;
          padding: 10px 12px;
        }

        .brief-actions strong {
          color: var(--text);
          font-family: "Courier New", ui-monospace, monospace;
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
          background: rgba(246, 183, 60, 0.07);
          border-left: 2px solid var(--amber);
          color: #dbe7f5;
          font-size: 0.84rem;
          line-height: 1.6;
          margin: 0 0 26px;
          padding: 12px 16px;
        }

        .start-btn {
          background: var(--green);
          border: 1px solid var(--green);
          color: #070b10;
          cursor: pointer;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          padding: 13px 26px;
          text-transform: uppercase;
          transition: all 0.15s;
        }

        .start-btn:hover {
          background: transparent;
          color: var(--green);
        }

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
      `}</style>
    </section>
  );
}
