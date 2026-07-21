import '../../styles/S03_Group7_spectre.css';
import { useReveal } from "./Animation.jsx";
import { useState } from "react";

export default function Intro() {
  const [ref, visible] = useReveal(0.1);
  const [spinKey, setSpinKey] = useState(0);

  // Remounting the <svg> (via key) restarts the spin animation from 0deg
  // every time, even on rapid repeat hovers, with no manual cleanup needed.
  function triggerSpin() {
    setSpinKey((key) => key + 1);
  }

  return (
    <>
    <div className="spectreTheme">
      <div className="alert-strip">
        <span className="alert-tag">
          <i className="alert-dot" aria-hidden="true" />
          Alert
        </span>
        <span className="alert-track">
          <span className="alert-text">
            VULNERABILITY DISCLOSURE — JANUARY 3, 2018 — SPECTRE (CVE-2017-5753 / CVE-2017-5715) + MELTDOWN (CVE-2017-5754) — HARDWARE-LEVEL EXPLOIT — ALL MODERN CPUs AFFECTED
          </span>
        </span>
      </div>
    </div>
    <div className="spectreTheme">
      <section className="intro">
        <div className="intro-glow" />
        <div className="intro-glow-2" />

        <div ref={ref} className={`intro-inner intro-grid ${visible ? "is-visible" : ""}`}>
          <div className="intro-eyebrow">Core Concepts — CS Architecture</div>

          <h1 className="intro-title">
            <span className="word-spectre">Spectre</span>{' '}
            <span className="word-and">&</span>{' '}
            <span className="word-meltdown">Meltdown</span>
          </h1>

          <div
            className="intro-visual"
            aria-hidden="true"
            onMouseEnter={triggerSpin}
          >
            <svg key={spinKey} viewBox="0 0 200 200" className="chip-svg spin-once">
              <rect x="55" y="55" width="90" height="90" rx="4" className="chip-die" />
              <rect x="75" y="75" width="50" height="50" rx="2" className="chip-core" />
              <rect x="88" y="88" width="24" height="24" className="chip-hot" />
              <g className="chip-pins">
                <line x1="55" y1="70" x2="35" y2="70" /><line x1="55" y1="90" x2="35" y2="90" />
                <line x1="55" y1="110" x2="35" y2="110" /><line x1="55" y1="130" x2="35" y2="130" />
                <line x1="145" y1="70" x2="165" y2="70" /><line x1="145" y1="90" x2="165" y2="90" />
                <line x1="145" y1="110" x2="165" y2="110" /><line x1="145" y1="130" x2="165" y2="130" />
                <line x1="70" y1="55" x2="70" y2="35" /><line x1="90" y1="55" x2="90" y2="35" />
                <line x1="110" y1="55" x2="110" y2="35" /><line x1="130" y1="55" x2="130" y2="35" />
                <line x1="70" y1="145" x2="70" y2="165" /><line x1="90" y1="145" x2="90" y2="165" />
                <line x1="110" y1="145" x2="110" y2="165" /><line x1="130" y1="145" x2="130" y2="165" />
              </g>
              <circle cx="100" cy="100" r="6" className="chip-pulse" />
            </svg>
            <span className="intro-visual-hint">// hover the die</span>
          </div>

          <p className="intro-subtitle">
            In 2018, the digital world faced a nightmare when two security flaws were
            discovered in the physical chips of every computer and smartphone on Earth.
          </p>

          <p className="section-body intro-body" style={{ marginTop: '1.5rem', maxWidth: '640px' }}>
            Unlike typical viruses, Spectre and Meltdown were long-standing hardware vulnerabilities caused by speculative execution, a design choice that improved performance but unintentionally exposed sensitive data, such as passwords. Since the flaws were built into computer hardware, fixing them required security patches that often reduced performance, highlighting the trade-off between speed and security.
          </p>
        </div>
      </section>
    </div>
    </>
  );
}