import { NextRequest, NextResponse } from 'next/server';
import { searchCompany } from '@/lib/sec';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';
  
  try {
    const results = await searchCompany(query);
    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Error in company search endpoint:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
