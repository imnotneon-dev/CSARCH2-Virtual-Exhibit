import { useState } from "react";

const EVENTS = [
  {
    year: "1995",
    label: "Speculation Goes Mainstream",
    tagColor: "green",
    summary: "Intel's P6 microarchitecture introduces out-of-order and speculative execution as standard CPU design. Every major manufacturer follows. The performance gains were significant — CPUs could execute tens of future instructions before confirming the branch direction. Nobody considered the security implications because the results were supposed to be discarded if the prediction was wrong.",
    impact: "Every Intel CPU sold from 1995 onward would carry the seed of the vulnerability.",
  },
  {
    year: "1998–2000s",
    label: "Industry-Wide Adoption",
    tagColor: "green",
    summary: "AMD, ARM, and IBM all adopt speculative execution variants. It becomes the defining performance feature of the modern CPU era. Branch prediction accuracy improves from ~85% to over 95%. The performance uplift becomes non-negotiable — removing speculation would slow CPUs by 20–30%. The feature was too embedded to revisit.",
    impact: "Billions of devices shipped with the same underlying architectural assumption.",
  },
  {
    year: "Mid-2017",
    label: "Private Discovery",
    tagColor: "amber",
    summary: "Google Project Zero researcher Jann Horn independently discovers both Spectre and Meltdown. AMD, ARM, and Intel are notified under coordinated disclosure. Horn's original report showed a real password could be read from kernel memory at ~2,000 bytes per second on unpatched hardware. Other research teams independently discovered the same flaws within weeks of each other — a sign the vulnerability had been waiting to be found.",
    impact: "Vendors had roughly 6 months to develop patches before public disclosure.",
  },
  {
    year: "Jan 3, 2018",
    label: "Public Disclosure",
    tagColor: "red",
    summary: "The story leaks before the coordinated embargo date. Full technical details of both CVEs are published simultaneously across Google, Graz University of Technology, and independent researchers. CVE-2017-5753 (Spectre variant 1), CVE-2017-5715 (Spectre variant 2), and CVE-2017-5754 (Meltdown) are released. Within hours, proof-of-concept code is publicly available. Emergency patches ship for Windows, Linux, and macOS the same day.",
    impact: "Every cloud provider — AWS, Google Cloud, Azure — began emergency reboots of millions of servers within 48 hours.",
  },
  {
    year: "Jan–Mar 2018",
    label: "Emergency Patching",
    tagColor: "amber",
    summary: "A worldwide patching effort begins. OS vendors, browser makers, and cloud providers race to push mitigations. The primary software mitigation for Meltdown — Kernel Page Table Isolation (KPTI) — added a costly context switch every time user code called into the kernel. Database workloads and I/O-heavy applications saw 10–30% performance regressions. Intel's first microcode patches were so unstable that Microsoft had to issue an emergency Windows update disabling them.",
    impact: "Estimated $50–100 billion in remediation costs globally across cloud infrastructure, enterprises, and consumers.",
  },
  {
    year: "2018–2019",
    label: "Variants Keep Emerging",
    tagColor: "red",
    summary: "Additional Spectre variants are discovered: SpectreRSB, Spectre-NG, Foreshadow (L1TF), MDS (ZombieLoad, RIDL, Fallout). Each requires separate mitigations. The architectural attack surface was wider than the original disclosure suggested. Intel's SGX secure enclave was compromised by Foreshadow. Each new variant meant another round of microcode updates, OS patches, and performance regression analysis.",
    impact: "Security researchers joked that speculative execution had become an entire new category of vulnerability class.",
  },
  {
    year: "2019–Present",
    label: "Hardware Redesigns",
    tagColor: "green",
    summary: "Intel Ice Lake (2019) and later Cascade Lake, Tiger Lake ship with hardware-level mitigations for the original variants. AMD Zen 2 and ARM v8.5 introduce architectural fixes. The hardware fixes are meaningful but incomplete — the fundamental tradeoff between performance and security via speculation cannot be fully resolved without abandoning the entire paradigm. Researchers continue finding new variants in 2020, 2021, and beyond.",
    impact: "Modern CPUs now include dedicated hardware controls that software can use to dial speculation up or down depending on workload sensitivity.",
  },
];

function dotColor(color) {
  if (color === "red") return "#ff3c55";
  if (color === "amber") return "#f6b73c";
  return "#25f39a";
}

export default function SpectreTimeline() {
  const [active, setActive] = useState(0);
  const current = EVENTS[active];

  return (
    <section className="spectre-timeline">
      <div className="timeline-frame">
        <header>
          <strong>Historical Timeline — Spectre &amp; Meltdown</strong>
          <span className="safe">{EVENTS.length} key events</span>
        </header>

        <div className="timeline-layout">
          {/* Left: event list — plain div, not <nav>, so it can't inherit the
              site-wide `nav { position: sticky }` rule from spectre.css */}
          <div className="event-list" role="navigation" aria-label="Timeline events">
            {EVENTS.map((evt, i) => (
              <button
                key={i}
                className={`event-btn ${i === active ? "active" : ""}`}
                onClick={() => setActive(i)}
                aria-current={i === active ? "true" : undefined}
              >
                <span className="evt-dot" style={{ background: dotColor(evt.tagColor) }} />
                <span className="evt-year">{evt.year}</span>
                <span className="evt-label">{evt.label}</span>
              </button>
            ))}
          </div>

          {/* Right: detail panel */}
          <div className="detail-panel" key={active}>
            <div className="detail-header">
              <span className="evt-dot detail-dot" style={{ background: dotColor(current.tagColor) }} />
              <span className="detail-year">{current.year}</span>
            </div>
            <h3 className="detail-title">{current.label}</h3>
            <p className="detail-text">{current.summary}</p>

            <div className="impact-block">
              <span className="block-label">Impact</span>
              <p>{current.impact}</p>
            </div>

            <div className="nav-controls">
              <button
                className="nav-btn"
                onClick={() => setActive((a) => Math.max(0, a - 1))}
                disabled={active === 0}
              >
                Prev
              </button>
              <span className="nav-counter">{active + 1} / {EVENTS.length}</span>
              <button
                className="nav-btn"
                onClick={() => setActive((a) => Math.min(EVENTS.length - 1, a + 1))}
                disabled={active === EVENTS.length - 1}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .spectre-timeline {
          --green: #25f39a;
          --red: #ff3c55;
          --amber: #f6b73c;
          --line: #243348;
          --text: #f4f7fb;
          --muted: #8ba0ba;
          color: var(--text);
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
          width: min(100%, 1040px);
          margin: 0 auto;
        }

        .timeline-frame {
          background: linear-gradient(180deg, #121a28, #0b111a);
          border: 1px solid var(--line);
          box-shadow: 0 24px 80px rgba(0,0,0,0.35);
        }

        .timeline-frame header {
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

        .safe { color: var(--green); }

        .timeline-layout {
          display: grid;
          grid-template-columns: 220px 1fr;
          min-height: 400px;
        }

        .event-list {
          position: static; /* explicit reset, belt-and-suspenders */
          border-right: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          padding: 8px 0;
          align-self: start;
        }

        .event-btn {
          align-items: flex-start;
          background: transparent;
          border: none;
          color: var(--muted);
          cursor: pointer;
          display: grid;
          gap: 4px;
          grid-template-columns: 10px 1fr;
          grid-template-rows: auto auto;
          padding: 12px 16px;
          text-align: left;
          transition: background 0.15s, color 0.15s;
          position: relative;
        }

        .event-btn:hover { background: rgba(255,255,255,0.03); color: var(--text); }

        .event-btn.active {
          background: rgba(37,243,154,0.06);
          color: var(--text);
          border-right: 2px solid var(--green);
        }

        .evt-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-top: 4px;
          grid-row: 1;
          flex-shrink: 0;
        }

        .evt-year {
          font-family: "Courier New", monospace;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          grid-column: 2;
          grid-row: 1;
          color: inherit;
        }

        .evt-label {
          font-size: 0.78rem;
          line-height: 1.35;
          grid-column: 2;
          grid-row: 2;
          color: inherit;
        }

        .detail-panel {
          padding: 28px;
          display: grid;
          gap: 16px;
          align-content: start;
        }

        .detail-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .detail-dot {
          width: 9px;
          height: 9px;
          margin-top: 0;
        }

        .detail-year {
          font-family: "Courier New", monospace;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: var(--muted);
        }

        .detail-title {
          font-size: clamp(1.2rem, 3vw, 1.7rem);
          font-weight: 700;
          line-height: 1.2;
          margin: 0;
        }

        .detail-text {
          color: var(--muted);
          font-size: 0.9rem;
          line-height: 1.75;
          margin: 0;
        }

        .impact-block {
          border-left: 2px solid var(--amber);
          padding: 4px 0 4px 14px;
          display: grid;
          gap: 6px;
        }

        .block-label {
          font-family: "Courier New", monospace;
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--amber);
        }

        .impact-block p {
          color: var(--text);
          font-size: 0.88rem;
          line-height: 1.6;
          margin: 0;
        }

        .nav-controls {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 4px;
        }

        .nav-btn {
          font-family: "Courier New", monospace;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 6px 14px;
          border: 1px solid var(--line);
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-btn:hover:not(:disabled) { border-color: var(--green); color: var(--green); }
        .nav-btn:disabled { opacity: 0.3; cursor: default; }

        .nav-counter {
          font-family: "Courier New", monospace;
          font-size: 0.68rem;
          color: var(--muted);
        }

        @media (max-width: 700px) {
          .timeline-layout { grid-template-columns: 1fr; }
          .event-list { flex-direction: row; overflow-x: auto; border-right: none; border-bottom: 1px solid var(--line); padding: 0; }
          .event-btn { min-width: 120px; border-right: none; padding: 10px 12px; }
          .event-btn.active { border-right: none; border-bottom: 2px solid var(--green); }
          .detail-panel { padding: 20px; }
        }
      `}</style>
    </section>
  );
}