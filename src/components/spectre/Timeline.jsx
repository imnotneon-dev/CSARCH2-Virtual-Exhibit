import '../../styles/spectre.css';

const events = [
  {
    period: '1995 - 2017',
    title: 'Speculative execution becomes standard',
    desc: 'Speculative execution becomes a standard feature in modern CPUs. Every major CPU manufacturer adopts out-of-order execution for performance. The underlying vulnerability is being shipped in every new chip.',
    isEvent: false,
  },
  {
    period: 'Mid-2017',
    title: 'Private discovery',
    desc: 'Researchers privately discover Spectre and Meltdown. Google Project Zero and independent researchers identify both vulnerabilities. Intel, AMD, and ARM are notified under coordinated disclosure. Patches begin development.',
    isEvent: false,
  },
  {
    period: '2018',
    title: 'Public disclosure',
    desc: 'The story leaks early. Full technical details are released simultaneously. Emergency patches ship within hours for Windows, Linux, and macOS.',
    isEvent: true,
  },
  {
    period: '2018 - 2019',
    title: 'Worldwide patching effort',
    desc: 'Major emergency patching efforts take place worldwide. OS updates, browser sandboxing changes, microcode patches, and cloud provider reboots of millions of servers. Performance regressions of up to 30% on some workloads.',
    isEvent: false,
  },
  {
    period: '2019',
    title: 'Hardware redesigns',
    desc: 'CPU manufacturers redesign hardware to reduce future risks. Intel and AMD ship new processor generations with architectural changes to mitigate speculative execution attacks at the hardware level.',
    isEvent: false,
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
            {events.map((e) => (
              <div className="timeline-event" key={e.period}>
                <div className={`timeline-dot ${e.isEvent ? 'dot-event' : ''}`} />
                <div className={`timeline-year ${e.isEvent ? 'red' : ''}`}>{e.period}</div>
                <div className="timeline-title">{e.title}</div>
                <div className="timeline-desc">{e.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}