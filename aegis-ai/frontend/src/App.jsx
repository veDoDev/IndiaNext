import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import TopNav from './components/TopNav';
import Tabs from './components/Tabs';
import InputPanel from './components/InputPanel';
import VerdictCards from './components/VerdictCards';
import ChartsPanel from './components/ChartsPanel';
import ExplainabilityPanel from './components/ExplainabilityPanel';
import RecommendationPanel from './components/RecommendationPanel';
import LandingPage from './components/LandingPage';
import { analyzePhishing, analyzeInjection, analyzeBehaviour, analyzeUrl } from './api';

const SAMPLE_BEHAVIOUR_JSON = JSON.stringify([
  { timestamp: "21:45:10", action: "User logged in successfully", ip: "192.168.1.10" },
  { timestamp: "23:10:05", action: "Login failed (Bad credentials)", ip: "203.0.113.45" },
  { timestamp: "23:10:45", action: "Login failed (Bad credentials)", ip: "203.0.113.45" },
  { timestamp: "23:11:15", action: "Login failed (Bad credentials)", ip: "203.0.113.45" },
  { timestamp: "23:11:40", action: "User logged in successfully", ip: "203.0.113.45" },
  { timestamp: "23:12:05", action: "Started bulk data export (5000 records)", ip: "203.0.113.45" },
], null, 2);

function Dashboard() {
  const [activeTab, setActiveTab] = useState('phishing');
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleTabSelect = (tabId) => {
    setActiveTab(tabId);
    setInputVal('');
    setResult(null);
    setError('');
  };

  const handleAnalyze = async () => {
    if (!inputVal.trim()) return;
    setLoading(true); setResult(null); setError('');
    try {
      let res;
      if (activeTab === 'phishing') res = await analyzePhishing(inputVal);
      else if (activeTab === 'injection') res = await analyzeInjection(inputVal);
      else if (activeTab === 'url') res = await analyzeUrl(inputVal);
      else if (activeTab === 'behaviour') {
        let events;
        try { events = JSON.parse(inputVal); if (!Array.isArray(events)) throw new Error(); }
        catch { throw new Error('Invalid JSON array provided for behaviour analysis.'); }
        res = await analyzeBehaviour(events);
      }
      else if (activeTab === 'url') {
        res = await analyzeUrl(inputVal);
      }
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Analysis failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .result-anim { animation: fadeIn 0.4s ease-out; }
      `}</style>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 16px 48px' }}>
        
        {/* Navigation Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '24px', marginBottom: '24px' }}>
             <TopNav />
             <button 
                 onClick={() => navigate('/')}
                 style={{
                     background: 'transparent', color: '#8892b0', border: '1px solid var(--border)', 
                     padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px',
                     display: 'flex', alignItems: 'center', transition: 'all 0.2s'
                 }}
                 onMouseOver={(e) => { e.currentTarget.style.color = 'var(--cyan)'; e.currentTarget.style.borderColor = 'var(--cyan)'; }}
                 onMouseOut={(e) => { e.currentTarget.style.color = '#8892b0'; e.currentTarget.style.borderColor = 'var(--border)'; }}
             >
                 [ EXIT TO CORE ]
             </button>
        </div>

        <Tabs activeTab={activeTab} onTabSelect={handleTabSelect} />
        <InputPanel
          activeTab={activeTab}
          inputAreaValue={inputVal}
          setInputAreaValue={setInputVal}
          onAnalyze={handleAnalyze}
          loading={loading}
          onFillSample={() => setInputVal(SAMPLE_BEHAVIOUR_JSON)}
        />
        {error && (
          <div style={{
            background: 'rgba(255,59,92,0.05)', border: '0.5px solid rgba(255,59,92,0.4)',
            borderRadius: '10px', padding: '12px 14px', marginBottom: '24px',
            color: 'var(--red)', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace',
          }}>
            ⚠ {error}
          </div>
        )}
        {result && (
          <div className="result-anim">
            <VerdictCards result={result} />
            <ChartsPanel result={result} />
            <ExplainabilityPanel activeTab={activeTab} result={result} inputAreaValue={inputVal} />
            <RecommendationPanel result={result} />
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
