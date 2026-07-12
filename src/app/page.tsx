"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  Shield, 
  ArrowRight, 
  Search, 
  GitBranch,
  Play,
  Activity,
  Layers,
  Database,
  Terminal,
  Info
} from 'lucide-react';

// Dynamically load DotLottieReact with SSR disabled to prevent hydration errors
const DotLottieReact = dynamic(
  () => import('@lottiefiles/dotlottie-react').then((mod) => mod.DotLottieReact),
  { ssr: false }
);

interface NodeDetails {
  title: string;
  role: string;
  model: string;
  description: string;
  inputs: string;
  outputs: string;
}

const NODES: Record<string, NodeDetails> = {
  intake: {
    title: "1. Intake & Normalize",
    role: "SEC EDGAR Sanitizer",
    model: "Fuzzy Registry Matcher + Web Fallback",
    description: "Accepts raw company input, resolves fuzzy tickers against SEC company registry via Fuse.js (falling back to AI-assisted Web search mapping for private/international entities), and retrieves facts metadata.",
    inputs: "User search query / Ticker name",
    outputs: "Sanitized CIK & Company Profile Facts"
  },
  hypothesis: {
    title: "2. Hypothesis Generator",
    role: "Investment Analyst (Bullish)",
    model: "gemini-3.1-flash-lite",
    description: "Queries headlines and skims SEC summaries to formulate 1-3 falsifiable, quantitative investment claims about why the company is a compelling long opportunity.",
    inputs: "Sanitized SEC profile text & search summaries",
    outputs: "Falsifiable Bullish Claims with citations"
  },
  workers: {
    title: "3. Parallel Research Workers",
    role: "Multi-Agent Specialist Cohort",
    model: "gemini-3.1-flash-lite (x3 Parallel)",
    description: "Forks execution to 3 parallel LLM workers: Confirming Worker gathers supportive evidence for the hypothesis; Adversarial Worker runs a double-pass audit for red flags; Macro Sector Worker audits macro headwinds/tailwinds.",
    inputs: "Generated hypotheses & scraping targets",
    outputs: "Supporting and counter findings with raw quotes"
  },
  builder: {
    title: "4. Evidence Graph Builder",
    role: "Logical Conflict Finder",
    model: "gemini-3.1-flash-lite",
    description: "Gathers all worker outputs, registers them as nodes in a relational evidence graph, and performs logical contradiction checks to link opposing bullish and bearish claims.",
    inputs: "Confirming, Adversarial, and Macro worker findings",
    outputs: "Evidence Graph (nodes and contradiction edges)"
  },
  verifier: {
    title: "5. Fact Claim Auditor",
    role: "Compliance Auditor",
    model: "gemini-3.1-flash-lite",
    description: "Audits every claim against its raw cited quote from SEC or news, rejecting non-auditable claims. If the verification audit fails too many claims (>40%), triggers a dynamic exit to 'Insufficient Data'.",
    inputs: "Extracted claims & primary source documents",
    outputs: "Verified claim lists vs Rejected claim lists"
  },
  reflexion: {
    title: "6. Devil's Advocate Review",
    role: "Steelmannist Bear Critic",
    model: "gemini-2.5-flash-lite",
    description: "Forces a critical review of the emerging bullish case. Compiles a high-temperature counter-thesis and evaluates the impact of weak links in the investment argument.",
    inputs: "Verified claims list",
    outputs: "Bear case synthesis"
  },
  scorer: {
    title: "7. Two-Layer Confidence Scorer",
    role: "Quantitative Risk Scorer",
    model: "Algorithmic Floor + Signal Model",
    description: "Executes Layer 1 safety floor (Altman Z-Score, Piotroski F-Score, Beneish M-Score) and automatically overrides verdict to SELL on breach. Computes Layer 2 Momentum signals (Trend crossover, Earnings growth acceleration, Debt-to-Equity curve, Net Insider buying, and Analyst revisions).",
    inputs: "Verified findings, SEC facts, daily stock quotes, and Form 4 transactions",
    outputs: "Altman Z/Piotroski F/Beneish M scores, 5 momentum indicators, and scaled rating (0%-100%)"
  },
  compiler: {
    title: "8. Memo Compiler",
    role: "Consensus Compiler",
    model: "gemini-2.5-flash-lite",
    description: "Compiles base, bull, and bear scenarios. Generates future tripwires for portfolio monitoring, formats a disclaimer, and writes the completed trace to the PostgreSQL database.",
    inputs: "Full pipeline execution logs & scenario states",
    outputs: "Compiled PDF-ready P-IIM report & DB insert"
  }
};

const HISTORICAL_POINTS = [
  {
    phase: "Q1 2022: Acquisition Announcement",
    date: "Jan 2022",
    verdict: "HOLD",
    score: 78,
    altman: "3.85 (Safe)",
    piotroski: "7/9",
    citation: "SEC Form 8-K: Microsoft announces merger agreement with Activision Blizzard for $95.00 per share in an all-cash transaction, establishing a secure cloud-gaming growth vector.",
    x: 80,
    y: 120
  },
  {
    phase: "Q4 2022: FTC Challenge Lawsuit",
    date: "Dec 2022",
    verdict: "NEUTRAL",
    score: 52,
    altman: "3.68 (Safe)",
    piotroski: "6/9",
    citation: "FTC Complaint (Dkt. 9412): The Commission seeks a preliminary injunction to prevent Microsoft from obtaining control of Activision, alleging foreclosure incentives.",
    x: 180,
    y: 200
  },
  {
    phase: "Q1 2023: CMA Regulatory Block",
    date: "Apr 2023",
    verdict: "SELL/VETO",
    score: 38,
    altman: "3.52 (Risk Alert)",
    piotroski: "5/9",
    citation: "CMA Final Report: UK regulator blocks transaction to protect cloud gaming space; Microsoft fails Layer 1 regulatory safety crossovers on the merger thesis.",
    x: 280,
    y: 280
  },
  {
    phase: "Q3 2023: Restructured Clearance",
    date: "Oct 2023",
    verdict: "BUY/ACCUMULATE",
    score: 89,
    altman: "4.12 (Strong)",
    piotroski: "8/9",
    citation: "CMA Consent Cleared: Microsoft divests cloud streaming rights to Ubisoft. Deal completes, creating substantial synergy expansion vectors.",
    x: 400,
    y: 80
  }
];

export default function Home() {
  const [activeNodeKey, setActiveNodeKey] = useState<string>("workers");
  const activeNode = NODES[activeNodeKey] || NODES.workers;
  const [simIndex, setSimIndex] = useState<number>(0);
  const activePoint = HISTORICAL_POINTS[simIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '80px', backgroundColor: '#000000', minHeight: '100vh', color: '#ffffff', padding: '0 20px 60px 20px' }}>
      
      <style>{`
        body {
          background-color: #000000 !important;
        }
        .container {
          background-color: #000000 !important;
          max-width: 1200px !important;
        }
        .get-started-btn {
          display: inline-block;
          background-color: #ffffff;
          color: #000000;
          padding: 14px 32px;
          border-radius: 9999px;
          font-weight: 600;
          font-size: 15px;
          text-decoration: none;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
        }
        .get-started-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(255, 255, 255, 0.15);
        }
        .simulator-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: #18181b;
          outline: none;
          margin: 20px 0;
          cursor: pointer;
        }
        .simulator-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid #818cf8;
          box-shadow: 0 0 10px rgba(129, 140, 248, 0.6);
          transition: transform 0.15s ease;
        }
        .simulator-slider::-webkit-slider-thumb:hover {
          transform: scale(1.25);
        }
        @media (max-width: 900px) {
          .hero-split-grid {
            grid-template-columns: 1fr !important;
            text-align: center !important;
            gap: 40px !important;
            margin-top: 20px !important;
            min-height: auto !important;
          }
          .hero-left-col {
            text-align: center !important;
            align-items: center !important;
          }
          .hero-left-col p {
            margin: 0 auto !important;
          }
          .hero-right-col {
            min-height: 250px !important;
          }
          .simulator-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>

      {/* Hero Section - Scaled to fill 100vh viewport height priority */}
      <section className="animate-fade-in hero-split-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: '1.2fr 1.1fr', 
        gap: '60px', 
        alignItems: 'center', 
        margin: '0 auto', 
        maxWidth: '1200px',
        width: '100%',
        minHeight: 'calc(100vh - 100px)',
        padding: '20px 0'
      }}>
        {/* Left Side: Custom Text + Feature Density to fill height */}
        <div className="hero-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '28px', textAlign: 'left', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h1 style={{ 
              fontSize: '4.2rem', 
              lineHeight: '1.1', 
              fontWeight: 800, 
              letterSpacing: '-0.04em', 
              margin: 0, 
              color: '#ffffff',
              maxWidth: '580px'
            }}>
              Adversarial audit of your investment thesis
            </h1>
            <p style={{ 
              color: '#71717a', 
              fontSize: '1.2rem', 
              lineHeight: 1.6, 
              margin: 0, 
              maxWidth: '480px' 
            }}>
              P-IIM compiles multi-agent pipelines to audit equity hypotheses against SEC EDGAR primary source filings. Disprove confirmation bias, surface contradictions, and verify facts.
            </p>
          </div>

          {/* Technical Checklist & Feature Indicators (Fills Viewport Space) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '480px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(129,140,248,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                <Shield size={16} style={{ color: '#818cf8' }} />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', margin: '0 0 2px 0' }}>Adversarial Audit Compiler</h4>
                <p style={{ fontSize: '13px', color: '#71717a', margin: 0, lineHeight: 1.4 }}>Vets quantitative statements against dynamic regulatory EDGAR records.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                <GitBranch size={16} style={{ color: '#10b981' }} />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', margin: '0 0 2px 0' }}>Multi-Layer Graph Analysis</h4>
                <p style={{ fontSize: '13px', color: '#71717a', margin: 0, lineHeight: 1.4 }}>Resolves conflicts dynamically across confirming and adversarial agents.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                <Activity size={16} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', margin: '0 0 2px 0' }}>Deterministic Rating Veto</h4>
                <p style={{ fontSize: '13px', color: '#71717a', margin: 0, lineHeight: 1.4 }}>Flags insolvency ratios and growth trend divergences in real-time.</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '8px' }}>
            <Link href="/dashboard" className="get-started-btn">
              Get Started
            </Link>
          </div>
        </div>

        {/* Right Side: DotLottie React Component Animation */}
        <div className="hero-right-col" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%', minHeight: '400px' }}>
          <DotLottieReact
            src="https://lottie.host/34e57016-74d8-425a-a142-e9395304d975/zvErt8z11T.lottie"
            loop
            autoplay
            width={500}
            height={500}
            style={{ width: '500px', height: '500px' }}
          />
        </div>
      </section>

      {/* Live Historical Verdict Simulator Section */}
      <section className="card" style={{ padding: '40px 24px', backgroundColor: '#050505', borderColor: '#18181b', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', border: '1px solid rgba(129, 140, 248, 0.2)', backgroundColor: 'rgba(129, 140, 248, 0.05)', fontSize: '11px', color: '#818cf8', fontWeight: 600, marginBottom: '10px' }}>
            <Activity size={12} />
            <span>INTERACTIVE SIMULATION</span>
          </div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '8px', color: '#ffffff' }}>Live Thesis Falsification Simulator</h2>
          <p style={{ color: '#71717a', fontSize: '13.5px', maxWidth: '600px', margin: '0 auto' }}>
            Drag the slider to see how P-IIM evaluated the Microsoft-Activision Blizzard merger thesis in real-time as regulatory filings and lawsuits dynamically shifted.
          </p>
        </div>

        <div className="simulator-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '36px', alignItems: 'stretch' }}>
          
          {/* Left Panel: SVG Plot & Timeline Slider */}
          <div style={{ border: '1px solid #18181b', borderRadius: '8px', padding: '24px', backgroundColor: '#000000', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Thesis Success Likelihood</span>
                <span style={{ fontSize: '13px', color: '#ffffff', fontFamily: 'ui-monospace, monospace' }}>Active Scenario Year: 2022-2023</span>
              </div>
              
              <div style={{ position: 'relative', width: '100%', height: '220px', borderBottom: '1px solid #27272a', borderLeft: '1px solid #27272a' }}>
                <svg viewBox="0 0 480 320" width="100%" height="100%" style={{ overflow: 'visible' }}>
                  {/* Grid lines */}
                  <line x1="0" y1="80" x2="480" y2="80" stroke="#18181b" strokeDasharray="4 4" />
                  <line x1="0" y1="160" x2="480" y2="160" stroke="#18181b" strokeDasharray="4 4" />
                  <line x1="0" y1="240" x2="480" y2="240" stroke="#18181b" strokeDasharray="4 4" />

                  {/* Connecting Trend Line */}
                  <path
                    d="M 80 120 L 180 200 L 280 280 L 400 80"
                    fill="none"
                    stroke="rgba(129, 140, 248, 0.3)"
                    strokeWidth="3"
                  />

                  {/* Active Glowing Path Segment */}
                  <path
                    d={`M 80 120 ${simIndex >= 1 ? 'L 180 200' : ''} ${simIndex >= 2 ? 'L 280 280' : ''} ${simIndex >= 3 ? 'L 400 80' : ''}`}
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="4"
                    style={{ transition: 'd 0.35s ease' }}
                  />

                  {/* Timeline Points */}
                  {HISTORICAL_POINTS.map((pt, idx) => {
                    const isActive = idx === simIndex;
                    return (
                      <g key={idx} cursor="pointer" onClick={() => setSimIndex(idx)}>
                        {isActive && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="12"
                            fill="none"
                            stroke="#818cf8"
                            strokeWidth="2"
                            opacity="0.6"
                            style={{ animation: 'spin 3s linear infinite' }}
                          />
                        )}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isActive ? "7" : "5"}
                          fill={isActive ? "#818cf8" : "#27272a"}
                          stroke={isActive ? "#ffffff" : "#3f3f46"}
                          strokeWidth="1.5"
                          style={{ transition: 'all 0.25s ease' }}
                        />
                        <text
                          x={pt.x}
                          y={pt.y + 24}
                          fill={isActive ? "#ffffff" : "#71717a"}
                          fontSize="10"
                          textAnchor="middle"
                          fontWeight={isActive ? "bold" : "normal"}
                        >
                          {pt.date}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            <div>
              <input
                type="range"
                min="0"
                max="3"
                value={simIndex}
                onChange={(e) => setSimIndex(parseInt(e.target.value))}
                className="simulator-slider"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#71717a', fontWeight: 500 }}>
                <span>1. ANNOUNCEMENT</span>
                <span>2. FTC CHALLENGE</span>
                <span>3. REGULATORY VETO</span>
                <span>4. RESTORED APPROVAL</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Dynamic Audit Metrics */}
          <div style={{ border: '1px solid #18181b', borderRadius: '8px', padding: '24px', backgroundColor: '#070708', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#71717a', fontWeight: 700, letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                Active Scenario Node
              </span>
              <h3 style={{ fontSize: '18px', color: '#ffffff', fontWeight: 700 }}>{activePoint.phase}</h3>
            </div>

            <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid #18181b', borderBottom: '1px solid #18181b', padding: '16px 0' }}>
              <div style={{ flex: 1.2 }}>
                <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 600 }}>P-IIM Verdict</span>
                <span className={`badge ${activePoint.verdict === 'BUY/ACCUMULATE' ? 'badge-success' : activePoint.verdict === 'SELL/VETO' ? 'badge-error' : 'badge-warning'}`} style={{ fontSize: '12.5px', padding: '4px 10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {activePoint.verdict}
                </span>
              </div>
              <div style={{ flex: 1, borderLeft: '1px solid #18181b', paddingLeft: '16px' }}>
                <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Confidence Index</span>
                <strong style={{ fontSize: '20px', color: activePoint.score > 60 ? '#10b981' : activePoint.score > 40 ? '#f59e0b' : '#ef4444', fontFamily: 'ui-monospace, monospace' }}>
                  {activePoint.score}%
                </strong>
              </div>
            </div>

            {/* Model Quantitative Floats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#71717a', display: 'block', fontSize: '11px', marginBottom: '2px' }}>Altman Z-Score Veto</span>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>{activePoint.altman}</span>
              </div>
              <div>
                <span style={{ color: '#71717a', display: 'block', fontSize: '11px', marginBottom: '2px' }}>Piotroski F-Score</span>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>{activePoint.piotroski}</span>
              </div>
            </div>

            {/* Fact Audit Box */}
            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #18181b' }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#71717a', fontWeight: 700, display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>
                Factual SEC Citation Quote
              </span>
              <div style={{ padding: '12px 14px', backgroundColor: '#000000', borderRadius: '6px', border: '1px solid #18181b' }}>
                <p style={{ color: '#ededed', fontSize: '12.5px', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>
                  "{activePoint.citation}"
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Pipeline Visual Interactive Section */}
      <section className="card" style={{ padding: '40px 24px', backgroundColor: '#050505', borderColor: '#18181b' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '8px', color: '#ffffff' }}>Pipeline Execution Architecture</h2>
          <p style={{ color: '#71717a', fontSize: '13px' }}>
            Click on any pipeline node to inspect its roles, model tier, and operational parameters.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
          
          {/* Interactive Graph Diagram */}
          <div style={{ border: '1px solid #18181b', borderRadius: '8px', padding: '24px', backgroundColor: '#000000', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
            
            {/* Row 1 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
              <button 
                className={`btn ${activeNodeKey === 'intake' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '12px', padding: '10px' }}
                onClick={() => setActiveNodeKey('intake')}
              >
                <Search size={14} /> 1. Intake & SEC fetch
              </button>
              
              <div style={{ width: '20px', height: '1px', borderBottom: '1px dashed #333' }}></div>
              
              <button 
                className={`btn ${activeNodeKey === 'hypothesis' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '12px', padding: '10px' }}
                onClick={() => setActiveNodeKey('hypothesis')}
              >
                <GitBranch size={14} /> 2. Hypothesis Builder
              </button>
            </div>

            {/* Down arrow */}
            <div style={{ display: 'flex', justifyContent: 'center', height: '20px' }}>
              <div style={{ width: '1px', height: '100%', borderLeft: '1px dashed #333' }}></div>
            </div>

            {/* Parallel Workers Row */}
            <div style={{ border: '1px dashed #27272a', borderRadius: '6px', padding: '16px 12px', backgroundColor: '#070707' }}>
              <div style={{ textAlign: 'center', fontSize: '10px', textTransform: 'uppercase', color: '#71717a', marginBottom: '12px', letterSpacing: '0.05em' }}>
                Parallel Research Workers
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div style={{ padding: '8px 12px', border: '1px solid #10b981', borderRadius: '4px', fontSize: '11px', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.02)' }}>
                  Confirming Agent
                </div>
                <button 
                  className={`btn btn-adversarial ${activeNodeKey === 'workers' ? 'active' : ''}`}
                  style={{ fontSize: '11px', padding: '8px 12px' }}
                  onClick={() => setActiveNodeKey('workers')}
                >
                  Adversarial Risk Audit
                </button>
                <div style={{ padding: '8px 12px', border: '1px solid #3b82f6', borderRadius: '4px', fontSize: '11px', color: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.02)' }}>
                  Macro Sector Agent
                </div>
              </div>
            </div>

            {/* Down arrow */}
            <div style={{ display: 'flex', justifyContent: 'center', height: '20px' }}>
              <div style={{ width: '1px', height: '100%', borderLeft: '1px dashed #333' }}></div>
            </div>

            {/* Row 3 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
              <button 
                className={`btn ${activeNodeKey === 'builder' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '12px', padding: '10px' }}
                onClick={() => setActiveNodeKey('builder')}
              >
                <GitBranch size={14} /> 4. Evidence Graph Builder
              </button>
              
              <div style={{ width: '20px', height: '1px', borderBottom: '1px dashed #333' }}></div>

              <button 
                className={`btn ${activeNodeKey === 'verifier' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '12px', padding: '10px' }}
                onClick={() => setActiveNodeKey('verifier')}
              >
                <Shield size={14} /> 5. Fact Claim Auditor
              </button>
            </div>

            {/* Down arrow */}
            <div style={{ display: 'flex', justifyContent: 'center', height: '20px' }}>
              <div style={{ width: '1px', height: '100%', borderLeft: '1px dashed #333' }}></div>
            </div>

            {/* Row 4 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
              <button 
                className={`btn ${activeNodeKey === 'reflexion' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '12px', padding: '10px' }}
                onClick={() => setActiveNodeKey('reflexion')}
              >
                <Play size={14} /> 6. Devil's Advocate Review
              </button>
              
              <div style={{ width: '20px', height: '1px', borderBottom: '1px dashed #333' }}></div>

              <button 
                className={`btn ${activeNodeKey === 'scorer' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '12px', padding: '10px' }}
                onClick={() => setActiveNodeKey('scorer')}
              >
                <Activity size={14} /> 7. Two-Layer Scorer
              </button>

              <div style={{ width: '20px', height: '1px', borderBottom: '1px dashed #333' }}></div>

              <button 
                className={`btn ${activeNodeKey === 'compiler' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '12px', padding: '10px' }}
                onClick={() => setActiveNodeKey('compiler')}
              >
                <Terminal size={14} /> 8. Memo Compiler
              </button>
            </div>

          </div>

          {/* Node Details Panel */}
          <div key={activeNodeKey} className="node-details-card animate-fade-in" style={{ border: '1px solid #18181b', borderRadius: '8px', padding: '24px', backgroundColor: '#0a0a0a', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#71717a', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '6px' }}>
                Pipeline Stage Inspector
              </div>
              <h3 style={{ fontSize: '1.25rem', color: '#ffffff' }}>{activeNode.title}</h3>
            </div>

            <div style={{ borderTop: '1px solid #18181b', borderBottom: '1px solid #18181b', padding: '14px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#71717a', display: 'block', marginBottom: '2px' }}>LLM Role Profile</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#ffffff' }}>{activeNode.role}</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#71717a', display: 'block', marginBottom: '2px' }}>Execution Engine</span>
                <span style={{ fontSize: '13px', fontFamily: 'ui-monospace, monospace', color: 'var(--success)' }}>{activeNode.model}</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: '#71717a', display: 'block', marginBottom: '4px' }}>Stage Description</span>
              <p style={{ fontSize: '13px', color: '#ededed', lineHeight: 1.5 }}>
                {activeNode.description}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid #18181b', fontSize: '12px' }}>
              <div>
                <span style={{ color: '#71717a', display: 'block', marginBottom: '2px' }}>Data Input</span>
                <span style={{ color: '#ffffff', fontWeight: 500 }}>{activeNode.inputs}</span>
              </div>
              <div>
                <span style={{ color: '#71717a', display: 'block', marginBottom: '2px' }}>Data Output</span>
                <span style={{ color: '#ffffff', fontWeight: 500 }}>{activeNode.outputs}</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Sleek Features Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#050505', borderColor: '#18181b' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #18181b', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' }}>
            <Database size={14} style={{ color: '#71717a' }} />
          </div>
          <h3 style={{ fontSize: '15px' }}>SEC EDGAR Facts Extraction</h3>
          <p style={{ color: '#71717a', fontSize: '13px', lineHeight: 1.5 }}>
            Pulls verified CIK facts directly from regulatory servers. No parsing guessing games, only direct SEC reference data.
          </p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#050505', borderColor: '#18181b' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #18181b', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' }}>
            <Shield size={14} style={{ color: '#71717a' }} />
          </div>
          <h3 style={{ fontSize: '15px' }}>Factual Claim Verification</h3>
          <p style={{ color: '#71717a', fontSize: '13px', lineHeight: 1.5 }}>
            Automated compliance auditor matches generated numeric metrics directly to specific source quotes. Failed citations are rejected.
          </p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#050505', borderColor: '#18181b' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #18181b', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' }}>
            <Layers size={14} style={{ color: '#71717a' }} />
          </div>
          <h3 style={{ fontSize: '15px' }}>Dynamic Multi-Layer Scoring</h3>
          <p style={{ color: '#71717a', fontSize: '13px', lineHeight: 1.5 }}>
            Implements algorithmic balance sheet checks (Altman, Piotroski, Beneish) to force-veto risks and ranks present momentum on a scaled rating.
          </p>
        </div>

      </section>

      {/* Footer disclaimer */}
      <footer className="disclaimer-banner" style={{ marginTop: '20px', borderTop: '1px solid #18181b' }}>
        No investment advice is provided. P-IIM compiles automated arguments from publicly available resources. Please consult with certified wealth managers before making financial allocations.
      </footer>

    </div>
  );
}
