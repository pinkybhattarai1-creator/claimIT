# 🤖 ClaimIT Multi-Provider AI Engine & Free Tier Configuration

ClaimIT includes a **resilient, multi-provider AI engine** designed specifically for medical and enterprise IT hardware warranty and RMA management.

It supports **100% Free AI Tiers** with automatic failover and a built-in deterministic rule engine that ensures **zero errors and zero hallucinations** even if internet connectivity drops or API quotas are reached.

---

## 1. Supported Free-Tier Providers

| Provider | Supported Free Models | Free Limits | Environment Variable | Setup Link |
| :--- | :--- | :--- | :--- | :--- |
| **Groq Cloud** *(Recommended)* | `llama-3.3-70b-versatile`<br>`llama-3.1-8b-instant`<br>`llama-3.2-11b-vision-preview` | Up to 30 RPM / Free fast inference | `GROQ_API_KEY`<br>`GROQ_MODEL` | [console.groq.com/keys](https://console.groq.com/keys) |
| **OpenRouter** | `meta-llama/llama-3.2-3b-instruct:free`<br>`meta-llama/llama-3.1-8b-instruct:free` | Free with `:free` models | `OPENROUTER_API_KEY`<br>`OPENROUTER_MODEL` | [openrouter.ai/keys](https://openrouter.ai/keys) |
| **Google Gemini** | `gemini-1.5-flash`<br>`gemini-2.0-flash` | 15 RPM / 1,500 RPD free on AI Studio | `GEMINI_API_KEY`<br>`GEMINI_MODEL` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| **Local Deterministic** | `rule-engine-v1` | Unlimited / Offline / Air-Gapped | Built-in (Always Active) | No setup required |

---

## 2. Configuration (`.env`)

Add your keys to your `.env` file:

```env
# Active provider preference: groq | openrouter | gemini | local
AI_PROVIDER=groq

# 1. Groq Cloud (Free Tier)
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# 2. OpenRouter (Free Tier)
OPENROUTER_API_KEY=sk-or-v1-your_openrouter_key_here
OPENROUTER_MODEL=meta-llama/llama-3.2-3b-instruct:free

# 3. Google Gemini (Free Tier)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

---

## 3. How the Zero-Hallucination Architecture Works

```
                                  [ User Request ]
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼                                                                 ▼
[ Free Cloud AI Provider ]                                    [ Built-In Fail-Safe Engine ]
(Groq ➔ OpenRouter ➔ Gemini)                                   (Active by Default / Offline)
        │                                                                 │
        │ Fast Multimodal Inference                                       │ 100% Deterministic Code
        ▼                                                                 ▼
  - OCR Image Pre-reading                                       - Thai Tax ID & Amount Regex
  - Diagnostic Semantic Search                                  - 4-Pillar Diagnostic Checklist
  - Bilingual Polish                                            - Vendor Templates (Dell/HP/Lenovo)
        │                                                                 │
        └────────────────────────────────┬────────────────────────────────┘
                                         ▼
                     [ Strict Backend Database & Logic ]
                      - Straight-Line BV = max(1, price * (1 - age/life))
                      - Ledger AVG(cost_thb) from Real Invoices
                      - Override Quality Gate (HTTP 400 on empty reason)
                      - 100% Immutable Audit Trail (move_log)
```

---

## 4. Testing AI Providers

You can run the AI diagnostic test script at any time:

```bash
node scripts/test_ai.js
```

Or run the full test suite including all 17 integration quality stages:

```bash
npm test
```
