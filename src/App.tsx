/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  Settings, 
  CloudLightning, 
  Coins, 
  ShieldCheck, 
  HelpCircle,
  Database,
  ArrowRight
} from 'lucide-react';
import { ActiveTab, Trade, UserSettings } from './types';
import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import TradeList from './components/TradeList';
import TradeEntryModal from './components/TradeEntryModal';
import AnalyticsReports from './components/AnalyticsReports';
import RiskCalculator from './components/RiskCalculator';

const LOCAL_STORAGE_KEY = 'simonfx_trade_journal';
const SETTINGS_STORAGE_KEY = 'simonfx_user_settings';

// No seed data for live deployment
const DEFAULT_TRADES_SEED: Trade[] = [];

const DEFAULT_SETTINGS: UserSettings = {
  userName: 'Prop Trader',
  baseCurrency: 'USD',
  startingBalance: 125000 // Standard prop account size option
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  
  // Mobile UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showIntegrationGuide, setShowIntegrationGuide] = useState(false);

  // Modal Sizing / Draft entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // Initialize data on load
  useEffect(() => {
    // 1. Settings load
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }

    // 2. Trades load
    const savedTrades = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedTrades) {
      try {
        setTrades(JSON.parse(savedTrades));
      } catch (e) {
        console.error('Failed to parse trades', e);
        setTrades(DEFAULT_TRADES_SEED);
      }
    } else {
      // Seed with starter trades
      setTrades(DEFAULT_TRADES_SEED);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_TRADES_SEED));
    }
  }, []);

  // Update Settings
  const updateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
  };

  // Save Trade Record (Create or Update)
  const handleSaveTrade = (trade: Trade) => {
    let updatedTrades;
    const exists = trades.some(t => t.id === trade.id);
    
    if (exists) {
      updatedTrades = trades.map(t => t.id === trade.id ? trade : t);
    } else {
      updatedTrades = [trade, ...trades];
    }

    setTrades(updatedTrades);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedTrades));
  };

  // Delete trade
  const handleDeleteTrade = (id: string) => {
    const updated = trades.filter(t => t.id !== id);
    setTrades(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  // Close trade fast
  const handleCloseTrade = (id: string, exitPrice: number, exitTime: string, pnl: number) => {
    const updated = trades.map(t => {
      if (t.id === id) {
        return {
          ...t,
          status: 'CLOSED' as const,
          exitPrice,
          exitTime,
          pnl
        };
      }
      return t;
    });
    setTrades(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleEditClick = (trade: Trade) => {
    setEditingTrade(trade);
    setIsModalOpen(true);
  };

  const handleNewEntryClick = () => {
    setEditingTrade(null);
    setIsModalOpen(true);
  };

  return (
    <div className="flex bg-zinc-950 min-h-screen text-zinc-100 font-sans">
      
      {/* SIDEBAR FOR DESKTOP */}
      <div className="hidden lg:block shrink-0">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          settings={settings}
          updateSettings={updateSettings}
        />
      </div>

      {/* MOBILE HEADER/NAVIGATION BAR */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-950 border-b border-zinc-900 px-6 flex items-center justify-between z-30 select-none">
        <span className="font-sans font-bold text-base text-white tracking-tight">
          ForexForge<span className="text-emerald-400 font-medium">.</span>
        </span>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-zinc-400 hover:text-white"
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* MOBILE SIDEBAR DROPDOWN DRAWER */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 top-16 bg-black/80 z-30 flex"
          onClick={() => setIsSidebarOpen(false)}
        >
          <div 
            className="w-80 h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setIsSidebarOpen(false);
              }}
              settings={settings}
              updateSettings={updateSettings}
            />
          </div>
        </div>
      )}

      {/* MAIN CONTAINER CONTENT PANE */}
      <main className="flex-1 w-full min-h-screen flex flex-col pt-16 lg:pt-0 overflow-y-auto">
        
        {/* Unified Integration Guide Alert Header */}
        <div className="bg-zinc-900/50 border-b border-zinc-900/80 px-8 py-3 flex text-xs justify-between items-center sm:gap-6">
          <p className="text-zinc-500 font-sans leading-relaxed">
            💡 Local persistence initialized: <span className="text-emerald-400 font-semibold">Active & Persistent</span>. Connect cloud databases like Supabase or Firebase anytime.
          </p>
          <button
            onClick={() => setShowIntegrationGuide(true)}
            className="px-3.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold border border-zinc-800 rounded-lg shrink-0 cursor-pointer"
          >
            View Cloud Schema
          </button>
        </div>

        {/* Tab Render Switchboard */}
        <div className="flex-1 h-full">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              trades={trades}
              settings={settings}
              onAddTradeClick={handleNewEntryClick}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'trades' && (
            <TradeList
              trades={trades}
              settings={settings}
              onEditTrade={handleEditClick}
              onDeleteTrade={handleDeleteTrade}
              onCloseTrade={handleCloseTrade}
              onAddTradeClick={handleNewEntryClick}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsReports
              trades={trades}
              settings={settings}
            />
          )}

          {activeTab === 'calculator' && (
            <RiskCalculator
              settings={settings}
            />
          )}
        </div>
      </main>

      {/* CLOUD SCHEMA INTEGRATION LIGHTBOX GUIDE */}
      {showIntegrationGuide && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs font-sans text-xs">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl relative p-6 space-y-6 select-text text-zinc-300 leading-relaxed font-sans">
            <button 
              onClick={() => setShowIntegrationGuide(false)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white"
            >
              <X className="h-5 w-5 font-bold" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-emerald-400" />
                <span>Production PostgreSql Supabase Setup Specs</span>
              </h3>
              <p className="text-zinc-500 mt-1 text-xs">Recommended Relational SQL DDL structure and Row-Level-Security (RLS) policies for complete multi-user partitioning.</p>
            </div>

            <div className="space-y-4">
              <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-850 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">1. Supabase Postgres DB Schema (SQL)</h4>
                <p className="text-[11px] text-zinc-500">Run this SQL code directly inside your Supabase SQL Editor to bootstrap backend trades tables with complete foreign keys & automatic profiles matching.</p>
                <pre className="bg-zinc-950 p-3.5 rounded border border-zinc-906 overflow-x-auto text-[10px] font-mono text-zinc-400 h-44 select-all">
{`-- Profile Metadata linked with Supabase auth.users
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  user_name TEXT DEFAULT 'Trader',
  base_currency TEXT DEFAULT 'USD' NOT NULL,
  starting_balance DECIMAl(15,2) DEFAULT 10000.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Main Trades Ledger Table
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
  tags TEXT[], -- Postgres Array of tags
  status VARCHAR(12) CHECK (status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN' NOT NULL,
  exit_price DECIMAL(18,5),
  exit_time TIMESTAMPTZ,
  pnl DECIMAL(15,2),
  notes TEXT,
  screenshots_before TEXT[], -- Compressed bases or S3 object links
  screenshots_after TEXT[],
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);`}
                </pre>
              </div>

              <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-850 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">2. Row Level Security Policies (RLS)</h4>
                <p className="text-[11px] text-zinc-500">Must be activated to guarantee that users only read, update, or delete their own recorded Forex journals! Keeps data secure by default.</p>
                <pre className="bg-zinc-950 p-3.5 rounded border border-zinc-906 overflow-x-auto text-[10px] font-mono text-zinc-400 h-32 select-all">
{`-- Enable row level protection
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Dynamic Profile policies
CREATE POLICY "Users can look up own profiles."
  ON profiles FOR ALL USING (auth.uid() = id);

-- Dynamic Trades policies
CREATE POLICY "Traders read own trades."
  ON trades FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Traders insert own trades."
  ON trades FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Traders modify own trades."
  ON trades FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Traders delete own trades."
  ON trades FOR DELETE USING (auth.uid() = user_id);`}
                </pre>
              </div>

              <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-850 space-y-3 font-sans text-xs">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">3. Client Integration Guide</h4>
                <p className="text-zinc-450 leading-relaxed text-[11px]">
                  When migrating to cloud services:
                </p>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-zinc-500">
                  <li>Install the Supabase SDK: <code className="text-zinc-300">npm install @supabase/supabase-js</code>.</li>
                  <li>Initialize the client using variables declared in your <code className="text-zinc-300">.env</code>: <code className="text-zinc-300">const supabase = createClient(URL, KEY)</code>.</li>
                  <li>Replace local-storage set/get methods in <code className="text-zinc-300">App.tsx</code> with async fetch calls to <code className="text-zinc-300">supabase.from('trades').select()</code>.</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => setShowIntegrationGuide(false)}
              className="w-full text-center py-2 bg-emerald-500 text-zinc-950 rounded-xl font-bold hover:bg-emerald-600 transition-colors cursor-pointer"
            >
              Continue to Workspace UI View
            </button>
          </div>
        </div>
      )}

      {/* FORM MODAL MODIFIER */}
      <TradeEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTrade}
        editingTrade={editingTrade}
        settings={settings}
      />

    </div>
  );
}
