# ⚡ TNEB Smart Analytics Dashboard

A modern, high-performance Next.js web application designed to track, analyze, and visualize bi-monthly Tamil Nadu Electricity Board (TNEB) consumption data.

Instead of staring at boring, static billing tables, this application scrapes raw TNEB HTML payloads and transforms them into a beautiful, insightful, and interactive property management dashboard.

## ✨ Features

- **Smart Insights:** Automatically detects 100% subsidized (free) billing cycles and flags pending payments with due dates to protect property owners from penalties.
- **Consumption Trends:** Interactive area charts visualizing bi-monthly KWH usage to easily spot abnormal power spikes (e.g., faulty appliances).
- **Dynamic Slab Rates:** Context-aware slab rate displays that dynamically adjust and group based on whether total consumption is above or below the 500-unit threshold.
- **Detailed Billing Ledger:** A clean, chronological breakdown of historical bills, meter readings, exact units consumed, and payment status.
- **Property Profile:** Instantly view sanctioned load, phase details, region, and distribution metrics for any linked consumer number.

## 🛠️ Tech Stack

- **Framework:** [Next.js (App Router)](https://nextjs.org/)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Charts:** Recharts
- **Data Extraction:** Cheerio (Server-side HTML parsing)

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/anburocky3/tneb-smart-tracker.git
cd tneb-smart-tracker
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
bun install
```

### 3. Env configuration

Make duplicate of `env.example` to `.env` and update your data there.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## ⚠️ Important Note on Production Deployment

Currently, the `app/api/tneb/route.ts` API relies on a specific `PHPSESSID` and `tokenID` to bypass TNEB's initial security walls. Because TNEB actively rotates these sessions to prevent scraping, deploying this for autonomous, long-term production use will require implementing dynamic session handling (e.g., using Puppeteer/Playwright to negotiate initial tokens).

## 👨‍💻 Credits

**Designed & Developed by:** [Anbuselvan Annamalai](https://anbuselvan-annamalai.com) (Anbu)

_Built with passion to make utility management smarter and simpler for everyone._
