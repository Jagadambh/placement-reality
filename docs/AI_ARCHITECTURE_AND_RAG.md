# Placement AI: Grounded RAG Architecture & Zero-Hallucination Policy

## 1. Overview

**Placement AI** is a specialized analytics copilot designed to eliminate hallucinated compensation packages, bogus recruiter lists, and ungrounded placement predictions.

Unlike general LLM chatbots that make unsupported assumptions, Placement AI operates via **Retrieval-Augmented Generation (RAG)** strictly bound to platform database records.

---

## 2. RAG Pipeline Architecture

```
[ User Query ] ──> [ Structured Context Retriever ]
                           │
                           ├── College & Season Matcher (MongoDB)
                           ├── Verified Placement Records
                           ├── Branch Breakdown (CSE, ECE, etc.)
                           ├── Verified Offers >= 10 LPA
                           └── Verified Internship Benchmarks
                           │
                           ▼
                  [ Ground-Truth Context ]
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
[ External LLM API Available? ]         [ No Key Configured? ]
  - Google Gemini 1.5 Flash              - Deterministic Ground-Truth
  - OpenAI GPT-4o-mini                   RAG Execution Engine
  - Strict Grounded System Prompt        - Exact Factual Synthesis
             │                           │
             └─────────────┬─────────────┘
                           ▼
                 [ Grounded Answer ]
                 + Verified Citations
                 + Methodology Disclosures
                 + Active Provider Telemetry
```

---

## 3. Strict System Instructions & Rules

1. **Zero Hallucination Guarantee**: Every figure cited must exist in the retrieved context documents.
2. **Mandatory Citations**: Every response lists the relevant institution, academic season, reporting framework (e.g. NIRF 2024), and provenance tier.
3. **Denominator Disclosure**: If a user asks for placement rates at a college with undisclosed eligible student counts, the assistant explicitly states that the denominator was not disclosed and refuses to manufacture an arbitrary percentage.
4. **Distinction of Gross Offers vs Unique Headcount**: The assistant constantly reinforces that gross offer volume does not equal unique placed students.

---

## 4. Multi-Provider Configuration

The system is configured via environment variables in `server/.env`:

```env
# Optional Live LLM Providers
AI_PROVIDER=auto              # auto | gemini | openai | mock
GEMINI_API_KEY=               # Google AI Studio Gemini API Key
OPENAI_API_KEY=               # OpenAI API Key
```

- When `GEMINI_API_KEY` is present, queries are routed to Google Gemini 1.5 Flash with the verified context payload.
- When `OPENAI_API_KEY` is present, queries are routed to OpenAI GPT-4o-mini.
- When **no API key is provided**, the backend seamlessly falls back to the **Deterministic Ground-Truth RAG Engine** with an informative banner explaining that the response was generated directly from verified database records.
