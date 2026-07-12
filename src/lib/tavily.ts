export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilySearchResponse {
  results: TavilySearchResult[];
}

export async function searchWeb(
  query: string,
  options: { maxResults?: number; searchDepth?: 'basic' | 'advanced'; includeDomains?: string[] } = {}
): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("Tavily API key is missing. Returning empty search results (graceful degradation).");
    
    if (process.env.NODE_ENV === 'development') {
      return {
        results: [
          {
            title: `Mock search result for ${query}`,
            url: `https://mocksearch.example.com/result?q=${encodeURIComponent(query)}`,
            content: `This is a fallback mock search snippet about ${query}. If you configure a real TAVILY_API_KEY in your .env, the engine will query the real web and regulatory filings.`,
            score: 0.99
          }
        ]
      };
    }
    return { results: [] };
  }
  
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: options.searchDepth || 'basic',
        max_results: options.maxResults || 5,
        include_domains: options.includeDomains,
      }),
    });
    clearTimeout(id);
    
    if (!response.ok) {
      const errText = await response.text();
      console.error(`Tavily search API error: ${response.status} ${errText}`);
      return { results: [] };
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Tavily search API request failed:`, error);
    return { results: [] };
  }
}
