import React from 'react';

const Bar = ({ label, value, valueColor, gradient }) => (
  <div style={{ marginBottom: '16px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}>
      <span style={{ color: 'var(--text)' }}>{label}</span>
      <span style={{ color: valueColor, fontWeight: 700 }}>{value}%</span>
    </div>
    <div style={{ height: '7px', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${value}%`,
        background: gradient,
        borderRadius: '4px',
        transition: 'width 1s ease-out',
      }} />
    </div>
  </div>
);

const ChartsPanel = ({ result }) => {
  if (!result) return null;
  const confPct = Math.round(result.confidence * 100);
  return (
    <div className="panel" style={{ marginBottom: '24px' }}>
      <Bar label="Threat Level" value={result.threat_score} valueColor="var(--red)" gradient="linear-gradient(to right, var(--amber), var(--red))" />
      <Bar label="Model Confidence" value={confPct} valueColor="var(--cyan)" gradient="linear-gradient(to right, var(--cyan), var(--purple))" />
    </div>
  );
};

export default ChartsPanel;
