import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { callLLM } from '@/lib/llm';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const analysisId = params.id;
  
  // Resolve user session
  const user = await getSessionUser(req);
  if (!user) {
    // If guest, they don't have chat history stored in DB
    return NextResponse.json([]);
  }
  
  try {
    const { rows } = await query(
      `SELECT role, message, created_at as "createdAt"
       FROM analysis_chats
       WHERE analysis_id = $1
       ORDER BY created_at ASC`,
      [analysisId]
    );
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error(`Error loading chat history for analysis ${analysisId}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const analysisId = params.id;
  
  try {
    const body = await req.json();
    const { message, history, analysis: guestAnalysis } = body;
    
    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    const user = await getSessionUser(req);
    const isAuthenticated = !!user;

    let analysis: any = null;
    let historyRows: { role: string; message: string }[] = [];

    if (isAuthenticated) {
      // 1. Authenticated User flow: Load from Database
      const { rows: analysisRows } = await query(
        `SELECT company_name, ticker, cik, status, final_confidence_score, memo_json, layer1_scores, layer2_signals, insider_transactions
         FROM analyses
         WHERE id = $1`,
        [analysisId]
      );
      
      if (analysisRows.length === 0) {
        return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
      }
      
      analysis = analysisRows[0];
      
      // Load history from database
      const { rows } = await query(
        `SELECT role, message
         FROM analysis_chats
         WHERE analysis_id = $1
         ORDER BY created_at ASC`,
        [analysisId]
      );
      historyRows = rows;
    } else {
      // 2. Unauthenticated Guest flow: Use payload sent in request body
      if (!guestAnalysis) {
        return NextResponse.json({ error: "Analysis details required for guest session." }, { status: 400 });
      }
      analysis = guestAnalysis;
      
      // Load history from body payload
      if (history && Array.isArray(history)) {
        historyRows = history.map((h: any) => ({
          role: h.role,
          message: h.message
        }));
      }
    }
    
    const memo = analysis.memo_json || {};
    const transparencyPanel = {
      layer1: analysis.layer1_scores || {},
      layer2: analysis.layer2_signals || {}
    };
    
    const contextPanel = {
      bullCase: memo.bullCase || '',
      bearCase: memo.bearCase || '',
      baseCase: memo.baseCase || '',
      tripwires: memo.tripwires || [],
      rejectedEvidenceSummary: memo.rejectedEvidenceSummary || ''
    };
    
    const insiderTransactions = analysis.insider_transactions || [];
    
    const systemPrompt = `You are a critical, objective investment research assistant. You are answering user questions about a specific saved Stress-Test Analysis.
You must reason ONLY over the already-computed, already-stored metrics and qualitative narratives provided in the Context below.
Do NOT run new research tools, fetch outer websites, or invent/fabricate new financial figures. If information is missing or marked "unavailable", state clearly that it is unavailable.

ANALYSIS CONTEXT:
- Company: ${analysis.company_name} (${analysis.ticker})
- CIK: ${analysis.cik}
- Final Score: ${analysis.final_confidence_score}%
- Transparency Panel (Scores & Ratios):
${JSON.stringify(transparencyPanel, null, 2)}
- Research Context Panel (Case Scenarios & Narratives):
${JSON.stringify(contextPanel, null, 2)}
- Insider Transactions (SEC Form 4):
${JSON.stringify(insiderTransactions, null, 2)}

Provide concise, factual answers citing only the metrics or quotes above.`;

    const chatPrompt = [
      ...historyRows.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.message}`),
      `User: ${message}`
    ].join("\n\n");
    
    const llmRes = await callLLM("reasoning", systemPrompt, chatPrompt, {
      temperature: 0.2
    });
    const reply = llmRes.text.trim();
    
    if (isAuthenticated) {
      // Save messages in DB for authenticated session
      await query(
        `INSERT INTO analysis_chats (analysis_id, role, message) VALUES ($1, $2, $3)`,
        [analysisId, 'user', message]
      );
      
      await query(
        `INSERT INTO analysis_chats (analysis_id, role, message) VALUES ($1, $2, $3)`,
        [analysisId, 'assistant', reply]
      );
    }
    
    return NextResponse.json({ role: 'assistant', message: reply });
    
  } catch (error: any) {
    console.error(`Error in per-analysis chatbot API:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
