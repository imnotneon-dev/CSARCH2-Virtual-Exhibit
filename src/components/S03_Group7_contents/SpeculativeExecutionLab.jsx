import { useEffect, useMemo, useState } from "react";

const ROUND_COUNT = 10;
const STARTING_CYCLES = 30;
const END_STATUSES = new Set(["Cache Leak", "Budget Exhausted", "Complete"]);
const INITIAL_MESSAGE =
  "Read the instruction card, then choose how the CPU should handle the branch.";
const INITIAL_LOGS = [
  "boot: speculative execution lab online",
  "goal: finish the workload before cycles or cache risk run out",
  "note: discarded result \u2260 erased side effect",
];
const RESET_LOGS = [
  "boot: randomized instruction stream loaded",
  "hint: public data can often tolerate speculation",
  "hint: protected boundaries usually need waiting, flushing, or a fence",
];

const VERDICT_DETAILS = {
  balanced: {
    label: "Balanced CPU Behavior",
    detail: "You mixed fast paths with safeguards and kept cache traces controlled.",
  },
  performance: {
    label: "High Performance, Moderate Risk",
    detail: "You gained speed from prediction while staying below the danger line.",
  },
  secureSlow: {
    label: "Secure but Slow",
    detail: "You avoided most traces, but spent nearly the whole cycle budget.",
  },
  risky: {
    label: "Risky Optimization",
    detail: "You completed the workload, but cache traces ended close to leaking.",
  },
  leaked: {
    label: "Speculative Leak",
    detail: "Speculative side effects became observable enough to infer secret data.",
  },
  exhausted: {
    label: "Over-Serialized Pipeline",
    detail: "The workload did not finish because too many checks stalled execution.",
  },
};

const SCENARIOS = [
  {
    id: "public-branch",
    label: "Public branch",
    instruction: ["if (imageLoaded)", "  displayImage();"],
    dataType: "Public",
    baseRisk: "Low",
    sensitivity: 0,
    histories: [
      ["LOADED", "LOADED", "LOADED", "MISSING"],
      ["LOADED", "LOADED", "LOADED", "LOADED"],
      ["MISSING", "LOADED", "LOADED", "LOADED"],
    ],
    predictions: ["Likely Loaded", "Strongly Loaded"],
  },
  {
    id: "bounds-check",
    label: "Bounds check",
    instruction: ["if (index < arrayLength)", "  read(array[index]);"],
    dataType: "Potentially Sensitive",
    baseRisk: "Medium",
    sensitivity: 2,
    histories: [
      ["IN_BOUNDS", "IN_BOUNDS", "IN_BOUNDS", "OUT_OF_BOUNDS"],
      ["IN_BOUNDS", "OUT_OF_BOUNDS", "IN_BOUNDS", "IN_BOUNDS"],
      ["OUT_OF_BOUNDS", "IN_BOUNDS", "IN_BOUNDS", "OUT_OF_BOUNDS"],
    ],
    predictions: ["Likely In Bounds", "Weakly In Bounds"],
  },
  {
    id: "permission-check",
    label: "Permission check",
    instruction: ["if (userIsAuthorized)", "  accessSecretData();"],
    dataType: "Sensitive",
    baseRisk: "High",
    sensitivity: 3,
    histories: [
      ["AUTHORIZED", "AUTHORIZED", "AUTHORIZED", "DENIED"],
      ["AUTHORIZED", "DENIED", "AUTHORIZED", "DENIED"],
      ["AUTHORIZED", "AUTHORIZED", "DENIED", "AUTHORIZED"],
    ],
    predictions: ["Likely Authorized", "Uncertain Authorized"],
  },
  {
    id: "kernel-boundary",
    label: "Kernel boundary",
    instruction: ["if (privilegedMode)", "  readKernelMemory();"],
    dataType: "Protected Kernel Memory",
    baseRisk: "Critical",
    sensitivity: 4,
    histories: [
      ["USER", "USER", "KERNEL", "USER"],
      ["KERNEL", "USER", "USER", "USER"],
      ["USER", "KERNEL", "USER", "USER"],
    ],
    predictions: ["Weakly Privileged", "Likely Privileged"],
  },
  {
    id: "verified-access",
    label: "Already verified access",
    instruction: ["if (permissionAlreadyChecked)", "  readUserProfile();"],
    dataType: "User Data",
    baseRisk: "Low to Medium",
    sensitivity: 1,
    histories: [
      ["CHECKED", "CHECKED", "CHECKED", "CHECKED"],
      ["CHECKED", "CHECKED", "CHECKED", "PENDING"],
      ["CHECKED", "CHECKED", "PENDING", "CHECKED"],
    ],
    predictions: ["Strongly Checked", "Likely Checked"],
  },
  {
    id: "sandbox-check",
    label: "Sandbox boundary",
    instruction: ["if (origin === trustedOrigin)", "  readSessionToken();"],
    dataType: "Cross-Origin Secret",
    baseRisk: "High",
    sensitivity: 3,
    histories: [
      ["TRUSTED", "TRUSTED", "UNTRUSTED", "TRUSTED"],
      ["TRUSTED", "UNTRUSTED", "UNTRUSTED", "TRUSTED"],
      ["TRUSTED", "TRUSTED", "TRUSTED", "UNTRUSTED"],
    ],
    predictions: ["Likely Trusted", "Weakly Trusted"],
  },
  {
    id: "feature-flag",
    label: "Feature flag branch",
    instruction: ["if (newRendererEnabled)", "  drawWithGpuPath();"],
    dataType: "Public Configuration",
    baseRisk: "Low",
    sensitivity: 0,
    histories: [
      ["ENABLED", "ENABLED", "ENABLED", "DISABLED"],
      ["DISABLED", "ENABLED", "ENABLED", "ENABLED"],
      ["ENABLED", "ENABLED", "ENABLED", "ENABLED"],
    ],
    predictions: ["Likely Enabled", "Strongly Enabled"],
  },
  {
    id: "crypto-key",
    label: "Key access check",
    instruction: ["if (keyHandle.isAllowed)", "  readKeyMaterial();"],
    dataType: "Cryptographic Secret",
    baseRisk: "Critical",
    sensitivity: 4,
    histories: [
      ["ALLOWED", "DENIED", "ALLOWED", "DENIED"],
      ["ALLOWED", "ALLOWED", "DENIED", "ALLOWED"],
      ["DENIED", "ALLOWED", "DENIED", "ALLOWED"],
    ],
    predictions: ["Uncertain Allowed", "Likely Allowed"],
  },
  {
    id: "metadata-read",
    label: "Metadata lookup",
    instruction: ["if (recordExists)", "  readPublicMetadata();"],
    dataType: "Public Metadata",
    baseRisk: "Low",
    sensitivity: 0,
    histories: [
      ["EXISTS", "EXISTS", "EXISTS", "MISSING"],
      ["EXISTS", "MISSING", "EXISTS", "EXISTS"],
      ["EXISTS", "EXISTS", "EXISTS", "EXISTS"],
    ],
    predictions: ["Likely Exists", "Strongly Exists"],
  },
  {
    id: "tenant-check",
    label: "Tenant isolation check",
    instruction: ["if (tenantId === activeTenant)", "  readTenantBilling();"],
    dataType: "Tenant-Scoped Data",
    baseRisk: "High",
    sensitivity: 3,
    histories: [
      ["MATCH", "MATCH", "MATCH", "MISMATCH"],
      ["MATCH", "MISMATCH", "MATCH", "MISMATCH"],
      ["MISMATCH", "MATCH", "MATCH", "MATCH"],
    ],
    predictions: ["Likely Match", "Weakly Match"],
  },
  {
    id: "length-prefetch",
    label: "Length-prefetch branch",
    instruction: ["if (offset < buffer.length)", "  prefetch(buffer[offset]);"],
    dataType: "User Buffer",
    baseRisk: "Medium",
    sensitivity: 2,
    histories: [
      ["VALID", "VALID", "VALID", "INVALID"],
      ["VALID", "INVALID", "VALID", "VALID"],
      ["INVALID", "VALID", "INVALID", "VALID"],
    ],
    predictions: ["Likely Valid", "Weakly Valid"],
  },
];

const ACTIONS = [
  {
    id: "wait",
    label: "Wait for Check",
    short: "Wait",
    description: "Resolve the condition first, then execute.",
  },
  {
    id: "speculate",
    label: "Speculate",
    short: "Spec",
    description: "Predict the branch and execute early.",
  },
  {
    id: "flush",
    label: "Speculate + Flush",
    short: "Flush",
    description: "Speculate, then reduce leftover cache traces.",
  },
  {
    id: "fence",
    label: "Insert Fence",
    short: "Fence",
    description: "Prevent speculation across this boundary.",
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function choose(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function shuffle(values) {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function toClassName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function makeRound(scenario, roundNumber) {
  const confidence = clamp(
    52 + Math.floor(Math.random() * 43) - scenario.sensitivity * 4,
    35,
    96
  );
  const predictionCorrect =
    Math.random() < confidence / 100 - scenario.sensitivity * 0.04;
  const penalty =
    12 + scenario.sensitivity * 6 + Math.floor(Math.random() * 9);

  return {
    ...scenario,
    roundNumber,
    branchHistory: choose(scenario.histories),
    prediction: choose(scenario.predictions),
    confidence,
    predictionCorrect,
    riskPenalty: penalty,
  };
}

function getPolicyRead(round) {
  if (!round) return "";

  if (round.id === "crypto-key") {
    return "Key material is highly sensitive, so even a cleaned-up speculative path can leave unacceptable evidence.";
  }

  if (round.id === "sandbox-check") {
    return "A trust-boundary branch should be judged by the cost of being wrong, not just by predictor confidence.";
  }

  if (round.id === "tenant-check") {
    return "Tenant data is isolated by policy; crossing that line speculatively can expose another context.";
  }

  if (round.id === "length-prefetch") {
    return "Prefetching can be fast, but a failed bounds check may still touch cache state tied to the buffer.";
  }

  if (round.sensitivity === 0 && round.confidence >= 70) {
    return "The data is public and the predictor has useful confidence, so the security cost of early work is low.";
  }

  if (round.sensitivity === 1 && round.confidence >= 78) {
    return "The access has already passed a check; the remaining question is whether the confidence justifies chasing speed.";
  }

  if (round.sensitivity === 4) {
    return "This crosses a protected boundary, so any speculative cache trace carries a large security penalty.";
  }

  if (round.sensitivity >= 3 && round.confidence < 78) {
    return "Sensitive data plus shaky prediction means a wrong guess can leave an expensive trace.";
  }

  if (round.sensitivity >= 2 && round.confidence >= 78) {
    return "The predictor is fairly confident, but the data can still create residual cache evidence.";
  }

  return "Compare the prediction confidence against the data sensitivity before spending cycles or accepting trace risk.";
}

function createDeck() {
  const pool = shuffle(SCENARIOS)
    .slice(0, ROUND_COUNT)
    .map((scenario, index) => makeRound(scenario, index + 1));

  return shuffle(pool).map((round, index) => ({
    ...round,
    roundNumber: index + 1,
  }));
}

function createInitialDeck() {
  return SCENARIOS.slice(0, ROUND_COUNT).map((scenario, index) => ({
    ...scenario,
    roundNumber: index + 1,
    branchHistory: scenario.histories[0],
    prediction: scenario.predictions[0],
    confidence: 78,
    predictionCorrect: index % 3 !== 1,
    riskPenalty: 14 + scenario.sensitivity * 6,
  }));
}

function evaluateAction(actionId, round) {
  const sensitive = round.sensitivity >= 2;
  const protectedBoundary = round.sensitivity >= 4;
  const uncertain = round.confidence < 70;

  if (actionId === "wait") {
    return {
      cycles: sensitive ? 4 : 3,
      risk: round.sensitivity === 0 ? 0 : 1,
      score: 1,
      message: "Permission checked before access. No speculative cache trace created.",
    };
  }

  if (actionId === "fence") {
    return {
      cycles: protectedBoundary ? 5 : 4,
      risk: 0,
      score: protectedBoundary || sensitive ? 1 : 0,
      message: "Speculation stopped at the boundary. Safe, but the pipeline paid extra cycles.",
    };
  }

  if (actionId === "flush") {
    const cycles = protectedBoundary || uncertain ? 4 : 3;
    const risk = protectedBoundary
      ? 22 + Math.floor(Math.random() * 10)
      : round.sensitivity >= 3
        ? 13 + Math.floor(Math.random() * 8)
        : round.sensitivity >= 2
          ? 8 + Math.floor(Math.random() * 7)
          : 4 + Math.floor(Math.random() * 5);

    return {
      cycles,
      risk,
      score: protectedBoundary ? 1 : round.predictionCorrect ? 3 : 2,
      message: protectedBoundary
        ? "Flush reduced the trace, but protected memory still made this a costly speculative boundary."
        : round.predictionCorrect
          ? "Speculation succeeded and cleanup reduced the remaining cache trace."
          : "Speculation was contained, but leftover cache trace risk remained after the flush.",
    };
  }

  if (round.predictionCorrect && !protectedBoundary) {
    return {
      cycles: 1,
      risk: sensitive ? 3 + Math.floor(Math.random() * 5) : 0,
      score: 5,
      message: "Speculation succeeded. Prediction was correct and no serious sensitive trace remained.",
    };
  }

  const risk = protectedBoundary
    ? 30 + Math.floor(Math.random() * 16)
    : sensitive || uncertain
      ? round.riskPenalty
      : 6 + Math.floor(Math.random() * 5);

  return {
    cycles: 2,
    risk,
    score: 3,
    message:
      "Speculative result was discarded, but a cache trace remained. Discarded result \u2260 erased side effect.",
  };
}

function getGameStatus(risk, cycles, completed, total) {
  if (risk >= 100) return "Cache Leak";
  if (completed >= total) return "Complete";
  if (cycles <= 0) return "Budget Exhausted";
  if (risk >= 70) return "High Risk";
  if (cycles <= 8) return "Cycle Pressure";
  return "Running";
}

function getVerdict(status, score, risk, cycles) {
  if (status === "Cache Leak") return VERDICT_DETAILS.leaked;
  if (status === "Budget Exhausted") return VERDICT_DETAILS.exhausted;
  if (risk < 25 && cycles <= 6) return VERDICT_DETAILS.secureSlow;
  if (score >= 36 && risk < 60 && cycles >= 4) {
    return VERDICT_DETAILS.performance;
  }
  if (risk >= 70) return VERDICT_DETAILS.risky;
  return VERDICT_DETAILS.balanced;
}

export default function SpeculativeExecutionLab() {
  const [deck, setDeck] = useState(createInitialDeck);
  const [roundIndex, setRoundIndex] = useState(0);
  const [cycles, setCycles] = useState(STARTING_CYCLES);
  const [performance, setPerformance] = useState(0);
  const [cacheRisk, setCacheRisk] = useState(0);
  const [lastAction, setLastAction] = useState(null);
  const [message, setMessage] = useState(INITIAL_MESSAGE);
  const [logs, setLogs] = useState(INITIAL_LOGS);

  useEffect(() => {
    setDeck(createDeck());
  }, []);

  const currentRound = deck[roundIndex] || deck[deck.length - 1];
  const completedRounds = roundIndex;
  const status = getGameStatus(cacheRisk, cycles, completedRounds, deck.length);
  const gameEnded = END_STATUSES.has(status);
  const policyRead = useMemo(() => getPolicyRead(currentRound), [currentRound]);
  const verdict = useMemo(
    () => getVerdict(status, performance, cacheRisk, cycles),
    [cacheRisk, cycles, performance, status]
  );
  const riskMeterStyle = {
    width: `${cacheRisk}%`,
    backgroundSize: `${10000 / Math.max(cacheRisk, 1)}% 100%`,
  };

  function pushLog(entry) {
    setLogs((current) => [entry, ...current].slice(0, 8));
  }

  function takeAction(actionId) {
    if (gameEnded || !currentRound) return;

    const action = ACTIONS.find((candidate) => candidate.id === actionId);
    if (!action) return;

    const result = evaluateAction(actionId, currentRound);
    const nextCycles = cycles - result.cycles;
    const nextRisk = clamp(cacheRisk + result.risk, 0, 100);
    const nextPerformance = performance + result.score;
    const nextRound = roundIndex + 1;

    setCycles(nextCycles);
    setCacheRisk(nextRisk);
    setPerformance(nextPerformance);
    setLastAction(actionId);
    setMessage(result.message);
    pushLog(
      `round ${roundIndex + 1}: ${action.label.toLowerCase()} | cycles -${result.cycles} | risk +${result.risk}%`
    );

    setRoundIndex(nextRound);
  }

  function resetGame() {
    setDeck(createDeck());
    setRoundIndex(0);
    setCycles(STARTING_CYCLES);
    setPerformance(0);
    setCacheRisk(0);
    setLastAction(null);
    setMessage("New instruction stream loaded. Balance speed against cache trace risk.");
    setLogs(RESET_LOGS);
  }

  return (
    <section className={`spec-lab ${toClassName(status)}`}>
      <div className="game-heading">
        <span>
          You are the CPU. Each round hands you one branch instruction it's
          about to run. Decide whether to speculate on it, wait for the
          check, flush the trace afterward, or fence it off completely.
          Speculating is fast but can leave secret data sitting in the cache;
          playing it safe costs cycles instead.
        </span>
      </div>

      <div className="how-to-play">
        <p className="eyebrow">How Each Round Works</p>
        <ol>
          <li><strong>Read the Instruction Card</strong> - what the code does, how sensitive the data is, and how confident the branch predictor is.</li>
          <li><strong>Check the Policy Read</strong> - a plain-language take on whether this branch is worth speculating on.</li>
          <li><strong>Pick a Player Action</strong> - Wait, Speculate, Speculate + Flush, or Fence. Each spends cycles and risk differently.</li>
          <li><strong>Watch both meters</strong> - the run ends if Cache Trace Risk hits 100% or the Cycle Budget hits 0, or once all 10 rounds are cleared.</li>
        </ol>
      </div>

      <div className="lab-frame">
        <header>
          <strong>CPU Pipeline Console - Spectre Tradeoff Drill</strong>
          <span className={gameEnded ? (status === "Complete" ? "safe" : "alert") : "watch"}>
            {status}
          </span>
        </header>

        <div className="lab-grid">
          <div className="panel instruction-panel">
            <p className="eyebrow">Instruction Card</p>
            <p className="panel-intro">
              The branch the CPU is about to hit this round. Weigh the data
              type and prediction confidence before you act.
            </p>
            <div className="card-meta">
              <strong>{currentRound?.label}</strong>
              <span className={`risk ${toClassName(currentRound?.baseRisk || "")}`}>
                {currentRound?.baseRisk} Risk
              </span>
            </div>

            <pre aria-label="Instruction code">
              <code>{currentRound?.instruction.join("\n")}</code>
            </pre>

            <dl className="instruction-facts">
              <div>
                <dt>Branch History</dt>
                <dd>{currentRound?.branchHistory.join(", ")}</dd>
              </div>
              <div>
                <dt>Prediction</dt>
                <dd>{currentRound?.prediction}</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>{currentRound?.confidence}%</dd>
              </div>
              <div>
                <dt>Data Type</dt>
                <dd>{currentRound?.dataType}</dd>
              </div>
            </dl>

            <div className="policy-read">
              <span>Policy Read</span>
              <strong>{policyRead}</strong>
            </div>
          </div>

          <div className="panel stats-panel">
            <p className="eyebrow">Player Stats</p>
            <p className="panel-intro">
              Your two budgets for the whole run. Either hitting zero (cycles)
              or 100% (risk) ends the game early.
            </p>
            <dl className="status-grid">
              <div>
                <dt>Cycle Budget</dt>
                <dd>{Math.max(0, cycles)} cycles</dd>
              </div>
              <div>
                <dt>Round</dt>
                <dd>
                  {Math.min(roundIndex + 1, deck.length)} / {deck.length}
                </dd>
              </div>
              <div>
                <dt>Performance</dt>
                <dd>{performance}</dd>
              </div>
              <div>
                <dt>Cache Trace Risk</dt>
                <dd>{cacheRisk}%</dd>
              </div>
            </dl>

            <div className="risk-meter" aria-label={`Cache trace risk ${cacheRisk}%`}>
              <span style={riskMeterStyle} />
            </div>

            <div className="cycle-rail" aria-label={`Cycle budget ${cycles}`}>
              {Array.from({ length: STARTING_CYCLES }, (_, index) => (
                <i className={index < Math.max(0, cycles) ? "live" : ""} key={index} />
              ))}
            </div>
          </div>

          <div className="panel action-panel">
            <p className="eyebrow">Player Actions</p>
            <p className="panel-intro">
              Choose how the CPU handles this round's branch. Pick one.
            </p>
            <div className="action-list">
              {ACTIONS.map((action) => (
                <button
                  className={lastAction === action.id ? "selected" : ""}
                  disabled={gameEnded}
                  key={action.id}
                  onClick={() => takeAction(action.id)}
                >
                  <strong>{action.label}</strong>
                  <span>{action.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel guide-panel">
            <p className="eyebrow">Decision Hints</p>
            <div className="hint-list">
              <span>Low sensitivity lets you value speed more aggressively.</span>
              <span>High sensitivity makes a wrong prediction more expensive.</span>
              <span>Weak confidence means the branch history is less trustworthy.</span>
              <span>Protected boundaries amplify the cost of leftover traces.</span>
              <span>Cleanup and serialization both reduce risk, but neither is free.</span>
            </div>
          </div>
        </div>

        <div className="bottom-grid">
          <div className="log-panel">
            <p className="eyebrow">Event Log</p>
            {logs.map((log) => (
              <span key={log}>{log}</span>
            ))}
          </div>

          <footer className={status === "Complete" ? "success" : gameEnded ? "failure" : ""}>
            <span>{gameEnded ? getEndMessage(status) : message}</span>
            {gameEnded && (
              <div className="verdict-card">
                <span>Verdict</span>
                <strong>{verdict.label}</strong>
                <p>{verdict.detail}</p>
              </div>
            )}
            <strong>{"Discarded result \u2260 erased side effect."}</strong>
            <div className="actions">
              <button className="secondary" onClick={resetGame}>
                Reset Lab
              </button>
            </div>
          </footer>
        </div>
      </div>

      {gameEnded && (
        <aside className="accuracy-note">
          <p className="eyebrow">What This Shows</p>
          <p>
            This simulation shows why Spectre and Meltdown were serious
            architectural vulnerabilities. Modern CPUs use speculation and
            prediction to improve performance. If the CPU guesses wrong, the
            speculative result is supposed to be discarded. However, discarded
            work can still leave microarchitectural side effects, such as
            changes in the CPU cache. Attackers may observe these cache traces
            through timing measurements to infer secret data.
          </p>
          <p>
            This game is simplified. Real processors, branch predictors, cache
            hierarchies, and mitigations are far more complex. The purpose here
            is to show the core tradeoff: faster execution can create security
            risks when speculative side effects cross protection boundaries.
          </p>
        </aside>
      )}

      <style>{`
        .spec-lab {
          --lab-columns: minmax(310px, 1fr) minmax(320px, 1fr);
          --divider: 2px;
          --panel: #101723;
          --line: #243348;
          --text: #f4f7fb;
          --muted: #8ba0ba;
          --green: #25f39a;
          --red: #ff3c55;
          --amber: #f6b73c;
          --blue: #54c7ff;
          color: var(--text);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          margin: 86px auto 0;
          width: min(100%, 1040px);
        }

        .game-heading {
          background-color: black;
          margin-bottom: 28px;
          padding: 20px 22px;
        }

        .game-heading p,
        .eyebrow {
          color: var(--green);
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          margin: 0 0 10px;
          text-transform: uppercase;
          background-color: black;
        }

        .game-heading h2 {
          font-size: clamp(2rem, 4vw, 3.2rem);
          line-height: 1;
          margin: 0 0 14px;
        }

        .game-heading span,
        .accuracy-note p {
          color: var(--muted);
          line-height: 1.7;
        }

        .how-to-play {
          background: black;
          border: 1px solid rgba(37, 243, 154, 0.2);
          margin-bottom: 24px;
          padding: 20px 22px;
        }

        .how-to-play ol {
          display: grid;
          gap: 10px;
          margin: 0;
          padding-left: 1.2em;
        }

        .how-to-play li {
          color: var(--muted);
          font-size: 0.88rem;
          line-height: 1.55;
        }

        .how-to-play li strong {
          color: var(--text);
        }

        .panel-intro {
          color: var(--muted);
          font-size: 0.82rem;
          line-height: 1.55;
          margin: 0 0 16px;
        }

        .lab-frame {
          background: linear-gradient(180deg, #121a28, #0b111a);
          border: var(--divider) solid var(--line);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
        }

        .lab-frame header {
          align-items: center;
          border-bottom: var(--divider) solid var(--line);
          display: flex;
          gap: 16px;
          justify-content: space-between;
          padding: 16px 22px;
        }

        .lab-frame header strong,
        .lab-frame header span,
        .log-panel,
        .lab-frame footer {
          font-family: "Courier New", ui-monospace, monospace;
        }

        .lab-frame header strong,
        .lab-frame header span {
          font-size: 0.76rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .safe,
        .success {
          color: var(--green);
        }

        .watch {
          color: var(--amber);
        }

        .alert,
        .failure {
          color: var(--red);
        }

        .lab-grid {
          display: grid;
          grid-template-columns: var(--lab-columns);
          position: relative;
        }

        .lab-grid::before,
        .bottom-grid::before {
          background: var(--line);
          bottom: 0;
          content: "";
          left: calc(50% - (var(--divider) / 2));
          position: absolute;
          top: 0;
          width: var(--divider);
          z-index: 1;
        }

        .panel {
          border-bottom: var(--divider) solid var(--line);
          padding: 24px;
        }

        .panel:nth-child(odd) {
          border-right: 0;
        }

        .card-meta {
          align-items: center;
          display: flex;
          gap: 12px;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .card-meta strong {
          font-size: 1.04rem;
        }

        .risk {
          color: var(--amber);
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .risk.high,
        .risk.critical {
          color: var(--red);
        }

        .risk.low {
          color: var(--green);
        }

        pre {
          background: rgba(0, 0, 0, 0.28);
          border: 1px solid rgba(139, 160, 186, 0.22);
          color: #dbe7f5;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.98rem;
          line-height: 1.7;
          margin: 0 0 16px;
          overflow: auto;
          padding: 18px;
          white-space: pre-wrap;
        }

        .instruction-facts,
        .status-grid {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(2, 1fr);
          margin: 0;
        }

        .instruction-facts div,
        .status-grid div {
          border: 1px solid rgba(139, 160, 186, 0.16);
          padding: 12px;
        }

        .instruction-facts dt,
        .status-grid dt {
          color: var(--muted);
          font-size: 0.74rem;
        }

        .instruction-facts dd,
        .status-grid dd {
          color: var(--green);
          font-family: "Courier New", ui-monospace, monospace;
          margin: 7px 0 0;
          overflow-wrap: anywhere;
        }

        .policy-read {
          background: rgba(37, 243, 154, 0.06);
          border: 1px solid rgba(37, 243, 154, 0.22);
          display: grid;
          gap: 8px;
          margin-top: 14px;
          padding: 13px;
        }

        .policy-read span {
          color: var(--green);
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .policy-read strong {
          color: #dbe7f5;
          font-size: 0.86rem;
          line-height: 1.45;
        }

        .risk-meter {
          background: #1d2533;
          height: 9px;
          margin: 18px 0;
          overflow: hidden;
        }

        .risk-meter span {
          background: linear-gradient(90deg, var(--green), var(--amber), var(--red));
          background-position: left center;
          background-repeat: no-repeat;
          display: block;
          height: 100%;
          transition: width 0.2s ease;
        }

        .cycle-rail {
          display: grid;
          gap: 4px;
          grid-template-columns: repeat(15, 1fr);
          margin-bottom: 18px;
        }

        .cycle-rail i {
          background: rgba(139, 160, 186, 0.18);
          display: block;
          height: 10px;
        }

        .cycle-rail i.live {
          background: var(--blue);
          box-shadow: 0 0 12px rgba(84, 199, 255, 0.25);
        }

        .action-list,
        .hint-list {
          display: grid;
          gap: 10px;
        }

        .action-list button {
          background: rgba(0, 0, 0, 0.12);
          border: 1px solid rgba(139, 160, 186, 0.2);
          color: var(--text);
          cursor: pointer;
          display: grid;
          gap: 7px;
          min-height: 72px;
          padding: 12px;
          text-align: left;
        }

        .action-list button.selected {
          border-color: var(--green);
          box-shadow: inset 0 0 0 1px rgba(37, 243, 154, 0.15);
        }

        .action-list strong {
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.86rem;
          text-transform: uppercase;
        }

        .action-list span,
        .hint-list span {
          color: var(--muted);
          font-size: 0.82rem;
          line-height: 1.45;
        }

        .hint-list span {
          border: 1px solid rgba(139, 160, 186, 0.16);
          padding: 12px;
        }

        .bottom-grid {
          display: grid;
          grid-template-columns: var(--lab-columns);
          position: relative;
        }

        .log-panel,
        .lab-frame footer {
          padding: 18px 22px;
        }

        .log-panel {
          color: var(--muted);
          display: grid;
          gap: 7px;
          font-size: 0.76rem;
        }

        .lab-frame footer {
          color: var(--muted);
          display: grid;
          gap: 8px;
          line-height: 1.5;
        }

        .lab-frame footer strong {
          color: var(--text);
          font-size: 0.78rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .verdict-card {
          border: 1px solid rgba(139, 160, 186, 0.22);
          display: grid;
          gap: 6px;
          padding: 12px;
        }

        .verdict-card span {
          color: var(--green);
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .verdict-card strong {
          color: var(--text);
          font-size: 0.82rem;
        }

        .verdict-card p {
          color: var(--muted);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 0.86rem;
          line-height: 1.45;
          margin: 0;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 6px;
        }

        button.secondary {
          background: transparent;
          border: 1px solid #4a668a;
          color: #b7c7da;
          cursor: pointer;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.78rem;
          font-weight: 700;
          min-height: 40px;
          padding: 0 16px;
          text-transform: uppercase;
        }

        button:disabled {
          cursor: default;
          opacity: 0.46;
        }

        .accuracy-note {
          background: rgba(16, 23, 35, 0.78);
          border: var(--divider) solid var(--line);
          margin-top: 22px;
          padding: 22px;
        }

        .accuracy-note p:last-child {
          margin-bottom: 0;
        }

        @media (max-width: 900px) {
          .lab-grid,
          .bottom-grid,
          .instruction-facts,
          .status-grid {
            grid-template-columns: 1fr;
          }

          .panel:nth-child(odd),
          .log-panel {
            border-right: 0;
          }

          .lab-grid::before,
          .bottom-grid::before {
            display: none;
          }

          .lab-frame footer {
            margin-left: 0;
          }

          .lab-frame header {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 560px) {
          .spec-lab {
            margin-top: 64px;
          }

          .panel,
          .log-panel,
          .lab-frame footer {
            padding: 18px;
          }

        }
      `}</style>
    </section>
  );
}

function getEndMessage(status) {
  if (status === "Complete") {
    return "Execution completed. Workload retired before risk or cycles failed.";
  }

  if (status === "Cache Leak") {
    return "Cache Trace Risk reached 100%. Secret data leaked through speculative side effects.";
  }

  return "Cycle budget exhausted. The CPU was too slow to complete the workload.";
}