# ForexForge Journal

ForexForge Journal is a premium, professional-grade, full-stack ready Forex trading journal with deep analytical tracking, interactive equity curves, position size calculators, and multi-chart dashboards.

## Feature Set

- **Comprehensive Performance Key indicators (KPIs)**: Instantly track Net profits/losses, win ratios, total volume, average risk reward metrics, and maximum drawdown periods.
- **Interactive Recharts Visualizer**: Fully interactive Area and Bar charts displaying growth curves and monthly profitability comparative states.
- **Slick Sizing Risk Helper**: Free-standing risk lot sizer that dynamically maps target allocations based on capital structures and stop distances.
- **Detailed Position table**: Rich filter controls (by assets, status, outcome, and text search) with expandable inline inspector drawers and multiple chart attachments.
- **Inline Fast Close**: Close active positions directly in the ledger row by inputting exit values via a streamlined modal.

---

## 🚀 Database Schema (Supabase PostgreSQL)

To migrate from the local persistence engine to high-availablility cloud storage, execute the following SQL code inside your Supabase project's **SQL Editor**:

### 1. Table Definitions

```sql
-- Profiles: Master record for currency preferences
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  user_name TEXT DEFAULT 'Trader',
  base_currency TEXT DEFAULT 'USD' NOT NULL,
  starting_balance DECIMAL(15,2) DEFAULT 10000.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Trades Ledger
CREATE TABLE trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  pair VARCHAR(16) NOT NULL,
  direction VARCHAR(8) CHECK (direction IN ('BUY', 'SELL')) NOT NULL,
  entry_price DECIMAL(18,5) NOT NULL,
  lot_size DECIMAL(10,2) NOT NULL,
  stop_loss DECIMAL(18,5),
  take_profit DECIMAL(18,5),
  entry_time TIMESTAMPTZ NOT NULL,
  strategy TEXT,
  tags TEXT[], -- PostgreSql text array
  status VARCHAR(12) CHECK (status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN' NOT NULL,
  exit_price DECIMAL(18,5),
  exit_time TIMESTAMPTZ,
  pnl DECIMAL(15,2),
  notes TEXT,
  screenshots_before TEXT[], -- Array of compressed base64 images or bucket urls
  screenshots_after TEXT[],
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);
```

### 2. Row Level Security Policies (RLS)

Protecting structural user data on PostgreSQL schemas:

```sql
-- Enable security features
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Profiles: read/update restricted to owner
CREATE POLICY "Users can fully manage their own profile info."
  ON profiles FOR ALL USING (auth.uid() = id);

-- Trades: complete CRUD bounded by auth UID
CREATE POLICY "Traders read their own books." 
  ON trades FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Traders insert their own books." 
  ON trades FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Traders update their own books." 
  ON trades FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Traders delete their own books." 
  ON trades FOR DELETE USING (auth.uid() = user_id);
```

---

## 🛠️ Deploying to Production (Vercel)

You can easily deploy the frontend to Vercel in 3 simple steps:

1. **Upload code to GitHub**: Import the repository into your GitHub account.
2. **Link to Vercel**: Import the GitHub repository inside [Vercel Dashboard](https://vercel.com).
3. **Environment Variables**: Configure key value configuration strings:
   - `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase instance URL endpoint.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your anon public API key.
4. **Deploy**: Build instantly. Vercel automatically deploys secure edge servers.
