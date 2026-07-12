import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { pdf, Document, Page, Text, View, StyleSheet, Svg, Path, Line, Circle, G, Defs, LinearGradient, Stop } from '@react-pdf/renderer';
import React from 'react';

export const dynamic = 'force-dynamic';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#1c1917',
    lineHeight: 1.4,
    backgroundColor: '#ffffff',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
    paddingBottom: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#0c0a09',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 8,
    color: '#78716c',
  },
  metaGrid: {
    flexDirection: 'row',
    marginTop: 4,
    justifyContent: 'space-between',
  },
  metaItem: {
    fontSize: 8,
    color: '#44403c',
  },
  metricsContainer: {
    borderWidth: 1,
    borderColor: '#e7e5e4',
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
    backgroundColor: '#fafaf9',
  },
  metricsTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0c0a09',
    textTransform: 'uppercase',
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e7e5e4',
    paddingBottom: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricsCell: {
    width: '16.6%',
  },
  metricsLabel: {
    fontSize: 7,
    color: '#78716c',
  },
  metricsVal: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  
  // Columns Layout
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  leftColumn: {
    width: '59%',
    flexDirection: 'column',
  },
  rightColumn: {
    width: '39%',
    flexDirection: 'column',
  },
  
  card: {
    borderWidth: 1,
    borderColor: '#e7e5e4',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    backgroundColor: '#fafaf9',
  },
  cardTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e7e5e4',
    paddingBottom: 3,
  },
  
  // Glowing panel replica
  verdictBuy: {
    backgroundColor: '#10b981',
    borderColor: '#047857',
  },
  verdictSell: {
    backgroundColor: '#ef4444',
    borderColor: '#b91c1c',
  },
  verdictNeutral: {
    backgroundColor: '#6366f1',
    borderColor: '#4f46e5',
  },
  verdictPanel: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    color: '#ffffff',
    marginBottom: 12,
  },
  verdictTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    opacity: 0.9,
    marginBottom: 2,
  },
  verdictVal: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },
  confidenceLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    opacity: 0.9,
    marginTop: 8,
    marginBottom: 2,
  },
  confidenceVal: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
  },
  
  // Scenarios
  scenarioBlock: {
    marginBottom: 8,
  },
  scenarioLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#0f172a',
    marginBottom: 2,
  },
  scenarioText: {
    fontSize: 7.5,
    color: '#27272a',
  },
  
  // Table
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#78716c',
    paddingBottom: 2,
    marginBottom: 3,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e7e5e4',
    paddingVertical: 3,
  },
  tableCellHeader: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#44403c',
  },
  tableCell: {
    fontSize: 7,
    color: '#1c1917',
  },
  
  // Badges
  badgeSuccess: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
  },
  badgeError: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
  },
  badgeWarning: {
    backgroundColor: '#fef9c3',
    color: '#a16207',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
  },
  
  // Audit node list
  evidenceNode: {
    padding: 6,
    borderRadius: 4,
    borderWidth: 0.5,
    marginBottom: 6,
    backgroundColor: '#ffffff',
  },
  
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#a8a29e',
    fontSize: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#e7e5e4',
    paddingTop: 4,
  },
  disclaimer: {
    fontSize: 6,
    color: '#78716c',
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#e7e5e4',
    paddingTop: 4,
  },
  compiledVerdictContainer: {
    borderWidth: 0.5,
    borderColor: '#e7e5e4',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
    backgroundColor: '#fafaf9',
  },
  compiledVerdictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e7e5e4',
    paddingBottom: 4,
  },
  compiledVerdictTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#78716c',
    textTransform: 'uppercase',
  },
  compiledVerdictBadge: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  compiledVerdictReasoning: {
    fontSize: 7.5,
    color: '#1c1917',
    lineHeight: 1.4,
  },
});

// Helper for verdict styling labels
function getVerdictLabel(v: string = '') {
  const norm = v.toLowerCase();
  if (norm === 'buy' || norm === 'positive' || norm === 'safe' || norm === 'pass') return 'BULLISH / INVESTABLE';
  if (norm === 'sell' || norm === 'negative' || norm === 'stress' || norm === 'fail') return 'BEARISH / AUDIT FAILURE';
  return 'NEUTRAL / UNCORRELATED';
}

// Custom Vector Svg Performance Line Chart
const PerformancePDFChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return null;
  const prices = data.map(d => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const width = 300;
  const height = 90;
  const paddingLeft = 30;
  const paddingRight = 10;
  const paddingTop = 8;
  const paddingBottom = 12;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = data.map((d, index) => {
    const x = paddingLeft + (index / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.close - minPrice) / priceRange) * chartHeight;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

  return (
    <View style={{ marginBottom: 10, position: 'relative' }}>
      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#78716c', textTransform: 'uppercase', marginBottom: 4 }}>
        12-Month Performance Trend (Closing Price)
      </Text>

      {/* Absolute positioned labels */}
      <Text style={{ position: 'absolute', left: 0, top: 4 + paddingTop, fontSize: 6, color: '#78716c', width: 25, textAlign: 'right' }}>
        {`$${Math.round(maxPrice)}`}
      </Text>
      <Text style={{ position: 'absolute', left: 0, top: 4 + paddingTop + chartHeight / 2, fontSize: 6, color: '#78716c', width: 25, textAlign: 'right' }}>
        {`$${Math.round((maxPrice + minPrice) / 2)}`}
      </Text>
      <Text style={{ position: 'absolute', left: 0, top: 4 + paddingTop + chartHeight, fontSize: 6, color: '#78716c', width: 25, textAlign: 'right' }}>
        {`$${Math.round(minPrice)}`}
      </Text>

      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="pdfChartGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
            <Stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
          </LinearGradient>
        </Defs>
        <Line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#e7e5e4" strokeWidth={0.5} strokeDasharray="2, 2" />
        <Line x1={paddingLeft} y1={paddingTop + chartHeight / 2} x2={width - paddingRight} y2={paddingTop + chartHeight / 2} stroke="#e7e5e4" strokeWidth={0.5} strokeDasharray="2, 2" />
        <Line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width - paddingRight} y2={paddingTop + chartHeight} stroke="#e7e5e4" strokeWidth={0.5} strokeDasharray="2, 2" />

        <Path d={areaPath} fill="url(#pdfChartGrad)" />
        <Path d={linePath} fill="none" stroke="#10b981" strokeWidth={1} />

        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={1.5} fill="#10b981" />
        ))}
      </Svg>
    </View>
  );
};

// Custom Vector Svg Verdict Evolution Chart
const VerdictEvolutionPDFChart = ({ history }: { history: any[] }) => {
  if (!history || history.length === 0) return null;

  const width = 190;
  const height = 80;
  const paddingLeft = 25;
  const paddingRight = 10;
  const paddingTop = 8;
  const paddingBottom = 12;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = history.map((h, index) => {
    const x = paddingLeft + (history.length > 1 ? (index / (history.length - 1)) * chartWidth : chartWidth / 2);
    const scoreVal = h.momentum_score !== null && h.momentum_score !== undefined ? h.momentum_score : 50;
    const y = paddingTop + chartHeight - (scoreVal / 100) * chartHeight;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <View style={{ marginBottom: 10, position: 'relative' }}>
      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#78716c', textTransform: 'uppercase', marginBottom: 4 }}>
        Deterministic Verdict History
      </Text>

      {/* Absolute positioned labels */}
      <Text style={{ position: 'absolute', left: 0, top: 4 + paddingTop, fontSize: 6, color: '#78716c', width: 20, textAlign: 'right' }}>
        100%
      </Text>
      <Text style={{ position: 'absolute', left: 0, top: 4 + paddingTop + chartHeight / 2, fontSize: 6, color: '#78716c', width: 20, textAlign: 'right' }}>
        50%
      </Text>
      <Text style={{ position: 'absolute', left: 0, top: 4 + paddingTop + chartHeight, fontSize: 6, color: '#78716c', width: 20, textAlign: 'right' }}>
        0%
      </Text>

      <Svg width={width} height={height}>
        <Line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#e7e5e4" strokeWidth={0.5} />
        <Line x1={paddingLeft} y1={paddingTop + chartHeight / 2} x2={width - paddingRight} y2={paddingTop + chartHeight / 2} stroke="#e7e5e4" strokeWidth={0.5} />
        <Line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width - paddingRight} y2={paddingTop + chartHeight} stroke="#e7e5e4" strokeWidth={0.5} />

        <Path d={linePath} fill="none" stroke="#6366f1" strokeWidth={1} />

        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={2} fill="#6366f1" />
        ))}
      </Svg>
    </View>
  );
};

interface PDFProps {
  analysis: any;
  memo: any;
  history: any[];
}

const StressTestPDFDocument: React.FC<PDFProps> = ({ analysis, memo, history }) => {
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

  const vNorm = (analysis.verdict || 'neutral').toLowerCase();
  const isBuy = vNorm === 'buy' || vNorm === 'positive' || vNorm === 'safe' || vNorm === 'pass';
  const isSell = vNorm === 'sell' || vNorm === 'negative' || vNorm === 'stress' || vNorm === 'fail';
  const verdictStyle = isBuy ? styles.verdictBuy : (isSell ? styles.verdictSell : styles.verdictNeutral);

  const contradictions = memo.evidenceGraph?.edges?.filter((e: any) => e.relation === 'contradicts') || [];

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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.title}>{analysis.company_name} P-IIM memo</Text>
          <Text style={styles.subtitle}>Investment Thesis P-IIM Report</Text>
          <View style={styles.metaGrid}>
            <Text style={styles.metaItem}>Ticker: {analysis.ticker} | CIK: {analysis.cik} | Country: {analysis.country || 'Unknown'}</Text>
            <Text style={styles.metaItem}>Sector: {memo?.metadata?.sector || 'Unknown'}</Text>
            <Text style={styles.metaItem}>Analyzed on: {new Date(analysis.created_at).toLocaleDateString()}</Text>
          </View>
        </View>

        {/* Key Metrics Row */}
        {memo.metadata?.metrics && (
          <View style={styles.metricsContainer}>
            <Text style={styles.metricsTitle}>Key Financial & Valuation Metrics (Real-Time Source)</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricsCell}>
                <Text style={styles.metricsLabel}>Current Price</Text>
                <Text style={styles.metricsVal}>
                  {memo.metadata.metrics.price ? `${memo.metadata.metrics.price.toFixed(2)} ${memo.metadata.metrics.currency || 'USD'}` : 'N/A'}
                </Text>
              </View>
              <View style={styles.metricsCell}>
                <Text style={styles.metricsLabel}>Market Cap</Text>
                <Text style={styles.metricsVal}>
                  {memo.metadata.metrics.marketCap ? `${(memo.metadata.metrics.marketCap / 1e9).toFixed(2)}B` : 'N/A'}
                </Text>
              </View>
              <View style={styles.metricsCell}>
                <Text style={styles.metricsLabel}>P/E Ratio</Text>
                <Text style={styles.metricsVal}>
                  {memo.metadata.metrics.peRatio ? `${memo.metadata.metrics.peRatio.toFixed(2)}x` : 'N/A'}
                </Text>
              </View>
              <View style={styles.metricsCell}>
                <Text style={styles.metricsLabel}>EPS</Text>
                <Text style={styles.metricsVal}>
                  {memo.metadata.metrics.eps ? `${memo.metadata.metrics.eps.toFixed(2)}` : 'N/A'}
                </Text>
              </View>
              <View style={styles.metricsCell}>
                <Text style={styles.metricsLabel}>Beta (Volatility)</Text>
                <Text style={styles.metricsVal}>
                  {memo.metadata.metrics.beta ? `${memo.metadata.metrics.beta.toFixed(2)}` : 'N/A'}
                </Text>
              </View>
              <View style={styles.metricsCell}>
                <Text style={styles.metricsLabel}>52-Week Range</Text>
                <Text style={[styles.metricsVal, { fontSize: 8 }]}>
                  {memo.metadata.metrics.fiftyTwoWeekRange || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Compiled Final Investment Verdict Section */}
        <View style={styles.compiledVerdictContainer}>
          <View style={styles.compiledVerdictHeader}>
            <Text style={styles.compiledVerdictTitle}>P-IIM Investment Committee Final Verdict</Text>
            <Text style={[
              styles.compiledVerdictBadge,
              {
                backgroundColor: action === "INVEST" ? '#dcfce7' : '#fee2e2',
                color: action === "INVEST" ? '#15803d' : '#b91c1c'
              }
            ]}>
              {action}
            </Text>
          </View>
          <Text style={styles.compiledVerdictReasoning}>
            {reasoning}
          </Text>
        </View>

        {/* 2-Column Memo Grid Layout */}
        <View style={styles.gridRow}>
          {/* Left Column */}
          <View style={styles.leftColumn}>
            {/* 12-Month Performance Trend */}
            <View style={styles.card}>
              <PerformancePDFChart data={memo.metadata?.chartData} />
            </View>

            {/* Verdict Panel (Glowing Panel Equivalent) */}
            <View style={[styles.verdictPanel, verdictStyle]}>
              <Text style={styles.verdictTitle}>Deterministic P-IIM Verdict</Text>
              <Text style={styles.verdictVal}>{getVerdictLabel(analysis.verdict)}</Text>
              
              {analysis.momentum_score !== null && (
                <>
                  <Text style={styles.confidenceLabel}>Calibrated Confidence Rating</Text>
                  <Text style={styles.confidenceVal}>{analysis.momentum_score}% confidence index</Text>
                </>
              )}
            </View>

            {/* Research Context Scenarios */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Research Context Scenario Narratives</Text>
              <View style={styles.scenarioBlock}>
                <Text style={styles.scenarioLabel}>Base Case</Text>
                <Text style={styles.scenarioText}>{memo.baseCase || 'Narrative unavailable.'}</Text>
              </View>
              <View style={styles.scenarioBlock}>
                <Text style={styles.scenarioLabel}>Bull Case</Text>
                <Text style={styles.scenarioText}>{memo.bullCase || 'Narrative unavailable.'}</Text>
              </View>
              <View style={styles.scenarioBlock}>
                <Text style={styles.scenarioLabel}>Bear Case</Text>
                <Text style={styles.scenarioText}>{memo.bearCase || 'Narrative unavailable.'}</Text>
              </View>
            </View>

            {/* Tripwire Triggers */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Falsifiable Future Tripwire Triggers</Text>
              {memo.tripwires && memo.tripwires.length > 0 ? (
                memo.tripwires.map((wire: string, idx: number) => (
                  <Text key={idx} style={{ marginBottom: 4, fontSize: 7.5 }}>
                    [{idx + 1}] {wire}
                  </Text>
                ))
              ) : (
                <Text style={{ color: '#78716c' }}>No falsifiable tripwires generated.</Text>
              )}
            </View>

            {/* SEC Form 4 Transactions */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>SEC Form 4 Recent Insider Transactions</Text>
              {analysis.insider_transactions && analysis.insider_transactions.length > 0 ? (
                <View>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableCellHeader, { width: '30%' }]}>Filer Name</Text>
                    <Text style={[styles.tableCellHeader, { width: '20%' }]}>Role</Text>
                    <Text style={[styles.tableCellHeader, { width: '15%' }]}>Date</Text>
                    <Text style={[styles.tableCellHeader, { width: '15%' }]}>Type</Text>
                    <Text style={[styles.tableCellHeader, { width: '20%', textAlign: 'right' }]}>Value</Text>
                  </View>
                  {analysis.insider_transactions.slice(0, 5).map((tx: any, idx: number) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { width: '30%', fontFamily: 'Helvetica-Bold' }]}>{tx.filerName}</Text>
                      <Text style={[styles.tableCell, { width: '20%' }]}>{tx.role}</Text>
                      <Text style={[styles.tableCell, { width: '15%' }]}>{tx.transactionDate}</Text>
                      <Text style={[styles.tableCell, { width: '15%' }]}>{tx.action?.toUpperCase()}</Text>
                      <Text style={[styles.tableCell, { width: '20%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>
                        {tx.value ? `$${tx.value.toLocaleString()}` : '$0'}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ color: '#78716c' }}>No recent insider transactions registered.</Text>
              )}
            </View>

            {/* Rejected Claims */}
            {memo.rejectedClaims && memo.rejectedClaims.length > 0 && (
              <View style={[styles.card, { borderColor: '#fca5a5' }]}>
                <Text style={[styles.cardTitle, { color: '#ef4444' }]}>Rejected Claims (Audit Failure)</Text>
                {memo.rejectedClaims.map((claim: any, idx: number) => (
                  <View key={idx} style={{ marginBottom: 4 }}>
                    <Text style={{ fontFamily: 'Helvetica-Bold', color: '#b91c1c' }}>"{claim.claim}"</Text>
                    <Text style={{ fontSize: 7, color: '#78716c' }}>Reason: {claim.reason}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Bypassed Red Flags */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bypassed Red Flags Log</Text>
              <Text style={{ fontSize: 7.5 }}>{memo.rejectedEvidenceSummary || 'None.'}</Text>
            </View>
          </View>

          {/* Right Column */}
          <View style={styles.rightColumn}>
            {/* Scoring Transparency Panel */}
            <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: '#3b82f6' }]}>
              <Text style={[styles.cardTitle, { color: '#2563eb' }]}>
                Scoring Transparency Panel ({availableSignals} of 8 signals active)
              </Text>
              
              {/* Layer 1 */}
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: '#44403c', textTransform: 'uppercase', marginBottom: 2 }}>
                  Layer 1: Fundamental Safety Floor
                </Text>
                <View style={{ gap: 2 }}>
                  <Text>Altman Z-Score: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{layer1.altmanZ?.score ?? 'N/A'}</Text> ({layer1.altmanZ?.zone?.toUpperCase() ?? 'N/A'})</Text>
                  <Text>Piotroski F-Score: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{layer1.piotroskiF?.score !== undefined ? `${layer1.piotroskiF.score}/9` : 'N/A'}</Text></Text>
                  <Text>Beneish M-Score: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{layer1.beneishM?.score ?? 'N/A'}</Text> ({layer1.beneishM?.breached ? 'BREACHED' : 'NORMAL'})</Text>
                </View>
              </View>

              {/* Layer 2 */}
              <View>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: '#44403c', textTransform: 'uppercase', marginBottom: 2 }}>
                  Layer 2: Present-State Momentum Signals
                </Text>
                <View style={{ gap: 3 }}>
                  <Text>Trend Signal: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{layer2.trend?.label?.toUpperCase() || 'N/A'}</Text></Text>
                  <Text>Earnings acceleration: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{layer2.earningsAcceleration?.label?.toUpperCase() || 'N/A'}</Text></Text>
                  <Text>Leverage Trend: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{layer2.leverageTrend?.label?.toUpperCase() || 'N/A'}</Text></Text>
                  <Text>Insider Activity: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{layer2.insiderActivity?.label?.toUpperCase() || 'N/A'}</Text></Text>
                  <Text>Analyst Revisions: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{layer2.analystRevisions?.label?.toUpperCase() || 'N/A'}</Text></Text>
                </View>
              </View>
            </View>

            {/* Verdict Over Time Graph */}
            <View style={styles.card}>
              <VerdictEvolutionPDFChart history={history} />
            </View>

            {/* Detected Contradictions */}
            {contradictions.length > 0 && (
              <View style={[styles.card, { borderColor: '#fca5a5' }]}>
                <Text style={[styles.cardTitle, { color: '#ef4444' }]}>Factual Contradictions</Text>
                {contradictions.map((edge: any, i: number) => {
                  const conf = memo.evidenceGraph.nodes.find((n: any) => n.id === edge.from);
                  const adv = memo.evidenceGraph.nodes.find((n: any) => n.id === edge.to);
                  return (
                    <Text key={i} style={{ marginBottom: 4, fontSize: 7 }}>
                      • Bullish: "{conf?.claim}" conflicts with Red Flag: "{adv?.claim}".
                    </Text>
                  );
                })}
              </View>
            )}

            {/* Evidence Graph Network */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Evidence Graph Network</Text>
              {memo.evidenceGraph?.nodes?.map((node: any) => {
                const isConf = node.id.startsWith('conf-');
                return (
                  <View key={node.id} style={[styles.evidenceNode, { borderColor: isConf ? '#10b981' : '#ef4444' }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ fontSize: 6, color: '#78716c' }}>Source: {node.sourceType}</Text>
                      <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: isConf ? '#15803d' : '#b91c1c' }}>
                        {isConf ? 'BULLISH' : 'RED FLAG'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 7, color: '#1c1917' }}>{node.claim}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Footer Stats & Disclaimers */}
        <View style={styles.disclaimer}>
          <Text style={{ color: '#44403c', fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
            Pipeline Run stats: Loops: {memo.metadata?.loopCount || 0} | Tool Calls: {memo.metadata?.toolCallCount || 0} | Cost: ${memo.metadata?.costEstimateUsd?.toFixed(4) || '0.0000'} USD
          </Text>
          <Text style={{ fontSize: 6, color: '#a8a29e' }}>{memo.disclaimer}</Text>
        </View>

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
      </Page>
    </Document>
  );
};

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;
  
  try {
    const user = await getSessionUser(req);
    const { rows } = await query("SELECT * FROM analyses WHERE id = $1", [id]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: "P-IIM record not found" }, { status: 404 });
    }
    
    const analysis = rows[0];

    // Public access: allow unsigned/guest users to download reports
    const memo = analysis.memo_json;
    
    // Query historical runs for the same ticker
    const { rows: history } = await query(
      "SELECT created_at, verdict, momentum_score FROM analyses WHERE ticker = $1 ORDER BY created_at ASC",
      [analysis.ticker]
    );

    const doc = <StressTestPDFDocument analysis={analysis} memo={memo} history={history} />;
    const stream = await pdf(doc).toBuffer();
    
    const ticker = analysis.ticker || 'unknown';
    const dateStr = new Date(analysis.created_at).toISOString().split('T')[0];
    
    return new Response(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${ticker.toLowerCase()}-thesis-p-iim-${dateStr}.pdf"`,
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error: any) {
    console.error("PDF generation failed:", error);
    return NextResponse.json({ error: `Failed to compile PDF: ${error.message}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { analysis, memo, history = [] } = body;
    
    if (!analysis || !memo) {
      return NextResponse.json({ error: "Missing analysis or memo data in request body" }, { status: 400 });
    }
    
    const doc = <StressTestPDFDocument analysis={analysis} memo={memo} history={history} />;
    const stream = await pdf(doc).toBuffer();
    
    const ticker = analysis.ticker || 'unknown';
    const dateStr = new Date(analysis.created_at || new Date()).toISOString().split('T')[0];
    
    return new Response(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${ticker.toLowerCase()}-thesis-p-iim-${dateStr}.pdf"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error: any) {
    console.error("PDF generation POST failed:", error);
    return NextResponse.json({ error: `Failed to compile PDF: ${error.message}` }, { status: 500 });
  }
}
