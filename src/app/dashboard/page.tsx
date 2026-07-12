"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Search, 
  Download, 
  AlertTriangle, 
  XCircle, 
  BookOpen, 
  Activity, 
  TrendingUp,
  RotateCw,
  Circle,
  CheckCircle
} from 'lucide-react';

interface CompanyInfo {
  cik: string;
  ticker: string;
  name: string;
  country?: string;
}

interface LogRow {
  timestamp: string;
  nodeName: string;
  message: string;
  status: "started" | "succeeded" | "failed" | "skipped";
}

export default function Dashboard() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CompanyInfo[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyInfo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [activeNode, setActiveNode] = useState('');
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [memo, setMemo] = useState<any | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'base' | 'bull' | 'bear'>('base');
  
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const getNodeStatuses = (logsList: LogRow[]) => {
    const statuses: Record<string, { status: 'idle' | 'running' | 'completed' | 'failed'; timestamp?: string }> = {
      intake: { status: 'idle' },
      hypothesis: { status: 'idle' },
      workers: { status: 'idle' },
      evidence: { status: 'idle' },
      verifier: { status: 'idle' },
      reflexion: { status: 'idle' },
      compiler: { status: 'idle' }
    };

    logsList.forEach(log => {
      const name = log.nodeName.toLowerCase();
      const status = log.status;
      const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      let key = '';
      if (name.includes('intake') || name.includes('graph engine')) key = 'intake';
      else if (name.includes('hypothesis')) key = 'hypothesis';
      else if (name.includes('worker') || name.includes('parallel')) key = 'workers';
      else if (name.includes('evidence') || name.includes('graph builder')) key = 'evidence';
      else if (name.includes('verifier')) key = 'verifier';
      else if (name.includes('reflexion') || name.includes('advocate') || name.includes('scorer') || name.includes('updater')) key = 'reflexion';
      else if (name.includes('compiler') || name.includes('scenario') || name.includes('tripwire')) key = 'compiler';

      if (key) {
        if (status === 'started') {
          statuses[key] = { status: 'running' };
        } else if (status === 'succeeded') {
          statuses[key] = { status: 'completed', timestamp: time };
        } else if (status === 'failed') {
          statuses[key] = { status: 'failed', timestamp: time };
        }
      }
    });

    const keysOrder = ['intake', 'hypothesis', 'workers', 'evidence', 'verifier', 'reflexion', 'compiler'];
    let highestActiveIdx = -1;
    keysOrder.forEach((k, idx) => {
      if (statuses[k].status === 'running' || statuses[k].status === 'completed' || statuses[k].status === 'failed') {
        highestActiveIdx = idx;
      }
    });

    keysOrder.forEach((k, idx) => {
      if (idx < highestActiveIdx && statuses[k].status === 'idle') {
        statuses[k].status = 'completed';
      }
    });

    return statuses;
  };

  const nodeStatuses = getNodeStatuses(logs);

  const renderNodeBox = (key: string, label: string) => {
    const state = nodeStatuses[key]?.status || 'idle';
    let borderColor = '#222222';
    let textColor = 'var(--text-dark)';
    let dotColor = 'transparent';
    let animate = false;

    if (state === 'running') {
      borderColor = 'var(--accent, #3b82f6)';
      textColor = '#3b82f6';
      dotColor = '#3b82f6';
      animate = true;
    } else if (state === 'completed') {
      borderColor = 'var(--success, #10b981)';
      textColor = '#10b981';
      dotColor = '#10b981';
    } else if (state === 'failed') {
      borderColor = 'var(--error, #ef4444)';
      textColor = '#ef4444';
      dotColor = '#ef4444';
    }

    return (
      <div style={{
        border: `1px solid ${borderColor}`,
        borderRadius: '6px',
        padding: '6px 12px',
        backgroundColor: '#0c0c0c',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        minWidth: '135px',
        justifyContent: 'center',
        fontSize: '11px',
        color: textColor,
        transition: 'all 0.3s ease'
      }}>
        {dotColor !== 'transparent' && (
          <span className={animate ? "animate-pulse" : ""} style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: dotColor,
            display: 'inline-block'
          }} />
        )}
        <span>{label}</span>
      </div>
    );
  };

  const renderVerticalLine = (height = 14) => (
    <div style={{ display: 'flex', justifyContent: 'center', height: `${height}px` }}>
      <div style={{ width: '1px', borderLeft: '1px dashed #333333' }} />
    </div>
  );

  const renderSplitConnectors = () => (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '1px', height: '6px', borderLeft: '1px dashed #333333' }} />
      <div style={{ width: '66%', height: '1px', borderTop: '1px dashed #333333' }} />
      <div style={{ width: '66%', display: 'flex', justifyContent: 'space-between', height: '6px' }}>
        <div style={{ width: '1px', height: '100%', borderLeft: '1px dashed #333333' }} />
        <div style={{ width: '1px', height: '100%', borderLeft: '1px dashed #333333' }} />
        <div style={{ width: '1px', height: '100%', borderLeft: '1px dashed #333333' }} />
      </div>
    </div>
  );

  const renderMergeConnectors = () => (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '66%', display: 'flex', justifyContent: 'space-between', height: '6px' }}>
        <div style={{ width: '1px', height: '100%', borderLeft: '1px dashed #333333' }} />
        <div style={{ width: '1px', height: '100%', borderLeft: '1px dashed #333333' }} />
        <div style={{ width: '1px', height: '100%', borderLeft: '1px dashed #333333' }} />
      </div>
      <div style={{ width: '66%', height: '1px', borderTop: '1px dashed #333333' }} />
      <div style={{ width: '1px', height: '6px', borderLeft: '1px dashed #333333' }} />
    </div>
  );

  const renderProgressRow = (label: string, statusKey: string) => {
    const nodeState = nodeStatuses[statusKey]?.status || 'idle';
    const timestamp = nodeStatuses[statusKey]?.timestamp || '';
    
    let icon = <Circle size={13} style={{ color: 'var(--text-dark)' }} />;
    let labelColor = 'var(--text-dark)';
    
    if (nodeState === 'running') {
      icon = <RotateCw size={13} className="animate-spin" style={{ color: '#3b82f6' }} />;
      labelColor = '#3b82f6';
    } else if (nodeState === 'completed') {
      icon = <CheckCircle size={13} style={{ color: '#10b981' }} />;
      labelColor = '#ffffff';
    } else if (nodeState === 'failed') {
      icon = <XCircle size={13} style={{ color: '#ef4444' }} />;
      labelColor = '#ef4444';
    }

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {icon}
          <span style={{ fontSize: '11px', color: labelColor, fontWeight: nodeState === 'running' ? 600 : 400 }}>{label}</span>
        </div>
        {timestamp && (
          <span style={{ fontSize: '9px', color: 'var(--text-dark)' }}>{timestamp}</span>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/company-search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleForceResolve = async () => {
    if (!query.trim()) return;
    setIsResolving(true);
    setError(null);
    setSelectedCompany(null);
    setMemo(null);
    setLogs([]);

    try {
      const res = await fetch(`/api/company-search/force-resolve?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error(`AI Web resolution failed: HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.company) {
        const resolved = data.company;
        const company: CompanyInfo = {
          cik: resolved.cik,
          ticker: resolved.ticker,
          name: resolved.name,
          country: resolved.country
        };
        setSelectedCompany(company);
        setQuery(`${resolved.name} (${resolved.ticker})`);
        setShowDropdown(false);
      } else {
        throw new Error("Failed to extract company profile from web search.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to resolve company via AI search.");
    } finally {
      setIsResolving(false);
    }
  };

  const handleSelectCompany = (company: CompanyInfo) => {
    setSelectedCompany(company);
    setQuery(`${company.name} (${company.ticker})`);
    setShowDropdown(false);
    setMemo(null);
    setLogs([]);
    setError(null);
  };

  const startStressTest = async () => {
    if (!selectedCompany) return;

    setIsAnalyzing(true);
    setLogs([]);
    setMemo(null);
    setError(null);
    setRunId(null);
    setActiveNode("Graph Engine");

    try {
      const response = await fetch('/api/stress-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: selectedCompany.ticker,
          cik: selectedCompany.cik,
          name: selectedCompany.name
        })
      });

      if (!response.ok) {
        throw new Error(`Endpoint setup failed: HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No readable stream body returned");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          
          const eventMatch = line.match(/^event:\s*(.+)$/m);
          const dataMatch = line.match(/^data:\s*(.+)$/m);

          if (eventMatch && dataMatch) {
            const event = eventMatch[1].trim();
            const data = JSON.parse(dataMatch[1].trim());

            if (event === 'log') {
              setLogs(prev => [...prev, {
                timestamp: data.timestamp,
                nodeName: data.nodeName,
                message: data.message,
                status: data.status
              }]);
              setActiveNode(data.nodeName);
            } else if (event === 'done') {
              if (data.analysisData) {
                (window as any).tempAnalysisData = data.analysisData;
              }
              setRunId(data.runId);
              setIsAnalyzing(false);
              router.push(`/analyses/${data.runId}`);
            } else if (event === 'error') {
              setError(data.message);
              setIsAnalyzing(false);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Pipeline failure:", err);
      setError(err.message || "Failed to execute stress test");
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (runId) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/analyses/${runId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.memo_json) {
              setMemo(data.memo_json);
              setAnalysis(data);
              clearInterval(interval);
            }
          }
        } catch (e) {
          // ignore
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [runId]);

  const verifiedBull = memo?.verifiedClaims || [];
  const verifiedBear = memo?.evidenceGraph?.nodes?.filter((n: any) => n.id.startsWith('adv-')) || [];
  const contradictions = memo?.evidenceGraph?.edges?.filter((e: any) => e.relation === 'contradicts') || [];

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '40px', marginTop: '20px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>P-IIM Engine</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '700px', margin: '0 auto' }}>
          Formulate quantitative, falsifiable hypotheses. Force adversarial critique. Audit factual sources. Keep your investment thesis rigorous.
        </p>
      </div>

      {/* Autocomplete Search */}
      <div className="search-wrapper" ref={searchContainerRef}>
        <div className="search-input-container">
          <input
            type="text"
            className="search-input"
            placeholder="Type company name or ticker (e.g. Apple, TSLA)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />
          <Search size={16} style={{ position: 'absolute', right: '14px', top: '13px', color: 'var(--text-dark)' }} />
        </div>

        {showDropdown && searchResults.length > 0 && (
          <div className="dropdown-menu">
            {searchResults.map((company, index) => (
              <button
                key={index}
                className="dropdown-item"
                onClick={() => handleSelectCompany(company)}
              >
                <div>
                  <div className="dropdown-item-title">{company.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dark)' }}>CIK: {company.cik}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {company.country && (
                    <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>{company.country}</span>
                  )}
                  <span className="dropdown-item-ticker">{company.ticker}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
          {selectedCompany && (
            <button
              className="btn btn-primary"
              onClick={startStressTest}
              disabled={isAnalyzing || isResolving}
              style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 600 }}
            >
              <Shield size={14} style={{ marginRight: '6px' }} />
              {isAnalyzing ? "Analyzing Pipeline..." : "Run P-IIM Audit"}
            </button>
          )}
          
          <button
            className="btn btn-secondary"
            onClick={handleForceResolve}
            disabled={isResolving || isAnalyzing || !query.trim()}
            style={{ padding: '10px 20px', fontSize: '13px' }}
          >
            {isResolving ? (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <RotateCw size={14} className="animate-spin" style={{ marginRight: '6px' }} />
                Resolving via AI...
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <Activity size={14} style={{ marginRight: '6px' }} />
                AI Web Resolver
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Error Panel */}
      {error && (
        <div className="card" style={{ borderLeft: '4px solid var(--error)', backgroundColor: 'rgba(239,68,68,0.05)' }}>
          <h3 style={{ color: 'var(--error)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <XCircle size={18} />
            Pipeline Execution Error
          </h3>
          <p style={{ color: '#fca5a5' }}>{error}</p>
        </div>
      )}

      {/* Live Logging Terminal */}
      {/* Live Running/Execution Progress Layout */}
      {(isAnalyzing || logs.length > 0) && !memo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', marginTop: '12px', alignItems: 'stretch' }}>
            {/* Left Flowchart Map */}
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
                <span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Committee Workflow Execution Map
                </span>
                <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: 'var(--text-dark)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#555' }} /> Idle
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6' }} /> Researching
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} /> Complete
                  </span>
                </div>
              </div>
              
              {/* Flowchart Layout */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '10px 0' }}>
                {renderNodeBox('intake', 'Intake & SEC Fetch')}
                {renderVerticalLine()}
                {renderNodeBox('hypothesis', 'Hypothesis Builder')}
                {renderSplitConnectors()}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
                  {renderNodeBox('workers', 'Confirming Agent')}
                  {renderNodeBox('workers', 'Adversarial Audit')}
                  {renderNodeBox('workers', 'Macro Sector Agent')}
                </div>
                {renderMergeConnectors()}
                {renderNodeBox('evidence', 'Evidence Graph Builder')}
                {renderVerticalLine()}
                {renderNodeBox('verifier', 'Claim Verifier')}
                {renderVerticalLine()}
                {renderNodeBox('reflexion', 'Devil\'s Advocate')}
                {renderVerticalLine()}
                {renderNodeBox('reflexion', 'Two-Layer Scorer')}
                {renderVerticalLine()}
                {renderNodeBox('compiler', 'Memo Compiler')}
              </div>
            </div>
            
            {/* Right Checklist */}
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', minHeight: '480px' }}>
              <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', marginBottom: '12px' }}>
                <span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Committee Progress Log
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                {renderProgressRow('Intake & SEC Fetch', 'intake')}
                {renderProgressRow('Hypothesis Builder', 'hypothesis')}
                {renderProgressRow('Confirming Research Worker', 'workers')}
                {renderProgressRow('Adversarial Research Worker', 'workers')}
                {renderProgressRow('Macro/Sector Research Worker', 'workers')}
                {renderProgressRow('Evidence Graph Builder', 'evidence')}
                {renderProgressRow('Factual Claim Verifier', 'verifier')}
                {renderProgressRow('Devil\'s Advocate Review', 'reflexion')}
                {renderProgressRow('Two-Layer Confidence Scorer', 'reflexion')}
                {renderProgressRow('Consensus Memo Compiler', 'compiler')}
              </div>
            </div>
          </div>

          {/* Logs Terminal - Positioned Below */}
          <div className="terminal">
            <div className="terminal-header">
              <div className="terminal-dots">
                <div className="terminal-dot terminal-dot-red"></div>
                <div className="terminal-dot terminal-dot-yellow"></div>
                <div className="terminal-dot terminal-dot-green"></div>
              </div>
              <div className="terminal-title">
                {isAnalyzing ? `P-IIM AUDIT IN PROGRESS [Active Node: ${activeNode}]` : "DETAILED RUN DIAGNOSTICS LOGS"}
              </div>
              <div style={{ width: '40px' }}></div>
            </div>
            <div className="terminal-body">
              {logs.map((log, idx) => (
                <div key={idx} className="terminal-row">
                  <span className="terminal-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="terminal-node">[{log.nodeName}]</span>
                  <span className={`terminal-msg ${log.status}`}>{log.message}</span>
                </div>
              ))}
              {isAnalyzing && (
                <div className="terminal-row" style={{ color: 'var(--accent)' }}>
                  <span>&gt; Executing pipeline node channels...</span>
                </div>
              )}
              <div ref={terminalEndRef}></div>
            </div>
          </div>
        </div>
      )}

      {/* Completed Memo */}
      {memo && (
        <div>
          <div className="memo-header">
            <div className="memo-title-block">
              <h1>P-IIM Audit Results</h1>
              <div className="memo-meta">
                Exchange: {memo.metadata?.exchange || 'US SEC'} | Sector: {memo.metadata?.sector || 'Unknown'} | Country: {analysis?.country || 'Unknown'} | Est. API Cost: ${memo.metadata?.costEstimateUsd?.toFixed(4) || '0.00'} USD
              </div>
            </div>
            {runId && (
              <a href={`/api/analyses/${runId}/pdf`} className="btn btn-secondary">
                <Download size={14} />
                Download PDF Memo
              </a>
            )}
          </div>

          <div className="card memo-verdict-card">
            <div>
              <div style={{ textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                P-IIM Final Verdict
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`badge ${memo.verdict === 'BUY/ACCUMULATE' ? 'badge-success' : memo.verdict === 'INSUFFICIENT DATA' ? 'badge-error' : 'badge-warning'}`} style={{ fontSize: '14px', padding: '6px 14px' }}>
                  {memo.verdict}
                </span>
                {memo.finalConfidenceScore !== null && (
                  <span className="badge" style={{ fontSize: '14px', padding: '6px 14px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    Confidence Score: {memo.finalConfidenceScore}%
                  </span>
                )}
              </div>
            </div>
            {memo.finalConfidenceScore !== null && (
              <div className="verdict-score-display">
                <div style={{ textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Calibrated Confidence Score
                </div>
                <div className="score-number">{memo.finalConfidenceScore}%</div>
              </div>
            )}
          </div>

          {memo.metadata?.metrics && (
            <div className="card" style={{ marginTop: '20px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>
                Key Financial & Valuation Metrics
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>Current Price</span>
                  <strong style={{ fontSize: '16px', color: '#ffffff' }}>
                    {memo.metadata.metrics.price ? `${memo.metadata.metrics.price.toFixed(2)} ${memo.metadata.metrics.currency || 'USD'}` : 'N/A'}
                  </strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>Market Cap</span>
                  <strong style={{ fontSize: '16px', color: '#ffffff' }}>
                    {memo.metadata.metrics.marketCap ? `${(memo.metadata.metrics.marketCap / 1e9).toFixed(2)}B ${memo.metadata.metrics.currency || 'USD'}` : 'N/A'}
                  </strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>Valuation (P/E Ratio)</span>
                  <strong style={{ fontSize: '16px', color: '#ffffff' }}>
                    {memo.metadata.metrics.peRatio ? `${memo.metadata.metrics.peRatio.toFixed(2)}x` : 'N/A'}
                  </strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>Earnings Per Share (EPS)</span>
                  <strong style={{ fontSize: '16px', color: '#ffffff' }}>
                    {memo.metadata.metrics.eps ? `${memo.metadata.metrics.eps.toFixed(2)}` : 'N/A'}
                  </strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>Beta (Volatility)</span>
                  <strong style={{ fontSize: '16px', color: '#ffffff' }}>
                    {memo.metadata.metrics.beta ? `${memo.metadata.metrics.beta.toFixed(2)}` : 'N/A'}
                  </strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>52-Week Range</span>
                  <strong style={{ fontSize: '13px', color: '#ffffff', marginTop: '3px' }}>
                    {memo.metadata.metrics.fiftyTwoWeekRange || 'N/A'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          <PerformanceLineChart data={memo.metadata?.chartData} />

          <div className="memo-grid">
            {/* Left */}
            <div>
              <div className="card">
                <div className="tabs-header">
                  <button
                    className={`tab-btn ${activeTab === 'base' ? 'active' : ''}`}
                    onClick={() => setActiveTab('base')}
                  >
                    Base Case
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'bull' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bull')}
                  >
                    Bull Case
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'bear' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bear')}
                  >
                    Bear Case
                  </button>
                </div>
                <div style={{ lineHeight: 1.6, color: '#ededed', minHeight: '80px', padding: '12px 0' }}>
                  {activeTab === 'base' && <p>{memo.baseCase || "No base case scenario narrative was generated."}</p>}
                  {activeTab === 'bull' && <p>{memo.bullCase || "No bull case scenario narrative was generated."}</p>}
                  {activeTab === 'bear' && <p>{memo.bearCase || "No bear case scenario narrative was generated."}</p>}
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} style={{ color: 'var(--text-muted)' }} />
                  Falsifiable Future Tripwire Triggers
                </h3>
                <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {memo.tripwires && memo.tripwires.length > 0 ? (
                    memo.tripwires.map((wire: string, idx: number) => (
                      <li key={idx} style={{ color: 'var(--foreground)', lineHeight: 1.5 }}>{wire}</li>
                    ))
                  ) : (
                    <div style={{ color: 'var(--text-dark)', fontSize: '12px', padding: '6px 0' }}>
                      No falsifiable tripwires generated for this thesis.
                    </div>
                  )}
                </ol>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={16} style={{ color: 'var(--text-muted)' }} />
                  Confidence Score Metrics
                </h3>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  {memo.confidenceBreakdown && Object.keys(memo.confidenceBreakdown).length > 0 ? (
                    Object.entries(memo.confidenceBreakdown).map(([key, val]: [string, any], idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-muted)', paddingBottom: '6px' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{key}:</span>
                        <span style={{ textAlign: 'right' }}>{val}</span>
                      </li>
                    ))
                  ) : (
                    <div style={{ color: 'var(--text-dark)', fontSize: '12px', padding: '6px 0' }}>
                      No confidence breakdown details available.
                    </div>
                  )}
                </ul>
              </div>
            </div>

            {/* Right */}
            <div>
              {memo.evidenceGraph?.edges?.filter((e: any) => e.relation === 'contradicts').length > 0 && (
                <div className="contradiction-box">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <AlertTriangle size={16} />
                    Factual Contradictions Surfaced
                  </h4>
                  <ul style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {memo.evidenceGraph.edges
                      .filter((e: any) => e.relation === 'contradicts')
                      .map((edge: any, i: number) => {
                        const conf = memo.evidenceGraph.nodes.find((n: any) => n.id === edge.from);
                        const adv = memo.evidenceGraph.nodes.find((n: any) => n.id === edge.to);
                        return (
                          <li key={i}>
                            Bullish Claim: <strong>"{conf?.claim}"</strong> contradicts Bearish Risk: <strong>"{adv?.claim}"</strong>.
                          </li>
                        );
                      })}
                  </ul>
                </div>
              )}

              <div className="card">
                <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} style={{ color: 'var(--text-muted)' }} />
                  Evidence Graph Network
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Confirming (green) and Adversarial (red) fact-claims extracted by parallel workers:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {memo.evidenceGraph?.nodes?.map((node: any) => (
                    <div
                      key={node.id}
                      className={`evidence-node-item ${node.id.startsWith('conf-') ? 'confirming' : 'adversarial'}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        <span>Source: {node.sourceType} ({node.reliabilityScore}% reliability)</span>
                        <span style={{ textTransform: 'uppercase', fontWeight: 700, color: node.id.startsWith('conf-') ? 'var(--success)' : 'var(--error)' }}>
                          {node.id.startsWith('conf-') ? 'Bullish' : 'Red Flag'}
                        </span>
                      </div>
                      <div style={{ fontWeight: 500, color: '#ffffff' }}>{node.claim}</div>
                    </div>
                  ))}
                </div>
              </div>

              {memo.rejectedClaims && memo.rejectedClaims.length > 0 && (
                <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                  <h3 style={{ color: 'var(--error)', marginBottom: '12px', borderBottom: '1px solid rgba(239, 68, 68, 0.15)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <XCircle size={16} />
                    Rejected Source Claims (Audit Failure)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {memo.rejectedClaims.map((claim: any, idx: number) => (
                      <div key={idx} style={{ fontSize: '12px', backgroundColor: 'rgba(239, 68, 68, 0.02)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                        <div style={{ fontWeight: 500, color: '#fca5a5' }}>"{claim.claim}"</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
                          Reason: {claim.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card">
                <h3 style={{ marginBottom: '12px', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px' }}>
                  Bypassed Red Flags Log
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {memo.rejectedEvidenceSummary}
                </p>
              </div>
            </div>
          </div>

          {/* Sources */}
          <div className="card">
            <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={16} style={{ color: 'var(--text-muted)' }} />
              Source Citations & Quotes
            </h3>
            <div className="source-list">
              {[...(memo.verifiedClaims || []), ...(memo.evidenceGraph?.nodes?.filter((n: any) => n.id.startsWith('adv-')) || [])].slice(0, 10).map((source: any, idx: number) => (
                <div key={idx} className="source-item">
                  <div>
                    <span style={{ backgroundColor: 'var(--border-muted)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginRight: '8px', color: '#ffffff' }}>
                      [{idx + 1}]
                    </span>
                    <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="source-item-url">
                      {source.sourceUrl}
                    </a>
                  </div>
                  <div className="source-item-quote">"{source.quote}"</div>
                </div>
              ))}
            </div>
          </div>

          <div className="disclaimer-banner">
            {memo.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}

function PerformanceLineChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="card" style={{ marginTop: '20px', padding: '24px', marginBottom: '20px', borderStyle: 'dashed', borderColor: 'var(--border-muted)', backgroundColor: 'transparent', textAlign: 'center' }}>
        <div style={{ textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.05em' }}>
          Historical Performance Trend
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-dark)' }}>
          Historical stock performance chart is unavailable for private entities or non-listed listings.
        </div>
      </div>
    );
  }

  const prices = data.map(d => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const width = 500;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 25;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = data.map((d, index) => {
    const x = paddingLeft + (index / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.close - minPrice) / priceRange) * chartHeight;
    return { x, y, date: d.date, close: d.close };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

  return (
    <div className="card animate-fade-in" style={{ marginTop: '20px', padding: '20px', marginBottom: '20px' }}>
      <div style={{ textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 600, letterSpacing: '0.05em' }}>
        12-Month Performance Trend (Closing Price)
      </div>
      <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#222222" strokeDasharray="3 3" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight / 2} x2={width - paddingRight} y2={paddingTop + chartHeight / 2} stroke="#222222" strokeDasharray="3 3" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width - paddingRight} y2={paddingTop + chartHeight} stroke="#222222" strokeDasharray="3 3" />

          <text x={paddingLeft - 8} y={paddingTop + 4} fill="var(--text-dark)" fontSize="9" textAnchor="end" style={{ letterSpacing: 'normal' }}>{`$${Math.round(maxPrice)}`}</text>
          <text x={paddingLeft - 8} y={paddingTop + chartHeight / 2 + 3} fill="var(--text-dark)" fontSize="9" textAnchor="end" style={{ letterSpacing: 'normal' }}>{`$${Math.round((maxPrice + minPrice) / 2)}`}</text>
          <text x={paddingLeft - 8} y={paddingTop + chartHeight + 3} fill="var(--text-dark)" fontSize="9" textAnchor="end" style={{ letterSpacing: 'normal' }}>{`$${Math.round(minPrice)}`}</text>

          {/* Shaded Area under path */}
          <path d={areaPath} fill="url(#chartGradient)" />

          {/* Core price line */}
          <path d={linePath} fill="none" stroke="#10b981" strokeWidth="1.5" />

          {/* Price dots */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="3" fill="#10b981" stroke="#000000" strokeWidth="1" />
              <title>{`${p.date}: ${p.close}`}</title>
            </g>
          ))}

          {/* X-axis date labels */}
          {points.filter((_, idx) => idx % 2 === 0 || idx === points.length - 1).map((p, i) => (
            <text key={i} x={p.x} y={height - 6} fill="var(--text-dark)" fontSize="9" textAnchor="middle">{p.date}</text>
          ))}
        </svg>
      </div>
    </div>
  );
}
