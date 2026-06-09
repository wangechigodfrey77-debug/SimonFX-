/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  PieChart,
  Pie
} from 'recharts';
import { Download, TrendingUp, Award, Activity, HeartCrack, Percent, CalendarDays } from 'lucide-react';
import { Trade, UserSettings } from '../types';
import { calculateTradeStats } from '../utils';

interface AnalyticsReportsProps {
  trades: Trade[];
  settings: UserSettings;
}

export default function AnalyticsReports({ trades, settings }: AnalyticsReportsProps) {
  // Report scope state variables (All time, Weekly, Monthly, Quarterly, Yearly)
  const [timeScope, setTimeScope] = useState<'ALL' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR'>('ALL');

  // Format currency
  const formatCurrency = (val: number) => {
    return val.toLocaleString(undefined, {
      style: 'currency',
      currency: settings.baseCurrency,
      minimumFractionDigits: 0,
    });
  };

  // 1. Filter trades based on chosen timeframe scope
  const getFilteredTradesByScope = () => {
    const closed = trades.filter(t => t.status === 'CLOSED');
    if (timeScope === 'ALL') return closed;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const oneQuarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    return closed.filter(t => {
      const exitTime = new Date(t.exitTime || t.entryTime);
      if (timeScope === 'WEEK') return exitTime >= oneWeekAgo;
      if (timeScope === 'MONTH') return exitTime >= oneMonthAgo;
      if (timeScope === 'QUARTER') return exitTime >= oneQuarterAgo;
      if (timeScope === 'YEAR') return exitTime >= oneYearAgo;
      return true;
    });
  };

  const scopedTrades = getFilteredTradesByScope();
  const stats = calculateTradeStats(scopedTrades, settings.startingBalance);

  // 2. Prepare Win vs Loss Pie Chart Data
  const getWinLossPieData = () => {
    return [
      { name: 'Wins', value: stats.wins, fill: '#10b981' }, // emerald-500
      { name: 'Losses', value: stats.losses, fill: '#f43f5e' }  // rose-500
    ];
  };

  // 3. Prepare Performance By Currency Pair Data (Cumulative P/L)
  const getPairPerformanceData = () => {
    const pairMap: { [key: string]: number } = {};
    scopedTrades.forEach(t => {
      pairMap[t.pair] = (pairMap[t.pair] || 0) + (t.pnl || 0);
    });

    return Object.entries(pairMap).map(([name, pnl]) => ({
      name,
      pnl: Number(pnl.toFixed(2))
    })).sort((a, b) => b.pnl - a.pnl);
  };

  // 4. Prepare Performance By Strategy Data (Win Rate & Cumulative P/L)
  const getStrategyPerformanceData = () => {
    const strategyMap: { [key: string]: { winPnl: number; lossPnl: number; total: number; wins: number } } = {};
    
    scopedTrades.forEach(t => {
      const strat = t.strategy || 'Unassigned';
      if (!strategyMap[strat]) {
        strategyMap[strat] = { winPnl: 0, lossPnl: 0, total: 0, wins: 0 };
      }
      
      strategyMap[strat].total += 1;
      const pnl = t.pnl || 0;
      if (pnl > 0) {
        strategyMap[strat].wins += 1;
        strategyMap[strat].winPnl += pnl;
      } else {
        strategyMap[strat].lossPnl += Math.abs(pnl);
      }
    });

    return Object.entries(strategyMap).map(([name, d]) => {
      const netPnl = d.winPnl - d.lossPnl;
      const wRate = d.total === 0 ? 0 : Math.round((d.wins / d.total) * 100);
      return {
        name,
        pnl: Number(netPnl.toFixed(2)),
        winRate: wRate,
        totalTrades: d.total
      };
    }).sort((a, b) => b.pnl - a.pnl);
  };

  const winLossData = getWinLossPieData();
  const pairPerfData = getPairPerformanceData();
  const strategyPerfData = getStrategyPerformanceData();

  // Export entire trade logs list to CSV
  const exportToCSV = () => {
    // CSV Header row
    const headers = ['Trade ID', 'Asset/Pair', 'Direction', 'Lot Size', 'Entry Price', 'Stop Loss', 'Take Profit', 'Status', 'Exit Price', 'Profit/Loss', 'Strategy', 'Notes', 'Date Entry', 'Date Exit'];
    
    const rows = trades.map(t => [
      t.id,
      t.pair,
      t.direction,
      t.lotSize,
      t.entryPrice,
      t.sl || '',
      t.tp || '',
      t.status,
      t.exitPrice || '',
      t.pnl || '',
      `"${t.strategy.replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
      t.entryTime,
      t.exitTime || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `forexforge_journal_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="analytics-view" className="space-y-6 font-sans text-zinc-100 p-8 max-w-7xl mx-auto select-none">
      
      {/* Header and Exporter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Award className="h-6 w-6 text-emerald-400" />
            <span>Reports & Performance Analytics</span>
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Dive deep into strategy win-ratios, pair profitable allocations, and cumulative metrics.
          </p>
        </div>

        <button
          onClick={exportToCSV}
          id="export-csv-btn"
          className="bg-zinc-900 border border-zinc-805 hover:bg-zinc-850 hover:text-white text-zinc-300 font-semibold px-4.5 py-2.5 rounded-lg text-xs flex items-center gap-2 transition-all self-start md:self-auto cursor-pointer"
        >
          <Download className="h-4 w-4 text-emerald-400" />
          <span>Export Ledger as CSV</span>
        </button>
      </div>

      {/* Scope Toggles bar */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 flex gap-2 w-fit">
        {[
          { key: 'ALL' as const, label: 'All-Time Records' },
          { key: 'WEEK' as const, label: '7-Day Span' },
          { key: 'MONTH' as const, label: '30-Day Span' },
          { key: 'QUARTER' as const, label: 'Quarterly Summary' },
          { key: 'YEAR' as const, label: 'Yearly Summary' },
        ].map(scope => (
          <button
            key={scope.key}
            onClick={() => setTimeScope(scope.key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer select-none transition-all ${
              timeScope === scope.key 
                ? 'bg-zinc-850 text-white' 
                : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            {scope.label}
          </button>
        ))}
      </div>

      {/* Conditional Empty state if scoped trades is 0 */}
      {scopedTrades.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl py-24 text-center">
          <CalendarDays className="h-10 w-10 text-zinc-650 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No closed transactions found</h3>
          <p className="text-sm text-zinc-550 max-w-xs mx-auto mt-1 leading-relaxed">
            There are no closed journal records completed within this selected timeframe scope ({timeScope}).
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Key Metric blocks for Selected scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Trades Count */}
            <div className="bg-zinc-955 border border-zinc-900 p-4.5 rounded-xl space-y-1.5">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Trades Concluded</span>
              <p className="text-xl font-bold text-white font-mono">{stats.totalTrades}</p>
              <p className="text-[10px] text-zinc-450">Win vs Loss counts: {stats.wins} W / {stats.losses} L</p>
            </div>

            {/* Profit factor */}
            <div className="bg-zinc-955 border border-zinc-900 p-4.5 rounded-xl space-y-1.5">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Profit Factor</span>
              <p className="text-xl font-bold text-emerald-400 font-mono">{stats.profitFactor}</p>
              <p className="text-[10px] text-zinc-450">Gross profit divider of gross loss</p>
            </div>

            {/* Win Rate */}
            <div className="bg-zinc-955 border border-zinc-900 p-4.5 rounded-xl space-y-1.5">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Concluded Win Rate</span>
              <p className="text-xl font-semibold text-teal-400 font-mono">{stats.winRate}%</p>
              {stats.winRate > 50 ? (
                <p className="text-[10px] text-emerald-450 font-medium">Positive strategy expectancy</p>
              ) : (
                <p className="text-[10px] text-rose-455 font-medium">Underperforming risk borders</p>
              )}
            </div>

            {/* Cumulative Profit/Loss */}
            <div className="bg-zinc-955 border border-zinc-900 p-4.5 rounded-xl space-y-1.5">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Net Income</span>
              <p className={`text-xl font-bold font-mono ${stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stats.totalPnl >= 0 ? '+' : ''}{formatCurrency(stats.totalPnl)}
              </p>
              <p className="text-[10px] text-zinc-450">Based on {settings.baseCurrency} account base</p>
            </div>

          </div>

          {/* Graphical Analytics charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Win/Loss Pie distribution */}
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Win vs Loss Distribution</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Ratio of successful versus defeated trade journals</p>
              </div>

              <div className="h-44 flex items-center justify-center my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={winLossData}
                      cx="55%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {winLossData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} Trades`, 'Volume']} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom side legend */}
                <div className="space-y-2.5 shrink-0 pr-4">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-zinc-400">Wins: <span className="text-white font-bold">{stats.wins}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-505" style={{ backgroundColor: '#f43f5e' }} />
                    <span className="text-zinc-400">Losses: <span className="text-white font-bold">{stats.losses}</span></span>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-900 pt-3 text-center text-[11px] text-zinc-500 leading-relaxed font-sans">
                Expectancy: Your current profit distributions reflect a <span className="text-emerald-400 font-bold">{stats.winRate}% success factor</span>.
              </div>
            </div>

            {/* Performance by Pair Horizontal Bar Chart */}
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl md:col-span-2 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Profit / Loss Contribution by Pair</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Net cash contribution grouped by Forex pair assets</p>
              </div>

              {pairPerfData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-zinc-650">No data points</div>
              ) : (
                <div className="h-52 w-full mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={pairPerfData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#18181b" horizontal={false} />
                      <XAxis 
                        type="number" 
                        stroke="#52525b" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(v) => `$${v}`}
                      />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="#52525b" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <Tooltip formatter={(value: any) => [`$${value}`, 'Net P/L']} />
                      <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                        {pairPerfData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="border-t border-zinc-900/60 pt-2 text-[10px] text-zinc-500 text-right uppercase font-mono mt-2">
                ForexForge Contribution Spectrum
              </div>
            </div>

          </div>

          {/* Strategy table breakdown performance */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Strategy Metrics Matrix</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">Statistical outputs grouped by setup strategies & reasoning styles</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-550 text-[10px] uppercase font-bold tracking-widest font-mono">
                    <th className="py-3 px-4">Strategy Formula</th>
                    <th className="py-3 px-4 text-center">Concluded Trades</th>
                    <th className="py-3 px-4 text-center">Setup Win Rate</th>
                    <th className="py-3 px-4 text-right">Net Scoped Income</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {strategyPerfData.map((strat, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/20">
                      <td className="py-4.5 px-4 font-semibold text-zinc-300">{strat.name}</td>
                      <td className="py-4.5 px-4 text-center font-mono text-zinc-450">{strat.totalTrades}</td>
                      <td className="py-4.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-12 h-1.5 bg-zinc-900 rounded-full overflow-hidden shrink-0">
                            <div className="h-full bg-emerald-500" style={{ width: `${strat.winRate}%` }} />
                          </div>
                          <span className="font-mono text-white font-bold">{strat.winRate}%</span>
                        </div>
                      </td>
                      <td className={`py-4.5 px-4 text-right font-mono font-bold ${strat.pnl >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                        {strat.pnl >= 0 ? '+' : ''}{formatCurrency(strat.pnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
