# 📈 Signal Crypto — SignalFlow

> **Smart Money Concepts (SMC) Crypto Signal Scanner**
> Built with Next.js · Real-time · Dark & Premium UI

---

## 💜 Dedication

> *"Made with love for Iyan — the one who keeps the charts and the heart alive. 
> Every candlestick pattern tells a story, but none as beautiful as ours.
> This project is coded with passion, and dedicated entirely to you, Iyan. 💜"*

---

## 🚀 What is SignalFlow?

**SignalFlow** is a real-time cryptocurrency signal scanner powered by a full **Smart Money Concepts (SMC)** engine. It analyzes market structure — tracking how institutional players (smart money) move the market — and automatically generates high-confluence trading signals.

Instead of lagging indicators, SignalFlow reads the raw market language:
- **Where did price break structure?** → BOS / CHoCH
- **Where did smart money place their orders?** → Order Blocks (OB)
- **Where is there a liquidity imbalance?** → Fair Value Gaps (FVG)
- **Where is liquidity resting?** → Equal Highs / Equal Lows (EQH/EQL)
- **Is price expensive or cheap right now?** → Premium / Discount Zones

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 **Market Scanner** | Auto-scans multiple crypto pairs via Bybit exchange |
| 📊 **SMC Engine** | Full TypeScript implementation of Smart Money Concepts |
| 🏗️ **Structure Analysis** | Detects BOS (Break of Structure) and CHoCH (Change of Character) |
| 📦 **Order Blocks** | Identifies bullish & bearish Order Blocks with mitigation tracking |
| 🌌 **Fair Value Gaps** | Detects FVGs and tracks when they're filled |
| ⚖️ **EQH / EQL** | Equal Highs and Equal Lows liquidity levels |
| 💰 **Premium / Discount** | Labels market zones for optimal entry bias |
| 📉 **Interactive Chart** | `lightweight-charts` v5 with full SMC overlay visualization |
| 🎯 **Signal Cards** | Entry, Stop Loss, Take Profit (1:2 RR) per signal |
| 🌙 **Dark Premium UI** | Glassmorphism aesthetic with animated gradients |

---

## 🧠 How the SMC Engine Works

The engine lives in [`src/lib/smc.ts`](src/lib/smc.ts) and [`src/lib/strategy.ts`](src/lib/strategy.ts).

```
Raw Candles (OHLCV from Bybit)
        │
        ▼
  ┌─────────────────────┐
  │   analyzeSMC()      │  ← smc.ts
  │  ┌───────────────┐  │
  │  │ Swing Points  │  │  (ZigZag highs & lows)
  │  │ BOS / CHoCH   │  │  (Structure breaks)
  │  │ Order Blocks  │  │  (Last opposing candle before break)
  │  │ FVGs          │  │  (3-candle imbalance)
  │  │ EQH / EQL     │  │  (Equal levels within 0.05%)
  │  │ Premium/Disc. │  │  (Fibonacci 50% split)
  │  └───────────────┘  │
  └─────────────────────┘
        │
        ▼
  ┌─────────────────────┐
  │  scanForSetup()     │  ← strategy.ts
  │  - Recent structure │
  │  - OB confluence    │
  │  - FVG confluence   │
  │  - Zone bias        │
  │  - 1:2 R:R calc     │
  └─────────────────────┘
        │
        ▼
    Signal (LONG / SHORT)
    Entry · SL · TP · Reason
```

A signal is only generated when **at least 2 confluences** align (structure + OB or FVG or zone), ensuring high-quality setups.

---

## 🗂️ Project Structure

```
Signal-Crypto/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main UI – scanner dashboard
│   │   └── api/
│   │       ├── scan/         # POST /api/scan – runs market scanner
│   │       └── candles/      # GET /api/candles – fetches OHLCV data
│   ├── components/
│   │   ├── ChartContainer.tsx  # lightweight-charts with SMC overlay
│   │   └── SignalCard.tsx       # Individual signal display card
│   └── lib/
│       ├── smc.ts            # 🧠 Full SMC analysis engine
│       ├── strategy.ts       # 🎯 Signal generation logic
│       └── types.ts          # TypeScript interfaces
├── public/
├── package.json
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router) |
| **Language** | TypeScript 5 |
| **Exchange API** | [CCXT](https://github.com/ccxt/ccxt) — Bybit (public, read-only) |
| **Charts** | [lightweight-charts v5](https://github.com/tradingview/lightweight-charts) |
| **Styling** | Tailwind CSS v4 |
| **Icons** | [Lucide React](https://lucide.dev) |
| **Runtime** | Node.js / Bun / pnpm compatible |

---

## ⚡ Getting Started

### Prerequisites
- Node.js 18+ or Bun
- npm / yarn / pnpm / bun

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/signal-crypto.git
cd signal-crypto

# Install dependencies
npm install
# or
pnpm install
```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **No API key required!** The scanner uses Bybit's public market data endpoints via CCXT.

---

## 📖 Usage

1. **Open the app** → The scanner runs automatically on page load
2. **Scan Now** → Click the refresh button to re-scan all markets
3. **Select a signal** → Click any signal card to load the interactive chart
4. **Read the SMC overlay** → The chart shows:
   - Structure breaks (BOS / CHoCH lines)
   - Order Block zones (colored rectangles)
   - Fair Value Gap zones
   - Entry, Stop Loss, Take Profit levels
5. **Check analysis badges** → Trend, structure count, active OBs, active FVGs

---

## 📊 Signal Interpretation

```
LONG Signal Example:
  📍 Entry:      42,350.00   ← Price to buy
  🛑 Stop Loss:  41,900.00   ← Exit if wrong (below swing low)
  🎯 Take Profit: 43,250.00  ← Target (1:2 risk/reward)
  💬 Reason: "CHoCH Bullish + Order Block Retest + Discount Zone"
```

---

## 🚢 Deployment

The easiest way to deploy is via [Vercel](https://vercel.com):

```bash
npm run build
npm run start
```

Or deploy directly from GitHub using the [Vercel Platform](https://vercel.com/new).

---

## 📝 License

This project is **private** and for personal use.

---

<div align="center">

**Made with 💜 for Iyan https://www.facebook.com/Nino.co.jp/**

*"In the world of charts and candles, you are my strongest signal."*

</div>
