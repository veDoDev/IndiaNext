import React from 'react';

const PLACEHOLDERS = {
  phishing: 'Paste suspicious email or message here...',
  injection: 'Paste the prompt or user input to analyze...',
  behaviour: 'Paste activity log or JSON event array here...',
  url: 'Paste suspicious URL or domain name here...',
};

const InputPanel = ({ activeTab, inputAreaValue, setInputAreaValue, onAnalyze, loading, onFillSample }) => (
  <div className="panel" style={{ marginBottom: '24px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <div className="section-label" style={{ marginBottom: 0 }}>THREAT INPUT</div>
      {activeTab === 'behaviour' && (
        <button
          onClick={onFillSample}
          style={{
            background: 'none', border: 'none', color: 'var(--cyan)',
            fontSize: '10px', cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace', textDecoration: 'underline',
          }}
        >Load Sample JSON</button>
      )}
    </div>
    <textarea
      value={inputAreaValue}
      onChange={e => setInputAreaValue(e.target.value)}
      placeholder={PLACEHOLDERS[activeTab]}
      style={{
        width: '100%', height: '80px',
        background: 'var(--bg)',
        border: '0.5px solid var(--border)',
        borderRadius: '6px', padding: '12px',
        fontSize: '11px', fontFamily: 'JetBrains Mono, monospace',
        color: 'var(--text)', resize: 'none',
        outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.2s',
      }}
      onFocus={e => e.target.style.borderColor = 'var(--cyan)'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}
    />
    <button
      onClick={onAnalyze}
      disabled={loading || !inputAreaValue.trim()}
      style={{
        marginTop: '12px', width: '100%',
        background: loading || !inputAreaValue.trim() ? 'rgba(0,212,255,0.3)' : 'var(--cyan)',
        color: '#000',
        fontFamily: 'Syne, sans-serif', fontWeight: 700,
        fontSize: '13px', padding: '12px 0',
        border: 'none', borderRadius: '6px',
        cursor: loading || !inputAreaValue.trim() ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      }}
    >
      {loading ? (
        <>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span>
          ANALYZING...
        </>
      ) : 'ANALYZE THREAT →'}
    </button>
  </div>
);

export default InputPanel;
