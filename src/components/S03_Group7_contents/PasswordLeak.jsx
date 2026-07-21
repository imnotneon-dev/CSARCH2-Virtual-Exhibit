import { useEffect, useMemo, useState } from "react";

const PROBE_COUNT = 8;
const PASSWORD_LENGTH = 12; // Changed from 16 to 12
const ATTACK_TIME_MS = 10000;
const TICK_MS = 100;
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

// Filler characters used to stretch a shorter base password out to the full
// 12-character target length, so every simulated secret is the same length.
const PADDING_CHARS = "!@#$%2468";

function extendToLength(value, length) {
  let result = value;
  let index = 0;

  while (result.length < length) {
    result += PADDING_CHARS[(result.length + index) % PADDING_CHARS.length];
    index += 1;
  }

  return result.slice(0, length);
}

function chooseSecret() {
  const useNameVariant = Math.random() < 0.45;
  let base;

  if (useNameVariant) {
    const name = COMMON_NAMES[Math.floor(Math.random() * COMMON_NAMES.length)];
    const suffix =
      NUMBER_SUFFIXES[Math.floor(Math.random() * NUMBER_SUFFIXES.length)];
    base = name + suffix;
  } else {
    base = BASE_PASSWORDS[Math.floor(Math.random() * BASE_PASSWORDS.length)];
  }

  return extendToLength(base, PASSWORD_LENGTH);
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

function attackUrgency(percent) {
  if (percent <= 20) return "attack-danger";
  if (percent <= 50) return "attack-warn";
  return "attack-safe";
}

const RULES = [
  {
    title: "Switch to the attacker view",
    detail:
      "Click View as Attacker to leave the user's perspective and see the probe array the application never shows.",
  },
  {
    title: "Trigger a memory access",
    detail:
      "Press Trigger Memory Access to start a round. This is also what opens the 10-second attack window — every probe address gets a fresh, randomized access time.",
  },
  {
    title: "Race the attack window",
    detail:
      "Once triggered, the countdown runs regardless of view. Reconstruct as much of the password as you can before it hits zero.",
  },
  {
    title: "Pick the fastest address",
    detail:
      "Select the probe with the lowest cycle count. A correct pick locks in one character. Wrong pick raises detection risk.",
  },
];

export default function PasswordLeak() {
  const [secret, setSecret] = useState(() => chooseSecret());
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
  const [messageKey, setMessageKey] = useState(0);
  const [lastLockedIndex, setLastLockedIndex] = useState(-1);
  const [lockPulseKey, setLockPulseKey] = useState(0);
  const [shakeRowAddress, setShakeRowAddress] = useState(null);
  const [riskPulseKey, setRiskPulseKey] = useState(0);
  const [statusFlipKey, setStatusFlipKey] = useState(0);
  const [viewTransitionKey, setViewTransitionKey] = useState(0);
  const [instructionKey, setInstructionKey] = useState(0);
  const [resultModalStage, setResultModalStage] = useState("closed");

  // Attack window: stays dormant until the player switches to the attacker
  // view, then counts down from ATTACK_TIME_MS regardless of which view is
  // showing, so peeking back at the user view doesn't buy extra time.
  const [timerStarted, setTimerStarted] = useState(false);
  const [attackTimeLeft, setAttackTimeLeft] = useState(ATTACK_TIME_MS);
  const [timedOut, setTimedOut] = useState(false);

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
        ? "Click the probe address with the lowest cycle count before the attack window runs out."
        : "Click Trigger Memory Access to start a cache timing round and open the 10-second attack window.";

  const reconstructionBuffer = useMemo(() => {
    return secret
      .split("")
      .map((char, index) => (index < revealed ? char : randomBuffer[index]))
      .join("");
  }, [randomBuffer, revealed, secret]);

  const attackPercent = Math.max(0, Math.min(100, (attackTimeLeft / ATTACK_TIME_MS) * 100));
  const attackSeconds = (Math.max(0, attackTimeLeft) / 1000).toFixed(1);
  const attackTone = attackUrgency(attackPercent);

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

  // The attack window countdown. Only ticks once timerStarted flips true
  // (on the first "View as Attacker" click) and stops as soon as the game
  // ends, win or lose.
  useEffect(() => {
    if (!timerStarted || gameEnded) return undefined;

    const attackTimer = window.setInterval(() => {
      setAttackTimeLeft((current) => Math.max(0, current - TICK_MS));
    }, TICK_MS);

    return () => window.clearInterval(attackTimer);
  }, [timerStarted, gameEnded]);

  // Fires once when the countdown reaches zero: forces a loss the same way
  // maxing out detection risk does, so the rest of the game state (footer,
  // result modal, disabled controls) reacts consistently.
  useEffect(() => {
    if (timerStarted && !gameEnded && attackTimeLeft <= 0) {
      setTimedOut(true);
      setDetectionRisk(100);
      setRiskPulseKey((key) => key + 1);
      setRoundReady(false);
      setProbes(clearProbeHits);
      announce(
        "Attack window expired. The 10-second timing window closed before the secret was fully reconstructed."
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attackTimeLeft, timerStarted, gameEnded]);

  useEffect(() => {
    setStatusFlipKey((key) => key + 1);
  }, [systemStatus]);

  useEffect(() => {
    setInstructionKey((key) => key + 1);
  }, [instruction]);

  useEffect(() => {
    if (gameEnded) {
      setResultModalStage("open");
    }
  }, [gameEnded]);

  function closeResultModal() {
    setResultModalStage("closing");
  }

  function announce(text) {
    setMessage(text);
    setMessageKey((key) => key + 1);
  }

  function switchView(nextView) {
    setView(nextView);
    setViewTransitionKey((key) => key + 1);
  }

  function triggerMemoryAccess() {
    if (!canPlay) return;

    const startingTimer = !timerStarted;
    if (startingTimer) setTimerStarted(true);

    setProbes(makeActiveProbeSet());
    setRoundReady(true);
    setAddressesVisible(true);
    announce(
      startingTimer
        ? "Sensitive data was accessed internally. A 10-second attack window has opened — find the address with the shortest access time."
        : "Sensitive data was accessed internally. Find the address with the shortest access time."
    );
  }

  function chooseProbe(probe) {
    if (!roundReady || !canPlay) return;

    if (probe.isHit) {
      const nextRevealed = Math.min(revealed + 1, secret.length);
      setRevealed(nextRevealed);
      setLastLockedIndex(nextRevealed - 1);
      setLockPulseKey((key) => key + 1);
      setRoundReady(nextRevealed < secret.length);
      setProbes(
        nextRevealed === secret.length
          ? clearProbeHits
          : reshuffleHit
      );
      announce(
        nextRevealed === secret.length
          ? "Secret reconstructed through cache timing analysis."
          : `Correct. ${probe.address} was the cache-hit address. Next round is live.`
      );
      return;
    }

    setShakeRowAddress(probe.address);
    const riskIncrease = 15 + Math.floor(Math.random() * 11);
    const nextRisk = Math.min(100, detectionRisk + riskIncrease);
    setDetectionRisk(nextRisk);
    setRiskPulseKey((key) => key + 1);
    setRoundReady(nextRisk < 100);
    setProbes(
      nextRisk >= 100
        ? clearProbeHits
        : reshuffleHit
    );
    announce(
      nextRisk >= 100
        ? "System alert triggered. Attack failed before the secret was reconstructed."
        : "Wrong address. Suspicious probing activity increased."
    );
  }

  function resetSimulation() {
    const nextSecret = chooseSecret();
    setSecret(nextSecret);
    setView("user");
    setViewTransitionKey((key) => key + 1);
    setRevealed(0);
    setDetectionRisk(0);
    setProbes(makeProbeSet(null, generateBaseAddress()));
    setRoundReady(false);
    setAddressesVisible(false);
    setRandomBuffer(makeMaskedBuffer(nextSecret.length));
    setLastLockedIndex(-1);
    setResultModalStage("closed");
    setTimerStarted(false);
    setAttackTimeLeft(ATTACK_TIME_MS);
    setTimedOut(false);
    announce(INITIAL_MESSAGE);
  }

  return (
    <section className="password-leak">
      <div className="sim-heading">
        <span>
          The password remains hidden, but cache timing can still reveal clues.
        </span>
      </div>

      <ol className="rules-list">
        {RULES.map((rule, index) => (
          <li className="rule-card" key={rule.title} style={{ transitionDelay: `${index * 70}ms` }}>
            <span className="rule-number">{index + 1}</span>
            <div className="rule-copy">
              <p className="rule-title">{rule.title}</p>
              <p className="rule-detail">{rule.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="terminal-frame">
        <header>
          <strong>Memory Access Monitor — Side Channel Demo</strong>
          <div className="header-controls">
            <span
              key={viewTransitionKey}
              className={`view-pill ${view === "attacker" ? "alert" : "safe"}`}
            >
              {view === "attacker" ? "Attacker View Active" : "User View Active"}
            </span>
            <button
              className={`reset-button ${gameEnded ? "cta-highlight cta-highlight--neutral" : ""}`}
              onClick={resetSimulation}
            >
              Reset
            </button>
          </div>
        </header>

        {timerStarted && (
          <div className="attack-timer-wrap">
            <div className="attack-timer-top">
              <span>Attack Window</span>
              <span className={`attack-seconds ${attackTone}`}>
                {timedOut ? "0.0s" : `${attackSeconds}s`}
              </span>
            </div>
            <div className="attack-bar" aria-label={`Attack window ${attackSeconds} seconds remaining`}>
              <div className={`attack-fill ${attackTone}`} style={{ width: `${attackPercent}%` }} />
            </div>
          </div>
        )}

        <div className="panels-viewport">
          <div className={`panels ${view === "attacker" ? "panels--attacker" : ""}`}>
            <div className="panel">
              <p className="eyebrow">User Interface</p>
              <div className="password-box">
                <span>Password:</span>
                <strong>{"*".repeat(secret.length)}</strong>
              </div>

              <div className={`status-line ${statusTone}`}>
                <span key={statusFlipKey} className="status-dot" />
                <span key={`label-${statusFlipKey}`} className="status-label">
                  {systemStatus}
                </span>
                <span className="status-risk">Detection risk {detectionRisk}%</span>
              </div>

              <div className="risk-meter" aria-label={`Detection risk ${detectionRisk}%`}>
                <span
                  key={riskPulseKey}
                  className="risk-fill"
                  style={{ width: `${detectionRisk}%` }}
                />
              </div>

              <p className="note">
                From the application's perspective, the credential remains masked.
                The password field itself never displays the secret.
              </p>

              {view === "user" ? (
                <button
                  className={`primary ${!gameEnded ? "cta-highlight" : ""}`}
                  onClick={() => switchView("attacker")}
                >
                  View as Attacker
                </button>
              ) : (
                <button className="secondary" onClick={() => switchView("user")}>
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
                      className={`char-cell ${index < revealed ? "locked-char" : "unknown-char"} ${
                        index === lastLockedIndex ? "just-locked" : ""
                      }`}
                      key={`${index}-${index < revealed ? "locked" : "unknown"}-${
                        index === lastLockedIndex ? lockPulseKey : "static"
                      }`}
                      onAnimationEnd={() => {
                        if (index === lastLockedIndex) setLastLockedIndex(-1);
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>

              <div className={`probe-table ${roundReady && canPlay ? "probe-table--live" : ""}`} aria-label="Probe-array timing list">
                <div className="probe-head" aria-hidden="true">
                  <span>Probe Address</span>
                  <span>Access Time</span>
                </div>

                {probes.map((probe) => {
                  const width = cycleBarWidth(probe.cycles);
                  const visibleAddress = addressesVisible ? probe.address : "0x????";
                  const isShaking = shakeRowAddress === probe.address;
                  return (
                    <button
                      key={probe.address}
                      className={`probe-row ${isShaking ? "shake" : ""}`}
                      disabled={!roundReady || !canPlay}
                      onClick={() => chooseProbe(probe)}
                      onAnimationEnd={() => {
                        if (isShaking) setShakeRowAddress(null);
                      }}
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
                  className={`danger ${canPlay && !roundReady ? "cta-highlight cta-highlight--danger" : ""}`}
                  disabled={!canPlay || roundReady}
                  onClick={triggerMemoryAccess}
                >
                  Trigger Memory Access
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer className={gameWon ? "success" : gameLost ? "failure" : ""}>
          <span key={messageKey} className="footer-message">
            {message}
          </span>
          <strong key={instructionKey} className="footer-instruction">
            {instruction}
          </strong>
        </footer>
      </div>

      {gameEnded && (
        <aside className="end-explanation">
          <p className="eyebrow">Reading the Timing Attack</p>
          <p>
            The probe table is a simplified stand-in for a real cache side-channel:
            an attacker measures which memory address answers fastest, and a fast
            answer means that data was already sitting in the cache. That timing
            difference, not the memory itself, is what leaks the secret. Real
            attacks probe far more addresses than shown here, and real attackers
            aren't limited to a fixed 10-second window — that constraint is here
            purely to create urgency in the simulation.
          </p>
        </aside>
      )}

      {resultModalStage !== "closed" && (
        <div
          className={`result-backdrop ${resultModalStage === "closing" ? "is-closing" : ""}`}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && resultModalStage === "closing") {
              setResultModalStage("closed");
            }
          }}
        >
          <div className={`result-card ${gameWon ? "is-success" : "is-failure"}`}>
            <span className="result-tag">{gameWon ? "Access Granted" : "Alert Triggered"}</span>
            <h3 className="result-title">
              {gameWon
                ? "Secret reconstructed"
                : timedOut
                  ? "Attack window expired"
                  : `Detection risk ${detectionRisk}%`}
            </h3>
            <p className="result-body">
              {gameWon
                ? "The full password was recovered one byte at a time by watching which probe address answered fastest."
                : timedOut
                  ? "The 10-second attack window closed before the secret was fully reconstructed."
                  : "From the application's perspective, the credential remains masked. The password field itself never displays the secret."}
            </p>
            <button className="result-confirm" onClick={closeResultModal}>
              Confirm
            </button>
          </div>
        </div>
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
          animation: frameIn 0.5s ease both;
        }

        @keyframes frameIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .sim-heading {
          margin-bottom: 28px;
        }

        .rules-list {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          list-style: none;
          margin: 0 0 28px;
          padding: 0;
        }

        .rule-card {
          background: rgba(16, 23, 35, 0.6);
          border: 1px solid var(--line);
          border-radius: 8px;
          display: flex;
          gap: 14px;
          padding: 16px;
          opacity: 0;
          transform: translateY(10px);
          animation: ruleIn 0.5s ease both;
          transition: border-color 0.3s ease, background 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease;
        }

        @keyframes ruleIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .rule-card:hover {
          border-color: rgba(37, 243, 154, 0.4);
          background: rgba(37, 243, 154, 0.05);
          transform: translateY(-4px);
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28);
        }

        .rule-number {
          align-items: center;
          border: 1px solid rgba(37, 243, 154, 0.4);
          border-radius: 50%;
          color: var(--green);
          display: flex;
          flex-shrink: 0;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.82rem;
          font-weight: 700;
          height: 28px;
          justify-content: center;
          width: 28px;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease, color 0.3s ease;
        }

        .rule-card:hover .rule-number {
          transform: scale(1.15) rotate(-6deg);
          background: var(--green);
          color: #070b10;
        }

        .rule-title {
          color: var(--text);
          font-size: 0.86rem;
          font-weight: 700;
          margin: 0 0 4px;
          transition: color 0.3s ease;
        }

        .rule-detail {
          color: var(--muted);
          font-size: 0.8rem;
          line-height: 1.55;
          margin: 0;
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.35s ease, opacity 0.3s ease, margin-top 0.3s ease;
        }

        .rule-card:hover .rule-detail {
          max-height: 140px;
          opacity: 1;
          margin-top: 2px;
        }

        @media (max-width: 760px) {
          .rules-list {
            grid-template-columns: 1fr;
          }
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
          transition: box-shadow 0.4s ease, border-color 0.4s ease;
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

        .header-controls {
          align-items: center;
          display: flex;
          gap: 14px;
        }

        .reset-button {
          background: transparent;
          border: 1px solid #4a668a;
          color: #b7c7da;
          cursor: pointer;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          min-height: 30px;
          padding: 0 12px;
          text-transform: uppercase;
          transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.15s ease;
        }

        .reset-button:hover {
          background: rgba(74, 102, 138, 0.18);
          transform: translateY(-1px);
        }

        .view-pill {
          animation: pillIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes pillIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .safe { color: var(--green); }
        .alert, .failure { color: var(--red); }
        .success { color: var(--green); }

        .attack-timer-wrap {
          animation: attackTimerIn 0.3s ease both;
          border-bottom: 1px solid var(--line);
          padding: 12px 22px;
        }

        @keyframes attackTimerIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .attack-timer-top {
          align-items: center;
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .attack-timer-top span:first-child {
          color: var(--muted);
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.68rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .attack-seconds {
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.9rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          transition: color 0.3s ease;
        }

        .attack-seconds.attack-safe { color: var(--green); }
        .attack-seconds.attack-warn { color: var(--amber); }
        .attack-seconds.attack-danger {
          color: var(--red);
          animation: attackPulseText 0.6s ease-in-out infinite;
        }

        @keyframes attackPulseText {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .attack-bar {
          background: #1d2533;
          border-radius: 5px;
          height: 10px;
          overflow: hidden;
        }

        .attack-fill {
          height: 100%;
          transition: width 100ms linear, background 0.3s ease;
        }

        .attack-fill.attack-safe { background: linear-gradient(90deg, var(--green), #b8ffe0); }
        .attack-fill.attack-warn { background: linear-gradient(90deg, var(--amber), #ffe1a8); }
        .attack-fill.attack-danger {
          background: linear-gradient(90deg, var(--red), #ff8fa0);
          animation: attackPulseBar 0.6s ease-in-out infinite;
        }

        @keyframes attackPulseBar {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.4); }
        }

        .panels-viewport {
          overflow: hidden;
        }

        .panels {
          display: flex;
          width: 200%;
          min-height: 420px;
          transform: translateX(0%);
          transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .panels--attacker {
          transform: translateX(-50%);
        }

        .panel {
          box-sizing: border-box;
          width: 50%;
          flex-shrink: 0;
          min-width: 0;
          padding: 28px;
          transition: background 0.3s ease;
        }

        .panel:hover {
          background: rgba(255, 255, 255, 0.015);
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
          transition: border-color 0.3s ease, background 0.3s ease, transform 0.3s ease;
        }

        .password-box:hover {
          border-color: rgba(37, 243, 154, 0.35);
          transform: translateY(-2px);
        }

        .password-box span {
          color: var(--muted);
          font-size: 0.78rem;
        }

        .password-box strong {
          color: var(--text);
          font-family: "Courier New", ui-monospace, monospace;
          font-size: clamp(1.4rem, 4vw, 2.1rem);
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
          animation: dotIn 0.3s ease both, dotPulse 1.8s ease-in-out 0.3s infinite;
        }

        @keyframes dotIn {
          from { transform: scale(0.4); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes dotPulse {
          0%, 100% { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
          50% { box-shadow: 0 0 0 4px transparent; opacity: 0.55; }
        }

        .status-label {
          display: inline-block;
          animation: labelSwap 0.3s ease both;
        }

        @keyframes labelSwap {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
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
          border-radius: 4px;
        }

        .risk-fill {
          background: linear-gradient(90deg, var(--green), var(--amber), var(--red));
          display: block;
          height: 100%;
          transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
          animation: fillPulse 0.5s ease;
        }

        @keyframes fillPulse {
          0% { filter: brightness(1.9); }
          100% { filter: brightness(1); }
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
          font-size: clamp(1.1rem, 2.6vw, 1.6rem);
          font-weight: 700;
          letter-spacing: 0.1em;
          min-height: 58px;
          overflow: hidden;
          padding: 0 16px;
          white-space: nowrap;
          transition: border-color 0.3s ease;
        }

        .reconstruction-field:hover {
          border-color: rgba(37, 243, 154, 0.3);
        }

        .char-cell {
          display: inline-block;
          transition: color 0.15s ease;
        }

        .locked-char {
          color: var(--green);
          text-shadow: 0 0 14px rgba(37, 243, 154, 0.35);
        }

        .unknown-char {
          color: #d1d8e2;
          opacity: 0.68;
        }

        .just-locked {
          animation: lockPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes lockPop {
          0% {
            transform: translateY(-10px) scale(1.3);
            opacity: 0;
            color: #fff;
            text-shadow: 0 0 22px rgba(37, 243, 154, 0.9);
          }
          60% {
            transform: translateY(1px) scale(1.08);
            opacity: 1;
          }
          100% {
            transform: translateY(0) scale(1);
            text-shadow: 0 0 14px rgba(37, 243, 154, 0.35);
          }
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
          transition: background 0.15s, border-color 0.15s, transform 0.15s ease;
          animation: rowIn 0.3s ease both;
        }

        @keyframes rowIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .probe-row:disabled {
          cursor: default;
          opacity: 0.55;
        }

        .probe-row:not(:disabled):hover,
        .probe-row:not(:disabled):focus-visible {
          background: rgba(37, 243, 154, 0.06);
          border-color: rgba(37, 243, 154, 0.3);
          transform: translateX(2px);
        }

        .probe-row:not(:disabled):active {
          transform: translateX(2px) scale(0.99);
        }

        .probe-row.shake {
          animation: rowShake 0.4s ease;
          border-color: rgba(255, 60, 85, 0.5);
          background: rgba(255, 60, 85, 0.08);
        }

        @keyframes rowShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(3px); }
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
          transition: left 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .actions button {
          flex: 1;
          min-width: 200px;
        }

        .cta-highlight {
          position: relative;
          animation: ctaPulseGreen 1.8s ease-in-out infinite;
        }

        .cta-highlight::after {
          animation: tagIn 0.3s ease 0.15s both;
          background: var(--green);
          border-radius: 3px;
          color: #070b10;
          content: "Click this";
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.6rem;
          font-weight: 700;
          left: 50%;
          letter-spacing: 0.06em;
          padding: 3px 8px;
          position: absolute;
          text-transform: uppercase;
          top: -24px;
          transform: translateX(-50%);
          white-space: nowrap;
        }

        .cta-highlight--danger {
          animation: ctaPulseRed 1.8s ease-in-out infinite;
        }

        .cta-highlight--danger::after {
          background: var(--red);
          color: #fff;
        }

        .cta-highlight--neutral {
          animation: ctaPulseNeutral 1.8s ease-in-out infinite;
        }

        .cta-highlight--neutral::after {
          background: #b7c7da;
          color: #0b111a;
        }

        @keyframes tagIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        @keyframes ctaPulseGreen {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37, 243, 154, 0.4); }
          50% { box-shadow: 0 0 0 7px rgba(37, 243, 154, 0); }
        }

        @keyframes ctaPulseRed {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 60, 85, 0.4); }
          50% { box-shadow: 0 0 0 7px rgba(255, 60, 85, 0); }
        }

        @keyframes ctaPulseNeutral {
          0%, 100% { box-shadow: 0 0 0 0 rgba(183, 199, 218, 0.35); }
          50% { box-shadow: 0 0 0 6px rgba(183, 199, 218, 0); }
        }

        .probe-table--live {
          border-radius: 4px;
          outline: 1px solid rgba(37, 243, 154, 0.3);
          outline-offset: 6px;
          animation: tableGlow 1.8s ease-in-out infinite;
        }

        @keyframes tableGlow {
          0%, 100% { outline-color: rgba(37, 243, 154, 0.15); }
          50% { outline-color: rgba(37, 243, 154, 0.5); }
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
          transition: background 0.18s ease, color 0.18s ease, transform 0.15s ease, box-shadow 0.18s ease;
        }

        button.primary:hover:not(:disabled),
        button.secondary:hover:not(:disabled),
        button.danger:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        button.primary:active:not(:disabled),
        button.secondary:active:not(:disabled),
        button.danger:active:not(:disabled) {
          transform: translateY(0);
        }

        button.primary {
          border-color: var(--green);
          color: var(--green);
        }

        button.primary:hover:not(:disabled) {
          background: var(--green);
          color: #070b10;
          box-shadow: 0 6px 18px rgba(37, 243, 154, 0.25);
        }

        button.secondary {
          border-color: #4a668a;
          color: #b7c7da;
        }

        button.secondary:hover:not(:disabled) {
          background: rgba(74, 102, 138, 0.18);
        }

        button.danger {
          border-color: var(--red);
          color: var(--red);
        }

        button.danger:hover:not(:disabled) {
          background: var(--red);
          color: #fff;
          box-shadow: 0 6px 18px rgba(255, 60, 85, 0.25);
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
          transition: color 0.3s ease;
        }

        .terminal-frame footer strong {
          color: var(--text);
          font-size: 0.78rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .footer-message {
          display: block;
          animation: messageIn 0.3s ease both;
        }

        .footer-instruction {
          display: block;
          animation: messageIn 0.3s ease both;
        }

        @keyframes messageIn {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .end-explanation {
          background: rgba(16, 23, 35, 0.78);
          border: 1px solid var(--line);
          margin-top: 22px;
          padding: 22px;
          animation: explanationIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes explanationIn {
          0% { opacity: 0; transform: translateY(14px); border-color: var(--line); }
          60% { border-color: rgba(37, 243, 154, 0.35); }
          100% { opacity: 1; transform: translateY(0); border-color: var(--line); }
        }

        .end-explanation p:last-child {
          margin-bottom: 0;
        }

        .result-backdrop {
          align-items: center;
          background: rgba(4, 7, 12, 0.72);
          backdrop-filter: blur(3px);
          bottom: 0;
          display: flex;
          justify-content: center;
          left: 0;
          padding: 24px;
          position: fixed;
          right: 0;
          top: 0;
          z-index: 60;
          animation: backdropIn 0.25s ease both;
        }

        .result-backdrop.is-closing {
          animation: backdropOut 0.25s ease both;
        }

        @keyframes backdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes backdropOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        .result-card {
          background: linear-gradient(180deg, #141d2c, #0c131e);
          border: 1px solid var(--line);
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55);
          max-width: 420px;
          padding: 32px;
          text-align: left;
          width: 100%;
          animation: cardIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        .result-backdrop.is-closing .result-card {
          animation: cardOut 0.22s ease both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.94); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes cardOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(10px) scale(0.96); }
        }

        .result-card.is-success {
          border-color: rgba(37, 243, 154, 0.4);
          box-shadow: 0 30px 90px rgba(37, 243, 154, 0.12);
        }

        .result-card.is-failure {
          border-color: rgba(255, 60, 85, 0.4);
          box-shadow: 0 30px 90px rgba(255, 60, 85, 0.12);
        }

        .result-tag {
          display: inline-block;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          margin-bottom: 14px;
          text-transform: uppercase;
          animation: pillIn 0.4s ease 0.1s both;
        }

        .result-card.is-success .result-tag {
          color: var(--green);
        }

        .result-card.is-failure .result-tag {
          color: var(--red);
        }

        .result-title {
          color: var(--text);
          font-size: 1.35rem;
          font-weight: 700;
          margin: 0 0 12px;
          animation: messageIn 0.4s ease 0.14s both;
        }

        .result-body {
          color: var(--muted);
          font-size: 0.9rem;
          line-height: 1.65;
          margin: 0 0 24px;
          animation: messageIn 0.4s ease 0.18s both;
        }

        .result-confirm {
          background: transparent;
          border: 1px solid;
          cursor: pointer;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.78rem;
          font-weight: 700;
          min-height: 42px;
          padding: 0 22px;
          text-transform: uppercase;
          transition: background 0.18s ease, color 0.18s ease, transform 0.15s ease, box-shadow 0.18s ease;
          animation: messageIn 0.4s ease 0.22s both;
        }

        .result-card.is-success .result-confirm {
          border-color: var(--green);
          color: var(--green);
        }

        .result-card.is-success .result-confirm:hover {
          background: var(--green);
          color: #070b10;
          box-shadow: 0 6px 18px rgba(37, 243, 154, 0.25);
          transform: translateY(-2px);
        }

        .result-card.is-failure .result-confirm {
          border-color: var(--red);
          color: var(--red);
        }

        .result-card.is-failure .result-confirm:hover {
          background: var(--red);
          color: #fff;
          box-shadow: 0 6px 18px rgba(255, 60, 85, 0.25);
          transform: translateY(-2px);
        }

        @media (max-width: 860px) {
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

        @media (prefers-reduced-motion: reduce) {
          .password-leak,
          .view-pill,
          .status-dot,
          .status-label,
          .risk-fill,
          .just-locked,
          .probe-row,
          .probe-row.shake,
          button.primary,
          button.secondary,
          button.danger,
          .footer-message,
          .footer-instruction,
          .end-explanation,
          .rule-card,
          .rule-number,
          .rule-detail,
          .panels,
          .panel,
          .password-box,
          .reconstruction-field,
          .result-backdrop,
          .result-card,
          .result-tag,
          .result-title,
          .result-body,
          .result-confirm,
          .cta-highlight,
          .cta-highlight::after,
          .probe-table--live,
          .reset-button,
          .attack-timer-wrap,
          .attack-seconds.attack-danger,
          .attack-fill.attack-danger {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </section>
  );
}