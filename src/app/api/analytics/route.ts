import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const totalRes = await query("SELECT COUNT(*) as count FROM analyses", []);
    const completedRes = await query("SELECT COUNT(*) as count, AVG(momentum_score) as avg_score FROM analyses WHERE status = 'complete'", []);
    const failedRes = await query("SELECT COUNT(*) as count FROM analyses WHERE status = 'failed'", []);
    const tickerRes = await query("SELECT COUNT(DISTINCT ticker) as count FROM analyses", []);
    
    const verdictRes = await query(
      "SELECT verdict, COUNT(*) as count FROM analyses WHERE status = 'complete' GROUP BY verdict", 
      []
    );

    const totalCount = Number(totalRes.rows[0]?.count || 0);
    const completedCount = Number(completedRes.rows[0]?.count || 0);
    const averageScore = completedRes.rows[0]?.avg_score ? Number(Number(completedRes.rows[0].avg_score).toFixed(1)) : null;
    const failedCount = Number(failedRes.rows[0]?.count || 0);
    const uniqueTickers = Number(tickerRes.rows[0]?.count || 0);

    const verdictStats = verdictRes.rows.map(r => ({
      verdict: r.verdict || 'neutral',
      count: Number(r.count)
    }));

    return NextResponse.json({
      totalCount,
      completedCount,
      failedCount,
      uniqueTickers,
      averageScore,
      verdictStats
    });
  } catch (error: any) {
    console.error("Error fetching homepage analytics:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
