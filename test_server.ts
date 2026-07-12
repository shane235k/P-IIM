import express from 'express';

const app = express();
const PORT = 3001;

// Standalone request test route
app.get('/test-yahoo/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const results: any = {};

  // Method 1: Standard v7 Quote (Native Fetch)
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    results.method1_v7_quote = {
      status: response.status,
      statusText: response.statusText,
      body: await response.text()
    };
  } catch (err: any) {
    results.method1_v7_quote = { error: err.message };
  }

  // Method 2: Standard v8 Chart (Bypasses Crumb Checks)
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1d&interval=1m`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    results.method2_v8_chart = {
      status: response.status,
      statusText: response.statusText,
      body: (await response.text()).substring(0, 500) + '...' // truncate since it's large
    };
  } catch (err: any) {
    results.method2_v8_chart = { error: err.message };
  }

  // Method 3: Testing without TLS check (in case firewall blocks certs)
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1d&interval=1m`;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'; // revert
    results.method3_v8_chart_no_tls = {
      status: response.status,
      statusText: response.statusText,
      body: (await response.text()).substring(0, 500) + '...'
    };
  } catch (err: any) {
    results.method3_v8_chart_no_tls = { error: err.message };
  }

  res.json(results);
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`Yahoo diagnostic Express server listening on port ${PORT}`);
  console.log(`To test NVDA, query: http://localhost:${PORT}/test-yahoo/NVDA`);
  console.log(`====================================================`);
});
