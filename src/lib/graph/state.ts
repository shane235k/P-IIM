import { Annotation } from "@langchain/langgraph";

export interface Claim {
  claim: string;
  sourceUrl: string;
  quote: string;
}

export interface RedFlag {
  claim: string;
  sourceUrl: string;
  quote: string;
  severity: "low" | "medium" | "high";
  category: string;
}

export interface EvidenceNode {
  id: string;
  claim: string;
  sourceUrl: string;
  sourceType: string;
  reliabilityScore: number; // 0-100
  timestamp: string;
}

export interface EvidenceEdge {
  from: string;
  to: string;
  relation: "supports" | "contradicts";
}

export interface EvidenceGraph {
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
}

export interface LogEntry {
  timestamp: string;
  runId: string;
  nodeName: string;
  status: "started" | "succeeded" | "failed" | "skipped";
  durationMs: number;
  llmProvider: "gemini" | "groq" | null;
  llmModel: string | null;
  toolCallsMade: string[];
  tokenUsage: { input: number; output: number } | null;
  costEstimateUsd: number | null;
  errorMessage: string | null;
  inputSummary: string;
  outputSummary: string;
}

export interface CompanyProfile {
  cik: string;
  name: string;
  ticker: string;
  exchange: string;
  sic: string;
  sicDescription: string;
  sector: string;
  marketCap?: string;
  fiscalYearEnd: string;
  description: string;
  country: string;
  metrics?: any | null;
  chartData?: any[] | null;
}

export interface GraphState {
  companyNameInput: string;
  resolvedTicker: string | null;
  resolvedCik: string | null;
  companyProfile: CompanyProfile | null;

  hypotheses: Claim[];

  confirmingFindings: Claim[];
  adversarialFindings: RedFlag[];

  evidenceGraph: EvidenceGraph;

  verifiedClaims: Claim[];
  rejectedClaims: (Claim & { reason: string })[];

  layer1Scores: any | null;
  layer2Signals: any | null;
  insiderTransactions: any | null;
  verdict: string | null;

  finalConfidenceScore: number | null;
  confidenceBreakdown: Record<string, string>;

  bullCase: string;
  bearCase: string;
  baseCase: string;

  rejectedEvidenceSummary: string;

  tripwires: string[];
  finalDecision: { action: "INVEST" | "PASS"; reasoning: string } | null;

  loopCount: number;
  toolCallCount: number;
  costEstimateUsd: number;
  status: "in_progress" | "insufficient_data" | "complete" | "failed";

  runLog: LogEntry[];
}

export const StateAnnotation = Annotation.Root({
  companyNameInput: Annotation<string>(),
  resolvedTicker: Annotation<string | null>(),
  resolvedCik: Annotation<string | null>(),
  companyProfile: Annotation<CompanyProfile | null>(),

  hypotheses: Annotation<Claim[]>({
    reducer: (x, y) => y ?? x,
  }),

  confirmingFindings: Annotation<Claim[]>({
    reducer: (x, y) => y ?? x,
  }),
  adversarialFindings: Annotation<RedFlag[]>({
    reducer: (x, y) => y ?? x,
  }),

  evidenceGraph: Annotation<EvidenceGraph>({
    reducer: (x, y) => y ?? x,
  }),

  verifiedClaims: Annotation<Claim[]>({
    reducer: (x, y) => y ?? x,
  }),
  rejectedClaims: Annotation<(Claim & { reason: string })[]>({
    reducer: (x, y) => y ?? x,
  }),

  layer1Scores: Annotation<any | null>({
    reducer: (x, y) => y ?? x,
  }),
  layer2Signals: Annotation<any | null>({
    reducer: (x, y) => y ?? x,
  }),
  insiderTransactions: Annotation<any | null>({
    reducer: (x, y) => y ?? x,
  }),
  verdict: Annotation<string | null>({
    reducer: (x, y) => y ?? x,
  }),

  finalConfidenceScore: Annotation<number | null>({
    reducer: (x, y) => (y !== undefined ? y : x),
  }),
  confidenceBreakdown: Annotation<Record<string, string>>({
    reducer: (x, y) => y ?? x,
  }),

  bullCase: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  bearCase: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  baseCase: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),

  rejectedEvidenceSummary: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),

  tripwires: Annotation<string[]>({
    reducer: (x, y) => y ?? x,
  }),
  finalDecision: Annotation<{ action: "INVEST" | "PASS"; reasoning: string } | null>({
    reducer: (x, y) => y ?? x,
  }),

  loopCount: Annotation<number>({
    reducer: (x, y) => (y !== undefined ? y : x),
  }),
  toolCallCount: Annotation<number>({
    reducer: (x, y) => (y !== undefined ? y : x),
  }),
  costEstimateUsd: Annotation<number>({
    reducer: (x, y) => (y !== undefined ? y : x),
  }),
  status: Annotation<"in_progress" | "insufficient_data" | "complete" | "failed">({
    reducer: (x, y) => y ?? x,
  }),

  runLog: Annotation<LogEntry[]>({
    reducer: (x, y) => {
      if (!y) return x;
      return [...x, ...y];
    },
  }),
});
