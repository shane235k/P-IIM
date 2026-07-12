import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;
  
  try {
    const user = await getSessionUser(req);

    const { rows } = await query(
      "SELECT id, company_name, ticker, cik, status, final_confidence_score, memo_json, run_log_json, cost_estimate_usd, created_at, completed_at, country, momentum_score, verdict, layer1_scores, layer2_signals, insider_transactions, user_id FROM analyses WHERE id = $1",
      [id]
    );
    
    if (rows.length === 0) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }
    
    const analysis = rows[0];

    // Enforce privacy: verify report belongs to the authenticated user
    if (analysis.user_id && (!user || user.userId !== analysis.user_id)) {
      return NextResponse.json({ error: "Unauthorized access to private analysis report." }, { status: 403 });
    }
    
    // Remove user_id from returned JSON to avoid leak
    delete analysis.user_id;

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error(`Error fetching analysis ${id}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
