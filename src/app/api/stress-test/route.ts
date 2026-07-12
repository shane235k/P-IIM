import { NextRequest } from 'next/server';
import { stressTestGraph } from '@/lib/graph/pipeline';
import crypto from 'crypto';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticker, cik, name } = body;
    
    if (!ticker || !cik || !name) {
      return new Response(
        JSON.stringify({ error: "Missing ticker, cik, or name in request body" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Resolve user from session
    const user = await getSessionUser(req);
    const userId = user?.userId || null;
    
    const encoder = new TextEncoder();
    const runId = crypto.randomUUID();
    
    const stream = new ReadableStream({
      async start(controller) {
        const push = (event: string, data: any) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };
        
        try {
          push('log', {
            nodeName: "Graph Engine",
            message: `Initializing LangGraph state graph. Assigned Run ID: ${runId}`,
            status: "started",
            timestamp: new Date().toISOString()
          });
          
          const onLog = (log: any) => {
            push('log', log);
          };
          
          const initialState = {
            companyNameInput: name,
            resolvedTicker: ticker,
            resolvedCik: cik,
            companyProfile: null,
            hypotheses: [],
            confirmingFindings: [],
            adversarialFindings: [],
            evidenceGraph: { nodes: [], edges: [] },
            verifiedClaims: [],
            rejectedClaims: [],
            confirmingScore: null,
            adversarialScore: null,
            disagreementDelta: null,
            arbitrationTriggered: false,
            severityOverrideTriggered: false,
            finalConfidenceScore: null,
            confidenceBreakdown: {},
            bullCase: '',
            bearCase: '',
            baseCase: '',
            rejectedEvidenceSummary: '',
            tripwires: [],
            loopCount: 0,
            toolCallCount: 0,
            costEstimateUsd: 0.0,
            status: 'in_progress' as const,
            runLog: []
          };
          
          const finalState = await stressTestGraph.invoke(initialState, {
            configurable: {
              runId,
              userId,
              onLog
            }
          });
          
          let analysisData = null;
          
          // If guest, assemble full report payload to return to the client-side session state
          if (!userId && finalState.companyProfile) {
            const profile = finalState.companyProfile;
            const rejectedEvidenceSummary = finalState.rejectedEvidenceSummary || "";
            const memoPayload = {
              verdict: finalState.status === "insufficient_data" ? "INSUFFICIENT DATA" : (finalState.verdict === "sell" ? "SELL WHEN YOU SEE FIT" : finalState.verdict === "hold" ? "HOLD" : "NEUTRAL"),
              finalConfidenceScore: finalState.finalConfidenceScore,
              confidenceBreakdown: finalState.confidenceBreakdown || {},
              bullCase: finalState.bullCase,
              bearCase: finalState.bearCase,
              baseCase: finalState.baseCase,
              tripwires: finalState.tripwires || [],
              evidenceGraph: finalState.evidenceGraph || { nodes: [], edges: [] },
              verifiedClaims: finalState.verifiedClaims || [],
              rejectedClaims: finalState.rejectedClaims || [],
              rejectedEvidenceSummary,
              disclaimer: "LEGAL NON-ADVICE DISCLAIMER: This document is an automated AI-generated stress-test research output. It is provided for informational and analytical purposes only, and does NOT constitute financial advice, investment recommendations, or an endorsement of any securities transaction. Seek advice from a licensed financial advisor before making any financial decisions.",
              metadata: {
                sector: profile.sector || 'Unknown',
                marketCap: profile.marketCap || null,
                exchange: profile.exchange || 'Unknown',
                fiscalYearEnd: profile.fiscalYearEnd || 'Unknown',
                loopCount: finalState.loopCount || 0,
                toolCallCount: finalState.toolCallCount || 0,
                costEstimateUsd: finalState.costEstimateUsd || 0,
                metrics: profile.metrics || null,
                chartData: profile.chartData || null
              }
            };
            
            const finalStatus = finalState.status === "failed" ? "failed" : (finalState.status === "insufficient_data" ? "insufficient_data" : "complete");
            
            analysisData = {
              id: runId,
              company_name: finalState.companyProfile.name,
              ticker: finalState.resolvedTicker,
              cik: finalState.resolvedCik,
              status: finalStatus,
              final_confidence_score: finalState.finalConfidenceScore,
              memo_json: memoPayload,
              run_log_json: finalState.runLog,
              cost_estimate_usd: finalState.costEstimateUsd,
              created_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
              country: finalState.companyProfile.country || 'Unknown',
              momentum_score: finalState.finalConfidenceScore,
              verdict: finalState.verdict || 'neutral',
              layer1_scores: finalState.layer1Scores || {},
              layer2_signals: finalState.layer2Signals || {},
              insider_transactions: finalState.insiderTransactions || [],
              user_id: null
            };
          }
          
          push('done', {
            runId,
            status: finalState.status,
            finalConfidenceScore: finalState.finalConfidenceScore,
            analysisData
          });
          
          controller.close();
          
        } catch (error: any) {
          console.error("SSE Stress-Test Execution Error:", error);
          push('error', {
            message: error.message || "An internal error occurred during the stress-test run."
          });
          controller.close();
        }
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (err: any) {
    console.error("Stress-test endpoint setup error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
