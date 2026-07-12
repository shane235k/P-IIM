"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Shield,
  AlertTriangle,
  XCircle,
  BookOpen,
  Download,
  Activity,
  TrendingUp,
  ArrowLeft,
  MessageSquare,
  Send,
  Coins,
  TrendingDown,
  Info,
  ChevronRight,
  X
} from 'lucide-react';

interface Claim {
  claim: string;
  sourceUrl: string;
  quote: string;
}

interface RedFlag {
  claim: string;
  sourceUrl: string;
  quote: string;
  severity: "low" | "medium" | "high";
  category: string;
}

interface LogEntry {
  timestamp: string;
  nodeName: string;
  message?: string;
  status: string;
  durationMs?: number;
  llmProvider?: string | null;
  llmModel?: string | null;
  toolCallsMade?: string[];
  tokenUsage?: { input: number; output: number } | null;
  costEstimateUsd?: number | null;
  errorMessage?: string | null;
  inputSummary?: string;
  outputSummary?: string;
}

export default function AnalysisDetail({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [memo, setMemo] = useState<any | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'base' | 'bull' | 'bear'>('base');
  const [showLogs, setShowLogs] = useState(false);

  const [historyData, setHistoryData] = useState<any[]>([]);

  const downloadGuestPDF = async () => {
    try {
      const res = await fetch(`/api/analyses/${id}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis,
          memo,
          history: historyData || []
        })
      });
      if (!res.ok) {
        throw new Error(`Failed to generate PDF: HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(analysis?.ticker || 'report').toLowerCase()}-thesis-p-iim-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Error downloading report: ${err.message}`);
    }
  };

  // Chat state
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    params.then(p => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;

    async function fetchAnalysis() {
      // Check for temporary in-memory guest session data first
      const tempData = (window as any).tempAnalysisData;
      if (tempData && tempData.id === id) {
        setAnalysis(tempData);
        setMemo(tempData.memo_json);
        if (tempData.run_log_json) {
          setLogs(tempData.run_log_json);
        }
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/analyses/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Investment stress-test analysis not found.");
          }
          throw new Error(`Failed to load analysis: HTTP ${res.status}`);
        }
        const data = await res.json();
        setAnalysis(data);
        setMemo(data.memo_json);

        if (data.run_log_json) {
          setLogs(data.run_log_json);
        }
      } catch (err: any) {
        console.error("Error loading analysis:", err);
        setError(err.message || "Failed to load report");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalysis();
  }, [id]);

  // Load history data once analysis is resolved
  useEffect(() => {
    if (!analysis?.ticker) return;

    async function fetchHistory() {
      try {
        const res = await fetch(`/api/companies/${analysis.ticker}/history`);
        if (res.ok) {
          const data = await res.json();
          setHistoryData(data);
        }
      } catch (err) {
        console.warn("Failed to load historical verdicts:", err);
      }
    }
    fetchHistory();
  }, [analysis?.ticker]);

  // Load chat history once analysis is resolved
  useEffect(() => {
    if (!id || (window as any).tempAnalysisData) return;

    async function fetchChatHistory() {
      try {
        const res = await fetch(`/api/analyses/${id}/chat`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.warn("Failed to load chat history:", err);
      }
    }
    fetchChatHistory();
  }, [id]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, chatOpen]);

  useEffect(() => {
    const container = document.querySelector('.container');
    if (!container) return;
    if (chatOpen) {
      container.classList.add('chat-open-layout');
    } else {
      container.classList.remove('chat-open-layout');
    }
    return () => {
      container.classList.remove('chat-open-layout');
    };
  }, [chatOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !id || isSending) return;

    const userMsg = inputMessage;
    setInputMessage('');
    setIsSending(true);

    // Append user message locally
    setMessages(prev => [...prev, { role: 'user', message: userMsg, createdAt: new Date().toISOString() }]);

    try {
      const res = await fetch(`/api/analyses/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages, analysis })
      });

      if (!res.ok) throw new Error("Failed to get response");
      const reply = await res.json();

      setMessages(prev => [...prev, reply]);
    } catch (err: any) {
      console.error("Error sending message:", err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        message: "Error: Failed to fetch reply from LLM context database. Please ensure standard API environment keys are configured.",
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Loading P-IIM Memo...</div>
        <div style={{ fontSize: '0.85rem' }}>Querying database channels...</div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="card" style={{ borderLeft: '4px solid var(--error)', backgroundColor: 'rgba(239, 68, 68, 0.05)', marginTop: '40px' }}>
        <h3 style={{ color: 'var(--error)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <XCircle size={18} />
          Analysis Load Failed
        </h3>
        <p style={{ color: '#fca5a5', marginBottom: '16px' }}>{error || "Record could not be loaded."}</p>
        <Link href="/history" className="btn btn-secondary">
          Back to History
        </Link>
      </div>
    );
  }

  const verifiedBull = memo?.verifiedClaims || [];
  const verifiedBear = memo?.evidenceGraph?.nodes?.filter((n: any) => n.id.startsWith('adv-')) || [];
  const contradictions = memo?.evidenceGraph?.edges?.filter((e: any) => e.relation === 'contradicts') || [];

  if (analysis.status === 'failed') {
    const errorLog = analysis.run_log_json?.find((log: any) => log.status === 'failed') || {};
    return (
      <div>
        <div style={{ marginBottom: '20px', marginTop: '10px' }}>
          <Link href="/history" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={14} /> Back to History
          </Link>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--error)', backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--error)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem' }}>
            <XCircle size={22} />
            P-IIM Pipeline Execution Failed
          </h2>
          <p style={{ color: '#fca5a5', lineHeight: 1.5, marginBottom: '16px', fontSize: '13px' }}>
            This analysis run encountered a critical error during the <strong>{errorLog.nodeName || 'Pipeline'}</strong> stage and could not complete.
          </p>
          <div className="terminal" style={{ margin: 0 }}>
            <div className="terminal-header">
              <span className="terminal-title">Execution Error Details</span>
            </div>
            <div className="terminal-body" style={{ maxHeight: '200px' }}>
              <div className="terminal-row" style={{ color: 'var(--error)' }}>
                <span>&gt; Node: {errorLog.nodeName || 'Intake / Resolver'}</span>
              </div>
              <div className="terminal-row" style={{ color: '#ffffff' }}>
                <span>&gt; Error: {errorLog.errorMessage || 'Fetch failed - check SEC EDGAR API rate limit blocks or network proxy settings.'}</span>
              </div>
              <div className="terminal-row" style={{ color: 'var(--text-dark)' }}>
                <span>&gt; Timestamp: {errorLog.timestamp ? new Date(errorLog.timestamp).toLocaleString() : new Date(analysis.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button className="btn btn-secondary" onClick={() => setShowLogs(!showLogs)}>
            {showLogs ? "Hide Technical Traces" : "View Technical Traces"}
          </button>
        </div>

        {showLogs && (
          <div className="card" style={{ marginTop: '24px', padding: '20px' }}>
            <h3 style={{ marginBottom: '12px' }}>Full Graph Execution Logs</h3>
            <div className="terminal" style={{ margin: 0 }}>
              <div className="terminal-body">
                {analysis.run_log_json?.map((log: any, idx: number) => (
                  <div key={idx} className="terminal-row">
                    <span className="terminal-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="terminal-node">[{log.nodeName}]</span>
                    <span className={`terminal-msg ${log.status}`}>{log.errorMessage || log.outputSummary || 'Executed stage'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (analysis.status === 'insufficient_data') {
    const rawMemo = analysis.memo_json || {};
    const rejectedClaims = rawMemo.rejectedClaims || [];
    const verifiedClaims = rawMemo.verifiedClaims || [];
    const totalClaimsCount = rejectedClaims.length + verifiedClaims.length;
    const failRate = totalClaimsCount > 0 ? (rejectedClaims.length / totalClaimsCount) * 100 : 0;

    return (
      <div>
        <div style={{ marginBottom: '20px', marginTop: '10px' }}>
          <Link href="/history" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={14} /> Back to History
          </Link>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.05)', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--warning)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem' }}>
            <AlertTriangle size={22} />
            Thesis Factual Audit Rejected (Insufficient Verified Data)
          </h2>
          <p style={{ color: '#fde68a', lineHeight: 1.6, marginBottom: '16px', fontSize: '13.5px' }}>
            The stress-test pipeline successfully retrieved files and formulated claims for <strong>{analysis.company_name}</strong>. However, during the factual verification phase, <strong>{rejectedClaims.length} out of {totalClaimsCount} ({failRate.toFixed(0)}%)</strong> of the quantitative claims failed strict audit verification against their cited primary source quotes.
            <br /><br />
            To protect analytical integrity, safety scoring floors and momentum score signals were aborted.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid var(--border-muted)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Verified Claims</span>
              <strong style={{ fontSize: '16px', color: 'var(--success)' }}>{verifiedClaims.length}</strong>
            </div>
            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid var(--border-muted)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Rejected Claims</span>
              <strong style={{ fontSize: '16px', color: 'var(--error)' }}>{rejectedClaims.length}</strong>
            </div>
            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid var(--border-muted)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Rejection Rate</span>
              <strong style={{ fontSize: '16px', color: 'var(--warning)' }}>{failRate.toFixed(0)}%</strong>
            </div>
          </div>
        </div>

        {/* List of Rejected Claims */}
        {rejectedClaims.length > 0 && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px', color: 'var(--error)' }}>
              Audit Report: Failed Claims & Rejection Reasons
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {rejectedClaims.map((claim: any, idx: number) => (
                <div key={idx} style={{ padding: '16px', border: '1px solid var(--card-border)', borderRadius: '6px', backgroundColor: '#070707', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Claim #{idx + 1}</div>
                  <div style={{ color: '#ffffff', fontWeight: 600 }}>"{claim.claim}"</div>
                  <div style={{ borderLeft: '3px solid #333', paddingLeft: '12px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0' }}>
                    Source Quote: "{claim.quote}"
                  </div>
                  <div style={{ fontSize: '12px', color: '#fca5a5', display: 'flex', gap: '6px', alignItems: 'flex-start', marginTop: '4px' }}>
                    <span style={{ fontWeight: 600 }}>Audit Reason:</span>
                    <span>{claim.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button className="btn btn-secondary" onClick={() => setShowLogs(!showLogs)}>
            {showLogs ? "Hide Technical Traces" : "View Technical Traces"}
          </button>
        </div>

        {showLogs && (
          <div className="card" style={{ marginTop: '24px', padding: '20px' }}>
            <h3 style={{ marginBottom: '12px' }}>Full Graph Execution Logs</h3>
            <div className="terminal" style={{ margin: 0 }}>
              <div className="terminal-body">
                {analysis.run_log_json?.map((log: any, idx: number) => (
                  <div key={idx} className="terminal-row">
                    <span className="terminal-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="terminal-node">[{log.nodeName}]</span>
                    <span className={`terminal-msg ${log.status}`}>{log.errorMessage || log.outputSummary || 'Executed stage'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Calculate Transparency panel values coverage
  const layer1 = analysis.layer1_scores || {};
  const layer2 = analysis.layer2_signals || {};

  let availableSignals = 0;
  if (layer1.altmanZ?.score !== null && layer1.altmanZ?.score !== undefined) availableSignals++;
  if (layer1.piotroskiF?.score !== null && layer1.piotroskiF?.score !== undefined) availableSignals++;
  if (layer1.beneishM?.score !== null && layer1.beneishM?.score !== undefined) availableSignals++;

  const layer2Keys = ["trend", "earningsAcceleration", "leverageTrend", "insiderActivity", "analystRevisions"];
  layer2Keys.forEach(k => {
    if (layer2[k] && layer2[k].score !== null && layer2[k].score !== undefined) {
      availableSignals++;
    }
  });

  const getVerdictLabel = (v: string) => {
    if (v === 'sell') return 'SELL WHEN YOU SEE FIT';
    if (v === 'hold') return 'HOLD';
    if (v === 'neutral') return 'NEUTRAL';
    return v?.toUpperCase() || 'NEUTRAL';
  };

  const getVerdictBadgeClass = (v: string) => {
    if (v === 'sell' || v === 'SELL WHEN YOU SEE FIT') return 'badge-error';
    if (v === 'hold' || v === 'HOLD') return 'badge-success';
    return 'badge-warning';
  };

  return (
    <>
      <style>{`
        .container {
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .container.chat-open-layout {
          transform: translateX(-210px) !important;
        }
        .invisible-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .invisible-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div>
        <div style={{ marginBottom: '20px', marginTop: '10px' }}>
          <Link href="/history" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={14} /> Back to History
          </Link>
        </div>

        <div className="memo-header">
          <div className="memo-title-block">
            <h1>{analysis.company_name} P-IIM Memo</h1>
            <div className="memo-meta">
              Ticker: {analysis.ticker} | CIK: {analysis.cik} | Sector: {memo?.metadata?.sector || 'Unknown'} | Country: {analysis.country || 'Unknown'} | Analyzed on: {new Date(analysis.created_at).toLocaleDateString()}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setShowLogs(!showLogs)}>
              {showLogs ? "Hide Technical Traces" : "View Technical Traces"}
            </button>
            <button
              className="btn"
              style={{
                backgroundColor: chatOpen ? 'rgba(99, 102, 241, 0.15)' : '#4f46e5',
                borderColor: chatOpen ? 'rgba(99, 102, 241, 0.3)' : '#4f46e5',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onClick={() => setChatOpen(!chatOpen)}
            >
              <MessageSquare size={14} />
              {chatOpen ? "Close Assistant" : "Open Assistant"}
            </button>
            {typeof window !== 'undefined' && (window as any).tempAnalysisData ? (
              <button onClick={downloadGuestPDF} className="btn btn-primary">
                <Download size={14} /> Download PDF Report
              </button>
            ) : (
              <a href={`/api/analyses/${id}/pdf`} className="btn btn-primary">
                <Download size={14} /> Download PDF Report
              </a>
            )}
          </div>
        </div>

        {(() => {
          if (!memo) return null;
          const score = analysis.final_confidence_score || 50;
          const altmanBreached = layer1.altmanZ?.breached;
          const beneishBreached = layer1.beneishM?.breached;
          const floorBreached = !!(altmanBreached || beneishBreached);
          
          const fallbackAction = (score >= 60 && !floorBreached) ? "INVEST" : "PASS";
          const action = memo.finalDecision?.action || fallbackAction;
          
          let fallbackReasoning = "";
          if (action === "INVEST") {
            fallbackReasoning = `The calibrated stress-test audit completed with a final confidence rating of ${score}%. All strict safety floor verification thresholds (Altman Z-Score and Beneish M-Score) were successfully cleared without triggers, confirming robust compliance and making it investable.`;
          } else {
            if (floorBreached) {
              fallbackReasoning = `The calibrated stress-test audit has recommended a PASS (do not invest) verdict because a fundamental safety floor breach was detected in Layer 1 (Altman Z-Score or Beneish M-Score indicating distress/manipulation).`;
            } else {
              fallbackReasoning = `The calibrated stress-test audit has recommended a PASS (do not invest) verdict because the final confidence score of ${score}% is below our hedge fund's minimum investment hurdle rate of 60%.`;
            }
          }
          const reasoning = memo.finalDecision?.reasoning || fallbackReasoning;
          const isInvest = action === "INVEST";

          return (
            <div
              className="card"
              style={{
                marginTop: '20px',
                padding: '20px',
                borderRadius: '8px',
                background: 'rgba(30, 41, 59, 0.4)',
                backdropFilter: 'blur(12px)',
                border: isInvest 
                  ? '1px solid rgba(16, 185, 129, 0.25)' 
                  : '1px solid rgba(239, 68, 68, 0.25)',
                boxShadow: isInvest
                  ? '0 0 15px rgba(16, 185, 129, 0.05)'
                  : '0 0 15px rgba(239, 68, 68, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    P-IIM Investment Committee Final Verdict
                  </span>
                  <h3 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', color: '#ffffff' }}>
                    Calibrated Decision Rationale
                  </h3>
                </div>
                <div
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    letterSpacing: '0.05em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: isInvest ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: isInvest ? '#10b981' : '#ef4444',
                    border: isInvest ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    boxShadow: isInvest ? '0 0 10px rgba(16, 185, 129, 0.1)' : '0 0 10px rgba(239, 68, 68, 0.1)',
                  }}
                >
                  {action}
                </div>
              </div>
              <p style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                {reasoning}
              </p>
            </div>
          );
        })()}

        {/* Audit Logs Collapsible Panel */}
        {showLogs && logs.length > 0 && (
          <div className="terminal" style={{ maxHeight: '500px', marginBottom: '24px' }}>
            <div className="terminal-header">
              <div className="terminal-dots">
                <div className="terminal-dot terminal-dot-red"></div>
                <div className="terminal-dot terminal-dot-yellow"></div>
                <div className="terminal-dot terminal-dot-green"></div>
              </div>
              <div className="terminal-title">TECHNICAL EXECUTION RUN LOG</div>
              <div style={{ width: '40px' }}></div>
            </div>
            <div className="terminal-body" style={{ color: '#ededed' }}>
              {logs.map((log, idx) => (
                <div key={idx} style={{ borderBottom: '1px solid var(--border-muted)', paddingBottom: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>[{log.nodeName}] | Status: {log.status}</span>
                    <span>Duration: {log.durationMs || 0}ms | Cost: ${log.costEstimateUsd?.toFixed(6) || '0.000000'}</span>
                  </div>
                  {log.errorMessage && (
                    <div style={{ color: 'var(--error)', fontSize: '12px', marginTop: '4px' }}>
                      Error: {log.errorMessage}
                    </div>
                  )}
                  <div style={{ color: '#ffffff', marginTop: '6px', fontSize: '12px' }}>
                    Input: {log.inputSummary}
                  </div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '12px' }}>
                    Output: {log.outputSummary}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verdict Banner moved to right column */}
        {memo && (
          <div>

            {memo.metadata?.metrics && (
              <div className="card" style={{ marginTop: '20px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Key Financial & Valuation Metrics (Real-Time Source Only)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>Current Price</span>
                    <strong style={{ fontSize: '16px', color: '#ffffff' }}>
                      {memo.metadata.metrics.price ? `${memo.metadata.metrics.price.toFixed(2)} ${memo.metadata.metrics.currency || 'USD'}` : <span style={{ color: 'var(--text-dark)', fontWeight: 'normal', fontSize: '13px' }}>unavailable</span>}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>Market Cap</span>
                    <strong style={{ fontSize: '16px', color: '#ffffff' }}>
                      {memo.metadata.metrics.marketCap ? `${(memo.metadata.metrics.marketCap / 1e9).toFixed(2)}B ${memo.metadata.metrics.currency || 'USD'}` : <span style={{ color: 'var(--text-dark)', fontWeight: 'normal', fontSize: '13px' }}>unavailable</span>}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>Valuation (P/E Ratio)</span>
                    <strong style={{ fontSize: '16px', color: '#ffffff' }}>
                      {memo.metadata.metrics.peRatio ? `${memo.metadata.metrics.peRatio.toFixed(2)}x` : <span style={{ color: 'var(--text-dark)', fontWeight: 'normal', fontSize: '13px' }}>unavailable</span>}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>Earnings Per Share (EPS)</span>
                    <strong style={{ fontSize: '16px', color: '#ffffff' }}>
                      {memo.metadata.metrics.eps ? `${memo.metadata.metrics.eps.toFixed(2)}` : <span style={{ color: 'var(--text-dark)', fontWeight: 'normal', fontSize: '13px' }}>unavailable</span>}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>Beta (Volatility)</span>
                    <strong style={{ fontSize: '16px', color: '#ffffff' }}>
                      {memo.metadata.metrics.beta ? `${memo.metadata.metrics.beta.toFixed(2)}` : <span style={{ color: 'var(--text-dark)', fontWeight: 'normal', fontSize: '13px' }}>unavailable</span>}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>52-Week Range</span>
                    <strong style={{ fontSize: '13px', color: '#ffffff', marginTop: '3px' }}>
                      {memo.metadata.metrics.fiftyTwoWeekRange || <span style={{ color: 'var(--text-dark)', fontWeight: 'normal', fontSize: '13px' }}>unavailable</span>}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            <div className="memo-grid" style={{ marginTop: '20px' }}>
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <PerformanceLineChart data={memo.metadata?.chartData} />

                {/* Verdict Glowing Gradient Panel (Confidence Score div) */}
                <div
                  className="card animate-fade-in"
                  style={{
                    background: (() => {
                      const v = (analysis.verdict || 'neutral').toLowerCase();
                      if (v === 'buy' || v === 'pass' || v === 'positive' || v === 'safe') {
                        return 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(4, 120, 87, 0.95))';
                      }
                      if (v === 'sell' || v === 'fail' || v === 'stress' || v === 'negative') {
                        return 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(153, 27, 27, 0.95))';
                      }
                      return 'linear-gradient(135deg, rgba(99, 102, 241, 0.95), rgba(49, 46, 129, 0.95))';
                    })(),
                    boxShadow: `0 12px 30px ${(() => {
                      const v = (analysis.verdict || 'neutral').toLowerCase();
                      if (v === 'buy' || v === 'pass' || v === 'positive' || v === 'safe') {
                        return 'rgba(16, 185, 129, 0.25)';
                      }
                      if (v === 'sell' || v === 'fail' || v === 'stress' || v === 'negative') {
                        return 'rgba(239, 68, 68, 0.25)';
                      }
                      return 'rgba(99, 102, 241, 0.25)';
                    })()}`,
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '16px',
                    padding: '24px',
                    color: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    position: 'relative',
                    overflow: 'hidden',
                    margin: 0
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    right: '-30px',
                    top: '-30px',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    filter: 'blur(20px)',
                    pointerEvents: 'none'
                  }} />

                  <div>
                    <div style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', opacity: 0.8, marginBottom: '6px' }}>
                      Deterministic P-IIM Verdict
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                      {getVerdictLabel(analysis.verdict)}
                    </div>
                  </div>

                  {analysis.momentum_score !== null && (
                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: '14px' }}>
                      <div style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', opacity: 0.8, marginBottom: '4px' }}>
                        Calibrated Confidence Rating
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.03em' }}>{analysis.momentum_score}%</span>
                        <span style={{ fontSize: '13px', fontWeight: 500, opacity: 0.9 }}>confidence index</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Research Context Scenarios */}
                <div className="card" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div className="tabs-header" style={{ margin: 0, border: 'none' }}>
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
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
                      RESEARCH CONTEXT
                    </span>
                  </div>
                  <div style={{ lineHeight: 1.6, color: '#ededed', minHeight: '80px', padding: '12px 0' }}>
                    {activeTab === 'base' && <p>{memo.baseCase || "No base case scenario narrative was generated."}</p>}
                    {activeTab === 'bull' && <p>{memo.bullCase || "No bull case scenario narrative was generated."}</p>}
                    {activeTab === 'bear' && <p>{memo.bearCase || "No bear case scenario narrative was generated."}</p>}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '10px', marginTop: '10px', fontSize: '10px', color: 'var(--text-dark)', fontStyle: 'italic' }}>
                    * Note: The Research Context panel informs qualitative judgment but does not influence the deterministic score calculation or the final verdict.
                  </div>
                </div>

                {/* Tripwire Triggers */}
                <div className="card" style={{ margin: 0 }}>
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

                {/* Form 4 Insider Table */}
                <div className="card" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Coins size={16} style={{ color: 'var(--text-muted)' }} />
                      SEC Form 4 Recent Insider Transactions
                    </h3>
                    <span style={{ fontSize: '11px', color: '#60a5fa', backgroundColor: 'rgba(59, 130, 246, 0.12)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                      {analysis.layer2_signals?.insiderActivity?.coverage || "Coverage unavailable"}
                    </span>
                  </div>
                  {analysis.insider_transactions && analysis.insider_transactions.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#ededed', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--border-muted)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                            <th style={{ padding: '8px' }}>Filer Name</th>
                            <th style={{ padding: '8px' }}>Role / Title</th>
                            <th style={{ padding: '8px' }}>Date</th>
                            <th style={{ padding: '8px' }}>Type</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Shares</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.insider_transactions.map((tx: any, idx: number) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                              <td style={{ padding: '10px 8px', fontWeight: 600 }}>{tx.filerName}</td>
                              <td style={{ padding: '10px 8px', color: 'var(--text-dark)' }}>{tx.role}</td>
                              <td style={{ padding: '10px 8px' }}>{tx.transactionDate}</td>
                              <td style={{ padding: '10px 8px' }}>
                                <span className={`badge ${tx.action === 'buy' ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                  {tx.action.toUpperCase()}
                                </span>
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'right' }}>{tx.shares?.toLocaleString()}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: tx.action === 'buy' ? 'var(--success)' : '#ffffff' }}>
                                {tx.value ? `$${tx.value.toLocaleString()}` : '$0'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dark)', fontSize: '12px' }}>
                      No recent Form 4 transactions reported inside the trailing 90 days.
                    </div>
                  )}
                </div>

                {/* Evidence Graph Network */}
                <div className="card" style={{ margin: 0 }}>
                  <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={16} style={{ color: 'var(--text-muted)' }} />
                    Evidence Graph Network
                  </h3>
                  <div
                    className="invisible-scrollbar"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      maxHeight: '420px',
                      overflowY: 'auto'
                    }}
                  >
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
              </div>

              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Scoring Transparency Panel */}
                <div className="card" style={{ borderColor: 'rgba(59, 130, 246, 0.25)', borderLeft: '3px solid #3b82f6', margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#60a5fa' }}>
                      <Info size={16} />
                      Scoring Transparency Panel
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Coverage: {availableSignals} of 8 inputs active
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Layer 1 */}
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Layer 1: Fundamental Safety Floor
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '4px' }}>
                          <span>Altman Z-Score</span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <strong style={{ color: '#ffffff' }}>{layer1.altmanZ?.score !== undefined && layer1.altmanZ?.score !== null ? layer1.altmanZ.score : "N/A"}</strong>
                            {layer1.altmanZ?.score !== undefined && layer1.altmanZ?.score !== null && (
                              <span className={`badge ${layer1.altmanZ?.zone === 'safe' ? 'badge-success' : layer1.altmanZ?.zone === 'grey' ? 'badge-warning' : 'badge-error'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                                {layer1.altmanZ?.zone?.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '4px' }}>
                          <span>Piotroski F-Score</span>
                          <strong style={{ color: '#ffffff' }}>
                            {layer1.piotroskiF?.score !== undefined && layer1.piotroskiF?.score !== null ? `${layer1.piotroskiF.score} / 9` : "N/A"}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '4px' }}>
                          <span>Beneish M-Score</span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <strong style={{ color: '#ffffff' }}>{layer1.beneishM?.score !== undefined && layer1.beneishM?.score !== null ? layer1.beneishM.score : "N/A"}</strong>
                            {layer1.beneishM?.score !== undefined && layer1.beneishM?.score !== null && (
                              <span className={`badge ${layer1.beneishM?.breached ? 'badge-error' : 'badge-success'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                                {layer1.beneishM?.breached ? "MANIPULATION RISK" : "NORMAL"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Layer 2 */}
                    <div>
                      <h4 style={{ margin: '8px 0 8px 0', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Layer 2: Present-State Momentum Signals
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Trend */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                            <span style={{ fontWeight: 500 }}>Trend Signal — Net:</span>
                            <span className={`badge ${layer2.trend?.score > 0.1 ? 'badge-success' : layer2.trend?.score < -0.1 ? 'badge-error' : 'badge-warning'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                              {layer2.trend?.label?.toUpperCase() || (layer2.trend?.score > 0 ? 'BULLISH' : layer2.trend?.score < 0 ? 'BEARISH' : 'NEUTRAL')}
                            </span>
                          </div>
                          {layer2.trend?.crossover ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '12px', fontSize: '11px', color: 'var(--text-dark)' }}>
                              <div>├─ MA Crossover: <span style={{ color: layer2.trend.crossover.score > 0 ? 'var(--success)' : 'var(--error)' }}>{layer2.trend.crossover.label}</span></div>
                              <div>├─ RSI (14-day): {layer2.trend.rsi?.val ?? layer2.trend.rsi} → <span style={{ color: layer2.trend.rsi.score > 0.1 ? 'var(--success)' : layer2.trend.rsi.score < -0.1 ? 'var(--error)' : 'var(--warning)' }}>{layer2.trend.rsi.label}</span> ({layer2.trend.rsi.score > 0 ? '+' : ''}{layer2.trend.rsi.score})</div>
                              <div>└─ % off 52-week high: {layer2.trend.pctFromHigh?.val ?? layer2.trend.pctFromHigh}% → <span style={{ color: layer2.trend.pctFromHigh.score > 0.1 ? 'var(--success)' : layer2.trend.pctFromHigh.score < -0.1 ? 'var(--error)' : 'var(--warning)' }}>{layer2.trend.pctFromHigh.label}</span> ({layer2.trend.pctFromHigh.score > 0 ? '+' : ''}{layer2.trend.pctFromHigh.score})</div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '12px', fontSize: '11px', color: 'var(--text-dark)' }}>
                              <div>└─ RSI: {layer2.trend?.rsi ?? 'N/A'}</div>
                            </div>
                          )}
                        </div>

                        {/* Earnings Acceleration */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                            <span style={{ fontWeight: 500 }}>Earnings Acceleration:</span>
                            <span className={`badge ${layer2.earningsAcceleration?.unreliable ? 'badge-warning' : (layer2.earningsAcceleration?.score > 0.1 ? 'badge-success' : layer2.earningsAcceleration?.score < -0.1 ? 'badge-error' : 'badge-warning')}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                              {layer2.earningsAcceleration?.label?.toUpperCase() || (layer2.earningsAcceleration?.score > 0 ? 'ACCELERATING' : layer2.earningsAcceleration?.score < 0 ? 'DECELERATING' : 'FLAT')}
                            </span>
                          </div>
                          {layer2.earningsAcceleration?.currentYoYBaseVal !== undefined ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '12px', fontSize: '11px', color: 'var(--text-dark)' }}>
                              <div>├─ YoY Q1 Growth: {layer2.earningsAcceleration.q1Growth}% (Base: ${(layer2.earningsAcceleration.currentYoYBaseVal / 1e9).toFixed(2)}B)</div>
                              <div>├─ YoY Q2 Growth: {layer2.earningsAcceleration.priorYoYBaseVal !== undefined ? `${layer2.earningsAcceleration.q2Growth}% (Base: $${(layer2.earningsAcceleration.priorYoYBaseVal / 1e9).toFixed(2)}B)` : `${layer2.earningsAcceleration.q2Growth}%`}</div>
                              {layer2.earningsAcceleration.unreliable ? (
                                <div style={{ color: 'var(--warning)' }}>└─ Status: {layer2.earningsAcceleration.reason}</div>
                              ) : (
                                <div>└─ Acceleration Delta: {layer2.earningsAcceleration.accel}% ({layer2.earningsAcceleration.score > 0 ? '+' : ''}{layer2.earningsAcceleration.score})</div>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '12px', fontSize: '11px', color: 'var(--text-dark)' }}>
                              <div>└─ Growth: {layer2.earningsAcceleration?.q1Growth}% vs {layer2.earningsAcceleration?.q2Growth}%</div>
                            </div>
                          )}
                        </div>

                        {/* Leverage Trend */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                            <span style={{ fontWeight: 500 }}>Leverage Trend (Debt/Equity):</span>
                            <span className={`badge ${layer2.leverageTrend?.score > 0.1 ? 'badge-success' : layer2.leverageTrend?.score < -0.1 ? 'badge-error' : 'badge-warning'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                              {layer2.leverageTrend?.label?.toUpperCase() || (layer2.leverageTrend?.score > 0 ? 'DECREASING DEBT' : layer2.leverageTrend?.score < 0 ? 'DEBT PILE-UP' : 'STABLE')}
                            </span>
                          </div>
                          {layer2.leverageTrend?.coverageText ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '12px', fontSize: '11px', color: 'var(--text-dark)' }}>
                              <div>├─ Quarterly Debt Change: {layer2.leverageTrend.levDelta}% ({layer2.leverageTrend.score > 0 ? '+' : ''}{layer2.leverageTrend.score})</div>
                              <div>└─ Coverage Service: <span style={{ color: layer2.leverageTrend.hasStrongCoverage ? 'var(--success)' : 'var(--warning)' }}>{layer2.leverageTrend.coverageText}</span></div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '12px', fontSize: '11px', color: 'var(--text-dark)' }}>
                              <div>└─ Stable Debt levels</div>
                            </div>
                          )}
                        </div>

                        {/* Insider Net Activity */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                            <span style={{ fontWeight: 500 }}>Insider Net Activity (90 days):</span>
                            <span className={`badge ${layer2.insiderActivity?.score > 0.1 ? 'badge-success' : layer2.insiderActivity?.score < -0.1 ? 'badge-error' : 'badge-warning'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                              {layer2.insiderActivity?.label?.toUpperCase() || (layer2.insiderActivity?.score > 0 ? 'BUYING' : layer2.insiderActivity?.score < 0 ? 'SELLING' : 'FLAT')}
                            </span>
                          </div>
                          {layer2.insiderActivity?.ratio !== undefined ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '12px', fontSize: '11px', color: 'var(--text-dark)' }}>
                              <div>├─ Net Value: {layer2.insiderActivity.netValue > 0 ? `+$${(layer2.insiderActivity.netValue / 1e3).toFixed(1)}k` : `-$${(Math.abs(layer2.insiderActivity.netValue) / 1e3).toFixed(1)}k`}</div>
                              <div>└─ Market Cap Ratio: {layer2.insiderActivity.ratio}% ({layer2.insiderActivity.score > 0 ? '+' : ''}{layer2.insiderActivity.score})</div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '12px', fontSize: '11px', color: 'var(--text-dark)' }}>
                              <div>└─ Net Transactions Value: {layer2.insiderActivity?.netValue}</div>
                            </div>
                          )}
                        </div>

                        {/* Analyst Revisions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                            <span style={{ fontWeight: 500 }}>Analyst Revisions (30 days):</span>
                            <span className={`badge ${layer2.analystRevisions?.score > 0.1 ? 'badge-success' : layer2.analystRevisions?.score < -0.1 ? 'badge-error' : 'badge-warning'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                              {layer2.analystRevisions?.label?.toUpperCase() || (layer2.analystRevisions?.score > 0 ? 'UPWARD' : layer2.analystRevisions?.score < 0 ? 'DOWNWARD' : 'FLAT')}
                            </span>
                          </div>
                          {layer2.analystRevisions?.revDelta !== undefined ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '12px', fontSize: '11px', color: 'var(--text-dark)' }}>
                              <div>├─ Revision Trend Delta: {layer2.analystRevisions.revDelta}% ({layer2.analystRevisions.score > 0 ? '+' : ''}{layer2.analystRevisions.score})</div>
                              <div>└─ Growth Estimates: {layer2.analystRevisions.currentEstimate}% (Prior: {layer2.analystRevisions.number30daysAgo}%)</div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '12px', fontSize: '11px', color: 'var(--text-dark)' }}>
                              <div>└─ Revision Trend: {layer2.analystRevisions?.trend || 'FLAT'}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <VerdictOverTimeGraph history={historyData} />

                {contradictions.length > 0 && (
                  <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', borderLeft: '3px solid #ef4444', margin: 0 }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#fca5a5', fontWeight: 600, fontSize: '14px' }}>
                      <AlertTriangle size={16} />
                      Factual Contradictions Surfaced
                    </h4>
                    <ul style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '16px', color: '#ededed' }}>
                      {contradictions.map((edge: any, i: number) => {
                        const conf = memo.evidenceGraph.nodes.find((n: any) => n.id === edge.from);
                        const adv = memo.evidenceGraph.nodes.find((n: any) => n.id === edge.to);
                        return (
                          <li key={i} style={{ lineHeight: 1.5 }}>
                            Bullish Claim: <span style={{ color: '#93c5fd' }}>"{conf?.claim}"</span> contradicts Red Flag: <span style={{ color: '#fca5a5' }}>"{adv?.claim}"</span>.
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {memo.rejectedClaims && memo.rejectedClaims.length > 0 && (
                  <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', borderLeft: '3px solid #ef4444', margin: 0 }}>
                    <h3 style={{ color: 'var(--error)', marginBottom: '12px', borderBottom: '1px solid rgba(239, 68, 68, 0.15)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
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

                <div className="card" style={{ margin: 0 }}>
                  <h3 style={{ marginBottom: '12px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                    Bypassed Red Flags Log
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {memo.rejectedEvidenceSummary}
                  </p>
                </div>

              </div>
            </div>

            <div className="card" style={{ marginTop: '20px' }}>
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

      {/* Floating Chatbot Elements (Sibling components to the shifted report div) */}
      <style>{`
      @keyframes chatPanelFadeIn {
        from {
          transform: translateX(100%);
        }
        to {
          transform: translateX(0);
        }
      }
      @keyframes chatBubbleEntrance {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .chat-panel-container {
        animation: chatPanelFadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .chat-message-bubble {
        animation: chatBubbleEntrance 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .premium-chat-input-container:focus-within {
        border-color: rgba(99, 102, 241, 0.6) !important;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2) !important;
      }
      .premium-chat-scroll::-webkit-scrollbar {
        width: 5px;
      }
      .premium-chat-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .premium-chat-scroll::-webkit-scrollbar-thumb {
        background: #27272a;
        border-radius: 3px;
      }
      .premium-chat-scroll::-webkit-scrollbar-thumb:hover {
        background: #3f3f46;
      }
    `}</style>

      {/* Render chatbot widget and toggle button into body via React Portal to prevent viewport placement overlap */}
      {mounted && createPortal(
        <>
          {!chatOpen && (
            <button
              onClick={() => setChatOpen(true)}
              style={{
                position: 'fixed',
                top: '50%',
                right: 0,
                transform: 'translateY(-50%)',
                backgroundColor: '#4f46e5',
                backgroundImage: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px 0 0 8px',
                padding: '16px 8px',
                cursor: 'pointer',
                boxShadow: '-4px 0 20px rgba(0,0,0,0.4)',
                zIndex: 9998,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                writingMode: 'vertical-rl',
                textTransform: 'uppercase',
                fontSize: '10px',
                letterSpacing: '0.15em',
                fontWeight: 600,
                transition: 'transform 0.2s ease, padding-left 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
                e.currentTarget.style.paddingLeft = '12px';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.0)';
                e.currentTarget.style.paddingLeft = '8px';
              }}
            >
              <MessageSquare size={12} style={{ transform: 'rotate(-90deg)', marginBottom: '4px' }} />
              AI Thesis Assistant
            </button>
          )}

          {/* Collapsible Right Sidebar Chatbot Drawer */}
          <div
            className="chat-panel-container"
            style={{
              position: 'fixed',
              top: '70px',
              right: '24px',
              width: '420px',
              maxWidth: 'calc(100vw - 48px)',
              height: 'calc(100vh - 90px)',
              border: '1px solid var(--card-border)',
              borderRadius: '16px',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
              backgroundColor: 'rgba(15, 15, 20, 0.96)',
              backdropFilter: 'blur(16px)',
              zIndex: 40,
              display: 'flex',
              flexDirection: 'column',
              padding: '24px 20px',
              transformOrigin: 'right center',
              transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: chatOpen ? 'translateX(0)' : 'translateX(calc(100% + 40px))',
              opacity: chatOpen ? 1 : 0,
              pointerEvents: chatOpen ? 'auto' : 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#a5b4fc', fontSize: '15px', fontWeight: 600 }}>
                <MessageSquare size={16} />
                Thesis Assistant
              </h3>
              <button
                onClick={() => setChatOpen(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--text-dark)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dark)'}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              Ask queries scoped specifically to this analysis. The chatbot operates strictly on Transparency Panel variables, Case Scenarios, and Insider Transactions already stored. It does not run new scrapers or fabricate answers.
            </p>

            <div
              ref={chatContainerRef}
              className="premium-chat-scroll"
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                padding: '10px 4px',
                marginBottom: '14px'
              }}
            >
              {messages.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-dark)', fontSize: '12px', textAlign: 'center', padding: '0 20px', lineHeight: 1.5 }}>
                  Ask about solvency risk zones, manipulation indices, or other research details.
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={idx}
                    className="chat-message-bubble"
                    style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      padding: '10px 14px',
                      borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      backgroundColor: m.role === 'user' ? '#3b82f6' : '#1e1e24',
                      backgroundImage: m.role === 'user' ? 'linear-gradient(135deg, #4f46e5, #3b82f6)' : 'none',
                      border: m.role === 'user' ? 'none' : '1px solid #27272a',
                      color: '#ffffff',
                      fontSize: '12.5px',
                      lineHeight: 1.45,
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    <div style={{ fontSize: '8px', color: m.role === 'user' ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-muted)', marginBottom: '3px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {m.role === 'user' ? 'USER' : 'ASSISTANT ANALYST'}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.message}</div>
                  </div>
                ))
              )}
              {isSending && (
                <div
                  className="chat-message-bubble"
                  style={{
                    alignSelf: 'flex-start',
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: '12px 12px 12px 2px',
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{ display: 'inline-block', width: '5px', height: '5px', backgroundColor: '#818cf8', borderRadius: '50%', animation: 'chatSlideUp 0.6s infinite alternate' }}></span>
                  Assistant is compiling facts...
                </div>
              )}
            </div>

            <form
              onSubmit={handleSendMessage}
              className="premium-chat-input-container"
              style={{
                display: 'flex',
                gap: '8px',
                backgroundColor: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '8px',
                padding: '4px 8px 4px 4px',
                alignItems: 'center',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              <input
                type="text"
                placeholder="Ask about solvency, manipulation risk..."
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                style={{
                  margin: 0,
                  flex: 1,
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  padding: '8px 12px',
                  outline: 'none',
                  boxShadow: 'none'
                }}
                disabled={isSending}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  minWidth: '36px',
                  height: '36px',
                  padding: 0,
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#4f46e5',
                  borderColor: '#4f46e5'
                }}
                disabled={isSending || !inputMessage.trim()}
              >
                <Send size={12} />
              </button>
            </form>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

function PerformanceLineChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="card animate-fade-in" style={{ padding: '24px', borderStyle: 'dashed', borderColor: 'var(--border-muted)', backgroundColor: 'transparent', textAlign: 'center', minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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
    <div className="card animate-fade-in" style={{ padding: '20px' }}>
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

          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#222222" strokeDasharray="3 3" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight / 2} x2={width - paddingRight} y2={paddingTop + chartHeight / 2} stroke="#222222" strokeDasharray="3 3" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width - paddingRight} y2={paddingTop + chartHeight} stroke="#222222" strokeDasharray="3 3" />

          <text x={paddingLeft - 8} y={paddingTop + 4} fill="var(--text-dark)" fontSize="9" textAnchor="end" style={{ letterSpacing: 'normal' }}>{`$${Math.round(maxPrice)}`}</text>
          <text x={paddingLeft - 8} y={paddingTop + chartHeight / 2 + 3} fill="var(--text-dark)" fontSize="9" textAnchor="end" style={{ letterSpacing: 'normal' }}>{`$${Math.round((maxPrice + minPrice) / 2)}`}</text>
          <text x={paddingLeft - 8} y={paddingTop + chartHeight + 3} fill="var(--text-dark)" fontSize="9" textAnchor="end" style={{ letterSpacing: 'normal' }}>{`$${Math.round(minPrice)}`}</text>

          <path d={areaPath} fill="url(#chartGradient)" />
          <path d={linePath} fill="none" stroke="#10b981" strokeWidth="1.5" />

          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="3" fill="#10b981" stroke="#000000" strokeWidth="1" />
              <title>{`${p.date}: ${p.close}`}</title>
            </g>
          ))}

          {points.filter((_, idx) => idx % 2 === 0 || idx === points.length - 1).map((p, i) => (
            <text key={i} x={p.x} y={height - 6} fill="var(--text-dark)" fontSize="9" textAnchor="middle">{p.date}</text>
          ))}
        </svg>
      </div>
    </div>
  );
}

function VerdictOverTimeGraph({ history }: { history: any[] }) {
  if (!history || history.length === 0) {
    return (
      <div className="card animate-fade-in" style={{ padding: '24px', flex: 1, borderStyle: 'dashed', borderColor: 'var(--border-muted)', backgroundColor: 'transparent', textAlign: 'center', minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.05em' }}>
          Verdict & Score Evolution
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-dark)' }}>
          Historical verdict evolution requires multiple completed runs for this ticker.
        </div>
      </div>
    );
  }

  const width = 500;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 25;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Map scores
  const scores = history.map(h => h.momentumScore || 50);
  const minScore = 0;
  const maxScore = 100;

  const points = history.map((h, index) => {
    const x = paddingLeft + (history.length > 1 ? (index / (history.length - 1)) * chartWidth : chartWidth / 2 + paddingLeft);
    const scoreVal = h.momentumScore !== null && h.momentumScore !== undefined ? h.momentumScore : 50;
    const y = paddingTop + chartHeight - (scoreVal / 100) * chartHeight;
    return {
      x,
      y,
      date: new Date(h.analyzedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: scoreVal,
      verdict: h.verdict
    };
  });

  // Calculate stepped line path: Horizontal then vertical step
  let steppedPath = "";
  if (points.length > 0) {
    steppedPath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      // Step to current X but keep previous Y, then draw to current X, current Y
      steppedPath += ` L ${curr.x} ${prev.y} L ${curr.x} ${curr.y}`;
    }
  }

  return (
    <div className="card animate-fade-in" style={{ padding: '20px', flex: 1 }}>
      <div style={{ textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 600, letterSpacing: '0.05em' }}>
        Deterministic Verdict History (Score Over Time)
      </div>
      <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
          {/* Guide thresholds lines */}
          <line x1={paddingLeft} y1={paddingTop + (chartHeight * 0.4)} x2={width - paddingRight} y2={paddingTop + (chartHeight * 0.4)} stroke="#ef4444" strokeWidth="0.5" strokeDasharray="2 4" /> {/* Sell threshold 40 */}
          <line x1={paddingLeft} y1={paddingTop + (chartHeight * 0.6)} x2={width - paddingRight} y2={paddingTop + (chartHeight * 0.6)} stroke="#10b981" strokeWidth="0.5" strokeDasharray="2 4" /> {/* Hold threshold 60 */}

          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#222222" strokeDasharray="3 3" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight / 2} x2={width - paddingRight} y2={paddingTop + chartHeight / 2} stroke="#222222" strokeDasharray="3 3" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width - paddingRight} y2={paddingTop + chartHeight} stroke="#222222" strokeDasharray="3 3" />

          {/* Y-axis */}
          <text x={paddingLeft - 8} y={paddingTop + 4} fill="var(--text-dark)" fontSize="9" textAnchor="end">100%</text>
          <text x={paddingLeft - 8} y={paddingTop + chartHeight / 2 + 3} fill="var(--text-dark)" fontSize="9" textAnchor="end">50%</text>
          <text x={paddingLeft - 8} y={paddingTop + chartHeight + 3} fill="var(--text-dark)" fontSize="9" textAnchor="end">0%</text>

          {/* Dotted Stepped Line */}
          {history.length > 1 && (
            <path d={steppedPath} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3 3" />
          )}

          {/* Point Markers */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill="#818cf8" stroke="#000000" strokeWidth="1.5" />
              <text x={p.x} y={p.y - 8} fill="#ffffff" fontSize="8" fontWeight="600" textAnchor="middle">{p.score}%</text>
              <title>{`${p.date}: ${p.score}% (${p.verdict?.toUpperCase()})`}</title>
            </g>
          ))}

          {/* Date Labels */}
          {points.filter((_, idx) => history.length > 4 ? idx % 2 === 0 : true).map((p, i) => (
            <text key={i} x={p.x} y={height - 6} fill="var(--text-dark)" fontSize="9" textAnchor="middle">{p.date}</text>
          ))}
        </svg>
      </div>
    </div>
  );
}
