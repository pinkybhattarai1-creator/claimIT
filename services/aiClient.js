/**
 * ClaimIT Multi-Provider AI Client
 * Unified, resilient adapter for Groq, OpenRouter, and Google Gemini.
 * Enforces strict timeouts and automatic fail-safe fallback to prevent errors or hangs.
 */

const https = require('https');

const DEFAULT_TIMEOUT_MS = 8000;

function cleanReasoningText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw;
  // 1. Remove closed <think>...</think> blocks
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // 2. If truncated with unclosed <think>, remove starting from <think>
  if (text.includes('<think>')) {
    text = text.replace(/<think>[\s\S]*$/i, '');
  }
  // 3. Remove standalone "Here's a thinking process:" preambles if present
  text = text.replace(/^Here's a thinking process:[\s\S]*?\n\n/i, '');
  return text.trim();
}

/**
 * Call Groq Chat Completions API (Free Tier)
 * Default model: llama-3.3-70b-versatile or llama-3.1-8b-instant
 */
async function callGroq({ prompt, systemPrompt, temperature = 0.2, maxTokens = 1024 }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.startsWith('gsk_your_')) {
    throw new Error('Groq API Key is not configured');
  }

  const model = process.env.GROQ_MODEL || 'qwen/qwen3.6-27b';
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const payload = JSON.stringify({
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: payload,
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
  const text = cleanReasoningText(rawText);
  return {
    provider: 'groq',
    model,
    text,
    usage: data.usage
  };
}

/**
 * Call OpenRouter Chat Completions API (Free Tier)
 * Default model: nvidia/nemotron-3.5-lightning:free
 */
async function callOpenRouter({ prompt, systemPrompt, temperature = 0.2, maxTokens = 1024 }) {
  const apiKey = process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.startsWith('sk-or-v1-your_')) {
    throw new Error('OpenRouter API Key is not configured');
  }

  const model = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3.5-lightning:free';
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const payload = JSON.stringify({
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:8847',
      'X-Title': 'ClaimIT Hospital System',
      'Content-Type': 'application/json'
    },
    body: payload,
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
  const text = cleanReasoningText(rawText);
  return {
    provider: 'openrouter',
    model,
    text,
    usage: data.usage
  };
}

/**
 * Call Google Gemini API (Free Tier)
 * Default model: gemini-1.5-flash
 */
async function callGemini({ prompt, systemPrompt, temperature = 0.2, maxTokens = 1024 }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey.startsWith('your_gemini')) {
    throw new Error('Google Gemini API Key is not configured');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = [];
  if (systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: `[System Instruction]: ${systemPrompt}` }] });
  }
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const payload = JSON.stringify({
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens
    }
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const candidate = data.candidates && data.candidates[0];
  const text = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0] 
    ? candidate.content.parts[0].text 
    : '';

  return {
    provider: 'gemini',
    model,
    text: text.trim(),
    usage: data.usageMetadata
  };
}

/**
 * Unified completion dispatcher with cascading failover:
 * Priority order: Groq -> OpenRouter -> Gemini -> Local Rule Engine
 */
async function completeWithFallback({ prompt, systemPrompt, preferredProvider, temperature = 0.2, maxTokens = 1024 }) {
  const provider = preferredProvider || process.env.AI_PROVIDER || 'groq';

  // 1. Try Preferred Provider
  try {
    if (provider === 'groq' && process.env.GROQ_API_KEY) {
      return await callGroq({ prompt, systemPrompt, temperature, maxTokens });
    } else if (provider === 'openrouter' && (process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY)) {
      return await callOpenRouter({ prompt, systemPrompt, temperature, maxTokens });
    } else if (provider === 'gemini' && (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) {
      return await callGemini({ prompt, systemPrompt, temperature, maxTokens });
    }
  } catch (primaryErr) {
    console.warn(`[AI Client] Primary provider (${provider}) error: ${primaryErr.message}. Attempting failover...`);
  }

  // 2. Cascading Failovers
  const providersToTry = ['groq', 'openrouter', 'gemini'].filter(p => p !== provider);
  for (const fallbackProvider of providersToTry) {
    try {
      if (fallbackProvider === 'groq' && process.env.GROQ_API_KEY) {
        return await callGroq({ prompt, systemPrompt, temperature, maxTokens });
      }
      if (fallbackProvider === 'openrouter' && (process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY)) {
        return await callOpenRouter({ prompt, systemPrompt, temperature, maxTokens });
      }
      if (fallbackProvider === 'gemini' && (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) {
        return await callGemini({ prompt, systemPrompt, temperature, maxTokens });
      }
    } catch (fallbackErr) {
      console.warn(`[AI Client] Failover provider (${fallbackProvider}) error: ${fallbackErr.message}`);
    }
  }

  // 3. Graceful Local Fallback (No network or error)
  return {
    provider: 'local_deterministic',
    model: 'rule-engine-v1',
    text: '',
    isFallback: true
  };
}

module.exports = {
  callGroq,
  callOpenRouter,
  callGemini,
  completeWithFallback
};
