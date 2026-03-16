import React from 'react';

const SEVERITY_STYLES = {
  CRITICAL: { dot: 'var(--red)', badge: { background: 'rgba(255,59,92,0.1)', border: '0.5px solid rgba(255,59,92,0.3)', color: 'var(--red)' } },
  HIGH:     { dot: 'var(--red)', badge: { background: 'rgba(255,59,92,0.1)', border: '0.5px solid rgba(255,59,92,0.3)', color: 'var(--red)' } },
  MEDIUM:   { dot: 'var(--amber)', badge: { background: 'rgba(255,171,0,0.1)', border: '0.5px solid rgba(255,171,0,0.3)', color: 'var(--amber)' } },
  LOW:      { dot: 'var(--green)', badge: { background: 'rgba(0,196,140,0.1)', border: '0.5px solid rgba(0,196,140,0.3)', color: 'var(--green)' } },
};

const HighlightedText = ({ text, flaggedPhrases }) => {
  if (!flaggedPhrases || flaggedPhrases.length === 0)
    return <span style={{ color: 'var(--muted)' }}>{text}</span>;

  let ranges = [];
  const lowerText = text.toLowerCase();
  flaggedPhrases.forEach(phrase => {
    const kw = phrase.text.toLowerCase();
    let idx = lowerText.indexOf(kw);
    while (idx !== -1) {
      ranges.push({ start: idx, end: idx + kw.length, level: phrase.level });
      idx = lowerText.indexOf(kw, idx + kw.length);
    }
  });
  ranges.sort((a, b) => a.start - b.start);

  const segments = [];
  let cur = 0;
  ranges.forEach((r, i) => {
    if (r.start > cur) segments.push(<span key={`t-${i}`} style={{ color: 'var(--muted)' }}>{text.slice(cur, r.start)}</span>);
    const hl = r.level === 'red'
      ? { background: 'rgba(255,59,92,0.15)', color: '#ff8099', border: '0.5px solid rgba(255,59,92,0.25)', padding: '2px 5px', borderRadius: '3px' }
      : { background: 'rgba(255,171,0,0.12)', color: '#ffc94d', border: '0.5px solid rgba(255,171,0,0.2)', padding: '2px 5px', borderRadius: '3px' };
    segments.push(<span key={`h-${i}`} style={hl}>{text.slice(r.start, r.end)}</span>);
    cur = r.end;
  });
  if (cur < text.length) segments.push(<span key="tail" style={{ color: 'var(--muted)' }}>{text.slice(cur)}</span>);
  return <>{segments}</>;
};

// Analysis breakdown bar (for phishing ML details)
const BreakdownBar = ({ label, value, max, color }) => (
  <div style={{ marginBottom: '8px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--muted)', marginBottom: '4px' }}>
      <span>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
    <div style={{ height: '4px', background: 'var(--bg)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min((value / max) * 100, 100)}%`, background: color, borderRadius: '2px', transition: 'width 0.8s ease' }} />
    </div>
  </div>
);

const ExplainabilityPanel = ({ activeTab, result, inputAreaValue }) => {
  if (!result) return null;

  // ── Behaviour Event Log ────────────────────────────────────
  if (activeTab === 'behaviour') {
    const { flagged_events } = result;
    if (!flagged_events || flagged_events.length === 0) return null;
    return (
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="section-label">BEHAVIOUR EVENT LOG</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {flagged_events.map((evt, idx) => {
            const s = SEVERITY_STYLES[evt.severity] || SEVERITY_STYLES.LOW;
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--s2)', padding: '10px', border: '0.5px solid var(--border)', borderRadius: '6px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--muted)', minWidth: '54px' }}>{evt.timestamp}</div>
                <div style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text)' }}>{evt.description}</div>
                <div style={{ ...s.badge, fontSize: '9px', padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.3px', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>{evt.severity}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Phishing / Injection XAI ───────────────────────────────
  const { flagged_phrases, explanation_summary, analysis_breakdown } = result;
  const hasPhrases = flagged_phrases && flagged_phrases.length > 0;
  const hasExplanation = explanation_summary;
  const hasBreakdown = analysis_breakdown;

  if (!hasPhrases && !hasExplanation) return null;

  return (
    <div className="panel" style={{ marginBottom: '24px' }}>
      <div className="section-label">EXPLAINABILITY — WHY FLAGGED</div>

      {/* Highlighted text */}
      {hasPhrases && (
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', lineHeight: '2.2', background: 'var(--bg)', padding: '12px', border: '0.5px solid var(--border)', borderRadius: '6px', marginBottom: '12px' }}>
          <HighlightedText text={inputAreaValue} flaggedPhrases={flagged_phrases} />
        </div>
      )}

      {/* Explanation summary */}
      {hasExplanation && (
        <div style={{ background: 'rgba(139,92,246,0.06)', border: '0.5px solid rgba(139,92,246,0.2)', borderRadius: '6px', padding: '10px 12px', marginBottom: '12px' }}>
          <div style={{ fontSize: '9px', color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '1.2px', fontFamily: 'JetBrains Mono, monospace', marginBottom: '6px' }}>
            AI ANALYSIS SUMMARY
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', lineHeight: '1.7', color: 'var(--text)' }}>
            {explanation_summary}
          </div>
        </div>
      )}

      {/* Analysis breakdown bars (phishing only) */}
      {hasBreakdown && (
        <div style={{ background: 'var(--s2)', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '10px 12px', marginBottom: '12px' }}>
          <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1.2px', fontFamily: 'JetBrains Mono, monospace', marginBottom: '10px' }}>
            ANALYSIS BREAKDOWN
          </div>
          <BreakdownBar label="ML Model Probability" value={Math.round(analysis_breakdown.ml_probability * 100)} max={100} color="var(--cyan)" />
          <BreakdownBar label="Scam Pattern Score" value={analysis_breakdown.pattern_score} max={60} color="var(--red)" />
          <BreakdownBar label="NLP Feature Score" value={analysis_breakdown.nlp_score} max={40} color="var(--amber)" />
        </div>
      )}

      {/* Per-phrase reasons */}
      {hasPhrases && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {flagged_phrases.map((phrase, idx) => (
            <div key={idx} style={{
              background: 'var(--s2)', border: '0.5px solid var(--border)',
              borderLeft: `2px solid ${phrase.level === 'red' ? 'var(--red)' : 'var(--amber)'}`,
              borderRadius: '5px', padding: '8px 10px',
            }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--text)', marginBottom: '4px' }}>
                "<span style={{ color: 'var(--muted)' }}>{phrase.text}</span>"
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--muted)', lineHeight: '1.5' }}>{phrase.reason}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExplainabilityPanel;
