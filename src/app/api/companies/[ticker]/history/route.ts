import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ ticker: string }> }
) {
  const params = await props.params;
  const ticker = (params.ticker || '').toUpperCase();
  
  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker parameter" }, { status: 400 });
  }

  try {
    const { rows } = await query(
      `SELECT created_at as "analyzedAt", momentum_score as "momentumScore", verdict 
       FROM analyses 
       WHERE UPPER(ticker) = $1 AND status = 'complete' 
       ORDER BY created_at ASC`,
      [ticker]
    );

    return NextResponse.json(rows.map(r => ({
      analyzedAt: r.analyzedAt,
      momentumScore: r.momentumScore ? Number(r.momentumScore) : null,
      verdict: r.verdict
    })));
  } catch (error: any) {
    console.error(`Error loading analysis history for ${ticker}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
