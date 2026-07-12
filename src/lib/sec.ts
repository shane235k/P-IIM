import fs from 'fs';
import path from 'path';
import Fuse from 'fuse.js';
import { searchWeb } from './tavily';
import { callLLM } from './llm';

interface CompanyTickerRaw {
  cik_str: number;
  ticker: string;
  title: string;
}

export interface CompanyInfo {
  cik: string;
  ticker: string;
  name: string;
  country?: string;
}

let inMemoryTickers: CompanyInfo[] | null = null;
let inMemoryLoadTime = 0;
const CACHE_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours
const SEC_TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';

function getTempFilePath(): string {
  const os = require('os');
  return path.join(os.tmpdir(), 'company_tickers.json');
}

export async function fetchAndCacheTickers(): Promise<CompanyInfo[]> {
  const userAgent = process.env.SEC_EDGAR_USER_AGENT || 'InvestmentStressTestEngine/1.0 info@example.com';
  console.log(`Fetching company_tickers.json from SEC EDGAR with User-Agent: ${userAgent}`);
  
  const response = await fetch(SEC_TICKERS_URL, {
    headers: {
      'User-Agent': userAgent,
      'Accept-Encoding': 'gzip, deflate',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch tickers from SEC EDGAR: ${response.statusText} (${response.status})`);
  }
  
  const rawData: Record<string, CompanyTickerRaw> = await response.json();
  const list: CompanyInfo[] = Object.values(rawData).map((item) => ({
    cik: String(item.cik_str),
    ticker: item.ticker,
    name: item.title,
    country: 'United States' // Default SEC registry to US
  }));
  
  // Cache in memory
  inMemoryTickers = list;
  inMemoryLoadTime = Date.now();
  
  // Cache in temp file
  try {
    const tempPath = getTempFilePath();
    fs.mkdirSync(path.dirname(tempPath), { recursive: true });
    fs.writeFileSync(tempPath, JSON.stringify({ loadTime: inMemoryLoadTime, list }), 'utf-8');
    console.log(`Saved company_tickers.json to cache: ${tempPath}`);
  } catch (err) {
    console.warn('Failed to write company_tickers.json to temp file cache', err);
  }
  
  return list;
}

export async function getCompanyTickers(): Promise<CompanyInfo[]> {
  const now = Date.now();
  
  // 1. Try memory cache
  if (inMemoryTickers && (now - inMemoryLoadTime < CACHE_LIFETIME_MS)) {
    return inMemoryTickers;
  }
  
  // 2. Try file cache in temp directory
  try {
    const tempPath = getTempFilePath();
    if (fs.existsSync(tempPath)) {
      const data = JSON.parse(fs.readFileSync(tempPath, 'utf-8'));
      if (data.loadTime && data.list && (now - data.loadTime < CACHE_LIFETIME_MS)) {
        inMemoryTickers = data.list;
        inMemoryLoadTime = data.loadTime;
        console.log(`Loaded company_tickers.json from file cache: ${tempPath}`);
        return inMemoryTickers!;
      }
    }
  } catch (err) {
    console.warn('Failed to read company_tickers.json from temp file cache', err);
  }
  
  // 3. Fetch fresh from SEC EDGAR
  try {
    return await fetchAndCacheTickers();
  } catch (err) {
    const tempPath = getTempFilePath();
    if (fs.existsSync(tempPath)) {
      console.warn('SEC EDGAR fetch failed, falling back to expired cache');
      const data = JSON.parse(fs.readFileSync(tempPath, 'utf-8'));
      return data.list;
    }
    throw err;
  }
}

export async function searchCompany(queryStr: string): Promise<CompanyInfo[]> {
  const list = await getCompanyTickers();
  if (!queryStr) return list.slice(0, 10);
  
  // 1. Local fuzzy search with scores included
  const fuse = new Fuse(list, {
    keys: ['ticker', 'name'],
    threshold: 0.4,
    distance: 100,
    ignoreLocation: true,
    includeScore: true
  });
  
  const searchResults = fuse.search(queryStr);
  
  // Filter for high-confidence matches:
  // - Exact ticker match
  // - Name starts with the query
  // - High-confidence fuzzy score (< 0.25)
  let results = searchResults
    .filter(r => {
      const isExactTicker = r.item.ticker.toUpperCase() === queryStr.toUpperCase();
      const startsWithName = r.item.name.toLowerCase().startsWith(queryStr.toLowerCase());
      const isGoodFuzzy = r.score !== undefined && r.score < 0.22;
      return isExactTicker || startsWithName || isGoodFuzzy;
    })
    .map(r => r.item);
  
  // 2. Online search fallback when local search fails to locate a high-confidence match
  if (results.length < 3) {
    console.log(`Fuzzy matching returned few high-confidence results (${results.length}). Executing online fallback search for: ${queryStr}`);
    
    // 2a. First, try Yahoo Finance Autocomplete Search (very fast, no keys required, resolves international tickers)
    try {
      const quoteUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(queryStr)}&quotesCount=5&newsCount=0`;
      const quoteResponse = await fetch(quoteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (quoteResponse.ok) {
        const body = await quoteResponse.json();
        const quotes = body.quotes || [];
        quotes.forEach((q: any) => {
          if (q.symbol && (q.shortname || q.longname)) {
            const isUSPublic = q.exchange === 'NMS' || q.exchange === 'NYQ' || q.exchange === 'ASE';
            let resolvedCik = `PV_${q.symbol.replace(/[^A-Za-z0-9]/g, '')}`;
            
            const newCompany: CompanyInfo = {
              cik: resolvedCik,
              ticker: q.symbol,
              name: q.longname || q.shortname,
              country: isUSPublic ? 'United States' : 'International'
            };
            
            if (!results.some(r => r.ticker.toUpperCase() === newCompany.ticker.toUpperCase())) {
              results.push(newCompany);
            }
          }
        });
      }
    } catch (err) {
      console.warn("Yahoo Finance Autocomplete Search fallback failed:", err);
    }
    
    // 2b. Secondary fallback to Tavily Web Search if we still lack results
    if (results.length < 3) {
      try {
        const searchRes = await searchWeb(`${queryStr} company stock ticker local exchange symbol CIK country EDGAR`, { maxResults: 3 });
        if (searchRes.results && searchRes.results.length > 0) {
          const searchContent = searchRes.results.map(r => r.content).join("\n\n");
          
          const systemInstruction = `You are a corporate data extractor. Extract the company CIK (numeric), stock ticker, full company name, and country of origin.
If the company is public and has a US SEC CIK, extract it.
If the company is public but listed on a foreign exchange (e.g. NSE India, Euronext Paris, etc.), extract their local ticker symbol (e.g. "TCS.NS" or "NSE:TCS", "CAP.PA" or "EPA:CAP") and create a unique CIK string starting with "PV_" (e.g. "PV_TATA").
ONLY set ticker to "PRIVATE" if the company is a truly private company with no public stock ticker.
Output a valid JSON object matching this structure:
{
  "name": "Full Company Name",
  "ticker": "TICKER",
  "cik": "CIK_OR_PV_ID",
  "country": "Country Name"
}
Format output as raw JSON only. Do not wrap in markdown code blocks.`;

          const llmRes = await callLLM("fast", systemInstruction, `Web Search Text:\n${searchContent}\n\nTarget Query: ${queryStr}`, {
            temperature: 0.0,
            jsonMode: true
          });

          const parsed = JSON.parse(llmRes.text.trim());
          if (parsed.name && parsed.cik) {
            const newCompany: CompanyInfo = {
              cik: String(parsed.cik),
              ticker: parsed.ticker || 'N/A',
              name: parsed.name,
              country: parsed.country || 'United States'
            };
            
            if (!results.some(r => r.ticker.toUpperCase() === newCompany.ticker.toUpperCase())) {
              results = [newCompany, ...results];
            }
          }
        }
      } catch (err) {
        console.warn("Online search fallback inside searchCompany failed:", err);
      }
    }
  }
  
  return results.slice(0, 10);
}

export interface FinancialMetrics {
  price: number | null;
  marketCap: number | null;
  peRatio: number | null;
  eps: number | null;
  beta: number | null;
  fiftyTwoWeekRange: string | null;
  currency: string | null;
}

export interface HistoricalDataPoint {
  date: string;
  close: number;
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
  metrics?: FinancialMetrics | null;
  chartData?: HistoricalDataPoint[] | null;
}

export async function fetchYahooFinanceMetrics(ticker: string): Promise<FinancialMetrics | null> {
  let yfTicker = ticker.toUpperCase();
  
  if (ticker.startsWith('PV_') || ticker === 'PRIVATE') {
    console.warn(`[Yahoo Finance Metrics] Ticker ${ticker} is marked private. Returning null.`);
    return null;
  }

  if (yfTicker.includes(':')) {
    const [exchange, symbol] = yfTicker.split(':');
    if (exchange === 'EPA' || exchange === 'PAR') yfTicker = `${symbol}.PA`;
    else if (exchange === 'LON') yfTicker = `${symbol}.L`;
    else if (exchange === 'TYO') yfTicker = `${symbol}.T`;
    else if (exchange === 'HKG') yfTicker = `${symbol}.HK`;
    else if (exchange === 'NSE') yfTicker = `${symbol}.NS`;
    else yfTicker = symbol;
  }
  
  const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yfTicker}`;
  try {
    const response = await fetch(quoteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    const quote = data.quoteResponse?.result?.[0];
    if (!quote) throw new Error("No quote results in response");
    
    return {
      price: quote.regularMarketPrice || null,
      marketCap: quote.marketCap || null,
      peRatio: quote.trailingPE || quote.forwardPE || null,
      eps: quote.trailingEps || null,
      beta: quote.beta || null,
      fiftyTwoWeekRange: quote.fiftyTwoWeekRange || null,
      currency: quote.currency || null
    };
  } catch (e: any) {
    console.warn(`[Yahoo Finance Metrics Fail] Endpoint ${quoteUrl} failed: ${e.message}. Executing chart fallback.`);
    
    // Attempt fallback to the chart endpoint to extract price & basic details
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yfTicker}?range=1d&interval=1m`;
    try {
      const chartResponse = await fetch(chartUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (chartResponse.ok) {
        const chartData = await chartResponse.json();
        const meta = chartData.chart?.result?.[0]?.meta;
        if (meta) {
          console.log(`[Yahoo Finance Chart Fallback Success] Retrieved price ${meta.regularMarketPrice} for ${yfTicker}`);
          const fiftyTwoWeekRange = (meta.fiftyTwoWeekLow !== undefined && meta.fiftyTwoWeekHigh !== undefined)
            ? `${meta.fiftyTwoWeekLow} - ${meta.fiftyTwoWeekHigh}`
            : null;
          return {
            price: meta.regularMarketPrice || null,
            marketCap: null,
            peRatio: null,
            eps: null,
            beta: null,
            fiftyTwoWeekRange,
            currency: meta.currency || 'USD'
          };
        }
      }
    } catch (fallbackError: any) {
      console.warn(`[Yahoo Finance Chart Fallback Fail] Endpoint ${chartUrl} failed: ${fallbackError.message}`);
    }
    
    return null;
  }
}

export async function fetchAlphaVantageChart(ticker: string, apiKey: string): Promise<HistoricalDataPoint[] | null> {
  let avTicker = ticker.toUpperCase();
  if (avTicker.includes(':')) {
    avTicker = avTicker.split(':')[1] || avTicker;
  }
  
  try {
    const response = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=${avTicker}&apikey=${apiKey}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    const timeSeries = data["Monthly Time Series"];
    if (!timeSeries) return null;
    
    const dates = Object.keys(timeSeries).sort().slice(-12);
    const chartPoints: HistoricalDataPoint[] = [];
    
    for (const dateStr of dates) {
      const monthData = timeSeries[dateStr];
      const closePrice = Number(monthData["4. close"]);
      if (!isNaN(closePrice)) {
        const d = new Date(dateStr);
        const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        chartPoints.push({
          date: dateFormatted,
          close: Number(closePrice.toFixed(2))
        });
      }
    }
    return chartPoints.length > 0 ? chartPoints : null;
  } catch (e) {
    console.warn(`Alpha Vantage charting query failed for ${avTicker}:`, e);
    return null;
  }
}

export async function fetchYahooFinanceChart(ticker: string): Promise<HistoricalDataPoint[] | null> {
  let yfTicker = ticker.toUpperCase();
  
  if (ticker.startsWith('PV_') || ticker === 'PRIVATE') {
    return null; // Private/non-listed companies have no stock price history
  }

  if (yfTicker.includes(':')) {
    const [exchange, symbol] = yfTicker.split(':');
    if (exchange === 'EPA' || exchange === 'PAR') yfTicker = `${symbol}.PA`;
    else if (exchange === 'LON') yfTicker = `${symbol}.L`;
    else if (exchange === 'TYO') yfTicker = `${symbol}.T`;
    else if (exchange === 'HKG') yfTicker = `${symbol}.HK`;
    else if (exchange === 'NSE') yfTicker = `${symbol}.NS`;
    else yfTicker = symbol;
  }
  
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yfTicker}?range=1y&interval=1mo`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!response.ok) throw new Error("Yahoo chart query failed");
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) throw new Error("No chart result found");
    
    const timestamps = result.timestamp || [];
    const indicators = result.indicators?.quote?.[0]?.close || [];
    
    const chartPoints: HistoricalDataPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (timestamps[i] && indicators[i] !== undefined && indicators[i] !== null) {
        const date = new Date(timestamps[i] * 1000).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        chartPoints.push({
          date,
          close: Number(indicators[i].toFixed(2))
        });
      }
    }
    return chartPoints;
  } catch (e) {
    console.warn(`Failed to fetch Yahoo Finance chart for ${yfTicker}. Trying Alpha Vantage fallback...`, e);
    
    const avApiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (avApiKey && avApiKey.trim()) {
      const avChart = await fetchAlphaVantageChart(ticker, avApiKey);
      if (avChart && avChart.length > 0) {
        return avChart;
      }
    }
    
    console.warn(`All public feeds failed for ${ticker}. No stock chart will be drawn.`);
    return null;
  }
}

async function fetchYahooAssetProfile(ticker: string) {
  let yfTicker = ticker.toUpperCase();
  if (yfTicker.includes(':')) {
    const [exchange, symbol] = yfTicker.split(':');
    if (exchange === 'EPA' || exchange === 'PAR') yfTicker = `${symbol}.PA`;
    else if (exchange === 'LON') yfTicker = `${symbol}.L`;
    else if (exchange === 'TYO') yfTicker = `${symbol}.T`;
    else if (exchange === 'HKG') yfTicker = `${symbol}.HK`;
    else if (exchange === 'NSE') yfTicker = `${symbol}.NS`;
    else yfTicker = symbol;
  }
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${yfTicker}?modules=assetProfile`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (res.ok) {
      const data = await res.json();
      return data.quoteSummary?.result?.[0]?.assetProfile || null;
    }
  } catch (err) {
    console.warn("Failed to fetch Yahoo assetProfile for", ticker, err);
  }
  return null;
}

export async function fetchCompanyProfile(cik: string, ticker: string): Promise<CompanyProfile> {
  // Graceful fallback for private/non-SEC companies
  if (!/^\d+$/.test(cik)) {
    let resolvedName = ticker;
    try {
      const quoteUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=1&newsCount=0`;
      const quoteResponse = await fetch(quoteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (quoteResponse.ok) {
        const body = await quoteResponse.json();
        const quote = body.quotes?.[0];
        if (quote && (quote.longname || quote.shortname)) {
          resolvedName = quote.longname || quote.shortname;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch name for fallback profile:", e);
    }

    const assetProfile = await fetchYahooAssetProfile(ticker);
    const metrics = await fetchYahooFinanceMetrics(ticker);
    const chartData = await fetchYahooFinanceChart(ticker);
    return {
      cik,
      name: ticker === 'PRIVATE' ? 'Private Entity' : resolvedName,
      ticker: ticker || 'PRIVATE',
      exchange: 'PRIVATE',
      sic: '0000',
      sicDescription: assetProfile?.industry || 'Private Company Operations',
      sector: assetProfile?.sector || 'Private Market Operations',
      marketCap: 'N/A',
      fiscalYearEnd: '12-31',
      description: assetProfile?.longBusinessSummary || 'This is a private company stress-test profile. Research will compile facts using web search queries.',
      country: 'Unknown',
      metrics,
      chartData
    };
  }

  const userAgent = process.env.SEC_EDGAR_USER_AGENT || 'InvestmentStressTestEngine/1.0 info@example.com';
  const paddedCik = cik.padStart(10, '0');
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;
  
  let data: any;
  let tickerFromSec = ticker;
  let exchangeFromSec = 'Unknown';
  let country = 'United States';

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept-Encoding': 'gzip, deflate',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch company profile from SEC for CIK ${paddedCik}: ${response.statusText} (${response.status})`);
    }
    
    data = await response.json();
    tickerFromSec = data.tickers?.[0] || ticker;
    exchangeFromSec = data.exchanges?.[0] || 'Unknown';
    
    // Extract and audit country of origin
    const secStateOrCountry = data.stateOrCountry || data.addresses?.business?.stateOrCountry || '';
    const secStateOrCountryDesc = data.stateOrCountryDescription || data.addresses?.business?.stateOrCountryDescription || '';
    
    const usStateCodes = [
      'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
      'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
      'SD','TN','TX','UT','VT','VA','WA','WI','WY','DC'
    ];
    
    if (usStateCodes.includes(secStateOrCountry.toUpperCase())) {
      country = 'United States';
    } else if (secStateOrCountryDesc) {
      country = secStateOrCountryDesc;
    } else if (secStateOrCountry) {
      country = secStateOrCountry;
    }
  } catch (error: any) {
    console.warn(`SEC EDGAR profile fetch failed for ${ticker} (${paddedCik}). Falling back to Yahoo Finance + Web resolver:`, error);
    
    let resolvedName = ticker;
    try {
      const quoteUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=1&newsCount=0`;
      const quoteResponse = await fetch(quoteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (quoteResponse.ok) {
        const body = await quoteResponse.json();
        const quote = body.quotes?.[0];
        if (quote && (quote.longname || quote.shortname)) {
          resolvedName = quote.longname || quote.shortname;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch fallback name:", e);
    }

    const assetProfile = await fetchYahooAssetProfile(ticker);
    const metrics = await fetchYahooFinanceMetrics(ticker);
    const chartData = await fetchYahooFinanceChart(ticker);
    return {
      cik: paddedCik,
      name: resolvedName,
      ticker,
      exchange: 'Unknown',
      sic: '0000',
      sicDescription: assetProfile?.industry || 'SEC EDGAR Fallback Operations',
      sector: assetProfile?.sector || 'General Sector Operations',
      fiscalYearEnd: '12-31',
      description: assetProfile?.longBusinessSummary || `SEC EDGAR profile download failed: ${error.message}. Running in web-only fallback mode.`,
      country: 'Unknown',
      metrics,
      chartData
    };
  }

  const metrics = await fetchYahooFinanceMetrics(tickerFromSec);
  const chartData = await fetchYahooFinanceChart(tickerFromSec);

  return {
    cik: paddedCik,
    name: data.name,
    ticker: tickerFromSec,
    exchange: exchangeFromSec,
    sic: String(data.sic || ''),
    sicDescription: data.sicDescription || '',
    sector: data.sicDescription || 'Unknown Sector',
    fiscalYearEnd: data.fiscalYearEnd || 'Unknown',
    description: data.description || '',
    country,
    metrics,
    chartData
  };
}

export async function fetchLatestFilingText(cik: string, form: '10-K' | '10-Q'): Promise<{ content: string; url: string }> {
  // Graceful fallback for non-SEC registered companies
  if (!/^\d+$/.test(cik)) {
    return {
      content: `Non-SEC registered company profile. SEC Form ${form} is not available. Research will audit facts using web search queries.`,
      url: ''
    };
  }

  const userAgent = process.env.SEC_EDGAR_USER_AGENT || 'InvestmentStressTestEngine/1.0 info@example.com';
  const paddedCik = cik.padStart(10, '0');
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': userAgent,
      'Accept-Encoding': 'gzip, deflate',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch filings metadata from SEC for CIK ${paddedCik}: ${response.statusText}`);
  }
  
  const data = await response.json();
  const filings = data.filings?.recent;
  if (!filings || !filings.form) {
    throw new Error(`No recent filings found for CIK ${paddedCik}`);
  }
  
  const idx = filings.form.findIndex((f: string) => f === form);
  if (idx === -1) {
    throw new Error(`Could not find a Form ${form} for CIK ${paddedCik}`);
  }
  
  const accessionNumber = filings.accessionNumber[idx];
  const primaryDocument = filings.primaryDocument[idx];
  const accessionNoDashes = accessionNumber.replace(/-/g, '');
  
  const filingUrl = `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${accessionNoDashes}/${primaryDocument}`;
  
  const filingResponse = await fetch(filingUrl, {
    headers: {
      'User-Agent': userAgent,
      'Accept-Encoding': 'gzip, deflate',
    },
  });
  
  if (!filingResponse.ok) {
    throw new Error(`Failed to fetch filing document from ${filingUrl}: ${filingResponse.statusText}`);
  }
  
  const fullHtml = await filingResponse.text();
  
  let cleanedText = fullHtml
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  if (cleanedText.length > 80000) {
    cleanedText = cleanedText.substring(0, 80000) + '... [TRUNCATED]';
  }
  
  return {
    content: cleanedText,
    url: filingUrl,
  };
}

export interface FinancialMetrics {
  price: number | null;
  marketCap: number | null;
  peRatio: number | null;
  eps: number | null;
  beta: number | null;
  fiftyTwoWeekRange: string | null;
  currency: string | null;
}

export function translateYahooTimeseriesToSECFacts(timeseriesResult: any[], keyStats: any): any {
  const factsObj: any = { facts: { "us-gaap": {}, "dei": {} } };
  
  function addFact(conceptName: string, val: number, endDateStr: string, isDei = false) {
    const space = isDei ? "dei" : "us-gaap";
    if (!factsObj.facts[space][conceptName]) {
      factsObj.facts[space][conceptName] = { units: { USD: [], shares: [] } };
    }
    const unitKey = (conceptName.toLowerCase().includes("shares") || conceptName.toLowerCase().includes("outstanding")) ? "shares" : "USD";
    
    const existing = factsObj.facts[space][conceptName].units[unitKey].find((u: any) => u.end === endDateStr);
    if (!existing) {
      factsObj.facts[space][conceptName].units[unitKey].push({
        val,
        end: endDateStr,
        form: "10-K",
        fy: new Date(endDateStr).getFullYear(),
        fp: "FY"
      });
    }
  }

  timeseriesResult.forEach((series: any) => {
    const metricType = series.meta?.type?.[0];
    if (!metricType) return;
    
    const datapoints = series[metricType] || [];
    datapoints.forEach((dp: any) => {
      const date = dp.asOfDate;
      const val = dp.reportedValue?.raw;
      if (!date || typeof val !== 'number') return;
      
      switch(metricType) {
        case 'annualTotalAssets':
          addFact("Assets", val, date);
          break;
        case 'annualCurrentAssets':
          addFact("AssetsCurrent", val, date);
          break;
        case 'annualTotalLiabilitiesNetMinorityInterest':
          addFact("Liabilities", val, date);
          break;
        case 'annualCurrentLiabilities':
          addFact("LiabilitiesCurrent", val, date);
          break;
        case 'annualRetainedEarnings':
          addFact("RetainedEarnings", val, date);
          break;
        case 'annualLongTermDebt':
          addFact("LongTermDebt", val, date);
          break;
        case 'annualNetPPE':
          addFact("PropertyPlantAndEquipment", val, date);
          break;
        case 'annualTotalRevenue':
          addFact("Revenues", val, date);
          break;
        case 'annualNetIncome':
          addFact("NetIncomeLoss", val, date);
          break;
        case 'annualOperatingCashFlow':
          addFact("NetCashProvidedByUsedInOperatingActivities", val, date);
          break;
        case 'annualDepreciationAndAmortization':
          addFact("Depreciation", val, date);
          break;
        case 'annualOperatingIncome':
        case 'annualEbit':
        case 'annualEBIT':
          addFact("OperatingIncome", val, date);
          break;
        case 'annualAccountsReceivable':
          addFact("AccountsReceivableNet", val, date);
          break;
        case 'annualCostOfRevenue':
          addFact("CostOfRevenue", val, date);
          break;
      }
    });
  });

  const now = new Date();
  const currentDateStr = now.toISOString().split('T')[0];
  
  const shares = keyStats.sharesOutstanding?.raw;
  if (typeof shares === 'number') {
    addFact("CommonStockSharesOutstanding", shares, currentDateStr);
    addFact("EntityCommonStockSharesOutstanding", shares, currentDateStr);
  }
  
  const eps = keyStats.trailingEps?.raw;
  if (typeof eps === 'number') {
    addFact("EarningsPerShareDiluted", eps, currentDateStr);
    addFact("EarningsPerShareBasic", eps, currentDateStr);
  }
  
  return factsObj;
}

let cachedYahooCookie = '';
let cachedYahooCrumb = '';
let cachedYahooTime = 0;

async function getYahooSession(): Promise<{ cookie: string; crumb: string }> {
  const now = Date.now();
  if (cachedYahooCookie && cachedYahooCrumb && (now - cachedYahooTime < 10 * 60 * 1000)) {
    return { cookie: cachedYahooCookie, crumb: cachedYahooCrumb };
  }
  
  try {
    const fcRes = await fetch("https://fc.yahoo.com", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const cookies = fcRes.headers.getSetCookie?.() || [];
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
    
    const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: {
        "Cookie": cookieHeader,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    
    if (crumbRes.ok) {
      const crumb = (await crumbRes.text()).trim();
      if (crumb) {
        cachedYahooCookie = cookieHeader;
        cachedYahooCrumb = crumb;
        cachedYahooTime = now;
        return { cookie: cookieHeader, crumb };
      }
    }
  } catch (err) {
    console.warn("Failed to retrieve Yahoo Finance session cookie/crumb:", err);
  }
  
  return { cookie: '', crumb: '' };
}

export async function fetchSECCompanyFacts(cik: string, ticker?: string | null): Promise<any | null> {
  const userAgent = process.env.SEC_EDGAR_USER_AGENT || 'InvestmentStressTestEngine/1.0 info@example.com';
  
  let targetCik = cik;
  // Resolve actual CIK if the lookup ticker is in our SEC list
  let lookupTicker = ticker || (cik && !/^\d+$/.test(cik) ? cik.replace(/^PV_/, '') : '');
  if (lookupTicker && !/^\d+$/.test(targetCik)) {
    try {
      const list = await getCompanyTickers();
      const match = list.find(c => c.ticker.toUpperCase() === lookupTicker.toUpperCase());
      if (match) {
        targetCik = match.cik;
        console.log(`[SEC CIK Resolver] Resolved ${lookupTicker} to SEC CIK: ${targetCik}`);
      }
    } catch (e) {
      console.warn("Failed to check ticker mapping in getCompanyTickers:", e);
    }
  }

  // 1. Try standard SEC EDGAR facts if CIK is numeric
  if (/^\d+$/.test(targetCik)) {
    const paddedCik = targetCik.padStart(10, '0');
    const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik}.json`;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept-Encoding': 'gzip, deflate',
        },
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error: any) {
      console.warn(`[SEC EDGAR Company Facts Fail] CIK ${paddedCik} failed: ${error.message}. Checking Yahoo Finance fallback.`);
    }
  }

  lookupTicker = ticker || (cik && !/^\d+$/.test(cik) ? cik.replace(/^PV_/, '') : '');
  if (!lookupTicker) return null;

  let yfTicker = lookupTicker.toUpperCase();
  if (yfTicker.includes(':')) {
    const [exchange, symbol] = yfTicker.split(':');
    if (exchange === 'EPA' || exchange === 'PAR') yfTicker = `${symbol}.PA`;
    else if (exchange === 'LON') yfTicker = `${symbol}.L`;
    else if (exchange === 'TYO') yfTicker = `${symbol}.T`;
    else if (exchange === 'HKG') yfTicker = `${symbol}.HK`;
    else if (exchange === 'NSE') yfTicker = `${symbol}.NS`;
    else yfTicker = symbol;
  }

  const session = await getYahooSession();
  
  const quoteSummaryUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${yfTicker}?modules=defaultKeyStatistics${session.crumb ? `&crumb=${encodeURIComponent(session.crumb)}` : ''}`;
  const types = [
    "annualTotalAssets",
    "annualCurrentAssets",
    "annualTotalLiabilitiesNetMinorityInterest",
    "annualCurrentLiabilities",
    "annualRetainedEarnings",
    "annualLongTermDebt",
    "annualNetPPE",
    "annualTotalRevenue",
    "annualNetIncome",
    "annualOperatingCashFlow",
    "annualDepreciationAndAmortization",
    "annualOperatingIncome",
    "annualEBIT",
    "annualAccountsReceivable",
    "annualCostOfRevenue"
  ];
  const timeseriesUrl = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${yfTicker}?symbol=${yfTicker}&type=${types.join(",")}&period1=1483228800&period2=2524608000${session.crumb ? `&crumb=${encodeURIComponent(session.crumb)}` : ''}`;
  
  try {
    console.log(`[Yahoo Finance Facts Fallback] Fetching dual-channel data for ticker: ${yfTicker}`);
    const headers: any = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    if (session.cookie) {
      headers['Cookie'] = session.cookie;
    }
    
    // Fetch both endpoints in parallel
    const [quoteRes, timeRes] = await Promise.all([
      fetch(quoteSummaryUrl, { headers }),
      fetch(timeseriesUrl, { headers })
    ]);
    
    if (!quoteRes.ok) throw new Error(`QuoteSummary HTTP Error: ${quoteRes.status}`);
    if (!timeRes.ok) throw new Error(`Timeseries HTTP Error: ${timeRes.status}`);
    
    const quoteData = await quoteRes.json();
    const timeData = await timeRes.json();
    
    const keyStats = quoteData?.quoteSummary?.result?.[0]?.defaultKeyStatistics || {};
    const timeseriesResult = timeData?.timeseries?.result || [];
    
    const mapped = translateYahooTimeseriesToSECFacts(timeseriesResult, keyStats);
    if (mapped) {
      console.log(`[Yahoo Finance Facts Fallback] Successfully mapped timeseries financial concepts for ${yfTicker}`);
      return mapped;
    }
  } catch (error: any) {
    console.warn(`[Yahoo Finance Facts Fallback Fail] Ticker ${yfTicker} failed: ${error.message}`);
  }

  return null;
}

export function getSECConceptValue(facts: any, conceptName: string, recentOffset = 0): { val: number; end: string; conceptName: string } | null {
  if (!facts || !facts.facts) return null;
  const concept = facts.facts["us-gaap"]?.[conceptName] || facts.facts["dei"]?.[conceptName];
  if (!concept || !concept.units) return null;
  
  let units = concept.units.USD;
  if (!units || units.length === 0) {
    units = concept.units.shares;
  }
  if (!units || units.length === 0) {
    units = concept.units["USD/shares"];
  }
  if (!units || units.length === 0) {
    const firstKey = Object.keys(concept.units)[0];
    if (firstKey) {
      units = concept.units[firstKey];
    }
  }
  
  if (!units || units.length === 0) return null;
  
  const sorted = [...units]
    .filter(u => u.form === "10-K" || u.form === "10-Q")
    .sort((a, b) => new Date(b.end || b.filed).getTime() - new Date(a.end || a.filed).getTime());
    
  if (sorted.length <= recentOffset) return null;
  const match = sorted[recentOffset];
  return { val: match.val, end: match.end, conceptName };
}

export function getSECConceptPriorValue(facts: any, conceptName: string, currentDateStr: string): number | null {
  if (!facts || !facts.facts) return null;
  const concept = facts.facts["us-gaap"]?.[conceptName] || facts.facts["dei"]?.[conceptName];
  if (!concept || !concept.units) return null;
  
  let units = concept.units.USD;
  if (!units || units.length === 0) {
    units = concept.units.shares;
  }
  if (!units || units.length === 0) {
    units = concept.units["USD/shares"];
  }
  if (!units || units.length === 0) {
    const firstKey = Object.keys(concept.units)[0];
    if (firstKey) {
      units = concept.units[firstKey];
    }
  }
  
  if (!units || units.length === 0) return null;
  
  const currentDate = new Date(currentDateStr);
  let bestVal: number | null = null;
  let minDiff = Infinity;
  
  for (const item of units) {
    if (!item.end || (item.form !== "10-K" && item.form !== "10-Q")) continue;
    const itemDate = new Date(item.end);
    const diffDays = Math.abs((currentDate.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const targetDiff = Math.abs(diffDays - 365);
    if (targetDiff < 45 && targetDiff < minDiff) {
      minDiff = targetDiff;
      bestVal = item.val;
    }
  }
  return bestVal;
}

export function getSECConceptValueWithFallbacks(facts: any, conceptNames: string[], recentOffset = 0): { val: number; end: string; conceptName: string } | null {
  let bestRes: { val: number; end: string; conceptName: string } | null = null;
  let bestDate = 0;
  
  for (const name of conceptNames) {
    const res = getSECConceptValue(facts, name, recentOffset);
    if (res !== null) {
      const dateMs = new Date(res.end).getTime();
      if (dateMs > bestDate) {
        bestDate = dateMs;
        bestRes = res;
      }
    }
  }
  return bestRes;
}

export function getSECConceptPriorValueWithFallbacks(facts: any, conceptNames: string[], currentDateStr: string): number | null {
  for (const name of conceptNames) {
    const res = getSECConceptPriorValue(facts, name, currentDateStr);
    if (res !== null) return res;
  }
  return null;
}

export interface MappedInsiderTransaction {
  filerName: string;
  role: string;
  transactionDate: string;
  action: 'buy' | 'sell';
  shares: number;
  price: number;
  value: number;
}

export async function fetchInsiderTransactions(cik: string, ticker: string): Promise<{ transactions: MappedInsiderTransaction[]; coverage: string }> {
  const userAgent = process.env.SEC_EDGAR_USER_AGENT || 'InvestmentStressTestEngine/1.0 info@example.com';
  const paddedCik = cik.padStart(10, '0');
  const metadataUrl = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;
  
  const resultList: MappedInsiderTransaction[] = [];
  
  try {
    const response = await fetch(metadataUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept-Encoding': 'gzip, deflate',
      },
    });
    if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    const filings = data.filings?.recent;
    if (!filings || !filings.form) throw new Error("No recent filings in submission metadata");
    
    // Find all recent Form 4 filings
    const form4Indices: number[] = [];
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    for (let i = 0; i < filings.form.length; i++) {
      if (filings.form[i] === "4") {
        const fileDate = new Date(filings.filingDate[i]);
        if (fileDate >= ninetyDaysAgo) {
          form4Indices.push(i);
        }
      }
    }
    
    // Select up to 10 most recent Form 4 filings
    const targetIndices = form4Indices.slice(0, 10);
    let successfullyParsed = 0;
    
    for (const idx of targetIndices) {
      const accessionNumber = filings.accessionNumber[idx];
      const primaryDocument = filings.primaryDocument[idx];
      const accessionNoDashes = accessionNumber.replace(/-/g, '');
      const xmlUrl = `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${accessionNoDashes}/${primaryDocument}`;
      
      try {
        const xmlResponse = await fetch(xmlUrl, {
          headers: {
            'User-Agent': userAgent,
            'Accept-Encoding': 'gzip, deflate',
          },
        });
        if (!xmlResponse.ok) throw new Error(`HTTP ${xmlResponse.status} ${xmlResponse.statusText}`);
        const xmlText = await xmlResponse.text();
        
        // Match filer name
        const filerMatch = xmlText.match(/<rptOwnerName>\s*(?:<value>)?([^<]+?)(?:<\/value>)?\s*<\/rptOwnerName>/i);
        const filerName = filerMatch ? filerMatch[1].trim() : "Unknown Filer";
        
        // Match filer role
        const officerMatch = xmlText.match(/<officerTitle>\s*(?:<value>)?([^<]+?)(?:<\/value>)?\s*<\/officerTitle>/i);
        const isDirectorMatch = xmlText.match(/<isDirector>\s*(?:<value>)?([^<]+?)(?:<\/value>)?\s*<\/isDirector>/i);
        const isOfficerMatch = xmlText.match(/<isOfficer>\s*(?:<value>)?([^<]+?)(?:<\/value>)?\s*<\/isOfficer>/i);
        
        let role = "Insider";
        if (officerMatch) {
          role = officerMatch[1].trim();
        } else if (isDirectorMatch && (isDirectorMatch[1].trim() === "true" || isDirectorMatch[1].trim() === "1")) {
          role = "Director";
        } else if (isOfficerMatch && (isOfficerMatch[1].trim() === "true" || isOfficerMatch[1].trim() === "1")) {
          role = "Officer";
        }
        
        // Find non-derivative transactions
        const txBlocks = xmlText.match(/<nonDerivativeTransaction>[\s\S]*?<\/nonDerivativeTransaction>/gi) || [];
        
        for (const block of txBlocks) {
          const dateMatch = block.match(/<transactionDate>\s*<value>([^<]+)<\/value>/i);
          const codeMatch = block.match(/<transactionAcquiredDisposedCode>\s*<value>([^<]+)<\/value>/i);
          const sharesMatch = block.match(/<transactionShares>\s*<value>([^<]+)<\/value>/i);
          const priceMatch = block.match(/<transactionPricePerShare>\s*<value>([^<]+)<\/value>/i);
          
          if (dateMatch && codeMatch && sharesMatch) {
            const actionCode = codeMatch[1].trim().toUpperCase();
            const action: 'buy' | 'sell' = actionCode === "A" ? 'buy' : 'sell';
            const shares = Number(sharesMatch[1].trim());
            const price = priceMatch ? Number(priceMatch[1].trim()) : 0;
            const value = shares * price;
            
            resultList.push({
              filerName,
              role,
              transactionDate: dateMatch[1].trim(),
              action,
              shares,
              price,
              value
            });
          }
        }
        successfullyParsed++;
      } catch (parseError: any) {
        console.warn(`[SEC Form 4 Scraper Fail] Accession ${accessionNumber} from ${xmlUrl} failed to parse: ${parseError.message}`);
      }
    }
    
    const totalCount = targetIndices.length;
    const coverage = totalCount > 0 
      ? `${successfullyParsed} of ${totalCount} filings parsed successfully in the trailing 90 days`
      : "0 of 0 filings available in the trailing 90 days";
      
    return { transactions: resultList.slice(0, 10), coverage };
  } catch (err: any) {
    console.warn(`[SEC Form 4 Scraper Fail] Overall submissions load failed: ${err.message}`);
    return { transactions: [], coverage: "0 of 0 filings available (Metadata error)" };
  }
}

export async function fetchDailyHistoricalPrices(ticker: string): Promise<number[] | null> {
  let yfTicker = ticker.toUpperCase();
  if (yfTicker.includes(':')) {
    const [exchange, symbol] = yfTicker.split(':');
    if (exchange === 'EPA' || exchange === 'PAR') yfTicker = `${symbol}.PA`;
    else if (exchange === 'LON') yfTicker = `${symbol}.L`;
    else if (exchange === 'TYO') yfTicker = `${symbol}.T`;
    else if (exchange === 'HKG') yfTicker = `${symbol}.HK`;
    else if (exchange === 'NSE') yfTicker = `${symbol}.NS`;
    else yfTicker = symbol;
  }

  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yfTicker}?range=1y&interval=1d`;
  try {
    const response = await fetch(chartUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) throw new Error("No chart results");
    const closes = result.indicators?.quote?.[0]?.close || [];
    const cleanedCloses = closes.filter((c: any) => c !== null && c !== undefined) as number[];
    return cleanedCloses;
  } catch (error: any) {
    console.warn(`[Daily Stock Feed Fail] Endpoint ${chartUrl} failed: ${error.message}`);
    return null;
  }
}
