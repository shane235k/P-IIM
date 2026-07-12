# 🛡️ Investment Thesis Stress-Test Engine

The **Investment Thesis Stress-Test Engine** is a production-grade, full-stack Next.js application designed to run a multi-node adversarial research pipeline. It evaluates and challenges investment hypotheses for public companies using **LangGraph.js**, **Google Gemini**, **Groq fallbacks**, **SEC EDGAR**, and **Tavily**.

Rather than running a panel of investor persona bots that debate and vote, this system implements a single, coherent pipeline that:
1. Formulates falsifiable, quantitative hypotheses about a company.
2. Actively tries to disprove them using a dedicated adversarial research worker.
3. Automatically verifies all factual and numeric claims against cited sources.
4. Surfaced logical contradictions between positive and negative findings.
5. Arbitrates disagreements by conducting targeted research on key points of divergence.
6. Auto-escalates critical red flags using a severity override.
7. Produces a final, calibrated confidence score and tripwires for ongoing monitoring.

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have **Node.js 20+** and **npm** installed.

### 2. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (based on `.env.example`):
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_FAST_MODEL=gemini-2.5-flash-lite
GEMINI_REASONING_MODEL=gemini-2.5-flash

GROQ_API_KEY=your_groq_api_key_here
GROQ_FALLBACK_MODEL=llama-3.3-70b-versatile

TAVILY_API_KEY=your_tavily_api_key_here

SEC_EDGAR_USER_AGENT=your_app_name your_contact_email@example.com

DATABASE_URL=postgres://user:password@host:5432/dbname

LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_PROJECT=investment-thesis-stress-test
LANGSMITH_TRACING=false

# Cost / safety controls
MAX_RESEARCH_LOOPS=2
MAX_TOOL_CALLS_PER_RUN=30
MAX_RUN_COST_USD_ESTIMATE=1.00
REQUEST_TIMEOUT_MS=30000

NODE_ENV=development
```

### 4. Running Locally
Run the database migrations (done automatically on startup) and start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

---

## 🛠️ How It Works (Architecture)

The research pipeline is implemented as an explicit LangGraph state graph. Here is the node execution flow:

```
[Intake & Normalize] ──> [Hypothesis Generator] ──> [Planner / Router]
                                                           │
                                           ┌───────────────┼───────────────┐
                                           ▼               ▼               ▼
                                    [Confirming]     [Adversarial]      [Macro]
                                           └───────────────┬───────────────┘
                                                           ▼
                                               [Evidence Graph Builder]
                                                           │
                                                           ▼
                                                   [Severity Check]
                                                    /            \
                                    (delta > 40)   /              \  (delta <= 40)
                                                  ▼                ▼
                                         [Arbitration]     [Claim Verifier]
                                                  \                /
                                                   \              /  (rejections > 40%)
                                                    ▼            ▼
                                             [Override]   [Insufficient Data Exit]
                                                    │
                                                    ▼
                                            [Devil's Advocate]
                                                    │
                                                    ▼
                                           [Confidence Score]
                                                    │
                                                    ▼
                                            [Scenario Cases]
                                                    │
                                                    ▼
                                              [Tripwires]
                                                    │
                                                    ▼
                                             [Memo Compiler]
```

### Explanation of Nodes
1. **Intake & Normalize**: Sanitizes inputs and fetches SEC company profile facts (exchange, sector, description).
2. **Hypothesis Generator**: Skims recent news and forms 1-3 falsifiable, quantitative investment claims.
3. **Planner / Router**: Routes research areas based on sector-specific characteristics.
4. **Parallel Research Workers**:
   - **Confirming**: Gathers evidence supporting the thesis.
   - **Adversarial**: Double-passes a rigorous checklist (accounting, customer concentration, debt, litigation, moats) at high temperature. Executes at least 4 tool calls.
   - **Macro/Sector**: Captures sector-wide headwinds and tailwinds.
5. **Evidence Graph Builder**: Combines all findings into a node network and flags logical contradictions.
6. **Severity & Disagreement Check**: Computes divergence scores. If the difference between bullish and bearish findings exceeds 40 points, triggers arbitration.
7. **Targeted Arbitration Research (6a)**: Executes focused search queries to resolve the primary contradiction, consuming one loop unit.
8. **Claim Verifier**: Audits numbers and metrics against source quotes. If more than 40% of claims fail audit, redirects to an `insufficient_data` exit.
9. **Severity Override Check**: Any high-severity red flag bypasses scores and forces the engine into reflexion.
10. **Devil's Advocate Reflexion**: Challenges the emerging thesis and compiles a steelman bear case.
11. **Confidence Updater**: Uses an inspectable, weighted math formula to output a calibrated confidence score.
12. **Scenario Framing & Tripwire Generator**: Drafts Bull/Base/Bear scenarios and concrete trigger thresholds.
13. **Memo Compiler**: Compiles the completed report, records the logs, and persists them to the PostgreSQL database.

---

## 📦 Tech Stack & Integrated APIs

- **Framework**: Next.js 15+ (App Router, Server Components, Route Handlers).
- **Orchestration**: LangGraph.js (`@langchain/langgraph`) + `@langchain/core`.
- **Primary LLM**: Google Gemini API via official `@google/genai` SDK (`gemini-2.5-flash-lite` for parallel workers, `gemini-2.5-flash` for reasoning/reflexion).
- **Fallback LLM**: Groq API via standard HTTP completions endpoint (running `llama-3.3-70b-versatile` if Gemini is throttled/rate-limited).
- **Regulatory Data**: SEC EDGAR submissions endpoints.
- **Search Tool**: Tavily Search API.
- **Fuzzy Search**: `fuse.js` (fuzzy searches ticker lists server-side).
- **Database**: PostgreSQL (Supabase / Vercel Postgres) using the `pg` client.
- **PDF Generation**: `@react-pdf/renderer` rendering documents directly in Serverless Route Handlers.
- **Observability**: LangSmith tracing configuration.
- **Styling**: Vanilla CSS (Vercel-inspired dashboard, monospace logs).

---

## 📈 Example Stress-Test Runs

### 1. Tesla Inc. (TSLA)
- **Hypothesis**: Tesla's energy storage business will grow >35% in 2026, offsetting automotive margin compression and justifying valuation.
- **Adversarial Finding**: Surfaced customer concentration in utility solar projects and capital investment risks.
- **Contradiction**: Confirming worker cited "Record battery pack orders," while Adversarial worker highlighted "Lithium supply chain contracts and execution bottlenecks."
- **Arbitration**: Resolved by checking global pack manufacturing targets, adjusting battery division risk metrics.
- **Verdict**: BUY/ACCUMULATE | Confidence: **72%** (Disconfirming evidence cited: automotive margins pressure).

### 2. Apple Inc. (AAPL)
- **Hypothesis**: Services division growth at >15% CAGR will expand gross margins by 150bps by Q4 2026.
- **Adversarial Finding**: Highlighted EU anti-trust regulatory headwinds and App Store fee restructuring.
- **Verdict**: HOLD/NEUTRAL | Confidence: **58%** (EU regulatory risk offset positive services trajectory).

---

## ⚖️ Key Decisions & Trade-Offs

1. **Custom LLM Fetch Wrapper over LangChain Models**: Written to provide fine-grained control over exponential backoff retries, timeouts, and fallback routing to Groq, ensuring complete cost estimation logging and SSE compatibility.
2. **Dynamic Serverless Ticker Caching**: To prevent write-only errors on Vercel, `company_tickers.json` is loaded dynamically to `/tmp` and kept in memory with a 24-hour TTL, removing build-time assets coupling.
3. **No-Tailwind Policy**: Opted for semantic Vanilla CSS styling (`globals.css`) for layout flexboxes and graphs, creating a clean, lightweight, dark dashboard theme.

---

## 🔮 What We Would Improve With More Time

1. **Visual Graph Node Rendering**: Replace CSS-based cards with an interactive SVG node canvas (e.g. using D3.js or React Flow) allowing users to drag and explore evidence links.
2. **Vector Filings Scraping (RAG)**: Index SEC EDGAR 10-K filings using vector embeddings in Postgres (pgvector) to perform highly precise semantic queries instead of relying on regex and search snippets.

---

## 📈 Scoring & Verdict Decision Logic

For a complete breakdown of our quantitative valuation layer, safety floor calculations, and real-time APIs, read the **[Scoring System Manual](file:///c:/nvm/COLLEGE/INTSH/company-analyser/docs/scoring_system.md)**.

This manual documents:
*   **Layer 1 (Fundamental Safety Floor):** Exact formulas for **Altman Z-Score**, **Piotroski F-Score**, and **Beneish M-Score**.
*   **Layer 2 (Momentum Signals):** Specific metrics checked for Price Trend, Earnings Acceleration, Leverage Trend, Insider Net Activity, and Analyst Revisions.
*   **Verdict Threshold Matrix:** Standard score-based verdicts vs. dynamic Layer 1 safety floor breach overrides.
