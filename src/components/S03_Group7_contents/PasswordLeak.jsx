import { useEffect, useMemo, useState } from "react";

const PROBE_COUNT = 8;
const RANDOM_BYTES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const INITIAL_MESSAGE =
  "System appears secure. Password characters are not displayed.";

const BASE_PASSWORDS = [
  "password",
  "admin",
  "qwerty",
  "abc123",
  "iloveyou",
  "letmein",
  "welcome",
  "monkey",
  "dragon",
  "football",
  "baseball",
  "sunshine",
  "princess",
  "shadow",
  "master",
  "secret",
  "login",
  "freedom",
  "whatever",
  "trustno1",
  "starwars",
  "superman",
  "batman",
  "mustang",
  "flower",
];

const COMMON_NAMES = [
  "michael",
  "ashley",
  "charlie",
  "jessica",
  "daniel",
  "joshua",
  "andrew",
  "nicole",
  "samantha",
  "brandon",
  "emily",
  "john",
  "chris",
  "david",
  "sarah",
  "alex",
  "kevin",
  "brian",
  "amanda",
  "jordan",
];

const NUMBER_SUFFIXES = [
  "1",
  "7",
  "11",
  "12",
  "13",
  "21",
  "69",
  "99",
  "123",
  "1234",
  "007",
  "2000",
  "2001",
  "2002",
  "2003",
  "2004",
  "2005",
  "2006",
  "2023",
  "2024",
];

function chooseSecret() {
  const useNameVariant = Math.random() < 0.45;

  if (useNameVariant) {
    const name = COMMON_NAMES[Math.floor(Math.random() * COMMON_NAMES.length)];
    const suffix =
      NUMBER_SUFFIXES[Math.floor(Math.random() * NUMBER_SUFFIXES.length)];
    return name + suffix;
  }

  return BASE_PASSWORDS[Math.floor(Math.random() * BASE_PASSWORDS.length)];
}

function randomByte() {
  return RANDOM_BYTES[Math.floor(Math.random() * RANDOM_BYTES.length)];
}

function makeMaskedBuffer(length) {
  return Array.from({ length }, () => "?");
}

function generateBaseAddress() {
  const high = BigInt(0x1000 + Math.floor(Math.random() * 0xe000));
  const middle = BigInt(Math.floor(Math.random() * 0x10000));
  return (high << 32n) | (middle << 16n);
}

function formatAddress(address) {
  const hex = address.toString(16).toUpperCase().padStart(12, "0");
  return `0x${hex.match(/.{1,4}/g).join("_")}`;
}

function randomHitCycles() {
  return 12 + Math.floor(Math.random() * 7);
}

function randomMissCycles() {
  return 80 + Math.floor(Math.random() * 31);
}

function cycleBarWidth(cycles) {
  const minCycles = 12;
  const maxCycles = 110;
  const normalized = (cycles - minCycles) / (maxCycles - minCycles);
  return `${Math.max(8, Math.min(100, 100 - normalized * 92))}%`;
}

function makeProbeSet(hitIndex, baseAddress) {
  return Array.from({ length: PROBE_COUNT }, (_, index) => {
    const isHit = index === hitIndex;
    const offset = BigInt(index * 0x1000);

    return {
      index,
      isHit,
      address: formatAddress(baseAddress + offset),
      cycles: isHit ? randomHitCycles() : randomMissCycles(),
    };
  });
}

function clearProbeHits(probes) {
  return probes.map((probe) => ({
    ...probe,
    isHit: false,
    cycles: randomMissCycles(),
  }));
}

function makeActiveProbeSet() {
  const hitIndex = Math.floor(Math.random() * PROBE_COUNT);
  return makeProbeSet(hitIndex, generateBaseAddress());
}

function reshuffleHit(probes) {
  const hitIndex = Math.floor(Math.random() * probes.length);

  return probes.map((probe, index) => {
    const isHit = index === hitIndex;
    return {
      ...probe,
      isHit,
      cycles: isHit ? randomHitCycles() : randomMissCycles(),
    };
  });
}

function fluctuateProbe(probe) {
  return {
    ...probe,
    cycles: probe.isHit ? randomHitCycles() : randomMissCycles(),
  };
}

export default function PasswordLeak() {
  const [secret, setSecret] = useState(() => BASE_PASSWORDS[0]);
  const [view, setView] = useState("user");
  const [revealed, setRevealed] = useState(0);
  const [detectionRisk, setDetectionRisk] = useState(0);
  const [probes, setProbes] = useState(() => []);
  const [roundReady, setRoundReady] = useState(false);
  const [addressesVisible, setAddressesVisible] = useState(false);
  const [randomBuffer, setRandomBuffer] = useState(() =>
    makeMaskedBuffer(secret.length)
  );
  const [message, setMessage] = useState(INITIAL_MESSAGE);

  const gameWon = revealed >= secret.length;
  const gameLost = detectionRisk >= 100 && !gameWon;
  const gameEnded = gameWon || gameLost;
  const canPlay = view === "attacker" && !gameEnded;
  const systemStatus = gameLost
    ? "Alert Triggered"
    : detectionRisk >= 70
      ? "High Alert"
      : detectionRisk > 0 || roundReady
        ? "Monitoring"
        : "Secure";
  const statusTone = gameLost
    ? "status-red"
    : detectionRisk >= 70
      ? "status-amber"
      : "status-green";
  const instruction = gameEnded
    ? "Press Reset to try another simulated password."
    : view === "user"
      ? "Click View as Attacker to inspect timing side effects."
      : roundReady
        ? "Click the probe address with the lowest cycle count."
        : "Click Trigger Memory Access to start a cache timing round.";

  const reconstructionBuffer = useMemo(() => {
    return secret
      .split("")
      .map((char, index) => (index < revealed ? char : randomBuffer[index]))
      .join("");
  }, [randomBuffer, revealed, secret]);

  useEffect(() => {
    const initialSecret = chooseSecret();
    setSecret(initialSecret);
    setRandomBuffer(makeMaskedBuffer(initialSecret.length));
    setProbes(makeProbeSet(null, generateBaseAddress()));
  }, []);

  useEffect(() => {
    const bufferTimer = window.setInterval(() => {
      setRandomBuffer((current) =>
        current.map((value, index) => (index < revealed ? value : randomByte()))
      );
    }, 120);

    return () => window.clearInterval(bufferTimer);
  }, [revealed]);

  useEffect(() => {
    const probeTimer = window.setInterval(() => {
      setProbes((current) => current.map(fluctuateProbe));
    }, 1000);

    return () => window.clearInterval(probeTimer);
  }, []);

  function triggerMemoryAccess() {
    if (!canPlay) return;

    setProbes(makeActiveProbeSet());
    setRoundReady(true);
    setAddressesVisible(true);
    setMessage(
      "Sensitive data was accessed internally. Find the address with the shortest access time."
    );
  }

  function chooseProbe(probe) {
    if (!roundReady || !canPlay) return;

    if (probe.isHit) {
      const nextRevealed = Math.min(revealed + 1, secret.length);
      setRevealed(nextRevealed);
      setRoundReady(nextRevealed < secret.length);
      setProbes(
        nextRevealed === secret.length
          ? clearProbeHits
          : reshuffleHit
      );
      setMessage(
        nextRevealed === secret.length
          ? "Secret reconstructed through cache timing analysis."
          : `Correct. ${probe.address} was the cache-hit address. Next round is live.`
      );
      return;
    }

    const riskIncrease = 15 + Math.floor(Math.random() * 11);
    const nextRisk = Math.min(100, detectionRisk + riskIncrease);
    setDetectionRisk(nextRisk);
    setRoundReady(nextRisk < 100);
    setProbes(
      nextRisk >= 100
        ? clearProbeHits
        : reshuffleHit
    );
    setMessage(
      nextRisk >= 100
        ? "System alert triggered. Attack failed before the secret was reconstructed."
        : "Wrong address. Suspicious probing activity increased."
    );
  }

  function resetSimulation() {
    const nextSecret = chooseSecret();
    setSecret(nextSecret);
    setView("user");
    setRevealed(0);
    setDetectionRisk(0);
    setProbes(makeProbeSet(null, generateBaseAddress()));
    setRoundReady(false);
    setAddressesVisible(false);
    setRandomBuffer(makeMaskedBuffer(nextSecret.length));
    setMessage(INITIAL_MESSAGE);
  }

  return (
    <section className="password-leak">
      <div className="sim-heading">
        <span>
          The password remains hidden, but cache timing can still reveal clues.
        </span>
      </div>

      <div className="terminal-frame">
        <header>
          <strong>Memory Access Monitor — Side Channel Demo</strong>
          <span className={view === "attacker" ? "alert" : "safe"}>
            {view === "attacker" ? "Attacker View Active" : "User View Active"}
          </span>
        </header>

        <div className="panels">
          <div className="panel">
            <p className="eyebrow">User Interface</p>
            <div className="password-box">
              <span>Password:</span>
              <strong>{"*".repeat(secret.length)}</strong>
            </div>

            <div className={`status-line ${statusTone}`}>
              <span className="status-dot" />
              <span>{systemStatus}</span>
              <span className="status-risk">Detection risk {detectionRisk}%</span>
            </div>

            <div className="risk-meter" aria-label={`Detection risk ${detectionRisk}%`}>
              <span style={{ width: `${detectionRisk}%` }} />
            </div>

            <p className="note">
              From the application's perspective, the credential remains masked.
              The password field itself never displays the secret.
            </p>

            {view === "user" ? (
              <button className="primary" onClick={() => setView("attacker")}>
                View as Attacker
              </button>
            ) : (
              <button className="secondary" onClick={() => setView("user")}>
                View as User
              </button>
            )}
          </div>

          <div className="panel attacker-panel">
            <p className="eyebrow">Attacker Dashboard — Probe Array</p>

            <div className="reconstruction">
              <span>Reconstruction buffer — {revealed} of {secret.length} bytes locked</span>
              <div className="reconstruction-field" aria-label="Attacker reconstruction buffer">
                {reconstructionBuffer.split("").map((char, index) => (
                  <span
                    className={index < revealed ? "locked-char" : "unknown-char"}
                    key={index}
                  >
                    {char}
                  </span>
                ))}
              </div>
            </div>

            <div className="probe-table" aria-label="Probe-array timing list">
              <div className="probe-head" aria-hidden="true">
                <span>Probe Address</span>
                <span>Access Time</span>
              </div>

              {probes.map((probe) => {
                const width = cycleBarWidth(probe.cycles);
                const visibleAddress = addressesVisible ? probe.address : "0x????";
                return (
                  <button
                    key={probe.address}
                    className="probe-row"
                    disabled={!roundReady || !canPlay}
                    onClick={() => chooseProbe(probe)}
                    aria-label={`Select probe address ${visibleAddress}, ${probe.cycles} cycles`}
                  >
                    <span className="address">{visibleAddress}</span>
                    <span className="bar" style={{ "--fill": width }}>
                      <i />
                    </span>
                    <span className="cycles">{probe.cycles} cy</span>
                  </button>
                );
              })}
            </div>

            <div className="actions">
              <button
                className="danger"
                disabled={!canPlay || roundReady}
                onClick={triggerMemoryAccess}
              >
                Trigger Memory Access
              </button>
              <button className="secondary" onClick={resetSimulation}>
                Reset
              </button>
            </div>
          </div>
        </div>

        <footer className={gameWon ? "success" : gameLost ? "failure" : ""}>
          <span>{message}</span>
          <strong>{instruction}</strong>
        </footer>
      </div>

      {gameEnded && (
        <aside className="end-explanation">
          <p className="eyebrow">Reading the Timing Attack</p>
          <p>
            The probe table is a simplified stand-in for a real cache side-channel:
            an attacker measures which memory address answers fastest, and a fast
            answer means that data was already sitting in the cache. That timing
            difference — not the memory itself — is what leaks the secret. Real
            attacks probe far more addresses than shown here.
          </p>
        </aside>
      )}

      <style suppressHydrationWarning>{`
        .password-leak {
          --bg: #070b10;
          --panel: #101723;
          --panel-2: #131b29;
          --line: #243348;
          --text: #f4f7fb;
          --muted: #8ba0ba;
          --green: #25f39a;
          --red: #ff3c55;
          --amber: #f6b73c;
          color: var(--text);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          width: min(100%, 1040px);
          margin: 0 auto;
        }

        .sim-heading {
          margin-bottom: 28px;
        }

        .sim-heading p,
        .eyebrow {
          color: var(--green);
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          margin: 0 0 10px;
          text-transform: uppercase;
        }

        .sim-heading span,
        .note,
        .end-explanation p {
          color: var(--muted);
          line-height: 1.7;
        }

        .terminal-frame {
          background: linear-gradient(180deg, #121a28, #0b111a);
          border: 1px solid var(--line);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
        }

        .terminal-frame header,
        .terminal-frame footer {
          align-items: center;
          border-bottom: 1px solid var(--line);
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 22px;
        }

        .terminal-frame header strong,
        .terminal-frame header span {
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.76rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .safe { color: var(--green); }
        .alert, .failure { color: var(--red); }
        .success { color: var(--green); }

        .panels {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.35fr);
          min-height: 420px;
        }

        .panel {
          padding: 28px;
          min-width: 0;
        }

        .panel + .panel {
          border-left: 1px solid var(--line);
        }

        .password-box {
          background: rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(139, 160, 186, 0.2);
          display: grid;
          gap: 10px;
          margin: 14px 0 20px;
          padding: 18px;
        }

        .password-box span {
          color: var(--muted);
          font-size: 0.78rem;
        }

        .password-box strong {
          color: var(--text);
          font-family: "Courier New", ui-monospace, monospace;
          font-size: clamp(1.7rem, 5vw, 2.35rem);
          letter-spacing: 0.08em;
          overflow-wrap: anywhere;
        }

        .status-line {
          align-items: center;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.76rem;
          letter-spacing: 0.04em;
          margin-bottom: 10px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          flex-shrink: 0;
        }

        .status-green { color: var(--green); }
        .status-amber { color: var(--amber); }
        .status-red { color: var(--red); }

        .status-risk {
          color: var(--muted);
          margin-left: auto;
        }

        .risk-meter {
          background: #1d2533;
          height: 9px;
          margin-bottom: 20px;
          overflow: hidden;
        }

        .risk-meter span {
          background: linear-gradient(90deg, var(--green), var(--amber), var(--red));
          display: block;
          height: 100%;
          transition: width 0.18s ease;
        }

        .note {
          font-size: 0.92rem;
          margin-bottom: 22px;
        }

        .reconstruction {
          display: grid;
          gap: 10px;
          margin-bottom: 22px;
        }

        .reconstruction > span {
          color: var(--muted);
          font-size: 0.78rem;
        }

        .reconstruction-field {
          align-items: center;
          background: rgba(0, 0, 0, 0.28);
          border: 1px solid rgba(139, 160, 186, 0.28);
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18);
          display: flex;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: clamp(1.65rem, 4vw, 2.25rem);
          font-weight: 700;
          letter-spacing: 0.12em;
          min-height: 58px;
          overflow: hidden;
          padding: 0 16px;
          white-space: nowrap;
        }

        .locked-char {
          color: var(--green);
          text-shadow: 0 0 14px rgba(37, 243, 154, 0.35);
        }

        .unknown-char {
          color: #d1d8e2;
          opacity: 0.68;
        }

        .probe-table {
          display: grid;
          gap: 6px;
          margin-bottom: 22px;
        }

        .probe-head,
        .probe-row {
          align-items: center;
          display: grid;
          gap: 12px;
          grid-template-columns: minmax(140px, 1fr) minmax(80px, 0.9fr) 64px;
        }

        .probe-head {
          color: var(--muted);
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.72rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0 10px;
        }

        .probe-head span:first-child {
          grid-column: 1 / 3;
        }

        .probe-row {
          background: transparent;
          border: 1px solid transparent;
          border-radius: 2px;
          color: var(--text);
          cursor: pointer;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.78rem;
          min-height: 40px;
          padding: 0 10px;
          text-align: left;
          transition: background 0.15s, border-color 0.15s;
        }

        .probe-row:disabled {
          cursor: default;
          opacity: 0.55;
        }

        .probe-row:not(:disabled):hover,
        .probe-row:not(:disabled):focus-visible {
          background: rgba(37, 243, 154, 0.06);
          border-color: rgba(37, 243, 154, 0.3);
        }

        .address {
          color: inherit;
          overflow-wrap: anywhere;
        }

        .cycles {
          color: inherit;
          text-align: right;
        }

        .bar {
          background: linear-gradient(90deg, var(--green) 0%, #d6ff4a 55%, var(--red) 100%);
          height: 8px;
          overflow: hidden;
          position: relative;
        }

        .bar i {
          background: #1d2533;
          display: block;
          height: 100%;
          left: var(--fill);
          position: absolute;
          right: 0;
          top: 0;
          transition: left 0.18s ease;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        button.primary,
        button.secondary,
        button.danger {
          background: transparent;
          border: 1px solid;
          color: var(--text);
          cursor: pointer;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.78rem;
          font-weight: 700;
          min-height: 40px;
          padding: 0 16px;
          text-transform: uppercase;
          transition: background 0.15s, color 0.15s;
        }

        button.primary {
          border-color: var(--green);
          color: var(--green);
        }

        button.primary:hover:not(:disabled) {
          background: var(--green);
          color: #070b10;
        }

        button.secondary {
          border-color: #4a668a;
          color: #b7c7da;
        }

        button.danger {
          border-color: var(--red);
          color: var(--red);
        }

        button.danger:hover:not(:disabled) {
          background: var(--red);
          color: #fff;
        }

        button:disabled {
          cursor: default;
          opacity: 0.45;
        }

        .terminal-frame footer {
          align-items: flex-start;
          border-bottom: 0;
          border-top: 1px solid var(--line);
          color: var(--muted);
          display: grid;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.82rem;
          gap: 6px;
          min-height: 56px;
        }

        .terminal-frame footer strong {
          color: var(--text);
          font-size: 0.78rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .end-explanation {
          background: rgba(16, 23, 35, 0.78);
          border: 1px solid var(--line);
          margin-top: 22px;
          padding: 22px;
        }

        .end-explanation p:last-child {
          margin-bottom: 0;
        }

        @media (max-width: 860px) {
          .panels {
            grid-template-columns: 1fr;
          }

          .panel + .panel {
            border-left: 0;
            border-top: 1px solid var(--line);
          }

          .terminal-frame header {
            align-items: flex-start;
            flex-direction: column;
          }

          .status-risk {
            margin-left: 0;
          }
        }

        @media (max-width: 540px) {
          .probe-head,
          .probe-row {
            grid-template-columns: minmax(0, 1fr) 60px;
          }

          .probe-head span:first-child {
            grid-column: auto;
          }

          .bar {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
