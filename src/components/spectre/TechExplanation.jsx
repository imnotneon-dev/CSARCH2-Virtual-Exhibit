import '../../styles/spectre.css';

const concepts = [
  {
    index: 'A',
    title: 'Speculative Execution',
    body: (
      <>
        Modern processors attempt to improve performance by predicting future
        instructions and executing them ahead of time.
        <br /><br />
        Example:
        <br />
        <code>if (userIsAuthorized) accessSecretData();</code>
        <br /><br />
        The CPU may temporarily execute the instruction before confirming whether the
        user is actually authorized. Normally these speculative operations are
        discarded — but traces remain in the CPU cache.
      </>
    ),
    variant: '',
  },
  {
    index: 'B',
    title: 'CPU Cache',
    body: (
      <>
        A cache is a small, high-speed memory area that stores frequently used data.
        <ul>
          <li>Accessing cached data is significantly faster than retrieving data from main memory.</li>
          <li>Attackers can measure timing differences to determine whether certain data was loaded into cache.</li>
        </ul>
      </>
    ),
    variant: '',
  },
  {
    index: 'C',
    title: 'Meltdown',
    body: (
      <>
        Meltdown allows an attacker to read privileged kernel memory from an
        unprivileged application. It effectively breaks the isolation between:
        <ul>
          <li>User applications</li>
          <li>Operating system memory</li>
        </ul>
        Potentially exposed information:
        <ul>
          <li>Passwords</li>
          <li>Encryption keys</li>
          <li>Sensitive operating system data</li>
        </ul>
      </>
    ),
    variant: 'card-red',
  },
  {
    index: 'D',
    title: 'Spectre',
    body: (
      <>
        Spectre tricks programs into executing instructions they normally would not
        execute. Instead of directly bypassing permissions, it manipulates speculative
        execution behavior to leak data through cache timing.
        <br /><br />
        Potentially affected:
        <ul>
          <li>Browsers</li>
          <li>Applications</li>
          <li>Virtual machines</li>
          <li>Cloud computing environments</li>
        </ul>
      </>
    ),
    variant: 'card-amber',
  },
];

export default function TechExplanation() {
  return (
    <div className="spectreTheme">
      <section className="section">
        <div className="section-inner">
          <div className="section-label">CSARCH Core</div>
          <h2 className="section-heading">Technical Explanation</h2>
          <p className="section-body">
            Two hardware-level flaws, two different ways of breaking the same trust
            boundary.
          </p>

          <div className="cards-grid">
            {concepts.map((c) => (
              <div className={`card ${c.variant}`} key={c.index}>
                <div className="card-index">{c.index}</div>
                <div className="card-title">{c.title}</div>
                <div className="card-body">{c.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}