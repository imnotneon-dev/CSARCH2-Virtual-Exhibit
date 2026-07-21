import '../../styles/S03_Group7_spectre.css';
import { useReveal } from "./Animation.jsx";

function TimelineEvent({ e, index }) {
  const [ref, visible] = useReveal(0.3);
  return (
    <div
      ref={ref}
      tabIndex={0}
      className={`timeline-event reveal-left tl-anim ${visible ? "is-visible" : ""} ${
        e.isEvent ? "tl-anim--flagship" : ""
      }`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <div className={`timeline-dot ${e.isEvent ? "dot-event" : ""} ${visible ? "pulse" : ""} tl-anim-dot`} />
      <div className={`timeline-year ${e.isEvent ? "red" : ""} tl-anim-year`}>{e.period}</div>
      <div className="timeline-title tl-anim-title">{e.title}</div>
      <div className="timeline-desc tl-anim-desc">{e.desc}</div>
      {e.impact && (
        <div className="tl-anim-impact">
          <span className="tl-anim-impact-label">Why it mattered</span>
          <p>{e.impact}</p>
        </div>
      )}
    </div>
  );
}

const events = [
  {
    period: '1995 - 2017',
    title: 'Speculative execution becomes standard',
    desc: 'Speculative execution becomes a standard feature in modern CPUs. Every major CPU manufacturer adopts out-of-order execution for performance. The underlying vulnerability is being shipped in every new chip.',
    isEvent: false,
    impact: 'Two decades of chips shipped with the flaw baked in, meaning almost every device in use by 2018 was affected at once. No single vendor could patch it alone, since the design choice sat at the hardware level across the entire industry.',
  },
  {
    period: 'Mid-2017',
    title: 'Private discovery',
    desc: 'Researchers privately discover Spectre and Meltdown. Google Project Zero and independent researchers identify both vulnerabilities. Intel, AMD, and ARM are notified under coordinated disclosure. Patches begin development.',
    isEvent: false,
    impact: 'Coordinated disclosure bought vendors months to prepare fixes before attackers could learn the details. That head start is the reason patches existed at all by the time the story became public.',
  },
  {
    period: '2018',
    title: 'Public disclosure',
    desc: 'The story leaks early. Full technical details are released simultaneously. Emergency patches ship within hours for Windows, Linux, and macOS.',
    isEvent: true,
    impact: 'The early leak forced every vendor to publish incomplete fixes under pressure, well before their planned coordinated date. Some patches shipped with known gaps simply because there was no time left to close them.',
  },
  {
    period: '2018 - 2019',
    title: 'Worldwide patching effort',
    desc: 'Major emergency patching efforts take place worldwide. OS updates, browser sandboxing changes, microcode patches, and cloud provider reboots of millions of servers. Performance regressions of up to 30% on some workloads.',
    isEvent: false,
    impact: 'Cloud providers had to reboot fleets of servers simultaneously, one of the largest coordinated infrastructure patches in history. The performance cost also meant customers were quietly paying for the fix in slower workloads for months afterward.',
  },
  {
    period: '2019',
    title: 'Hardware redesigns',
    desc: 'CPU manufacturers redesign hardware to reduce future risks. Intel and AMD ship new processor generations with architectural changes to mitigate speculative execution attacks at the hardware level.',
    isEvent: false,
    impact: 'Software patches alone were never enough, so the fix eventually had to move back into silicon itself. It marked a rare case where a security flaw reshaped how future CPUs were physically designed.',
  },
];

export default function Timeline() {
  return (
    <div className="spectreTheme">
      <section className="section">
        <div className="section-inner">
          <div className="section-label">Timeline</div>
          <h2 className="section-heading">How It Unfolded</h2>
          <p className="section-body">
            From a quiet performance trick to a global scramble, in just over two decades.
          </p>

          <div className="timeline">
            <div className="timeline-line" />
            {events.map((e, index) => (
              <TimelineEvent e={e} index={index} key={e.period} />
            ))}
          </div>
        </div>
      </section>

      <style suppressHydrationWarning>{`
        .tl-anim {
          cursor: pointer;
          border-radius: 8px;
          padding: 14px 20px 14px 18px;
          margin: -14px -20px 12px 6px;
          transition:
            background 0.35s ease,
            box-shadow 0.35s ease,
            transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .tl-anim:hover,
        .tl-anim:focus-visible {
          background: rgba(37, 243, 154, 0.05);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
          transform: translateX(12px);
          outline: none;
        }

        .tl-anim--flagship:hover,
        .tl-anim--flagship:focus-visible {
          background: rgba(255, 60, 85, 0.06);
        }

        .tl-anim-dot {
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
        }

        .tl-anim:hover .tl-anim-dot,
        .tl-anim:focus-visible .tl-anim-dot {
          transform: scale(1.35);
          box-shadow: 0 0 0 6px rgba(37, 243, 154, 0.15);
        }

        .tl-anim--flagship:hover .tl-anim-dot,
        .tl-anim--flagship:focus-visible .tl-anim-dot {
          box-shadow: 0 0 0 6px rgba(255, 60, 85, 0.15);
        }

        .tl-anim-year {
          display: inline-block;
          transition: transform 0.3s ease, letter-spacing 0.3s ease;
        }

        .tl-anim:hover .tl-anim-year,
        .tl-anim:focus-visible .tl-anim-year {
          transform: translateY(-1px);
          letter-spacing: 0.02em;
        }

        .tl-anim-title {
          transition: transform 0.3s ease;
        }

        .tl-anim:hover .tl-anim-title,
        .tl-anim:focus-visible .tl-anim-title {
          transform: translateX(2px);
        }

        .tl-anim-desc {
          transition: opacity 0.3s ease;
        }

        .tl-anim-impact {
          display: grid;
          grid-template-rows: 0fr;
          opacity: 0;
          transition:
            grid-template-rows 0.4s cubic-bezier(0.22, 1, 0.36, 1),
            opacity 0.3s ease 0s,
            margin-top 0.4s ease;
          margin-top: 0;
        }

        .tl-anim-impact > * {
          min-height: 0;
        }

        .tl-anim-impact p {
          overflow: hidden;
          margin: 4px 0 0;
          font-size: 0.88rem;
          line-height: 1.6;
          opacity: 0.85;
        }

        .tl-anim-impact-label {
          overflow: hidden;
          display: block;
          font-family: "Courier New", ui-monospace, monospace;
          font-size: 0.66rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #25f39a;
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity 0.3s ease 0.08s, transform 0.3s ease 0.08s;
        }

        .tl-anim--flagship .tl-anim-impact-label {
          color: #ff3c55;
        }

        .tl-anim:hover .tl-anim-impact,
        .tl-anim:focus-visible .tl-anim-impact {
          grid-template-rows: 1fr;
          opacity: 1;
          margin-top: 8px;
          transition:
            grid-template-rows 0.4s cubic-bezier(0.22, 1, 0.36, 1),
            opacity 0.35s ease 0.05s,
            margin-top 0.4s ease;
        }

        .tl-anim:hover .tl-anim-impact-label,
        .tl-anim:focus-visible .tl-anim-impact-label {
          opacity: 1;
          transform: translateY(0);
        }

        @media (prefers-reduced-motion: reduce) {
          .tl-anim,
          .tl-anim-dot,
          .tl-anim-year,
          .tl-anim-title,
          .tl-anim-impact,
          .tl-anim-impact-label {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}