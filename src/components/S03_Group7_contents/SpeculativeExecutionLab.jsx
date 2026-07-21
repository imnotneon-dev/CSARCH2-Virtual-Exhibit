import { useEffect, useMemo, useRef, useState } from "react";

const ROUND_COUNT = 10;
const STARTING_CYCLES = 30;
const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const END_STATUSES = new Set(["Cache Leak", "Budget Exhausted", "Complete"]);
const INITIAL_MESSAGE =
  "Read the instruction card, then choose how the CPU should handle the branch before the clock runs out.";
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

const ROUND_TIME_START = 9000;
const ROUND_TIME_STEP = 450;
const ROUND_TIME_MIN = 4200;
const TICK_MS = 100;
const FAST_REACTION_RATIO = 0.6;

const RULES = [
  {
    title: "Read the instruction card",
    detail:
      "See what the code does, how sensitive the data is, and how confident the branch predictor is.",
  },
  {
    title: "Check the policy read",
    detail:
      "A plain-language take on whether this branch is actually worth speculating on.",
  },
  {
    title: "Pick a player action",
    detail:
      "Wait, Speculate, Speculate + Flush, or Fence. Each spends cycles and risk differently.",
  },
  {
    title: "Beat the clock",
    detail:
      "Every round gives you a shrinking window to decide. Let it run out and the CPU speculates anyway, no cleanup included.",
  },
  {
    title: "Watch both gauges",
    detail:
      "The run ends if Cache Trace Risk hits 100%, the Cycle Budget hits 0, or all 10 rounds clear.",
  },
];

const ACTION_GUIDE = [
  {
    id: "wait",
    label: "Wait for Check",
    tone: "tone-safe",
    summary: "Resolve the branch condition first, then run the code once the answer is known.",
    whenClicked:
      "Costs about 3-4 cycles. No speculative work ever runs, so this never creates a cache trace.",
  },
  {
    id: "speculate",
    label: "Speculate",
    tone: "tone-risk",
    summary: "Guess the branch outcome and execute immediately, before the check resolves.",
    whenClicked:
      "Only 1 cycle if the guess is right. If it's wrong, the result is discarded, but it can still leave a cache trace and raise risk, especially on sensitive data.",
  },
  {
    id: "flush",
    label: "Speculate + Flush",
    tone: "tone-mid",
    summary: "Speculate like above, then actively clear out any leftover cache state.",
    whenClicked:
      "Costs 3-4 cycles either way. Cuts down the leftover trace risk from a wrong guess, but a flush is never perfectly clean.",
  },
  {
    id: "fence",
    label: "Insert Fence",
    tone: "tone-safe",
    summary: "Block speculation from crossing this branch at all.",
    whenClicked:
      "Costs 4-5 cycles, the most of any option. Cache trace risk stays at zero no matter what the predictor thinks.",
  },
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
  { id: "wait", label: "Wait for Check", tone: "tone-safe", key: "1" },
  { id: "speculate", label: "Speculate", tone: "tone-risk", key: "2" },
  { id: "flush", label: "Speculate + Flush", tone: "tone-mid", key: "3" },
  { id: "fence", label: "Insert Fence", tone: "tone-safe", key: "4" },
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

function getEndMessage(status) {
  if (status === "Complete") {
    return "Execution completed. Workload retired before risk or cycles failed.";
  }

  if (status === "Cache Leak") {
    return "Cache Trace Risk reached 100%. Secret data leaked through speculative side effects.";
  }

  return "Cycle budget exhausted. The CPU was too slow to complete the workload.";
}

function ringTone(percent, invert) {
  const value = invert ? 100 - percent : percent;
  if (value >= 70) return "ring-danger";
  if (value >= 40) return "ring-warn";
  return "ring-safe";
}

function getRoundTimeBudget(roundIndexZeroBased) {
  return Math.max(
    ROUND_TIME_MIN,
    ROUND_TIME_START - roundIndexZeroBased * ROUND_TIME_STEP
  );
}

// How long the numbered rule card stays open after the pointer/focus leaves it.
// Gives people room to move from the number badge down into the detail text
// without the reveal snapping shut mid-travel.
const RULE_CLOSE_DELAY = 450;

export default function SpeculativeExecutionLab() {
  const [deck, setDeck] = useState(createInitialDeck);
  const [roundIndex, setRoundIndex] = useState(0);
  const [cycles, setCycles] = useState(STARTING_CYCLES);
  const [performance, setPerformance] = useState(0);
  const [cacheRisk, setCacheRisk] = useState(0);
  const [lastAction, setLastAction] = useState(null);
  const [message, setMessage] = useState(INITIAL_MESSAGE);
  const [messageKey, setMessageKey] = useState(0);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [statusKey, setStatusKey] = useState(0);
  const [riskPulseKey, setRiskPulseKey] = useState(0);
  const [cyclesPulseKey, setCyclesPulseKey] = useState(0);
  const [perfPulseKey, setPerfPulseKey] = useState(0);
  const [selectionPulseKey, setSelectionPulseKey] = useState(0);
  const [instructionKey, setInstructionKey] = useState(0);
  const [resultModalStage, setResultModalStage] = useState("closed");
  const [openRuleIndex, setOpenRuleIndex] = useState(null);
  const ruleCloseTimeout = useRef(null);

  // Gates the decision clock. The timer effect below only arms itself once
  // this flips to true, so the round countdown never runs just because the
  // page is open — the player has to explicitly start the lab first.
  const [gameStarted, setGameStarted] = useState(false);

  const [timeBudget, setTimeBudget] = useState(ROUND_TIME_START);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME_START);
  const [streak, setStreak] = useState(0);
  const [streakPulseKey, setStreakPulseKey] = useState(0);
  const [reactionTag, setReactionTag] = useState(null);
  const [shaking, setShaking] = useState(false);
  const actionTakenRef = useRef(false);
  const timerRef = useRef(null);
  const reactionTagTimeout = useRef(null);

  useEffect(() => {
    setDeck(createDeck());
  }, []);

  useEffect(() => {
    return () => {
      if (ruleCloseTimeout.current) clearTimeout(ruleCloseTimeout.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (reactionTagTimeout.current) clearTimeout(reactionTagTimeout.current);
    };
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

  const cyclesPercent = clamp((Math.max(0, cycles) / STARTING_CYCLES) * 100, 0, 100);
  const cycleDashOffset =
    RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * cyclesPercent) / 100;
  const riskDashOffset =
    RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * cacheRisk) / 100;
  const cycleTone = ringTone(cyclesPercent, true);
  const riskToneClass = ringTone(cacheRisk, false);
  const confidence = currentRound?.confidence ?? 0;
  const confidenceTone = confidence >= 70 ? "conf-strong" : "conf-weak";

  const clockPercent = clamp((timeLeft / timeBudget) * 100, 0, 100);
  const clockTone =
    clockPercent <= 20 ? "clock-danger" : clockPercent <= 50 ? "clock-warn" : "clock-safe";
  const clockSeconds = (Math.max(0, timeLeft) / 1000).toFixed(1);

  const statusTone =
    status === "Cache Leak"
      ? "status-red"
      : status === "Budget Exhausted"
        ? "status-red"
        : status === "Complete"
          ? "status-green"
          : status === "High Risk" || status === "Cycle Pressure"
            ? "status-amber"
            : "status-green";
  const instructionText = !gameStarted
    ? "Press Start Simulation to arm the decision clock."
    : gameEnded
      ? "Press Reset Lab to load a new instruction stream."
      : `Round ${Math.min(roundIndex + 1, deck.length)} of ${deck.length} \u2014 decide before the clock hits zero.`;

  useEffect(() => {
    setStatusKey((key) => key + 1);
  }, [status]);

  useEffect(() => {
    setInstructionKey((key) => key + 1);
  }, [instructionText]);

  useEffect(() => {
    if (gameEnded) {
      setResultModalStage("open");
    }
  }, [gameEnded]);

  // Decision clock: only arms once the player has pressed Start, resets every
  // round, ticks down, and forces a timeout resolution if the player hasn't
  // acted before it reaches zero.
  useEffect(() => {
    if (gameEnded || !gameStarted) return undefined;

    const budget = getRoundTimeBudget(roundIndex);
    setTimeBudget(budget);
    setTimeLeft(budget);
    actionTakenRef.current = false;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((current) => Math.max(0, current - TICK_MS));
    }, TICK_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roundIndex, gameEnded, gameStarted]);

  useEffect(() => {
    if (
      gameStarted &&
      timeLeft <= 0 &&
      !actionTakenRef.current &&
      !gameEnded &&
      currentRound
    ) {
      handleTimeout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  useEffect(() => {
    function handleKeydown(event) {
      if (gameEnded || !gameStarted) return;
      const action = ACTIONS.find((candidate) => candidate.key === event.key);
      if (action) takeAction(action.id);
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  function closeResultModal() {
    setResultModalStage("closing");
  }

  function pushLog(entry) {
    setLogs((current) => [entry, ...current].slice(0, 8));
  }

  function openRuleCard(index) {
    if (ruleCloseTimeout.current) {
      clearTimeout(ruleCloseTimeout.current);
      ruleCloseTimeout.current = null;
    }
    setOpenRuleIndex(index);
  }

  function scheduleCloseRuleCard() {
    if (ruleCloseTimeout.current) clearTimeout(ruleCloseTimeout.current);
    ruleCloseTimeout.current = setTimeout(() => {
      setOpenRuleIndex(null);
    }, RULE_CLOSE_DELAY);
  }

  function flashReaction(text) {
    if (reactionTagTimeout.current) clearTimeout(reactionTagTimeout.current);
    setReactionTag({ key: Date.now(), text });
    reactionTagTimeout.current = setTimeout(() => setReactionTag(null), 1300);
  }

  function handleTimeout() {
    if (gameEnded || !currentRound) return;
    actionTakenRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    const base = evaluateAction("speculate", currentRound);
    const extraRisk = 8 + Math.floor(Math.random() * 6);
    const spentCycles = Math.max(1, base.cycles);
    const nextCycles = cycles - spentCycles;
    const addedRisk = base.risk + extraRisk;
    const nextRisk = clamp(cacheRisk + addedRisk, 0, 100);
    const nextRound = roundIndex + 1;

    setCycles(nextCycles);
    setCyclesPulseKey((key) => key + 1);
    setCacheRisk(nextRisk);
    setRiskPulseKey((key) => key + 1);
    setLastAction("timeout");
    setSelectionPulseKey((key) => key + 1);
    setMessage(
      "No decision made in time. The CPU defaulted to full speculation, and the leftover trace was worse for it."
    );
    setMessageKey((key) => key + 1);
    setStreak(0);
    setStreakPulseKey((key) => key + 1);
    setShaking(true);
    pushLog(
      `round ${roundIndex + 1}: no decision (timeout) | cycles -${spentCycles} | risk +${addedRisk}%`
    );

    setRoundIndex(nextRound);
  }

  function takeAction(actionId) {
    if (gameEnded || !gameStarted || !currentRound || actionTakenRef.current) return;
    actionTakenRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    const action = ACTIONS.find((candidate) => candidate.id === actionId);
    if (!action) return;

    const result = evaluateAction(actionId, currentRound);
    const reactionRatio = timeBudget > 0 ? timeLeft / timeBudget : 0;
    const fastReaction = reactionRatio > FAST_REACTION_RATIO;
    const bonus = fastReaction ? 1 : 0;

    const nextCycles = cycles - result.cycles;
    const nextRisk = clamp(cacheRisk + result.risk, 0, 100);
    const nextPerformance = performance + result.score + bonus;
    const nextRound = roundIndex + 1;
    const cleanPick = result.risk === 0;

    setCycles(nextCycles);
    setCyclesPulseKey((key) => key + 1);
    setCacheRisk(nextRisk);
    setRiskPulseKey((key) => key + 1);
    setPerformance(nextPerformance);
    setPerfPulseKey((key) => key + 1);
    setLastAction(actionId);
    setSelectionPulseKey((key) => key + 1);
    setMessage(result.message);
    setMessageKey((key) => key + 1);

    setStreak((current) => (cleanPick ? current + 1 : 0));
    setStreakPulseKey((key) => key + 1);

    if (fastReaction) flashReaction("Fast reaction +1");

    pushLog(
      `round ${roundIndex + 1}: ${action.label.toLowerCase()} | cycles -${result.cycles} | risk +${result.risk}%${
        bonus ? " | +1 fast" : ""
      }`
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
    setMessageKey((key) => key + 1);
    setLogs(RESET_LOGS);
    setResultModalStage("closed");
    setStreak(0);
    setReactionTag(null);
    // Return to the standby screen rather than re-arming the clock
    // immediately, so a fresh run always starts on the player's terms.
    setGameStarted(false);
  }

  return (
    <section className={`spec-lab ${toClassName(status)} ${shaking ? "is-shaking" : ""}`}>
      <div className="game-heading">
        <span>
          You are the CPU. Each round hands you one branch instruction it's
          about to run, and a shrinking window to decide. Watch the gauges,
          weigh the predictor's confidence, then speculate, wait, flush, or
          fence the branch before time runs out.
        </span>
      </div>

      <ol className="rules-list">
        {RULES.map((rule, index) => (
          <li
            className={`rule-card ${openRuleIndex === index ? "is-open" : ""}`}
            key={rule.title}
            style={{ transitionDelay: `${index * 70}ms` }}
            onMouseEnter={() => openRuleCard(index)}
            onMouseLeave={scheduleCloseRuleCard}
            onFocus={() => openRuleCard(index)}
            onBlur={scheduleCloseRuleCard}
            tabIndex={0}
          >
            <span className="rule-number">{index + 1}</span>
            <div className="rule-copy">
              <p className="rule-title">{rule.title}</p>
              <p className="rule-detail">{rule.detail}</p>
            </div>
          </li>
        ))}
      </ol>

       <p className="eyebrow action-guide-heading">What Each Action Does</p>
          <div className="action-guide">
            <div className="action-guide-line" />
            {ACTION_GUIDE.map((item) => (
              <div className={`action-guide-item ${item.tone}`} key={item.id} tabIndex={0}>
                <span className="action-guide-dot" />
                <div className="action-guide-copy">
                  <strong>{item.label}</strong>
                  <p>{item.summary}</p>
                  <div className="action-guide-impact">
                    <span>When clicked</span>
                    <p>{item.whenClicked}</p>
                  </div>
                </div>
              </div>
            ))}
        </div>

      <div className={`lab-frame ${shaking ? "shake-once" : ""}`} onAnimationEnd={() => setShaking(false)}>
        {!gameStarted && (
          <div className="start-overlay">
            <div className="start-card">
              <span className="start-tag">Lab Standby</span>
              <h3 className="start-title">Speculative Execution Lab</h3>
              <p className="start-body">
                The decision clock stays off until you begin. Skim the rules
                above, then start the run when you're ready to act on the
                clock.
              </p>
              <button className="start-button" onClick={() => setGameStarted(true)}>
                Start Simulation
              </button>
            </div>
          </div>
        )}

        <header>
          <strong>CPU Pipeline Console - Spectre Tradeoff Drill</strong>
          <div className="header-controls">
            <span className="stat-chip">
              Round {Math.min(roundIndex + 1, deck.length)}/{deck.length}
            </span>
            <span className="stat-chip">
              Score <b key={perfPulseKey} className="stat-pop">{performance}</b>
            </span>
            <span className={`stat-chip ${streak >= 3 ? "stat-chip--hot" : ""}`}>
              Streak <b key={streakPulseKey} className="stat-pop">x{streak}</b>
            </span>
            <span key={statusKey} className={`status-pill ${statusTone}`}>
              <span className="status-dot" />
              <span className="status-label">{status}</span>
            </span>
            <button
              className={`reset-button ${gameEnded ? "cta-highlight cta-highlight--neutral" : ""}`}
              onClick={resetGame}
            >
              Reset Lab
            </button>
          </div>
        </header>

        <div className="clock-bar-wrap">
          <div className="clock-bar-top">
            <span>Decision Clock</span>
            <span className={`clock-seconds ${clockTone}`}>{clockSeconds}s</span>
          </div>
          <div className="clock-bar" aria-label={`Time remaining ${clockSeconds} seconds`}>
            <div className={`clock-fill ${clockTone}`} style={{ width: `${clockPercent}%` }} />
          </div>
        </div>

        <div className="console" key={currentRound?.roundNumber}>
          <div className="gauge-row">
            <div className="gauge">
              <svg viewBox="0 0 120 120" className="ring-svg">
                <circle cx="60" cy="60" r={RING_RADIUS} className="ring-track" />
                <circle
                  cx="60"
                  cy="60"
                  r={RING_RADIUS}
                  className={`ring-progress ${cycleTone}`}
                  style={{
                    strokeDasharray: RING_CIRCUMFERENCE,
                    strokeDashoffset: cycleDashOffset,
                  }}
                  key={cyclesPulseKey}
                />
                <text x="60" y="66" textAnchor="middle" className="ring-number">
                  {Math.max(0, cycles)}
                </text>
              </svg>
              <div className="gauge-label">
                <span>Cycle Budget</span>
              </div>
            </div>

            <div className="instruction-mini">
              <div className="card-meta">
                <strong>{currentRound?.label}</strong>
                <span className={`risk ${toClassName(currentRound?.baseRisk || "")}`}>
                  {currentRound?.baseRisk} Risk
                </span>
              </div>

              <pre aria-label="Instruction code">
                <code>{currentRound?.instruction.join("\n")}</code>
              </pre>

              <p className="data-line">
                Data type: <b>{currentRound?.dataType}</b>
              </p>

              <div className="policy-read">
                <span>Policy Read</span>
                <p>{policyRead}</p>
              </div>
            </div>

            <div className="gauge">
              <svg viewBox="0 0 120 120" className="ring-svg">
                <circle cx="60" cy="60" r={RING_RADIUS} className="ring-track" />
                <circle
                  cx="60"
                  cy="60"
                  r={RING_RADIUS}
                  className={`ring-progress ${riskToneClass}`}
                  style={{
                    strokeDasharray: RING_CIRCUMFERENCE,
                    strokeDashoffset: riskDashOffset,
                  }}
                  key={riskPulseKey}
                />
                <text x="60" y="66" textAnchor="middle" className="ring-number">
                  {cacheRisk}%
                </text>
              </svg>
              <div className="gauge-label">
                <span>Cache Trace Risk</span>
              </div>
            </div>
          </div>

          <div className="confidence-strip">
            <div className="confidence-copy">
              <span>Branch Predictor</span>
              <strong>{currentRound?.prediction}</strong>
            </div>
            <div className={`confidence-bar ${confidenceTone}`}>
              <div className="confidence-fill" style={{ width: `${confidence}%` }} />
              <div className="confidence-marker" style={{ left: `${confidence}%` }} />
            </div>
            <span className="confidence-value">{confidence}% confidence</span>
          </div>

          <div className="action-row-wrap">
            {reactionTag && (
              <span key={reactionTag.key} className="reaction-tag">
                {reactionTag.text}
              </span>
            )}
            <div className="action-row">
              {ACTIONS.map((action) => {
                const isSelected = lastAction === action.id;
                return (
                  <button
                    className={`${action.tone} ${isSelected ? "selected" : ""}`}
                    disabled={gameEnded || !gameStarted}
                    key={isSelected ? `${action.id}-${selectionPulseKey}` : action.id}
                    onClick={() => takeAction(action.id)}
                    onAnimationEnd={(event) => event.stopPropagation()}
                  >
                    <span className="action-key">{action.key}</span>
                    <span className="action-dot" />
                    {action.label}
                  </button>
                );
              })}
            </div>
            <p className="action-hint">Tip: press 1, 2, 3, or 4 to act instantly.</p>
          </div>
        </div>

        <details className="log-drawer">
          <summary>
            <span className="chevron">&#9656;</span>
            Decision hints &amp; event log
          </summary>
          <div className="drawer-content">
            <div className="hint-list">
              <span>Low sensitivity lets you value speed more aggressively.</span>
              <span>High sensitivity makes a wrong prediction more expensive.</span>
              <span>Weak confidence means the branch history is less trustworthy.</span>
              <span>Protected boundaries amplify the cost of leftover traces.</span>
              <span>Cleanup and serialization both reduce risk, but neither is free.</span>
            </div>
            <div className="log-panel">
              {logs.map((log) => (
                <span className="log-line" key={log}>{log}</span>
              ))}
            </div>
          </div>
        </details>

        <footer className={status === "Complete" ? "success" : gameEnded ? "failure" : ""}>
          <span key={messageKey} className="footer-message">
            {gameEnded ? getEndMessage(status) : message}
          </span>
          <strong key={instructionKey} className="footer-instruction">
            {instructionText}
          </strong>
          {gameEnded && (
            <div className="verdict-card">
              <span>Verdict</span>
              <strong>{verdict.label}</strong>
              <p>{verdict.detail}</p>
            </div>
          )}
        </footer>
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

      {resultModalStage !== "closed" && (
        <div
          className={`result-backdrop ${resultModalStage === "closing" ? "is-closing" : ""}`}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && resultModalStage === "closing") {
              setResultModalStage("closed");
            }
          }}
        >
          <div
            className={`result-card ${
              status === "Complete" ? "is-success" : status === "Cache Leak" ? "is-failure" : "is-warning"
            }`}
          >
            <span className="result-tag">{status}</span>
            <h3 className="result-title">{verdict.label}</h3>
            <p className="result-body">{getEndMessage(status)} {verdict.detail}</p>
            <button className="result-confirm" onClick={closeResultModal}>
              Confirm
            </button>
          </div>
        </div>
      )}

      <style suppressHydrationWarning>{`
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
          animation: labIn 0.5s ease both;
        }

        @keyframes labIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .game-heading {
          background: linear-gradient(135deg, rgba(18, 27, 41, 0.92), rgba(10, 16, 25, 0.78));
          border: 1px solid var(--line);
          border-left: 3px solid var(--green);
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.16);
          margin-bottom: 24px;
          padding: 20px 22px;
          animation: slideFadeIn 0.5s ease 0.05s both;
        }

        @keyframes slideFadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .game-heading span,
        .accuracy-note p {
          color: var(--muted);
          line-height: 1.7;
        }

        .spec-lab .eyebrow {
          color: var(--green);
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          margin: 0 0 10px;
          text-transform: uppercase;
        }

        .rules-list {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          list-style: none;
          margin: 0 0 24px;
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

        .rule-card:hover,
        .rule-card.is-open {
          border-color: rgba(37, 243, 154, 0.4);
          background: rgba(37, 243, 154, 0.05);
          transform: translateY(-4px);
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28);
        }

        .rule-card:focus-visible {
          outline: 1px solid var(--green);
          outline-offset: 3px;
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

        .rule-card:hover .rule-number,
        .rule-card.is-open .rule-number {
          transform: scale(1.15) rotate(-6deg);
          background: var(--green);
          color: #070b10;
        }

        .rule-title {
          color: var(--text);
          font-size: 0.86rem;
          font-weight: 700;
          margin: 0 0 4px;
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

        .rule-card:hover .rule-detail,
        .rule-card.is-open .rule-detail {
          max-height: 140px;
          opacity: 1;
          margin-top: 2px;
        }

        .lab-frame {
          background: linear-gradient(180deg, #121a28, #0b111a);
          border: var(--divider) solid var(--line);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
          animation: slideFadeIn 0.55s ease 0.18s both;
          position: relative;
        }

        .lab-frame.shake-once {
          animation: frameShake 0.4s ease;
        }

        @keyframes frameShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(3px); }
        }

        .start-overlay {
          align-items: center;
          background: rgba(6, 10, 16, 0.86);
          backdrop-filter: blur(4px);
          bottom: 0;
          display: flex;
          justify-content: center;
          left: 0;
          padding: 24px;
          position: absolute;
          right: 0;
          top: 0;
          z-index: 40;
          animation: backdropIn 0.3s ease both;
        }

        .start-card {
          animation: cardIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          background: linear-gradient(180deg, #141d2c, #0c131e);
          border: 1px solid rgba(37, 243, 154, 0.35);
          box-shadow: 0 30px 90px rgba(37, 243, 154, 0.12);
          max-width: 400px;
          padding: 32px;
          text-align: center;
          width: 100%;
        }

        .start-tag {
          color: var(--green);
          display: inline-block;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          margin-bottom: 14px;
          text-transform: uppercase;
        }

        .start-title {
          color: var(--text);
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 12px;
        }

        .start-body {
          color: var(--muted);
          font-size: 0.86rem;
          line-height: 1.6;
          margin: 0 0 26px;
        }

        .start-button {
          animation: ctaPulse 1.8s ease-in-out infinite;
          background: var(--green);
          border: 1px solid var(--green);
          color: #070b10;
          cursor: pointer;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          min-height: 44px;
          padding: 0 26px;
          text-transform: uppercase;
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }

        .start-button:hover {
          box-shadow: 0 10px 26px rgba(37, 243, 154, 0.3);
          transform: translateY(-2px);
        }

        .lab-frame header {
          align-items: center;
          border-bottom: var(--divider) solid var(--line);
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          justify-content: space-between;
          padding: 16px 22px;
        }

        .lab-frame header strong {
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.76rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .header-controls {
          align-items: center;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .stat-chip {
          align-items: center;
          background: rgba(139, 160, 186, 0.08);
          border: 1px solid rgba(139, 160, 186, 0.22);
          border-radius: 20px;
          color: var(--muted);
          display: inline-flex;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.7rem;
          gap: 6px;
          letter-spacing: 0.06em;
          padding: 5px 12px;
          text-transform: uppercase;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }

        .stat-chip b {
          color: var(--green);
          font-weight: 700;
        }

        .stat-chip--hot {
          border-color: rgba(246, 183, 60, 0.5);
          box-shadow: 0 0 14px rgba(246, 183, 60, 0.18);
        }

        .stat-chip--hot b {
          color: var(--amber);
        }

        .stat-pop {
          display: inline-block;
          animation: statPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes statPop {
          0% { transform: scale(1.4); text-shadow: 0 0 14px rgba(37, 243, 154, 0.8); }
          100% { transform: scale(1); }
        }

        .status-pill {
          align-items: center;
          display: inline-flex;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.76rem;
          gap: 8px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          animation: pillIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes pillIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .status-dot {
          background: currentColor;
          border-radius: 50%;
          flex-shrink: 0;
          height: 8px;
          width: 8px;
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

        .status-label { display: inline-block; }

        .status-green { color: var(--green); }
        .status-amber { color: var(--amber); }
        .status-red { color: var(--red); }

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
          position: relative;
          transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.15s ease;
        }

        .reset-button:hover {
          background: rgba(74, 102, 138, 0.18);
          transform: translateY(-1px);
        }

        .cta-highlight { animation: ctaPulse 1.8s ease-in-out infinite; }

        .cta-highlight::after {
          animation: tagIn 0.3s ease 0.15s both;
          background: #b7c7da;
          border-radius: 3px;
          color: #0b111a;
          content: "Click this";
          font-size: 0.6rem;
          font-weight: 700;
          left: 50%;
          letter-spacing: 0.06em;
          padding: 3px 8px;
          position: absolute;
          text-transform: uppercase;
          top: -22px;
          transform: translateX(-50%);
          white-space: nowrap;
        }

        @keyframes tagIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(183, 199, 218, 0.35); }
          50% { box-shadow: 0 0 0 7px rgba(183, 199, 218, 0); }
        }

        .clock-bar-wrap {
          border-bottom: 1px solid var(--line);
          padding: 14px 24px;
        }

        .clock-bar-top {
          align-items: center;
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .clock-bar-top span:first-child {
          color: var(--muted);
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.68rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .clock-seconds {
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.9rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          transition: color 0.3s ease;
        }

        .clock-seconds.clock-safe { color: var(--green); }
        .clock-seconds.clock-warn { color: var(--amber); }
        .clock-seconds.clock-danger {
          color: var(--red);
          animation: clockPulseText 0.6s ease-in-out infinite;
        }

        @keyframes clockPulseText {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .clock-bar {
          background: #1d2533;
          border-radius: 5px;
          height: 10px;
          overflow: hidden;
        }

        .clock-fill {
          height: 100%;
          transition: width 100ms linear, background 0.3s ease;
        }

        .clock-fill.clock-safe { background: linear-gradient(90deg, var(--green), #b8ffe0); }
        .clock-fill.clock-warn { background: linear-gradient(90deg, var(--amber), #ffe1a8); }
        .clock-fill.clock-danger {
          background: linear-gradient(90deg, var(--red), #ff8fa0);
          animation: clockPulseBar 0.6s ease-in-out infinite;
        }

        @keyframes clockPulseBar {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.4); }
        }

        .console {
          animation: roundIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
          padding: 26px 24px 10px;
        }

        @keyframes roundIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .gauge-row {
          align-items: start;
          display: grid;
          gap: 20px;
          grid-template-columns: 150px minmax(0, 1fr) 150px;
          margin-bottom: 22px;
        }

        .gauge {
          display: grid;
          justify-items: center;
          row-gap: 10px;
        }

        .ring-svg {
          height: 130px;
          width: 130px;
        }

        .ring-track {
          fill: none;
          stroke: rgba(139, 160, 186, 0.16);
          stroke-width: 10;
        }

        .ring-progress {
          fill: none;
          stroke-linecap: round;
          stroke-width: 10;
          transform: rotate(-90deg);
          transform-origin: 60px 60px;
          transition: stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1), stroke 0.3s ease;
          animation: ringFlash 0.5s ease;
        }

        @keyframes ringFlash {
          0% { filter: brightness(2); }
          100% { filter: brightness(1); }
        }

        .ring-safe { stroke: var(--green); }
        .ring-warn { stroke: var(--amber); }
        .ring-danger { stroke: var(--red); }

        .ring-number {
          fill: var(--text);
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 1.6rem;
          font-weight: 700;
        }

        .gauge-label {
          text-align: center;
        }

        .gauge-label span {
          color: var(--muted);
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.68rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .instruction-mini {
          background: rgba(0, 0, 0, 0.16);
          border: 1px solid rgba(139, 160, 186, 0.18);
          border-radius: 6px;
          padding: 16px;
          transition: border-color 0.3s ease;
        }

        .instruction-mini:hover {
          border-color: rgba(37, 243, 154, 0.3);
        }

        .card-meta {
          align-items: center;
          display: flex;
          gap: 12px;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .card-meta strong { font-size: 1rem; }

        .risk {
          color: var(--amber);
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.66rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .risk.high, .risk.critical { color: var(--red); }
        .risk.low { color: var(--green); }

        pre {
          background: rgba(0, 0, 0, 0.28);
          border: 1px solid rgba(139, 160, 186, 0.22);
          color: #dbe7f5;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.92rem;
          line-height: 1.6;
          margin: 0 0 12px;
          overflow: auto;
          padding: 14px;
          white-space: pre-wrap;
        }

        .data-line {
          color: var(--muted);
          font-size: 0.78rem;
          margin: 0 0 12px;
        }

        .data-line b {
          color: var(--blue);
          font-weight: 700;
        }

        .policy-read {
          border-left: 2px solid var(--green);
          display: grid;
          gap: 4px;
          padding: 2px 0 2px 12px;
          animation: policyIn 0.4s ease 0.1s both;
        }

        @keyframes policyIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .policy-read span {
          color: var(--green);
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.64rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .policy-read p {
          color: #dbe7f5;
          font-size: 0.82rem;
          line-height: 1.45;
          margin: 0;
        }

        .confidence-strip {
          align-items: center;
          display: grid;
          gap: 14px;
          grid-template-columns: minmax(140px, auto) minmax(0, 1fr) auto;
          margin-bottom: 22px;
        }

        .confidence-copy {
          display: grid;
          gap: 2px;
        }

        .confidence-copy span {
          color: var(--muted);
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.64rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .confidence-copy strong { font-size: 0.9rem; }

        .confidence-bar {
          background: #1d2533;
          border-radius: 4px;
          height: 10px;
          position: relative;
          overflow: visible;
        }

        .confidence-fill {
          border-radius: 4px;
          height: 100%;
          transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .conf-strong .confidence-fill { background: linear-gradient(90deg, var(--green), #b8ffe0); }
        .conf-weak .confidence-fill { background: linear-gradient(90deg, var(--amber), #ffe1a8); }

        .confidence-marker {
          background: var(--text);
          border-radius: 50%;
          box-shadow: 0 0 0 3px rgba(244, 247, 251, 0.18);
          height: 14px;
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          transition: left 0.5s cubic-bezier(0.22, 1, 0.36, 1);
          width: 14px;
        }

        .confidence-value {
          color: var(--muted);
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.74rem;
          white-space: nowrap;
        }

        .action-guide-heading {
          margin-bottom: 10px !important;
        }

        .action-guide {
          margin-bottom: 20px;
          padding-left: 4px;
          position: relative;
        }

        .action-guide-line {
          background: rgba(139, 160, 186, 0.2);
          bottom: 8px;
          left: 9px;
          position: absolute;
          top: 8px;
          width: 1px;
        }

        .action-guide-item {
          border-radius: 8px;
          cursor: pointer;
          padding: 10px 14px 10px 30px;
          position: relative;
          transition: background 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease;
        }

        .action-guide-item:hover,
        .action-guide-item:focus-visible {
          background: rgba(37, 243, 154, 0.05);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
          outline: none;
          transform: translateX(6px);
        }

        .action-guide-item.tone-risk:hover,
        .action-guide-item.tone-risk:focus-visible {
          background: rgba(255, 60, 85, 0.06);
        }

        .action-guide-item.tone-mid:hover,
        .action-guide-item.tone-mid:focus-visible {
          background: rgba(246, 183, 60, 0.06);
        }

        .action-guide-dot {
          background: var(--green);
          border-radius: 50%;
          height: 9px;
          left: 5px;
          position: absolute;
          top: 16px;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
          width: 9px;
        }

        .action-guide-item.tone-risk .action-guide-dot { background: var(--red); }
        .action-guide-item.tone-mid .action-guide-dot { background: var(--amber); }

        .action-guide-item:hover .action-guide-dot,
        .action-guide-item:focus-visible .action-guide-dot {
          box-shadow: 0 0 0 6px rgba(37, 243, 154, 0.15);
          transform: scale(1.35);
        }

        .action-guide-item.tone-risk:hover .action-guide-dot,
        .action-guide-item.tone-risk:focus-visible .action-guide-dot {
          box-shadow: 0 0 0 6px rgba(255, 60, 85, 0.15);
        }

        .action-guide-item.tone-mid:hover .action-guide-dot,
        .action-guide-item.tone-mid:focus-visible .action-guide-dot {
          box-shadow: 0 0 0 6px rgba(246, 183, 60, 0.15);
        }

        .action-guide-copy strong {
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.82rem;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .action-guide-copy p {
          color: var(--muted);
          font-size: 0.8rem;
          line-height: 1.5;
          margin: 4px 0 0;
        }

        .action-guide-impact {
          display: grid;
          grid-template-rows: 0fr;
          margin-top: 0;
          opacity: 0;
          transition: grid-template-rows 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease, margin-top 0.4s ease;
        }

        .action-guide-impact > * { min-height: 0; }

        .action-guide-impact p {
          color: #dbe7f5;
          font-size: 0.78rem;
          line-height: 1.5;
          margin: 0;
          overflow: hidden;
        }

        .action-guide-impact span {
          color: var(--green);
          display: block;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          opacity: 0;
          overflow: hidden;
          text-transform: uppercase;
          transform: translateY(-4px);
          transition: opacity 0.3s ease 0.08s, transform 0.3s ease 0.08s;
        }

        .action-guide-item.tone-risk .action-guide-impact span { color: var(--red); }
        .action-guide-item.tone-mid .action-guide-impact span { color: var(--amber); }

        .action-guide-item:hover .action-guide-impact,
        .action-guide-item:focus-visible .action-guide-impact {
          grid-template-rows: 1fr;
          margin-top: 8px;
          opacity: 1;
        }

        .action-guide-item:hover .action-guide-impact span,
        .action-guide-item:focus-visible .action-guide-impact span {
          opacity: 1;
          transform: translateY(0);
        }

        .action-row-wrap {
          position: relative;
        }

        .reaction-tag {
          animation: reactionFloat 1.3s ease both;
          background: var(--green);
          border-radius: 4px;
          color: #070b10;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.7rem;
          font-weight: 700;
          left: 50%;
          letter-spacing: 0.05em;
          padding: 4px 10px;
          position: absolute;
          text-transform: uppercase;
          top: -30px;
          transform: translateX(-50%);
          white-space: nowrap;
        }

        @keyframes reactionFloat {
          0% { opacity: 0; transform: translate(-50%, 6px) scale(0.9); }
          15% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          75% { opacity: 1; transform: translate(-50%, -6px) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -14px) scale(0.95); }
        }

        .action-row {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(4, 1fr);
          margin-bottom: 10px;
        }

        .action-row button {
          align-items: center;
          background: rgba(0, 0, 0, 0.14);
          border: 1px solid rgba(139, 160, 186, 0.22);
          border-radius: 6px;
          color: var(--text);
          cursor: pointer;
          display: flex;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.82rem;
          font-weight: 700;
          gap: 9px;
          justify-content: center;
          min-height: 58px;
          padding: 10px;
          position: relative;
          text-align: center;
          transition: border-color 0.2s ease, background 0.2s ease, transform 0.18s ease, box-shadow 0.2s ease;
        }

        .action-key {
          align-items: center;
          background: rgba(139, 160, 186, 0.14);
          border-radius: 3px;
          color: var(--muted);
          display: flex;
          font-size: 0.66rem;
          height: 16px;
          justify-content: center;
          left: 6px;
          position: absolute;
          top: 6px;
          width: 16px;
        }

        .action-dot {
          border-radius: 50%;
          flex-shrink: 0;
          height: 9px;
          width: 9px;
        }

        .tone-safe .action-dot { background: var(--green); }
        .tone-mid .action-dot { background: var(--amber); }
        .tone-risk .action-dot { background: var(--red); }

        .action-row button:not(:disabled):hover {
          border-color: rgba(37, 243, 154, 0.4);
          background: rgba(37, 243, 154, 0.06);
          transform: translateY(-2px);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.22);
        }

        .action-row button:not(:disabled):active { transform: translateY(0) scale(0.98); }

        .action-row button.selected {
          border-color: var(--green);
          box-shadow: inset 0 0 0 1px rgba(37, 243, 154, 0.15);
          animation: selectPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes selectPop {
          0% { transform: scale(1); }
          40% { transform: scale(1.04); box-shadow: 0 0 0 4px rgba(37, 243, 154, 0.18); }
          100% { transform: scale(1); }
        }

        .action-hint {
          color: var(--muted);
          font-size: 0.72rem;
          margin: 0 0 4px;
          text-align: center;
        }

        button:disabled { cursor: default; opacity: 0.45; }

        .log-drawer {
          border-top: 1px solid var(--line);
          padding: 6px 24px 0;
        }

        .log-drawer summary {
          align-items: center;
          color: var(--muted);
          cursor: pointer;
          display: flex;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.74rem;
          gap: 8px;
          letter-spacing: 0.06em;
          list-style: none;
          padding: 12px 0;
          text-transform: uppercase;
          user-select: none;
        }

        .log-drawer summary::-webkit-details-marker { display: none; }

        .chevron {
          display: inline-block;
          transition: transform 0.25s ease;
        }

        .log-drawer[open] .chevron { transform: rotate(90deg); }

        .drawer-content {
          animation: drawerIn 0.3s ease both;
          display: grid;
          gap: 18px;
          grid-template-columns: 1fr 1fr;
          padding-bottom: 18px;
        }

        @keyframes drawerIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .hint-list, .log-panel {
          display: grid;
          gap: 8px;
        }

        .hint-list span {
          border: 1px solid rgba(139, 160, 186, 0.16);
          border-radius: 4px;
          color: var(--muted);
          font-size: 0.78rem;
          line-height: 1.4;
          padding: 9px 11px;
          transition: border-color 0.25s ease, background 0.25s ease, transform 0.2s ease;
        }

        .hint-list span:hover {
          border-color: rgba(84, 199, 255, 0.35);
          background: rgba(84, 199, 255, 0.05);
          transform: translateX(3px);
        }

        .log-panel {
          color: var(--muted);
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.72rem;
        }

        .log-line { animation: logIn 0.35s ease both; }

        @keyframes logIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .lab-frame footer {
          border-top: var(--divider) solid var(--line);
          color: var(--muted);
          display: grid;
          font-family: "Courier New", ui-monospace, monospace;
          gap: 8px;
          line-height: 1.5;
          padding: 18px 24px 22px;
        }

        .lab-frame footer strong {
          color: var(--text);
          font-size: 0.78rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .footer-message, .footer-instruction {
          animation: messageIn 0.3s ease both;
          display: block;
        }

        @keyframes messageIn {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .success { color: var(--green); }
        .failure { color: var(--red); }

        .verdict-card {
          animation: verdictIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          border: 1px solid rgba(139, 160, 186, 0.22);
          border-radius: 4px;
          display: grid;
          gap: 6px;
          padding: 12px;
        }

        @keyframes verdictIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .verdict-card span {
          color: var(--green);
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .verdict-card strong { color: var(--text); font-size: 0.82rem; }

        .verdict-card p {
          color: var(--muted);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 0.86rem;
          line-height: 1.45;
          margin: 0;
        }

        .accuracy-note {
          animation: explanationIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          background: rgba(16, 23, 35, 0.78);
          border: var(--divider) solid var(--line);
          margin-top: 22px;
          padding: 22px;
        }

        @keyframes explanationIn {
          0% { opacity: 0; transform: translateY(14px); border-color: var(--line); }
          60% { border-color: rgba(37, 243, 154, 0.35); }
          100% { opacity: 1; transform: translateY(0); border-color: var(--line); }
        }

        .accuracy-note p:last-child { margin-bottom: 0; }

        .result-backdrop {
          align-items: center;
          animation: backdropIn 0.25s ease both;
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
        }

        .result-backdrop.is-closing { animation: backdropOut 0.25s ease both; }

        @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes backdropOut { from { opacity: 1; } to { opacity: 0; } }

        .result-card {
          animation: cardIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          background: linear-gradient(180deg, #141d2c, #0c131e);
          border: 1px solid var(--line);
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55);
          max-width: 440px;
          padding: 32px;
          text-align: left;
          width: 100%;
        }

        .result-backdrop.is-closing .result-card { animation: cardOut 0.22s ease both; }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.94); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes cardOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(10px) scale(0.96); }
        }

        .result-card.is-success { border-color: rgba(37, 243, 154, 0.4); box-shadow: 0 30px 90px rgba(37, 243, 154, 0.12); }
        .result-card.is-failure { border-color: rgba(255, 60, 85, 0.4); box-shadow: 0 30px 90px rgba(255, 60, 85, 0.12); }
        .result-card.is-warning { border-color: rgba(246, 183, 60, 0.4); box-shadow: 0 30px 90px rgba(246, 183, 60, 0.12); }

        .result-tag {
          animation: pillIn 0.4s ease 0.1s both;
          display: inline-block;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          margin-bottom: 14px;
          text-transform: uppercase;
        }

        .result-card.is-success .result-tag { color: var(--green); }
        .result-card.is-failure .result-tag { color: var(--red); }
        .result-card.is-warning .result-tag { color: var(--amber); }

        .result-title {
          animation: messageIn 0.4s ease 0.14s both;
          color: var(--text);
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0 0 12px;
        }

        .result-body {
          animation: messageIn 0.4s ease 0.18s both;
          color: var(--muted);
          font-size: 0.9rem;
          line-height: 1.65;
          margin: 0 0 24px;
        }

        .result-confirm {
          animation: messageIn 0.4s ease 0.22s both;
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
        }

        .result-card.is-success .result-confirm { border-color: var(--green); color: var(--green); }
        .result-card.is-success .result-confirm:hover { background: var(--green); color: #070b10; box-shadow: 0 6px 18px rgba(37, 243, 154, 0.25); transform: translateY(-2px); }
        .result-card.is-failure .result-confirm { border-color: var(--red); color: var(--red); }
        .result-card.is-failure .result-confirm:hover { background: var(--red); color: #fff; box-shadow: 0 6px 18px rgba(255, 60, 85, 0.25); transform: translateY(-2px); }
        .result-card.is-warning .result-confirm { border-color: var(--amber); color: var(--amber); }
        .result-card.is-warning .result-confirm:hover { background: var(--amber); color: #070b10; box-shadow: 0 6px 18px rgba(246, 183, 60, 0.25); transform: translateY(-2px); }

        @media (max-width: 900px) {
          .gauge-row { grid-template-columns: 1fr; }
          .gauge { justify-self: center; }
          .confidence-strip { grid-template-columns: 1fr; }
          .action-row { grid-template-columns: repeat(2, 1fr); }
          .drawer-content { grid-template-columns: 1fr; }
        }

        @media (max-width: 760px) {
          .rules-list { grid-template-columns: 1fr; }
        }

        @media (max-width: 560px) {
          .spec-lab { margin-top: 64px; }
          .console { padding: 20px 16px 6px; }
          .action-row { grid-template-columns: 1fr; }
          .lab-frame footer { padding: 16px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .spec-lab, .game-heading, .rules-list, .rule-card, .rule-number, .rule-detail,
          .lab-frame, .lab-frame.shake-once, .status-pill, .status-dot, .reset-button, .console, .ring-progress,
          .instruction-mini, .policy-read, .confidence-fill, .clock-fill, .clock-seconds.clock-danger,
          .confidence-marker, .action-guide-item, .action-guide-dot, .action-guide-impact,
          .action-guide-impact span, .action-row button, .action-row button.selected, .reaction-tag,
          .log-drawer, .chevron, .drawer-content, .hint-list span, .log-line, .footer-message,
          .footer-instruction, .stat-pop, .verdict-card, .accuracy-note, .result-backdrop,
          .result-card, .result-tag, .result-title, .result-body, .result-confirm, .cta-highlight,
          .start-overlay, .start-card, .start-button {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </section>
  );
}