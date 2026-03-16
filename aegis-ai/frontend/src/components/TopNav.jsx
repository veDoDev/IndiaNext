import React from 'react';

const nav = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 0',
  marginBottom: '16px',
  borderBottom: '0.5px solid var(--border)',
};

const logoBox = {
  width: '16px', height: '16px', borderRadius: '3px',
  background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
  marginRight: '8px', flexShrink: 0,
};

const logoText = {
  fontFamily: 'Syne, sans-serif', fontWeight: 700,
  fontSize: '19px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center',
};

const statusPill = {
  display: 'flex', alignItems: 'center', gap: '6px',
  background: 'var(--s1)', border: '0.5px solid var(--border)',
  padding: '6px 12px', borderRadius: '999px',
};

const dot = {
  width: '8px', height: '8px', borderRadius: '50%',
  background: 'var(--green)',
  animation: 'pulse 2s infinite',
};

const statusText = {
  color: 'var(--green)', fontSize: '10px',
  fontFamily: 'JetBrains Mono, monospace',
  letterSpacing: '0.1em', textTransform: 'uppercase',
};

const TopNav = () => (
  <div style={nav}>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div style={logoBox} />
      <div style={logoText}>
        AEGIS<span style={{ color: 'var(--cyan)' }}>.</span>AI
      </div>
    </div>
    <div style={statusPill}>
      <div style={dot} />
      <span style={statusText}>System Online</span>
    </div>
  </div>
);

export default TopNav;
