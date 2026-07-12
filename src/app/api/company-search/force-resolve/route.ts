import { NextRequest, NextResponse } from 'next/server';
import { searchWeb } from '@/lib/tavily';
import { callLLM } from '@/lib/llm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const queryStr = searchParams.get('q') || '';
  
  if (!queryStr) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }
  
  try {
    console.log(`Forcing AI web resolution for company: ${queryStr}`);
    
    // 1. Run web search for company details
    const searchRes = await searchWeb(`${queryStr} company stock ticker CIK exchange country profile`, { maxResults: 4 });
    const searchContent = searchRes.results?.map(r => r.content).join("\n\n") || 'No search results found.';
    
    const systemInstruction = `You are a corporate intelligence agent. Resolve the query to an official company profile.
Extract the company CIK, primary stock ticker (with exchange prefix if foreign, e.g. "EPA:CAP" or "PRIVATE"), official corporate name, country of origin, and exchange.
Format the output as a valid JSON object:
{
  "name": "Official Corporate Name",
  "ticker": "TICKER_OR_PRIVATE",
  "cik": "CIK_NUMBER_OR_PV_ID",
  "country": "Country of Origin",
  "exchange": "Primary Exchange Name",
  "description": "Brief 1-2 sentence description of the company operations."
}
Only output the raw JSON object. Do not include markdown code fences.`;

    const llmRes = await callLLM("reasoning", systemInstruction, `Query: ${queryStr}\n\nSearch Results:\n${searchContent}`, {
      temperature: 0.1,
      jsonMode: true
    });

    const parsed = JSON.parse(llmRes.text.trim());
    return NextResponse.json({ company: parsed });
    
  } catch (error: any) {
    console.error("AI web resolution failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
