import React from 'react';

const getSeverityColor = (sev) => {
  if (sev === 'LOW') return 'var(--green)';
  if (sev === 'MED') return 'var(--amber)';
  if (sev === 'HIGH') return 'var(--amber)';
  return 'var(--red)';
};

const getVerdictColor = (verdict) => {
  if (['PHISHING','INJECTION','ANOMALY'].includes(verdict)) return 'var(--red)';
  return 'var(--green)';
};

const Card = ({ label, value, color }) => (
  <div style={{
    background: 'var(--s1)', border: '0.5px solid var(--border)',
    borderRadius: '8px', padding: '10px', textAlign: 'center',
  }}>
    <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px' }}>{label}</div>
    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color }}>{value}</div>
  </div>
);

const VerdictCards = ({ result }) => {
  if (!result) return null;
  const { threat_score, severity, verdict, confidence } = result;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '24px' }}>
      <Card label="THREAT SCORE" value={threat_score} color={getSeverityColor(severity)} />
      <Card label="SEVERITY" value={severity} color={getSeverityColor(severity)} />
      <Card label="VERDICT" value={verdict} color={getVerdictColor(verdict)} />
      <Card label="CONFIDENCE" value={`${Math.round(confidence * 100)}%`} color="var(--cyan)" />
    </div>
  );
};

export default VerdictCards;
