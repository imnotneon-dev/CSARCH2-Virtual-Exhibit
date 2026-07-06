import { useState, useEffect, useRef } from "react";

const SYSTEMS = [
  {
    id: 1,
    name: "Banking Server",
    risk: "Critical",
    riskLevel: 4,
    description: "Processes financial transactions. A breach exposes account data for millions.",
    actions: ["Apply OS Patch", "Enable Kernel Isolation"],
    timeRequired: 18,
  },
  {
    id: 2,
    name: "Cloud Database",
    risk: "Critical",
    riskLevel: 4,
    description: "Stores encrypted customer records. Speculative execution can bypass encryption.",
    actions: ["Kernel Isolation", "Deploy Monitoring"],
    timeRequired: 20,
  },
  {
    id: 3,
    name: "Hospital Records",
    risk: "High",
    riskLevel: 3,
    description: "Patient data protected by HIPAA. A breach carries legal and human consequences.",
    actions: ["Apply OS Patch", "Deploy Monitoring"],
    timeRequired: 14,
  },
  {
    id: 4,
    name: "Government Portal",
    risk: "High",
    riskLevel: 3,
    description: "Public-facing services with citizen data. Privileged kernel access is a vector.",
    actions: ["Apply OS Patch", "Enable Kernel Isolation"],
    timeRequired: 16,
  },
  {
    id: 5,
    name: "Web Browser",
    risk: "Medium",
    riskLevel: 2,
    description: "JavaScript can exploit Spectre through high-resolution timers in the browser.",
    actions: ["Browser Update", "Deploy Monitoring"],
    timeRequired: 10,
  },
];

const TOTAL_TIME = 90; // seconds

function getRiskClass(risk) {
  if (risk === "Critical") return "risk-critical";
  if (risk === "High") return "risk-high";
  return "risk-medium";
}

function getOutcome(systems) {
  const patched = systems.filter((s) => s.patched);
  const criticalPatched = patched.filter((s) => s.riskLevel >= 4).length;
  const totalCritical = systems.filter((s) => s.riskLevel >= 4).length;

  if (criticalPatched === totalCritical && patched.length === systems.length) {
    return { type: "secure", label: "Secure Infrastructure", color: "var(--green)" };
  }
  if (criticalPatched === totalCritical) {
    return { type: "partial", label: "Partial Breach", color: "var(--amber)" };
  }
  return { type: "incident", label: "Major Security Incident", color: "var(--red)" };
}

export default function PatchMemoryLeak() {
  const [systems, setSystems] = useState(SYSTEMS.map((s) => ({ ...s, patched: false, patching: false, progress: 0 })));
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [gameOver, setGameOver] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [selectedAction, setSelectedAction] = useState({});
  const timerRef = useRef(null);
  const patchTimers = useRef({});

  useEffect(() => {
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
  }, []);

  function endGame() {
    setGameOver(true);
    setSystems((prev) => {
      setOutcome(getOutcome(prev));
      return prev;
    });
    Object.values(patchTimers.current).forEach(clearInterval);
  }

  function startPatch(systemId) {
    if (gameOver) return;
    const sys = systems.find((s) => s.id === systemId);
    if (!sys || sys.patched || sys.patching) return;

    setSystems((prev) =>
      prev.map((s) => (s.id === systemId ? { ...s, patching: true, progress: 0 } : s))
    );

    const duration = sys.timeRequired * 1000;
    const interval = 200;
    const steps = duration / interval;
    let step = 0;

    patchTimers.current[systemId] = setInterval(() => {
      step++;
      const progress = Math.min(100, Math.round((step / steps) * 100));
      setSystems((prev) =>
        prev.map((s) => (s.id === systemId ? { ...s, progress } : s))
      );
      if (step >= steps) {
        clearInterval(patchTimers.current[systemId]);
        setSystems((prev) => {
          const updated = prev.map((s) =>
            s.id === systemId ? { ...s, patched: true, patching: false, progress: 100 } : s
          );
          if (updated.every((s) => s.patched)) endGame();
          return updated;
        });
      }
    }, interval);
  }

  function reset() {
    clearInterval(timerRef.current);
    Object.values(patchTimers.current).forEach(clearInterval);
    patchTimers.current = {};
    setSystems(SYSTEMS.map((s) => ({ ...s, patched: false, patching: false, progress: 0 })));
    setTimeLeft(TOTAL_TIME);
    setGameOver(false);
    setOutcome(null);
    setSelectedAction({});
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); endGame(); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const patchedCount = systems.filter((s) => s.patched).length;

  return (
    <section className="patch-game">
      <div className="game-frame">
        <header>
          <strong>Incident Response Console — Jan 3, 2018</strong>
          <span className={timeLeft < 20 ? "alert" : "watch"}>
            {gameOver ? (outcome?.label ?? "Done") : `${mm}:${ss} remaining`}
          </span>
        </header>

        <div className="status-bar">
          <div className="stat">
            Secured: <span style={{ color: "var(--green)" }}>{patchedCount} / {systems.length}</span>
          </div>
          <div className="stat">
            Time: <span style={{ color: timeLeft < 20 ? "var(--red)" : "var(--amber)" }}>{mm}:{ss}</span>
          </div>
          <div className="stat">
            Critical: <span style={{ color: "var(--red)" }}>
              {systems.filter((s) => s.riskLevel >= 4 && s.patched).length} / {systems.filter((s) => s.riskLevel >= 4).length} patched
            </span>
          </div>
        </div>

        <div className="systems-list">
          {systems.map((sys) => {
            const action = selectedAction[sys.id] || sys.actions[0];
            return (
              <div key={sys.id} className={`system-row ${sys.patched ? "patched" : sys.patching ? "patching" : ""}`}>
                <div className="row-info">
                  <div className="row-top">
                    <span className={`chip ${sys.patched ? "chip-patched" : "chip-vulnerable"}`}>
                      {sys.patched ? "Secured" : sys.patching ? "Patching…" : "Vulnerable"}
                    </span>
                    <span className={`risk-tag ${getRiskClass(sys.risk)}`}>{sys.risk} Risk</span>
                  </div>
                  <div className="sys-name">{sys.name}</div>
                  <div className="sys-desc">{sys.description}</div>
                  <div className="vuln-bar-track">
                    <div
                      className={`vuln-bar-fill ${sys.patched ? "fill-green" : getRiskClass(sys.risk).replace("risk-", "fill-")}`}
                      style={{ width: sys.patched ? "0%" : `${70 + sys.riskLevel * 6}%` }}
                    />
                  </div>
                  {sys.patching && (
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${sys.progress}%` }} />
                      <span className="progress-label">{sys.progress}%</span>
                    </div>
                  )}
                </div>

                <div className="row-actions">
                  {!sys.patched && !sys.patching ? (
                    <>
                      <select
                        className="action-select"
                        value={action}
                        onChange={(e) => setSelectedAction((prev) => ({ ...prev, [sys.id]: e.target.value }))}
                        disabled={gameOver}
                      >
                        {sys.actions.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                        <option value="Ignore Risk">Ignore Risk</option>
                      </select>
                      <button
                        className="patch-btn"
                        onClick={() => action !== "Ignore Risk" && startPatch(sys.id)}
                        disabled={gameOver || action === "Ignore Risk"}
                      >
                        {action === "Ignore Risk" ? "Skipped" : "Deploy"}
                      </button>
                    </>
                  ) : (
                    <div className="row-actions-status">
                      {sys.patched ? "No action needed" : "In progress…"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {gameOver && outcome && (
          <div className={`outcome-banner ${outcome.type}`}>
            <div className="outcome-label" style={{ color: outcome.color }}>{outcome.label}</div>
            <div className="outcome-detail">
              {outcome.type === "secure" && "All systems patched before the deadline. Critical infrastructure protected."}
              {outcome.type === "partial" && "Critical systems secured, but some remain exposed. Partial breach likely."}
              {outcome.type === "incident" && "Critical systems left unpatched. Major security incident in progress."}
            </div>
            <button className="reset-btn" onClick={reset}>Try Again</button>
          </div>
        )}

        <footer>
          <span>
            Each patch takes real time. Prioritize by risk level — critical systems first.
            <br />
            Ignoring a system leaves it fully exposed to Spectre and Meltdown exploits.
          </span>
        </footer>
      </div>

      <style>{`
        .patch-game {
          --green: #25f39a;
          --red: #ff3c55;
          --amber: #f6b73c;
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

        /* ── SYSTEMS LIST (row layout, replaces the old cramped grid) ── */
        .systems-list {
          display: flex;
          flex-direction: column;
        }

        .system-row {
          display: grid;
          grid-template-columns: 1fr 200px;
          gap: 1.5rem;
          align-items: center;
          padding: 1.25rem 22px;
          border-bottom: 1px solid var(--line);
          transition: background 0.2s;
          min-width: 0;
        }

        .system-row:last-child { border-bottom: none; }
        .system-row.patched { background: rgba(37,243,154,0.04); }
        .system-row.patching { background: rgba(246,183,60,0.04); }

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
        .chip-patched { background: rgba(37,243,154,0.12); color: var(--green); }

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

        .vuln-bar-track {
          height: 3px;
          background: rgba(255,255,255,0.07);
          margin-top: 2px;
        }

        .vuln-bar-fill {
          height: 100%;
          transition: width 0.4s;
        }

        .fill-critical { background: var(--red); }
        .fill-high { background: var(--amber); }
        .fill-medium { background: #8edfff; }
        .fill-green { background: var(--green); }

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
          transition: width 0.2s;
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
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .row-actions-status {
          font-family: "Courier New", monospace;
          font-size: 0.7rem;
          color: var(--muted);
          text-align: right;
        }

        .action-select {
          width: 100%;
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--line);
          color: var(--text);
          font-family: "Courier New", monospace;
          font-size: 0.65rem;
          padding: 7px 8px;
          cursor: pointer;
        }

        .patch-btn {
          width: 100%;
          font-family: "Courier New", monospace;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 7px 10px;
          border: 1px solid var(--green);
          background: transparent;
          color: var(--green);
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .patch-btn:hover:not(:disabled) { background: var(--green); color: #070b10; }
        .patch-btn:disabled { opacity: 0.4; cursor: default; border-color: var(--line); color: var(--muted); }

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

        @media (max-width: 720px) {
          .system-row {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          .row-actions-status { text-align: left; }
        }

        @media (max-width: 480px) {
          .game-frame header, .game-frame footer, .status-bar, .system-row, .outcome-banner {
            padding-left: 16px;
            padding-right: 16px;
          }
          .status-bar { gap: 1rem; }
        }
      `}</style>
    </section>
  );
}