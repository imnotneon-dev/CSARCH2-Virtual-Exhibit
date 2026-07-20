import '../../styles/S03_Group7_spectre.css';
import { useState } from "react";

function ConceptCard({ concept, index, isExpanded, onExpand, onCollapse }) {
  const detailId = `concept-${concept.index.toLowerCase()}-details`;

  return (
    <article
      className={`card ${concept.variant} ${isExpanded ? "is-expanded" : ""}`}
      onMouseEnter={() => onExpand(index)}
      onMouseLeave={() => onCollapse(index)}
    >
      <button
        type="button"
        className="card-trigger"
        aria-expanded={isExpanded}
        aria-controls={detailId}
        onClick={() => onExpand(index)}
        onFocus={() => onExpand(index)}
        onBlur={() => onCollapse(index)}
      >
        <span className="card-index">{concept.index}</span>
        <span className="card-heading">
          <strong className="card-title">{concept.title}</strong>
          <span className="card-summary">{concept.summary}</span>
        </span>
        <span className="card-toggle" aria-hidden="true" />
      </button>

      <div id={detailId} className="card-details" aria-hidden={!isExpanded}>
        <div className="card-details-clip">
          <div className="card-details-inner">
            <div className="card-detail-copy">{concept.detail}</div>
            <aside className="card-takeaway">
              <span>{concept.takeawayLabel}</span>
              <p>{concept.takeaway}</p>
            </aside>
          </div>
        </div>
      </div>
    </article>
  );
}

const concepts = [
  {
    index: 'A',
    title: 'Speculative Execution',
    summary: 'Modern processors predict and run instructions before knowing whether those instructions are actually needed.',
    detail: (
      <>
        <p>
          This shortcut keeps the processor pipeline busy instead of waiting for every
          condition to be resolved. If the prediction is wrong, the CPU discards the
          calculated result—but activity such as loading data into cache may have
          already happened.
        </p>
        <code className="card-code">if (userIsAuthorized) accessSecretData();</code>
      </>
    ),
    takeawayLabel: 'Security gap',
    takeaway: 'The visible result is erased, but a measurable trace of the temporary work can remain.',
    variant: '',
  },
  {
    index: 'B',
    title: 'CPU Cache',
    summary: 'The cache is a small, fast memory layer that keeps recently used data close to the processor.',
    detail: (
      <p>
        Cached data returns much faster than data fetched from main memory. By timing
        many carefully chosen memory accesses, an attacker can identify which location
        became fast and infer what the processor touched during speculative work.
      </p>
    ),
    takeawayLabel: 'Side channel',
    takeaway: 'The attacker reads timing differences—not protected memory directly—and turns speed into a data signal.',
    variant: 'card-blue',
  },
  {
    index: 'C',
    title: 'Meltdown',
    summary: 'Meltdown lets an ordinary process transiently cross the boundary that protects operating-system memory.',
    detail: (
      <p>
        On affected processors, a forbidden read can execute briefly before the
        permission check stops it. The program never receives that value normally,
        but the value can influence the cache and be reconstructed through timing,
        exposing passwords, keys, or other kernel data.
      </p>
    ),
    takeawayLabel: 'Boundary broken',
    takeaway: 'Meltdown targets the separation between a user application and privileged kernel memory.',
    variant: 'card-red',
  },
  {
    index: 'D',
    title: 'Spectre',
    summary: 'Spectre manipulates branch prediction so a victim program temporarily follows an attacker-chosen path.',
    detail: (
      <p>
        Rather than directly bypassing a privilege check, Spectre trains the processor
        to make a useful wrong prediction. The victim then touches secret-dependent
        data during speculative execution, leaving cache traces that may leak across
        browsers, applications, virtual machines, and cloud workloads.
      </p>
    ),
    takeawayLabel: 'Victim misled',
    takeaway: 'Spectre turns a program’s own valid code into the mechanism that reveals its protected data.',
    variant: 'card-amber',
  },
];

export default function TechExplanation() {
  const [expandedIndex, setExpandedIndex] = useState(-1);

  const expandConcept = (index) => {
    setExpandedIndex(index);
  };

  const collapseConcept = (index) => {
    setExpandedIndex((currentIndex) => currentIndex === index ? -1 : currentIndex);
  };

  return (
    <div className="spectreTheme">
      <section className="section">
        <div className="section-inner">
          <div className="section-label">CSARCH Core</div>
          <h2 className="section-heading">Technical Explanation</h2>
          <p className="section-body">
            Follow the chain from processor optimization to observable cache trace,
            then compare the two attacks built from it.
          </p>

          <div className="cards-grid" aria-label="Technical concept sequence">
            {concepts.map((concept, index) => (
              <ConceptCard
                concept={concept}
                index={index}
                isExpanded={expandedIndex === index}
                onExpand={expandConcept}
                onCollapse={collapseConcept}
                key={concept.index}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
