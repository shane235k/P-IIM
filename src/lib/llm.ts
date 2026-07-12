import { GoogleGenAI } from '@google/genai';

// Gemini Client initialization is deferred to prevent build-time failures when keys are absent.

const PRICING = {
  gemini: {
    fast: { input: 0.075 / 1_000_000, output: 0.30 / 1_000_000 },
    reasoning: { input: 0.075 / 1_000_000, output: 0.30 / 1_000_000 },
  },
  groq: {
    input: 0.59 / 1_000_000,
    output: 0.79 / 1_000_000,
  }
};

const clientInstances: Record<string, GoogleGenAI> = {};

function getGeminiClient(nodeName?: string): GoogleGenAI {
  const name = (nodeName || '').toLowerCase();
  
  let keyToUse = process.env.GEMINI_API_KEY_PRIMARY || process.env.GEMINI_API_KEY;
  let keySource = 'GEMINI_API_KEY_PRIMARY';

  if (
    name.includes('worker') || 
    name.includes('confirming') || 
    name.includes('adversarial') || 
    name.includes('macro') || 
    name.includes('arbitrat') || 
    name.includes('verifier')
  ) {
    keyToUse = process.env.GEMINI_API_KEY_WORKERS || process.env.GEMINI_API_KEY;
    keySource = 'GEMINI_API_KEY_WORKERS';
  } else if (
    name.includes('severity') || 
    name.includes('devils') || 
    name.includes('advocate') || 
    name.includes('confidence') || 
    name.includes('scenario') || 
    name.includes('tripwire') || 
    name.includes('compiler') ||
    name.includes('memo')
  ) {
    keyToUse = process.env.GEMINI_API_KEY_JUDGE || process.env.GEMINI_API_KEY;
    keySource = 'GEMINI_API_KEY_JUDGE';
  }

  if (!keyToUse) {
    throw new Error(`CRITICAL RUNTIME ERROR: No Gemini API Key resolved for node "${nodeName}" (Tried ${keySource} and fallback GEMINI_API_KEY).`);
  }

  if (!clientInstances[keyToUse]) {
    clientInstances[keyToUse] = new GoogleGenAI({ apiKey: keyToUse });
  }
  return clientInstances[keyToUse];
}

export interface LLMResponse {
  text: string;
  provider: 'gemini' | 'groq';
  model: string;
  tokens: { input: number; output: number };
  costEstimateUsd: number;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callLLM(
  tier: 'fast' | 'reasoning',
  systemInstruction: string,
  prompt: string,
  options: { jsonMode?: boolean; temperature?: number; runId?: string; nodeName?: string; runLog?: any[] } = {}
): Promise<LLMResponse> {
  const runId = options.runId || 'unknown';
  const nodeName = options.nodeName || 'unknown-node';
  const timeoutMs = Number(process.env.REQUEST_TIMEOUT_MS) || 30000;
  
  const geminiFastModel = process.env.GEMINI_FAST_MODEL || 'gemini-2.5-flash-lite';
  const geminiReasoningModel = process.env.GEMINI_REASONING_MODEL || 'gemini-2.5-flash';
  const geminiModel = tier === 'fast' ? geminiFastModel : geminiReasoningModel;
  
  let attempts = 0;
  const maxRetries = 2;
  const startTime = Date.now();
  
  while (attempts <= maxRetries) {
    attempts++;
    const attemptStartTime = Date.now();
    try {
      console.log(`[LLM Call] Attempt ${attempts}/${maxRetries + 1} for ${nodeName} using Gemini (${geminiModel})`);
      
      const client = getGeminiClient(nodeName);
      
      const apiCall = client.models.generateContent({
        model: geminiModel,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || undefined,
          responseMimeType: options.jsonMode ? 'application/json' : undefined,
          temperature: options.temperature ?? 0.2,
        }
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout: Gemini request exceeded ${timeoutMs}ms`)), timeoutMs);
      });
      
      const response = await Promise.race([apiCall, timeoutPromise]);
      const duration = Date.now() - attemptStartTime;
      
      const text = response.text || '';
      const promptTokens = response.usageMetadata?.promptTokenCount || 0;
      const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
      
      const rate = tier === 'fast' ? PRICING.gemini.fast : PRICING.gemini.reasoning;
      const costEstimateUsd = (promptTokens * rate.input) + (outputTokens * rate.output);
      
      const result: LLMResponse = {
        text,
        provider: 'gemini',
        model: geminiModel,
        tokens: { input: promptTokens, output: outputTokens },
        costEstimateUsd,
      };
      
      console.log(`[LLM Call Succeeded] Node: ${nodeName}, Provider: gemini, Model: ${geminiModel}, Duration: ${duration}ms, Tokens: In=${promptTokens} Out=${outputTokens}, Cost: $${costEstimateUsd.toFixed(6)}`);
      
      if (options.runLog) {
        options.runLog.push({
          timestamp: new Date().toISOString(),
          runId,
          nodeName,
          status: "succeeded",
          durationMs: duration,
          llmProvider: "gemini",
          llmModel: geminiModel,
          toolCallsMade: [],
          tokenUsage: { input: promptTokens, output: outputTokens },
          costEstimateUsd,
          errorMessage: null,
          inputSummary: prompt.substring(0, 150) + (prompt.length > 150 ? '...' : ''),
          outputSummary: text.substring(0, 150) + (text.length > 150 ? '...' : '')
        });
      }
      
      return result;
      
    } catch (error: any) {
      const duration = Date.now() - attemptStartTime;
      const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Quota exceeded');
      const isTimeout = error?.message?.includes('Timeout') || error?.message?.includes('timeout');
      
      console.warn(`[LLM Call Failed] Attempt ${attempts} - Node: ${nodeName}, Error: ${error.message || error}`);
      
      if (attempts <= maxRetries) {
        const backoffMs = Math.pow(2, attempts) * 1000;
        console.log(`Sleeping for ${backoffMs}ms before retry...`);
        await sleep(backoffMs);
        continue;
      }
      
      const groqApiKey = process.env.GROQ_API_KEY;
      if (groqApiKey) {
        const groqModel = process.env.GROQ_FALLBACK_MODEL || 'llama-3.3-70b-versatile';
        console.warn(`[LLM Fallback Triggered] Gemini failed. Falling back to Groq (${groqModel}) for Node: ${nodeName}. Reason: ${isRateLimit ? 'Rate Limit (429)' : isTimeout ? 'Timeout' : 'General Error'}`);
        
        try {
          const fallbackStartTime = Date.now();
          const groqPrompt = systemInstruction 
            ? `System Instructions:\n${systemInstruction}\n\nUser Request:\n${prompt}`
            : prompt;
            
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${groqApiKey}`,
            },
            body: JSON.stringify({
              model: groqModel,
              messages: [{ role: 'user', content: groqPrompt }],
              temperature: options.temperature ?? 0.2,
              response_format: options.jsonMode ? { type: 'json_object' } : undefined,
            }),
          });
          
          if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Groq API returned HTTP ${response.status}: ${errBody}`);
          }
          
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content || '';
          const promptTokens = data.usage?.prompt_tokens || 0;
          const outputTokens = data.usage?.completion_tokens || 0;
          
          const costEstimateUsd = (promptTokens * PRICING.groq.input) + (outputTokens * PRICING.groq.output);
          const fallbackDuration = Date.now() - fallbackStartTime;
          
          const result: LLMResponse = {
            text,
            provider: 'groq',
            model: groqModel,
            tokens: { input: promptTokens, output: outputTokens },
            costEstimateUsd,
          };
          
          console.log(`[LLM Fallback Succeeded] Node: ${nodeName}, Provider: groq, Model: ${groqModel}, Duration: ${fallbackDuration}ms, Cost: $${costEstimateUsd.toFixed(6)}`);
          
          if (options.runLog) {
            options.runLog.push({
              timestamp: new Date().toISOString(),
              runId,
              nodeName,
              status: "succeeded",
              durationMs: Date.now() - startTime,
              llmProvider: "groq",
              llmModel: groqModel,
              toolCallsMade: [],
              tokenUsage: { input: promptTokens, output: outputTokens },
              costEstimateUsd,
              errorMessage: `Gemini failed after retries. Fallback to Groq succeeded. Gemini error: ${error.message}`,
              inputSummary: prompt.substring(0, 150) + (prompt.length > 150 ? '...' : ''),
              outputSummary: text.substring(0, 150) + (text.length > 150 ? '...' : '')
            });
          }
          
          return result;
        } catch (groqError: any) {
          console.error(`[LLM Fallback Failed] Node: ${nodeName}, Groq Error: ${groqError.message}`);
          
          if (options.runLog) {
            options.runLog.push({
              timestamp: new Date().toISOString(),
              runId,
              nodeName,
              status: "failed",
              durationMs: Date.now() - startTime,
              llmProvider: "gemini",
              llmModel: geminiModel,
              toolCallsMade: [],
              tokenUsage: null,
              costEstimateUsd: null,
              errorMessage: `Gemini & Groq Fallback failed. Gemini error: ${error.message}. Groq error: ${groqError.message}`,
              inputSummary: prompt.substring(0, 150),
              outputSummary: ''
            });
          }
          throw new Error(`Both primary Gemini and fallback Groq APIs failed. Gemini: ${error.message}. Groq: ${groqError.message}`);
        }
      } else {
        console.warn(`[LLM Fallback Skipped] No Groq key is configured in environment for Node: ${nodeName}`);
        if (options.runLog) {
          options.runLog.push({
            timestamp: new Date().toISOString(),
            runId,
            nodeName,
            status: "failed",
            durationMs: Date.now() - startTime,
            llmProvider: "gemini",
            llmModel: geminiModel,
            toolCallsMade: [],
            tokenUsage: null,
            costEstimateUsd: null,
            errorMessage: `Gemini failed after retries. Fallback skipped (no GROQ_API_KEY). Gemini error: ${error.message}`,
            inputSummary: prompt.substring(0, 150),
            outputSummary: ''
          });
        }
        throw error;
      }
    }
  }
  
  throw new Error(`Unreachable state in callLLM for Node: ${nodeName}`);
}
