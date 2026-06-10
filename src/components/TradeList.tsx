/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Eye, 
  Edit, 
  Trash2, 
  BadgeHelp,
  CheckCircle2, 
  PlayCircle,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  X,
  FileSpreadsheet,
  Settings,
  ChevronRight,
  Coins
} from 'lucide-react';
import { Trade, UserSettings } from '../types';
import { isJpyPair, autoCalculatePnl, calculatePips } from '../utils';

interface TradeListProps {
  trades: Trade[];
  settings: UserSettings;
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (id: string) => void;
  onCloseTrade: (id: string, exitPrice: number, exitTime: string, pnl: number) => void;
  onAddTradeClick: () => void;
  userRole?: 'admin' | 'viewer' | null;
}

export default function TradeList({ trades, settings, onEditTrade, onDeleteTrade, onCloseTrade, onAddTradeClick, userRole = 'viewer' }: TradeListProps) {
  // Search & Filter state variables
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [pairFilter, setPairFilter] = useState('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');

  // Sorting
  const [sortBy, setSortBy] = useState<'date' | 'pnl' | 'pair'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Lightbox / Inspector Drawer State
  const [inspectedTrade, setInspectedTrade] = useState<Trade | null>(null);
  
  // Fast Close Overlay State
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);
  const [closeExitPrice, setCloseExitPrice] = useState('');
  const [closeExitTime, setCloseExitTime] = useState('');
  const [useCalculatedClosePnl, setUseCalculatedClosePnl] = useState(true);
  const [manualClosePnl, setManualClosePnl] = useState('');

  // Active zoomed image lightbox source
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string | null>(null);

  // Currency Formatter
  const formatCurrency = (val: number) => {
    return val.toLocaleString(undefined, {
      style: 'currency',
      currency: settings.baseCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  // Unique Pairs list present in data for filtering
  const availablePairs = Array.from(new Set(trades.map(t => t.pair)));

  // Toggle sorting logic
  const handleSort = (field: 'date' | 'pnl' | 'pair') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Filter Trades
  const filteredTrades = trades.filter(t => {
    // Search matched by Currency pair, strategy name, notes text
    const searchMatch = 
      t.pair.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.strategy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const statusMatch = statusFilter === 'ALL' || t.status === statusFilter;
    const directionMatch = directionFilter === 'ALL' || t.direction === directionFilter;
    const pairMatch = pairFilter === 'ALL' || t.pair === pairFilter;
    
    let outcomeMatch = true;
    if (outcomeFilter === 'WIN') {
      outcomeMatch = t.status === 'CLOSED' && (t.pnl || 0) > 0;
    } else if (outcomeFilter === 'LOSS') {
      outcomeMatch = t.status === 'CLOSED' && (t.pnl || 0) < 0;
    }

    return searchMatch && statusMatch && directionMatch && pairMatch && outcomeMatch;
  });

  // Sort Trades
  const sortedTrades = [...filteredTrades].sort((a, b) => {
    let valA: any = a.entryTime;
    let valB: any = b.entryTime;

    if (sortBy === 'pnl') {
      valA = a.pnl ?? -Infinity;
      valB = b.pnl ?? -Infinity;
    } else if (sortBy === 'pair') {
      valA = a.pair;
      valB = b.pair;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Fast closing submit action
  const handleFastCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingTradeId) return;

    const targetTrade = trades.find(t => t.id === closingTradeId);
    if (!targetTrade) return;

    const exitPriceNum = parseFloat(closeExitPrice);
    if (isNaN(exitPriceNum) || exitPriceNum <= 0) {
      alert('Please enter a valid Exit Price.');
      return;
    }

    const resolvedExitTime = closeExitTime ? new Date(closeExitTime).toISOString() : new Date().toISOString();
    let finalPnl = 0;
    if (useCalculatedClosePnl) {
      finalPnl = autoCalculatePnl(targetTrade.pair, targetTrade.direction, targetTrade.entryPrice, exitPriceNum, targetTrade.lotSize);
    } else {
      finalPnl = parseFloat(manualClosePnl) || 0;
    }

    onCloseTrade(closingTradeId, exitPriceNum, resolvedExitTime, finalPnl);
    
    // Clear state
    setClosingTradeId(null);
    setCloseExitPrice('');
    setCloseExitTime('');
    setManualClosePnl('');
    setUseCalculatedClosePnl(true);
  };

  return (
    <div id="trades-list-view" className="space-y-6 font-sans text-zinc-100 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto select-none">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
            <span>Trade Journal Ledger</span>
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Historical list of recorded setups. Use multi-filter search options to filter.
          </p>
        </div>

        {userRole === 'admin' && (
          <button
            onClick={onAddTradeClick}
            className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold px-5 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition-all self-start md:self-auto cursor-pointer"
          >
            <span>+</span> Record Position
          </button>
        )}
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2.5 text-zinc-400 font-bold text-xs uppercase tracking-wider">
          <Filter className="h-4.5 w-4.5 text-emerald-400" />
          <span>Multi-Filter Engine</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* Text Search Box */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-650" />
            <input
              type="text"
              placeholder="Search pairs, notes, strategy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          {/* Pair Select */}
          <div>
            <select
              value={pairFilter}
              onChange={(e) => setPairFilter(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
            >
              <option value="ALL">All Pairs</option>
              {availablePairs.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Status Select */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
            >
              <option value="ALL">All Positions</option>
              <option value="OPEN">Open (Active)</option>
              <option value="CLOSED">Closed (Completed)</option>
            </select>
          </div>

          {/* Outcome Select */}
          <div>
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value as any)}
              className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-zinc-305 focus:outline-none focus:border-zinc-700"
            >
              <option value="ALL">All Outcomes</option>
              <option value="WIN">Win Setup</option>
              <option value="LOSS">Loss Setup</option>
            </select>
          </div>
        </div>

        {/* Direction Mini Sub-toggles */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-900 text-xs">
          <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">Direction:</span>
          {['ALL', 'BUY', 'SELL'].map(dir => (
            <button
              key={dir}
              onClick={() => setDirectionFilter(dir as any)}
              className={`px-3 py-1 rounded text-[11px] font-semibold cursor-pointer select-none transition-all ${
                directionFilter === dir 
                  ? 'bg-zinc-800 text-white border border-zinc-700' 
                  : 'bg-zinc-905 border border-transparent text-zinc-500 hover:text-zinc-200'
              }`}
            >
              {dir}
            </button>
          ))}
        </div>
      </div>

      {/* Trades count feedback */}
      <div className="text-xs text-zinc-500 font-medium px-1 flex justify-between items-center">
        <span>Displaying <span className="text-zinc-300 font-semibold">{sortedTrades.length}</span> of {trades.length} trade logs</span>
        <div className="flex gap-4 items-center">
          <button onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-white cursor-pointer select-none">
            <span>Date</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
          <button onClick={() => handleSort('pnl')} className="flex items-center gap-1 hover:text-white cursor-pointer select-none">
            <span>Profit / P/L</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Trades Ledger Table */}
      {sortedTrades.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl py-16 text-center select-none">
          <BadgeHelp className="h-10 w-10 text-zinc-650 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No trade records match filters</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1">
            Adjust your filter criteria above or try searching another Forex pair.
          </p>
        </div>
      ) : (
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-950/80 text-zinc-500 text-[10px] uppercase font-bold tracking-widest font-mono">
                  <th className="px-6 py-4">Asset</th>
                  <th className="px-6 py-4">Direction</th>
                  <th className="px-6 py-4 text-center">Lot Size</th>
                  <th className="px-6 py-4">Market Levels (Entry/Sl/Tp)</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Net P/L</th>
                  <th className="px-6 py-4 text-center">Screenshots</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-xs">
                {sortedTrades.map((trade) => {
                  const hasScreenshots = (trade.screenshotsBefore?.length > 0) || (trade.screenshotsAfter?.length > 0);
                  const isWinningSetup = trade.status === 'CLOSED' && (trade.pnl || 0) > 0;
                  const isLosingSetup = trade.status === 'CLOSED' && (trade.pnl || 0) < 0;

                  return (
                    <tr 
                      key={trade.id} 
                      className="hover:bg-zinc-901/40 transition-colors group cursor-pointer"
                      onClick={() => setInspectedTrade(trade)}
                    >
                      {/* Asset & Strategy */}
                      <td className="px-6 py-4.5">
                        <div className="font-mono font-bold text-white text-sm tracking-wide">{trade.pair}</div>
                        <div className="text-[10px] text-zinc-500 font-medium truncate max-w-[150px] mt-0.5">{trade.strategy}</div>
                      </td>

                      {/* Direction */}
                      <td className="px-6 py-4.5">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                          trade.direction === 'BUY' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {trade.direction}
                        </span>
                      </td>

                      {/* Lots */}
                      <td className="px-6 py-4.5 text-center font-mono font-semibold text-zinc-300">
                        {trade.lotSize.toFixed(2)}
                      </td>

                      {/* Levels */}
                      <td className="px-6 py-4.5">
                        <div className="font-mono font-medium text-zinc-200">Entry: {trade.entryPrice.toFixed(5)}</div>
                        <div className="text-[10px] font-mono text-zinc-550 mt-1 flex gap-2">
                          <span className="text-zinc-600">SL:</span>
                          <span className="text-rose-500/80">{trade.sl ? trade.sl.toFixed(5) : '--'}</span>
                          <span className="text-zinc-700">|</span>
                          <span className="text-zinc-650">TP:</span>
                          <span className="text-emerald-500/80">{trade.tp ? trade.tp.toFixed(5) : '--'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4.5 text-center">
                        {trade.status === 'CLOSED' ? (
                          <div className="flex items-center justify-center gap-1 text-zinc-500 text-[10px]">
                            <CheckCircle2 className="h-3.5 w-3.5 text-zinc-650" />
                            <span>Closed</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-amber-400 text-[10px] font-semibold">
                            <Clock className="h-3.5 w-3.5 animate-spin-slow duration-1000" />
                            <span>Running</span>
                          </div>
                        )}
                      </td>

                      {/* Final Net Pnl */}
                      <td className="px-6 py-4.5 text-right font-mono font-bold text-sm">
                        {trade.status === 'CLOSED' ? (
                          <span className={isWinningSetup ? 'text-emerald-400' : isLosingSetup ? 'text-rose-400' : 'text-zinc-400'}>
                            {trade.pnl && trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl || 0)}
                          </span>
                        ) : (
                          <span className="text-zinc-500 italic text-[11px] font-medium">- Running</span>
                        )}
                      </td>

                      {/* Screenshots Indicator */}
                      <td className="px-6 py-4.5 text-center">
                        {hasScreenshots ? (
                          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 font-medium">
                            {(trade.screenshotsBefore?.length || 0) + (trade.screenshotsAfter?.length || 0)} pic
                          </span>
                        ) : (
                          <span className="text-zinc-650 font-medium">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center items-center gap-2">
                          {userRole === 'admin' ? (
                            <>
                              {/* Close Position Fast Button */}
                              {trade.status === 'OPEN' && (
                                <button
                                  onClick={() => {
                                    setClosingTradeId(trade.id);
                                    setCloseExitPrice(trade.entryPrice.toString());
                                    const now = new Date();
                                    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                                    setCloseExitTime(now.toISOString().substring(0, 16));
                                  }}
                                  className="px-2 py-1 bg-amber-500 text-zinc-950 font-bold rounded hover:bg-amber-400 text-[10px] cursor-pointer"
                                  title="Instant Close Position"
                                >
                                  Close
                                </button>
                              )}
                              
                              <button
                                onClick={() => onEditTrade(trade)}
                                className="p-1.5 text-zinc-455 hover:text-white hover:bg-zinc-900 rounded cursor-pointer"
                                title="Edit"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  if (window.confirm('Delete this trade record? This action is permanent.')) {
                                    onDeleteTrade(trade.id);
                                  }
                                }}
                                className="p-1.5 text-zinc-455 hover:text-rose-400 hover:bg-zinc-900 rounded cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] bg-zinc-900 text-zinc-550 border border-zinc-900/50 px-2 py-0.5 rounded font-medium uppercase tracking-wider">
                              View Only
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAILED DRAWERS / OVERLAYS PANEL */}

      {/* 1. Fast Close Overlay */}
      {closingTradeId && (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button 
              onClick={() => setClosingTradeId(null)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-white">Instant Close Trade</h3>
              <p className="text-xs text-zinc-500 mt-1">Exit currency assets and finalize Profit/Loss outcomes</p>
            </div>

            <form onSubmit={handleFastCloseSubmit} className="space-y-4 text-sm font-sans">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Exit Price</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 1.08900"
                  value={closeExitPrice}
                  onChange={(e) => setCloseExitPrice(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-805 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Exit Timestamp</label>
                <input
                  type="datetime-local"
                  required
                  value={closeExitTime}
                  onChange={(e) => setCloseExitTime(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-805 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono text-zinc-300"
                />
              </div>

              <div className="border-t border-zinc-900/60 pt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoClosePnlCheck"
                    checked={useCalculatedClosePnl}
                    onChange={(e) => setUseCalculatedClosePnl(e.target.checked)}
                    className="rounded text-emerald-500 bg-zinc-900 focus:ring-0 cursor-pointer h-4 w-4"
                  />
                  <label htmlFor="autoClosePnlCheck" className="text-xs text-zinc-400 cursor-pointer select-none">
                    Formulate auto P/L based on contract specifications
                  </label>
                </div>

                {!useCalculatedClosePnl && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Manual P/L Override ({settings.baseCurrency})</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 120.00"
                      value={manualClosePnl}
                      onChange={(e) => setManualClosePnl(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-805 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setClosingTradeId(null)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Close & Save Output
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Full Trade Detail Card Slide-over Inspector */}
      {inspectedTrade && (
        <div 
          className="fixed inset-0 bg-black/75 z-40 flex items-center justify-end p-0"
          onClick={() => setInspectedTrade(null)}
        >
          <div 
            className="bg-zinc-950 w-full max-w-xl h-full border-l border-zinc-900 shadow-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close */}
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    inspectedTrade.direction === 'BUY' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                  }`}>
                    {inspectedTrade.direction} POSITION
                  </span>
                  <p className="text-2xl font-bold font-mono tracking-tight text-white mt-1.5">{inspectedTrade.pair}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  {userRole === 'admin' && (
                    <button
                      onClick={() => {
                        onEditTrade(inspectedTrade);
                        setInspectedTrade(null);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 rounded cursor-pointer"
                      title="Edit Record"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => setInspectedTrade(null)}
                    className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 rounded cursor-pointer"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-2 gap-4 divide-y divide-zinc-900 bg-zinc-900/15 border border-zinc-900 rounded-xl p-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-550 uppercase tracking-widest block font-medium">Position Lot size</span>
                  <span className="text-base font-semibold font-mono text-zinc-300">{inspectedTrade.lotSize.toFixed(2)} Lot</span>
                </div>

                <div className="space-y-1 pt-0">
                  <span className="text-[10px] text-zinc-550 uppercase tracking-widest block font-medium">PnL Summary</span>
                  {inspectedTrade.status === 'CLOSED' ? (
                    <span className={`text-base font-bold font-mono ${
                      (inspectedTrade.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {inspectedTrade.pnl && inspectedTrade.pnl >= 0 ? '+' : ''}{formatCurrency(inspectedTrade.pnl || 0)}
                    </span>
                  ) : (
                    <span className="text-amber-450 text-xs font-semibold uppercase flex items-center gap-1 mt-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                      Position Running
                    </span>
                  )}
                </div>

                <div className="space-y-1 pt-3.5">
                  <span className="text-[10px] text-zinc-550 uppercase tracking-widest block font-medium">Entry Price Level</span>
                  <span className="text-xs font-semibold font-mono text-zinc-300">{inspectedTrade.entryPrice.toFixed(5)}</span>
                </div>

                <div className="space-y-1 pt-3.5">
                  <span className="text-[10px] text-zinc-550 uppercase tracking-widest block font-medium">Exit Price Level</span>
                  <span className="text-xs font-semibold font-mono text-zinc-300">
                    {inspectedTrade.exitPrice ? inspectedTrade.exitPrice.toFixed(5) : '--'}
                  </span>
                </div>
              </div>

              {/* Stop loss and risk analysis */}
              <div className="space-y-2.5 bg-zinc-900/30 p-4 border border-zinc-900 rounded-xl">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-450 border-b border-zinc-900 pb-1.5">Trade Execution Parameters</h4>
                <div className="grid grid-cols-2 gap-3.5 text-xs text-zinc-400">
                  <div className="flex justify-between items-center bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-900">
                    <span className="text-zinc-550 font-medium">Stop Loss:</span>
                    <span className="font-mono font-semibold text-rose-400">{inspectedTrade.sl ? inspectedTrade.sl.toFixed(5) : '--'}</span>
                  </div>
                  <div className="flex justify-between items-center bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-900">
                    <span className="text-zinc-550 font-medium">Take Profit:</span>
                    <span className="font-mono font-semibold text-emerald-400">{inspectedTrade.tp ? inspectedTrade.tp.toFixed(5) : '--'}</span>
                  </div>
                </div>

                {/* Calculate Pip counts */}
                {inspectedTrade.status === 'CLOSED' && inspectedTrade.exitPrice && (
                  <div className="flex justify-between items-center text-xs bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-900 mt-2">
                    <span className="text-zinc-500 font-medium">Pips outcome:</span>
                    <span className={`font-mono font-bold ${
                      (inspectedTrade.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-450'
                    }`}>
                      {calculatePips(inspectedTrade.pair, inspectedTrade.entryPrice, inspectedTrade.exitPrice, inspectedTrade.direction)} pips
                    </span>
                  </div>
                )}
              </div>

              {/* Time stamps */}
              <div className="space-y-2 text-xs">
                <span className="text-[10px] text-zinc-550 uppercase tracking-widest font-bold">Trading Logs Timeline</span>
                <p className="text-zinc-400 flex justify-between">
                  <span>Entry Recorded:</span>
                  <span className="font-mono font-medium">{new Date(inspectedTrade.entryTime).toLocaleString()}</span>
                </p>
                {inspectedTrade.exitTime && (
                  <p className="text-zinc-400 flex justify-between">
                    <span>Exit Recorded:</span>
                    <span className="font-mono font-medium">{new Date(inspectedTrade.exitTime).toLocaleString()}</span>
                  </p>
                )}
              </div>

              {/* Tags select */}
              {inspectedTrade.tags?.length > 0 && (
                <div className="space-y-2 text-xs">
                  <span className="text-[10px] text-zinc-550 uppercase tracking-widest font-bold block">Tags & Annotations</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {inspectedTrade.tags.map(tag => (
                      <span key={tag} className="px-2.5 py-0.5 border border-zinc-900 bg-zinc-900/60 rounded text-[11px] text-zinc-400 font-semibold font-sans">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2 bg-zinc-900/10 border border-zinc-900 p-4 rounded-xl text-xs">
                <span className="text-[10px] text-zinc-550 uppercase tracking-widest font-bold block">Journal Commentary</span>
                <p className="text-zinc-400 font-sans leading-relaxed mt-1 text-xs select-text">
                  {inspectedTrade.notes || 'No notes added for this position record.'}
                </p>
              </div>

              {/* Screenshots Display Grid */}
              <div className="space-y-3.5 border-t border-zinc-950 pt-4">
                <span className="text-[10px] text-zinc-550 uppercase tracking-widest font-bold block">Visual Analytics & Attachments</span>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Before state */}
                  <div className="space-y-2">
                    <span className="text-[11px] text-zinc-500 font-medium">Setup Structure (Before)</span>
                    {inspectedTrade.screenshotsBefore?.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        {inspectedTrade.screenshotsBefore.map((src, i) => (
                          <div 
                            key={i} 
                            onClick={() => setZoomedImageSrc(src)}
                            className="h-16 relative overflow-hidden rounded bg-zinc-900 border border-zinc-800 cursor-zoom-in"
                          >
                            <img src={src} alt="Before" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-[10px] text-zinc-700 bg-zinc-900/20 text-center rounded border border-zinc-900">No images attached</div>
                    )}
                  </div>

                  {/* After state */}
                  <div className="space-y-2">
                    <span className="text-[11px] text-zinc-500 font-medium">Outcome Analytics (After)</span>
                    {inspectedTrade.screenshotsAfter?.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        {inspectedTrade.screenshotsAfter.map((src, i) => (
                          <div 
                            key={i} 
                            onClick={() => setZoomedImageSrc(src)}
                            className="h-16 relative overflow-hidden rounded bg-zinc-900 border border-zinc-850 cursor-zoom-in"
                          >
                            <img src={src} alt="After" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-[10px] text-zinc-700 bg-zinc-900/20 text-center rounded border border-zinc-900">No images attached</div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Actions panel */}
            <div className="border-t border-zinc-900 pt-4 flex gap-2">
              <button
                onClick={() => setInspectedTrade(null)}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-xs font-semibold rounded-lg text-zinc-400 border border-zinc-850/60"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Zoomed Image Lightbox Overlay */}
      {zoomedImageSrc && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImageSrc(null)}
        >
          <img src={zoomedImageSrc} alt="Zoomed Screenshot" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
          <button 
            onClick={() => setZoomedImageSrc(null)}
            className="absolute top-4 right-4 bg-zinc-900 hover:bg-zinc-850 text-white rounded-full p-2.5 cursor-pointer z-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

    </div>
  );
}
