import '../../styles/S03_Group7_spectre.css';
import { useReveal } from "./Animation.jsx";

export default function Intro() {
  const [ref, visible] = useReveal(0.1);
  return (
    <>
    <div className="spectreTheme">
      <div className="alert-strip">
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

        <div ref={ref} className={`intro-inner reveal ${visible ? "is-visible" : ""}`}>
          <div className="intro-eyebrow">Core Concepts — CS Architecture</div>

          <h1 className="intro-title">
            <span className="word-spectre">Spectre</span>{' '}
            <span className="word-and">&</span>{' '}
            <span className="word-meltdown">Meltdown</span>
          </h1>

          <p className="intro-subtitle">
            In 2018, the digital world faced a nightmare when two security flaws were
            discovered in the physical chips of every computer and smartphone on Earth.
          </p>

          <p className="section-body" style={{ marginTop: '1.5rem', maxWidth: '640px' }}>
            Unlike typical viruses that can easily be deleted, these were &ldquo;hardware
            vulnerabilities&rdquo; that had existed for decades. The problem originated
            from a design choice to make devices faster by having chips predict the
            user&rsquo;s next action. However, this speed trick inadvertently left a
            backdoor for hackers to steal private information, such as passwords.
            Furthermore, this discovery caused a global panic because the flaw was built
            into the physical parts of the machines, making it nearly impossible to fix
            without slowing down computers everywhere. Ultimately, Spectre and Meltdown
            served as a powerful lesson that the rush for faster technology can create
            deep security risks that put the entire world&rsquo;s privacy at stake.
          </p>
        </div>
      </section>
    </div>
    </>
  );
}
