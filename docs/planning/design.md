# Design & UI/UX Specification (Project B.I.T.)

## 1. Design Philosophy
An enterprise-grade dark-mode dashboard tailored for fintech systems. The interface prioritizes **transparency**, giving equal real-time visual weight to agent reasoning, system execution, and security logs. Nothing the system does should happen "invisibly" — every state transition gets a visible, timestamped trace.

## 2. Layout Structure (3-Column Layout)

* **Left Panel (25% width) — Control & Red Team Suite**
  * Preset selection (Shoes, Electronics, SaaS Seats).
  * Red Team Simulation buttons: `Inject Prompt Attack`, `Modify Price Payload`, `Expire Token`.
  * Real-Time Telemetry card: Loop Latency, Token Cost, Hash Verifier status.

* **Center Panel (45% width) — Dual Agent Workspace**
  * Split-screen chat windows: **Buyer Agent** (blue tint) vs **Merchant Agent** (purple tint).
  * Animated loop indicator badge cycling: Observe → Plan → Act → Verify.
  * Pop-up Razorpay-style mock approval modal on successful handshake.

* **Right Panel (30% width) — Live Audit & Verification Ledger**
  * Terminal-style live stream of raw JSON handshakes, monospace font, newest entry on top.
  * Security badges rendered inline per event: `[SANITY: PASSED]`, `[TOKEN: VERIFIED]`, `[GATE: PASSED]`, `[GATE: BLOCKED]`.

## 3. Color Palette & States
* **Background:** `#090D16` (deep slate / dark mode)
* **Primary Accent:** `#3B82F6` (Razorpay blue)
* **Success / Pass:** `#10B981` (emerald green)
* **Error / Blocked:** `#EF4444` (ruby red)
* **Warning / Retry:** `#F59E0B` (amber)
* **Border Highlights:** Soft glow (box-shadow, blue or amber) on the panel currently active in the loop cycle.

## 4. Typography
* **UI Chrome / Headings:** Inter or system sans-serif, medium weight.
* **Audit Trail / JSON / Code:** JetBrains Mono or similar monospace, 13px, high line-height for scanability.
* **Agent Chat Bubbles:** Sans-serif, slightly larger line-height for readability during live demo.

## 5. Component States
* **Idle:** Panels at rest, no glow, muted borders (`#1E293B`).
* **Active (loop running):** Currently executing step's panel gets a pulsing border glow in blue.
* **Success:** Green flash on the panel + a green audit entry.
* **Blocked / Failed:** Red flash + shake animation (subtle, ~150ms) on the offending panel, red audit entry with the failure `reason` string surfaced directly in the log (not hidden behind a tooltip).
* **Retrying:** Amber badge with retry count, e.g. `RETRY 2/3`.

## 6. Red Team Attack Simulator — Visual Treatment
This is the hackathon centerpiece and should be visually distinct:
* A dedicated card in the Left Panel with a warning-striped border (amber/black diagonal, used sparingly).
* On click, opens a side-by-side **before/after diff view**: raw catalog text on the left with the injection payload highlighted in red strikethrough-style markup, sanitized text on the right in green.
* A large, unmissable status pill: `ATTACK NEUTRALIZED` (green) or, if sanitization is bypassed for demo purposes, `ATTACK SUCCEEDED — UNSAFE MODE` (red) so judges can see both the defended and undefended paths.

## 7. Responsive / Demo Considerations
* Designed primarily for a single 1440px+ presentation screen (hackathon demo), not mobile-first.
* Audit Trail column should auto-scroll but pause on hover so judges can read a specific entry mid-demo.
* Avoid modal-heavy flows for anything except the final Human-in-the-Loop approval step — judges should see the system working, not click through dialogs.
