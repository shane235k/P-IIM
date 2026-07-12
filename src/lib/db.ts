import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set in environment variables.");
    }
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('supabase') || connectionString.includes('neon') || connectionString.includes('vercel-storage') || connectionString.includes('.postgres.database.azure.com')
        ? { rejectUnauthorized: false }
        : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const p = getPool();
  return p.query(text, params);
}

let dbInitialized = false;

export async function initDb() {
  if (dbInitialized) return;
  
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS analyses (
      id UUID PRIMARY KEY,
      company_name TEXT NOT NULL,
      ticker TEXT NOT NULL,
      cik TEXT NOT NULL,
      status TEXT NOT NULL,
      final_confidence_score NUMERIC,
      memo_json JSONB,
      run_log_json JSONB NOT NULL,
      cost_estimate_usd NUMERIC NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );
  `;
  
  try {
    await query(createTableQuery);
    
    // Add new columns for two-layer scorer and insider transactions
    const columnsToAdd = [
      { name: "country", type: "TEXT DEFAULT 'Unknown'" },
      { name: "momentum_score", type: "NUMERIC" },
      { name: "verdict", type: "TEXT" },
      { name: "layer1_scores", type: "JSONB" },
      { name: "layer2_signals", type: "JSONB" },
      { name: "insider_transactions", type: "JSONB" }
    ];
    
    for (const col of columnsToAdd) {
      try {
        await query(`ALTER TABLE analyses ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
      } catch (alterErr) {
        console.warn(`Failed to add column ${col.name}:`, alterErr);
      }
    }
    
    // Add index for fast history fetching
    try {
      await query("CREATE INDEX IF NOT EXISTS idx_analyses_ticker_created_at ON analyses(ticker, created_at)");
    } catch (indexErr) {
      console.warn("Failed to create index idx_analyses_ticker_created_at:", indexErr);
    }
    
    // Create analysis_chats table
    const createChatsTableQuery = `
      CREATE TABLE IF NOT EXISTS analysis_chats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await query(createChatsTableQuery);
    
    dbInitialized = true;
    console.log("Database tables and chat history schemas initialized successfully.");
  } catch (error: any) {
    console.error("Error initializing database schema:", error);
  }
}
