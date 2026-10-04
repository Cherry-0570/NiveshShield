# 🛡 NiveshShield — Investor Safety Intelligence
**Explainable Digital Fraud & Scam Resilience for Retail Investors**
SANGYAN Hackathon 2026 (IIT BHU × SEBI × NSDL) — Primary track: Digital Fraud & Scam Resilience · Supporting: Misinformation & Content Literacy

## Problem
Retail and first-time investors receive investment messages on WhatsApp, Telegram, SMS, email and social media. Scammers use urgency, fake KYC/account-blocking warnings, guaranteed returns, VIP/insider claims, lookalike links, and requests for PAN, Aadhaar, OTP or direct UPI payments.

## Solution
Paste any message into NiveshShield and get a 0–100 risk score, a risk category, each detected warning signal with a plain-language explanation, a short summary, and a recommended safe action. It never gives buy/sell advice.

## Features
- Independent signals: urgency, guaranteed/unrealistic returns, sensitive-information requests, payment requests (extra weight for personal UPI/accounts), VIP/secret/social-channel language, suspicious links
- Benign-evidence detection that lowers the score (false-alarm reduction)
- Animated risk gauge and four visual states: Low (0–24), Suspicious (25–54), High (55–79), Critical (80–100)
- Three one-click demo cases; empty/very-long/emoji/₹/newline/URL input handled safely
- CSS-only 3D shield with orbit rings and parallax; honours `prefers-reduced-motion`; responsive

## How it works
`js/app.js` runs a transparent rule set of regular expressions. Each triggered signal adds fixed points once; a combined-signal bonus applies when 3+ signals co-occur; safer phrases subtract points (capped, and capped further when strong scam evidence exists so they cannot cancel it). Links are parsed and checked for URL shorteners, brand names on non-official domains, phishing words (kyc/verify/secure/login), unusual endings and raw IPs. A suspicious link alone is never shown as Low.

**The current MVP uses a transparent evidence-based client-side risk engine and does not claim to be a trained ML model.**

## Technology
HTML, CSS, vanilla JavaScript. No frameworks, no build step, no network calls.

## How to run
Unzip and open `index.html` in any modern browser. Optional tests: `node tests/engine.test.js` (engine) and `python3 tests/ui.test.py` (needs Playwright).

## Demo cases
🚨 Fake KYC → High · 💰 Guaranteed IPO → Critical · 🟢 Awareness → Low. See `TEST_CASES.txt`.

## Privacy
Analysis runs locally in the browser. Nothing is uploaded or stored. The app never asks for OTP, passwords, PINs, trading credentials, bank logins or API keys. Prototype only. Not financial advice.

## Future scope
Multilingual NLP/LLM (Hindi and regional languages), OCR for screenshots, live domain verification, trusted-source retrieval, voice-message analysis, advanced fraud intelligence, SEBI SCORES/cybercrime reporting hand-off.

## Limitations
Keyword/pattern rules can miss novel scams or phrasing, and can over-flag legitimate text that quotes scam words. English-only. No live domain or reputation lookup. A rule-based aid, not a verdict.
