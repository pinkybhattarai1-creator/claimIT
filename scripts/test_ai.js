/**
 * ClaimIT AI Provider Diagnostic & Verification Script
 * Tests Groq, OpenRouter, and Google Gemini connectivity on Free Tiers.
 * Validates fail-safe fallback mechanism.
 */

const dotenv = require('dotenv');
dotenv.config();

const { callGroq, callOpenRouter, callGemini, completeWithFallback } = require('../services/aiClient');

async function testAllProviders() {
  console.log('===============================================================');
  console.log('🤖 ClaimIT AI Provider Diagnostics & Connectivity Test');
  console.log('===============================================================\n');

  // 1. Test Groq (Free Fast Inference)
  console.log('1️⃣  Testing Groq Cloud API (Free Tier)...');
  try {
    const start = Date.now();
    const groqRes = await callGroq({
      prompt: 'Hello ClaimIT! Please reply: Groq Connected Successfully',
      maxTokens: 300
    });
    const elapsed = Date.now() - start;
    console.log(`  ✅ Groq Connected! Model: ${groqRes.model} (${elapsed}ms)`);
    console.log(`  📝 Response: "${groqRes.text}"\n`);
  } catch (err) {
    console.log(`  ⚠️ Groq Notice: ${err.message}\n`);
  }

  // 2. Test OpenRouter (Free Models)
  console.log('2️⃣  Testing OpenRouter API (Free Tier)...');
  try {
    const start = Date.now();
    const orRes = await callOpenRouter({
      prompt: 'Hello ClaimIT! Please reply: OpenRouter Connected Successfully',
      maxTokens: 300
    });
    const elapsed = Date.now() - start;
    console.log(`  ✅ OpenRouter Connected! Model: ${orRes.model} (${elapsed}ms)`);
    console.log(`  📝 Response: "${orRes.text}"\n`);
  } catch (err) {
    console.log(`  ⚠️ OpenRouter Notice: ${err.message}\n`);
  }

  // 3. Test Google Gemini (Free AI Studio)
  console.log('3️⃣  Testing Google Gemini API (Free Tier)...');
  try {
    const start = Date.now();
    const geminiRes = await callGemini({
      prompt: 'Hello ClaimIT! Please reply: Gemini Connected Successfully',
      maxTokens: 300
    });
    const elapsed = Date.now() - start;
    console.log(`  ✅ Gemini Connected! Model: ${geminiRes.model} (${elapsed}ms)`);
    console.log(`  📝 Response: "${geminiRes.text}"\n`);
  } catch (err) {
    console.log(`  ⚠️ Gemini Notice: ${err.message}\n`);
  }

  // 4. Test Fail-Safe Cascading Fallback Dispatcher
  console.log('4️⃣  Testing Cascading Multi-Provider Dispatcher...');
  const start = Date.now();
  const dispatchRes = await completeWithFallback({
    prompt: 'Summarize in 5 words: Dell OptiPlex motherboard defective.',
    maxTokens: 300
  });
  const elapsed = Date.now() - start;
  console.log(`  ✅ Dispatcher Result from [${dispatchRes.provider.toUpperCase()}]:`);
  console.log(`     "${dispatchRes.text || 'Fallback to deterministic rules'}" (${elapsed}ms)\n`);

  console.log('===============================================================');
  console.log('🎉 AI Multi-Provider Integration Verification Complete!');
  console.log('===============================================================');
}

testAllProviders().catch(console.error);
