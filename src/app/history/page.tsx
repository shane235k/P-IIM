import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { query, initDb } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';
import { FolderOpen, Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface AnalysisRow {
  id: string;
  company_name: string;
  ticker: string;
  status: string;
  final_confidence_score: string | null;
  cost_estimate_usd: string;
  created_at: Date;
  country?: string;
}

export default async function HistoryPage() {
  await initDb();
  
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  const user = sessionCookie ? verifySessionToken(sessionCookie) : null;

  if (!user) {
    return (
      <div>
        <div style={{ marginBottom: '30px', marginTop: '20px' }}>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '8px' }}>Analysis History</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Review and audit past P-IIM records.
          </p>
        </div>

        <div className="card" style={{ 
          textAlign: 'center', 
          padding: '48px 32px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '16px',
          border: '1px dashed rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(15, 15, 20, 0.4)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(99, 102, 241, 0.2)'
          }}>
            <Shield size={20} style={{ color: '#818cf8' }} />
          </div>
          <h3 style={{ marginTop: '4px', marginBottom: '4px', fontSize: '18px', fontWeight: 600 }}>Authentication Required</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '12px', maxWidth: '440px', fontSize: '13px', lineHeight: 1.5 }}>
            Past report history retention is only available to authenticated users. Guests can perform live P-IIM runs and chat with the model, but results are discarded once the page is closed or reloaded.
          </p>
          <div style={{ display: 'inline-flex', gap: '12px' }}>
            <Link href="/login" className="btn btn-primary" style={{ padding: '8px 16px' }}>
              Sign In
            </Link>
            <Link href="/register" className="btn btn-secondary" style={{ padding: '8px 16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let analyses: AnalysisRow[] = [];
  let errorMsg = "";
  
  try {
    const { rows } = await query(
      "SELECT id, company_name, ticker, status, final_confidence_score, cost_estimate_usd, created_at, country FROM analyses WHERE user_id = $1 ORDER BY created_at DESC",
      [user.userId]
    );
    analyses = rows;
  } catch (error: any) {
    console.error("Failed to load analyses history from DB:", error);
    errorMsg = error.message || "Failed to load database history.";
  }

  return (
    <div>
      <div style={{ marginBottom: '30px', marginTop: '20px' }}>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '8px' }}>Analysis History</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Review and audit past P-IIM records. Re-running a company generates a new analysis card allowing comparisons over time.
        </p>
      </div>

      {errorMsg ? (
        <div className="card" style={{ borderLeft: '4px solid var(--error)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
          <h3 style={{ color: 'var(--error)', marginBottom: '8px' }}>Database Error</h3>
          <p style={{ color: '#fca5a5' }}>{errorMsg}</p>
        </div>
      ) : analyses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <FolderOpen size={36} style={{ color: 'var(--text-muted)' }} />
          <h3 style={{ marginTop: '4px', marginBottom: '4px' }}>No P-IIM analyses found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '12px', maxWidth: '400px', fontSize: '13px', lineHeight: 1.5 }}>
            You haven't run any company analyses yet. Go back to the dashboard to launch your first analysis.
          </p>
          <Link href="/dashboard" className="btn btn-primary">
            Launch P-IIM Analysis
          </Link>
        </div>
      ) : (
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Ticker</th>
                <th>Status</th>
                <th>Calibrated Score</th>
                <th>API Cost</th>
                <th>Date Analyzed</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((row) => {
                const dateStr = new Date(row.created_at).toLocaleDateString() + ' ' + new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const score = row.final_confidence_score !== null ? `${row.final_confidence_score}%` : 'N/A';
                const cost = Number(row.cost_estimate_usd) > 0 ? `$${Number(row.cost_estimate_usd).toFixed(4)}` : '$0.00';
                
                let badgeClass = "badge-muted";
                if (row.status === "complete") badgeClass = "badge-success";
                else if (row.status === "failed") badgeClass = "badge-error";
                else if (row.status === "insufficient_data") badgeClass = "badge-warning";
                
                return (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>{row.company_name}</div>
                      {row.country && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Origin: {row.country}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="dropdown-item-ticker">{row.ticker}</span>
                    </td>
                    <td>
                      <span className={`badge ${badgeClass}`}>{row.status}</span>
                    </td>
                    <td>
                      <strong style={{ color: row.status === "complete" ? '#ffffff' : 'inherit' }}>{score}</strong>
                    </td>
                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: 'var(--text-muted)' }}>{cost}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{dateStr}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <Link href={`/analyses/${row.id}`} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                          View Memo
                        </Link>
                        {row.status !== "failed" && (
                          <a href={`/api/analyses/${row.id}/pdf`} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                            PDF
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
