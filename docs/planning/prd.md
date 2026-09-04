# Product Requirement Document (PRD): Autonomous Agent-to-Agent Commerce Protocol (Project B.I.T.)

## 1. Executive Summary
Project B.I.T. (Bounded Intent Tokens) is a production-grade, security-hardened transaction protocol designed to enable autonomous AI Buyer Agents to negotiate, validate, and execute payments with AI Merchant Agents. By decoupling AI reasoning from monetary authority via Cryptographic Bounded Intent Tokens and implementing an Iterative Execution Loop, the platform eliminates hallucination-driven financial risk and prompt injection vulnerabilities.

## 2. Problem Statement
As agentic workflows mature, traditional e-commerce UIs will be bypassed by autonomous AI buyers. Current agent implementations suffer from three critical flaws:
1. **Unbounded Execution:** Giving AI models direct access to wallets or payment keys.
2. **Adversarial Vulnerability:** Inability to prevent prompt injections embedded within merchant catalogs.
3. **Single-Shot Failure:** Chatbots failing or halting when an API or negotiation parameter mismatches.

## 3. Target Audience & Stakeholders
* **E-Commerce Merchants:** Seeking agent-readable catalog exposure and automated transaction processing.
* **Autonomous AI Buyers:** Consumer or business AI representatives purchasing goods programmatically.
* **Fintech Auditors / Razorpay Evaluators:** Requiring deterministic safety bounds and transparent transaction logs.

## 4. Key Novelties & Differentiators
* **Bounded Intent Tokens:** Cryptographically signed, single-use constraints (SKU, Max Amount, Expiration) created prior to money movement.
* **Iterative Evaluation Loop Engine:** Agents execute in a closed feedback loop with schema validation and self-correction retries.
* **Catalog Sanitization Proxy:** Deterministic regex/AST proxy that strips adversarial prompts before feeding data to LLM context.
* **Red Team Attack Simulator:** 1-click UI toggles for testing prompt injection, price tampering, and expired token defenses.
* **Telemetry Dashboard:** Live monitoring of agent loop latency, token expenditure, and cryptographic verification status.

## 5. Core User Flows
1. **Catalog Query:** Buyer Agent queries catalog through Sanitization Proxy.
2. **Loop Negotiation:** Buyer & Merchant agents engage in an iterative verification loop to match user requirements to catalog constraints.
3. **Token Minting:** Gateway issues a Bounded Intent Token signed with SHA-256.
4. **Security Validation:** Deterministic Security Gate checks token validity against requested invoice.
5. **Human-in-the-Loop Approval:** UI displays a 1-click OTP/Approval modal to move funds.

## 6. Success Metrics (for Hackathon Judging)
* **Security:** 100% of injected prompt-attack test cases neutralized by the Sanitization Proxy before reaching the LLM context.
* **Determinism:** 0 instances of the LLM directly authorizing a transaction outside the Security Gate.
* **Resilience:** Agent loop successfully self-corrects at least 1 malformed action per demo run without crashing.
* **Clarity:** Judges can trace any transaction end-to-end via the live Audit Trail without needing verbal explanation.

## 7. Out of Scope (v1)
* Real Razorpay production API integration (mocked for demo).
* Multi-currency support.
* Persistent database (in-memory / JSON-backed for hackathon scope).
* Multi-agent marketplace with more than one buyer/merchant pair.
