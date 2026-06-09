/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  BarChart3, 
  HelpCircle,
  Coins,
  ShieldCheck,
  CalendarDays,
  Target
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar,
  Cell
} from 'recharts';
import { Trade, UserSettings } from '../types';
import { calculateTradeStats } from '../utils';

interface DashboardOverviewProps {
  trades: Trade[];
  settings: UserSettings;
  onAddTradeClick: () => void;
  setActiveTab: (tab: any) => void;
}

export default function DashboardOverview({ trades, settings, onAddTradeClick, setActiveTab }: DashboardOverviewProps) {
  const stats = calculateTradeStats(trades, settings.startingBalance);
  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const openTrades = trades.filter(t => t.status === 'OPEN');

  // Format currency values nicely
  const formatCurrency = (val: number) => {
    return val.toLocaleString(undefined, {
      style: 'currency',
      currency: settings.baseCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  // Prepare Equity Curve Data
  const getEquityCurveData = () => {
    const data = [{ name: 'Start', equity: settings.startingBalance }];
    let cumulativeBalance = settings.startingBalance;
    
    // Sort closed trades chronologically by exit time or entry time
    const sortedClosed = [...closedTrades].sort((a, b) => {
      const timeA = new Date(a.exitTime || a.entryTime).getTime();
      const timeB = new Date(b.exitTime || b.entryTime).getTime();
      return timeA - timeB;
    });

    sortedClosed.forEach((trade, idx) => {
      cumulativeBalance += (trade.pnl || 0);
      data.push({
        name: `Trade ${idx + 1}`,
        equity: Number(cumulativeBalance.toFixed(2))
      });
    });

    return data;
  };

  // Prepare Monthly Bar chart data
  const getMonthlyBarChartData = () => {
    const monthlyMap: { [key: string]: number } = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize current year months
    const currentYearStr = new Date().getFullYear().toString();
    months.forEach(m => {
      monthlyMap[`${m} ${currentYearStr.substring(2)}`] = 0;
    });

    closedTrades.forEach(trade => {
      const exitDateStr = trade.exitTime || trade.entryTime;
      const d = new Date(exitDateStr);
      const mLabel = months[d.getMonth()];
      const yLabel = d.getFullYear().toString().substring(2);
      const key = `${mLabel} ${yLabel}`;
      
      monthlyMap[key] = (monthlyMap[key] || 0) + (trade.pnl || 0);
    });

    return Object.entries(monthlyMap).map(([name, pnl]) => ({
      name,
      pnl: Number(pnl.toFixed(2))
    }));
  };

  const equityData = getEquityCurveData();
  const monthlyData = getMonthlyBarChartData();

  // Custom tooltips for better TradingView look
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 shadow-xl text-zinc-100 font-sans text-xs">
          <p className="text-zinc-400 font-medium mb-1">{payload[0].payload.name}</p>
          <p className="font-semibold flex items-center gap-1.5">
            <span className="text-zinc-500 font-mono">Balance:</span>
            <span className={payload[0].value >= settings.startingBalance ? "text-emerald-400" : "text-rose-400"}>
              {formatCurrency(payload[0].value)}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 shadow-xl text-zinc-100 font-sans text-xs">
          <p className="text-zinc-400 font-medium mb-1">{payload[0].payload.name}</p>
          <p className={`font-semibold ${value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {value >= 0 ? '+' : ''}{formatCurrency(value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="dashboard-view" className="space-y-6 font-sans text-zinc-100 p-8 max-w-7xl mx-auto">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h2 className="text-2xl font-bold font-sans tracking-tight text-white leading-tight">
            Dashboard Overview
          </h2>
          <p className="text-sm text-zinc-400 mt-1.5">
            Welcome back, <span className="text-white font-semibold">{settings.userName}</span>. Here is your recent trading metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {openTrades.length > 0 && (
            <div className="px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold rounded-lg flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span>{openTrades.length} Active Trade{openTrades.length === 1 ? '' : 's'}</span>
            </div>
          )}
          <button
            onClick={onAddTradeClick}
            id="dashboard-new-trade-btn"
            className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-all duration-150 cursor-pointer shadow-md shadow-emerald-500/5 hover:-translate-y-0.5"
          >
            <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
            <span>New Trade Entry</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Profit/Loss */}
        <div className="bg-zinc-950 shadow-md border border-zinc-900 px-5 py-4 rounded-xl flex justify-between items-center group relative overflow-hidden">
          <div className="space-y-2.5 z-10">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Total Net Profit</span>
            <div className={`text-2xl font-bold flex items-baseline gap-1.5 ${stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>{stats.totalPnl >= 0 ? '+' : ''}{formatCurrency(stats.totalPnl)}</span>
            </div>
            <div className="text-[11px] text-zinc-500 font-medium">
              Current account equity: <span className="text-zinc-300 font-semibold">{formatCurrency(settings.startingBalance + stats.totalPnl)}</span>
            </div>
          </div>
          <div className={`p-3 rounded-xl z-10 transition-colors ${stats.totalPnl >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            {stats.totalPnl >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-32 bg-radial from-transparent to-zinc-900/10 pointer-events-none" />
        </div>

        {/* Win Rate */}
        <div className="bg-zinc-950 shadow-md border border-zinc-900 px-5 py-4 rounded-xl flex justify-between items-center group relative overflow-hidden">
          <div className="space-y-2.5 z-10">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Win Rate</span>
            <div className="text-2xl font-bold text-white flex items-baseline gap-1">
              <span>{stats.winRate}%</span>
              <span className="text-xs text-zinc-500 font-medium">of {stats.totalTrades} trades</span>
            </div>
            <div className="text-[11px] text-zinc-500 font-medium flex items-center gap-1.5">
              <span className="text-emerald-400 font-semibold">{stats.wins} Wins</span>
              <span className="text-zinc-700">|</span>
              <span className="text-rose-400 font-semibold">{stats.losses} Losses</span>
            </div>
          </div>
          <div className="p-3 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-xl z-10">
            <Target className="h-5 w-5" />
          </div>
          {/* Subtle Progress Bar Under-Glow */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-900">
            <div className="h-full bg-emerald-400 transition-all duration-500 rounded-r-sm" style={{ width: `${stats.winRate}%` }} />
          </div>
        </div>

        {/* Profit Factor & R:R */}
        <div className="bg-zinc-950 shadow-md border border-zinc-900 px-5 py-4 rounded-xl flex justify-between items-center relative overflow-hidden">
          <div className="space-y-2.5 z-10">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Profit Factor</span>
            <div className="text-2xl font-bold text-white flex items-baseline gap-1.5">
              <span>{stats.totalTrades > 0 ? stats.profitFactor : '0.00'}</span>
              <span className="text-xs text-zinc-500 font-medium">(Ratio)</span>
            </div>
            <div className="text-[11px] text-zinc-500 font-medium">
              Average Risk Reward: <span className="text-emerald-400 font-semibold">1 : {stats.avgRr}</span>
            </div>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
            <BarChart3 className="h-5 w-5" />
          </div>
        </div>

        {/* Drawdown */}
        <div className="bg-zinc-950 shadow-md border border-zinc-900 px-5 py-4 rounded-xl flex justify-between items-center relative overflow-hidden">
          <div className="space-y-2.5 z-10">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Max Drawdown</span>
            <div className="text-2xl font-bold text-rose-400 flex items-baseline gap-1.5">
              <span>{formatCurrency(stats.maxDrawdown)}</span>
            </div>
            <div className="text-[11px] text-zinc-500 font-medium">
              Peak drawdown percentage: <span className="text-rose-500/90 font-semibold">-{stats.drawdownPercent}%</span>
            </div>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
            <ShieldCheck className="h-5 w-5 text-tomato-400" />
          </div>
        </div>
      </div>

      {/* Analytics Highlights / Pair Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Best / Worst Performers mini panel */}
        <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Historical Highs & Lows</span>
            <span className="text-[10px] font-mono text-zinc-600 uppercase">Top metrics</span>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4 divide-x divide-zinc-900">
            {/* Best Pair */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">Profit Generator (Pair)</span>
              <p className="text-2xl font-bold text-emerald-400 font-mono tracking-tight">{stats.bestPair}</p>
              <p className="text-xs text-zinc-500">Your most profitable setup currency asset</p>
            </div>
            {/* Worst Pair */}
            <div className="space-y-1.5 pl-4">
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">Liability (Pair)</span>
              <p className="text-2xl font-bold text-rose-400 font-mono tracking-tight">{stats.worstPair}</p>
              <p className="text-xs text-zinc-500">Requires tighter stop loss management</p>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl flex items-start gap-2.5 text-xs text-zinc-400 mt-2">
            <HelpCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              Metrics are compiled securely from closed journals. Focus your strategy executions on <span className="text-emerald-400 font-semibold">{stats.bestPair !== '-' ? stats.bestPair : 'your primary pairs'}</span> to optimize your profit factor.
            </p>
          </div>
        </div>

        {/* Summary mini cards / Instructions */}
        <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Account Diagnostics</span>
            <span className="text-[10px] font-mono text-zinc-600 uppercase">Interactive</span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-4 text-center">
            <div className="bg-zinc-900/30 border border-zinc-900 p-3 rounded-xl">
              <p className="text-[10px] font-semibold tracking-wider uppercase text-zinc-500 text-center">Open Trades</p>
              <p className="text-lg font-bold text-amber-400 mt-1">{openTrades.length}</p>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-900 p-3 rounded-xl">
              <p className="text-[10px] font-semibold tracking-wider uppercase text-zinc-500 text-center">Closed Trades</p>
              <p className="text-lg font-bold text-zinc-300 mt-1">{closedTrades.length}</p>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-900 p-3 rounded-xl">
              <p className="text-[10px] font-semibold tracking-wider uppercase text-zinc-500 text-center">Total Entries</p>
              <p className="text-lg font-bold text-emerald-400 mt-1">{trades.length}</p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('trades')}
            className="w-full text-center py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium border border-zinc-800/80 transition-colors"
          >
            Go to Trade Journal Ledger
          </button>
        </div>
      </div>

      {/* Chart Section */}
      {closedTrades.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-zinc-900 rounded-full text-zinc-500">
            <BarChart3 className="h-10 w-10" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">No closed trades recorded yet</h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-sm">
              Your growth curve charts and monthly profit stats will populate automatically as you add and close trades in the journal.
            </p>
          </div>
          <button
            onClick={onAddTradeClick}
            className="bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-800 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
          >
            Create Your First Entry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Equity Curve Account Growth Area Chart */}
          <div className="bg-zinc-950 shadow-md border border-zinc-900 p-5 rounded-2xl lg:col-span-2">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Account Balance Curve</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">Continuous net growth tracking starting from {formatCurrency(settings.startingBalance)}</p>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">Dynamic</span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#18181b" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#52525b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#52525b" 
                    fontSize={10} 
                    tickFormatter={(v) => `$${v}`}
                    tickLine={false} 
                    axisLine={false}
                    domain={['dataMin - 100', 'dataMax + 100']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="equity" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#equityGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly P/L Bar Chart */}
          <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Monthly Profit / Loss</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">Cumulative monthly P/L comparison</p>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase">History</span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#18181b" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#52525b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#52525b" 
                    fontSize={10} 
                    tickFormatter={(v) => `${v >= 0 ? '+' : ''}$${v}`}
                    tickLine={false} 
                    axisLine={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {monthlyData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
