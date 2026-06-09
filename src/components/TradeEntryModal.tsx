/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  HelpCircle, 
  DollarSign, 
  Clock, 
  ChevronDown, 
  Check, 
  AlertTriangle,
  Coins
} from 'lucide-react';
import { Trade, UserSettings } from '../types';
import { 
  POPULAR_PAIRS, 
  POPULAR_STRATEGIES, 
  POPULAR_TAGS, 
  compressImage,
  autoCalculatePnl
} from '../utils';

interface TradeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trade: Trade) => void;
  editingTrade?: Trade | null;
  settings: UserSettings;
}

export default function TradeEntryModal({ isOpen, onClose, onSave, editingTrade, settings }: TradeEntryModalProps) {
  // Modal states
  const [formStatus, setFormStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [pair, setPair] = useState('EURUSD');
  const [searchPair, setSearchPair] = useState('');
  const [showPairDropdown, setShowPairDropdown] = useState(false);
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  
  // Numeric values
  const [entryPrice, setEntryPrice] = useState('');
  const [lotSize, setLotSize] = useState('0.10');
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');
  
  // Exit parameters
  const [exitPrice, setExitPrice] = useState('');
  const [exitTime, setExitTime] = useState('');
  const [pnlOverride, setPnlOverride] = useState('');
  const [useAutoPnl, setUseAutoPnl] = useState(true);

  // Text & categorical
  const [entryTime, setEntryTime] = useState('');
  const [strategy, setStrategy] = useState('');
  const [customStrategy, setCustomStrategy] = useState('');
  const [strategyType, setStrategyType] = useState('preset'); // 'preset' or 'custom'
  
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [notes, setNotes] = useState('');

  // Screeshot URLs
  const [screenshotsBefore, setScreenshotsBefore] = useState<string[]>([]);
  const [screenshotsAfter, setScreenshotsAfter] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  // Initialize fields on editing / opening
  useEffect(() => {
    if (editingTrade) {
      setFormStatus(editingTrade.status);
      setPair(editingTrade.pair);
      setDirection(editingTrade.direction);
      setEntryPrice(editingTrade.entryPrice.toString());
      setLotSize(editingTrade.lotSize.toString());
      setTp(editingTrade.tp ? editingTrade.tp.toString() : '');
      setSl(editingTrade.sl ? editingTrade.sl.toString() : '');
      
      setEntryTime(editingTrade.entryTime.substring(0, 16)); // Format for datetime-local
      
      if (POPULAR_STRATEGIES.includes(editingTrade.strategy)) {
        setStrategyType('preset');
        setStrategy(editingTrade.strategy);
        setCustomStrategy('');
      } else {
        setStrategyType('custom');
        setStrategy('');
        setCustomStrategy(editingTrade.strategy);
      }

      setSelectedTags(editingTrade.tags || []);
      setNotes(editingTrade.notes || '');
      setScreenshotsBefore(editingTrade.screenshotsBefore || []);
      setScreenshotsAfter(editingTrade.screenshotsAfter || []);
      
      if (editingTrade.status === 'CLOSED') {
        setExitPrice(editingTrade.exitPrice ? editingTrade.exitPrice.toString() : '');
        setExitTime(editingTrade.exitTime ? editingTrade.exitTime.substring(0, 16) : '');
        setPnlOverride(editingTrade.pnl ? editingTrade.pnl.toString() : '');
        setUseAutoPnl(editingTrade.pnl === undefined || editingTrade.pnl === null);
      } else {
        setExitPrice('');
        setExitTime('');
        setPnlOverride('');
        setUseAutoPnl(true);
      }
    } else {
      // Reset to defaults
      setFormStatus('OPEN');
      setPair('EURUSD');
      setDirection('BUY');
      setEntryPrice('');
      setLotSize('0.10');
      setTp('');
      setSl('');
      
      // Default to current date-time
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setEntryTime(now.toISOString().substring(0, 16));
      
      setStrategyType('preset');
      setStrategy(POPULAR_STRATEGIES[0]);
      setCustomStrategy('');
      setSelectedTags([]);
      setCustomTag('');
      setNotes('');
      setScreenshotsBefore([]);
      setScreenshotsAfter([]);
      setExitPrice('');
      setExitTime('');
      setPnlOverride('');
      setUseAutoPnl(true);
    }
  }, [editingTrade, isOpen]);

  if (!isOpen) return null;

  // Filter pairs
  const filteredPairs = POPULAR_PAIRS.filter(p => 
    p.toLowerCase().includes(searchPair.toLowerCase())
  );

  // File uploading handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'before' | 'after') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    try {
      const resizedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        resizedUrls.push(compressed);
      }
      
      if (target === 'before') {
        setScreenshotsBefore([...screenshotsBefore, ...resizedUrls]);
      } else {
        setScreenshotsAfter([...screenshotsAfter, ...resizedUrls]);
      }
    } catch (err) {
      console.error('Image compression failed', err);
      alert('Failed to upload image. Please try another file.');
    } finally {
      setIsCompressing(false);
    }
  };

  const removeScreenshot = (index: number, target: 'before' | 'after') => {
    if (target === 'before') {
      const copy = [...screenshotsBefore];
      copy.splice(index, 1);
      setScreenshotsBefore(copy);
    } else {
      const copy = [...screenshotsAfter];
      copy.splice(index, 1);
      setScreenshotsAfter(copy);
    }
  };

  // Toggle active tags selection
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const addCustomTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customTag.trim()) {
      e.preventDefault();
      if (!selectedTags.includes(customTag.trim())) {
        setSelectedTags([...selectedTags, customTag.trim()]);
      }
      setCustomTag('');
    }
  };

  // Sizing estimation
  const estEntryNum = parseFloat(entryPrice) || 0;
  const estSlNum = parseFloat(sl) || 0;
  const estLotNum = parseFloat(lotSize) || 0;
  
  let riskPips = 0;
  let riskAmount = 0;
  let riskPercent = 0;

  if (estEntryNum > 0 && estSlNum > 0) {
    const isJpy = pair.toUpperCase().endsWith('JPY');
    const pipSize = isJpy ? 0.01 : 0.0001;
    riskPips = Math.abs(estEntryNum - estSlNum) / pipSize;
    
    // Estimate risk in currency using automated formulas
    // SL value is computed by doing the P/L calculation if the trade is stopped out
    const stopLossMultiplier = direction === 'BUY' ? estEntryNum - riskPips * pipSize : estEntryNum + riskPips * pipSize;
    riskAmount = Math.abs(autoCalculatePnl(pair, direction, estEntryNum, stopLossMultiplier, estLotNum));
    riskPercent = Number(((riskAmount / settings.startingBalance) * 100).toFixed(2));
  }

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalStrategy = strategyType === 'preset' ? strategy : customStrategy;
    const finalEntryPrice = parseFloat(entryPrice);
    const finalLotSize = parseFloat(lotSize);
    const finalSl = parseFloat(sl) || 0;
    const finalTp = parseFloat(tp) || 0;

    if (!finalEntryPrice || isNaN(finalEntryPrice)) {
      alert('Please enter a valid Entry Price');
      return;
    }
    if (!finalLotSize || isNaN(finalLotSize)) {
      alert('Please enter a valid Lot Size');
      return;
    }

    // SL/TP validity safeguards to help novice traders prevent errors
    if (finalSl > 0) {
      if (direction === 'BUY' && finalSl >= finalEntryPrice) {
        alert('For BUY trades, Stop Loss (SL) must be below the Entry Price.');
        return;
      }
      if (direction === 'SELL' && finalSl <= finalEntryPrice) {
        alert('For SELL trades, Stop Loss (SL) must be above the Entry Price.');
        return;
      }
    }
    if (finalTp > 0) {
      if (direction === 'BUY' && finalTp <= finalEntryPrice) {
        alert('For BUY trades, Take Profit (TP) must be above the Entry Price.');
        return;
      }
      if (direction === 'SELL' && finalTp >= finalEntryPrice) {
        alert('For SELL trades, Take Profit (TP) must be below the Entry Price.');
        return;
      }
    }

    // Closed status check
    let finalPnl = undefined;
    let verifiedExitPrice = undefined;
    let verifiedExitTime = undefined;

    if (formStatus === 'CLOSED') {
      const exitPriceNum = parseFloat(exitPrice);
      if (isNaN(exitPriceNum) || exitPriceNum <= 0) {
        alert('Please enter a valid Exit Price for closed trades.');
        return;
      }
      verifiedExitPrice = exitPriceNum;
      verifiedExitTime = exitTime ? new Date(exitTime).toISOString() : new Date().toISOString();
      
      if (useAutoPnl) {
        finalPnl = autoCalculatePnl(pair, direction, finalEntryPrice, exitPriceNum, finalLotSize);
      } else {
        finalPnl = parseFloat(pnlOverride) || 0;
      }
    }

    const tradeObject: Trade = {
      id: editingTrade?.id || Math.random().toString(36).substring(2, 11),
      pair,
      direction,
      entryPrice: finalEntryPrice,
      lotSize: finalLotSize,
      tp: finalTp,
      sl: finalSl,
      entryTime: new Date(entryTime).toISOString(),
      strategy: finalStrategy || 'N/A',
      tags: selectedTags,
      status: formStatus,
      exitPrice: verifiedExitPrice,
      exitTime: verifiedExitTime,
      pnl: finalPnl,
      screenshotsBefore,
      screenshotsAfter,
      notes
    };

    onSave(tradeObject);
    onClose();
  };

  // Quick auto-fill stop losses and lot sizes helpers
  const applyHalfPctRisk = () => {
    if (riskPips > 0) {
      const targetRiskAmt = settings.startingBalance * 0.01; // 1%
      const quoteMultiplier = pair.toUpperCase().endsWith('JPY') ? 155.0 : 1.0;
      // standard formula back-calculated
      const size = (targetRiskAmt / (riskPips * 10)) * quoteMultiplier;
      setLotSize(Math.max(0.01, parseFloat(size.toFixed(2))).toString());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex justify-center items-center z-50 p-4 overflow-y-auto backdrop-blur-xs font-sans text-sm">
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-zinc-900 sticky top-0 bg-zinc-950/95 z-20">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {editingTrade ? 'Edit Journal Record' : 'Record New Journal Entry'}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5 uppercase tracking-widest font-mono">
              {editingTrade ? `ID: ${editingTrade.id}` : 'Drafting setup parameter bounds'}
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
          
          {/* Status Indicator Tabs */}
          <div className="grid grid-cols-2 p-1 bg-zinc-900/60 rounded-xl border border-zinc-900 w-fit">
            <button
              type="button"
              onClick={() => setFormStatus('OPEN')}
              className={`px-6 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                formStatus === 'OPEN' 
                  ? 'bg-zinc-800 text-amber-400 shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Active (Open Position)
            </button>
            <button
              type="button"
              onClick={() => setFormStatus('CLOSED')}
              className={`px-6 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                formStatus === 'CLOSED' 
                  ? 'bg-zinc-800 text-emerald-400 shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Closed (Completed Trade)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* LEFT COLUMN: Core Execution Trade Params */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest border-b border-zinc-900/60 pb-1">
                Forex Order Parameters
              </h4>

              {/* Pair and Direction */}
              <div className="grid grid-cols-2 gap-4">
                {/* Searchable Pair Selection */}
                <div className="relative">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Currency Asset</label>
                  <div 
                    onClick={() => setShowPairDropdown(!showPairDropdown)}
                    className="flex justify-between items-center w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-xs cursor-pointer hover:bg-zinc-900/80"
                  >
                    <span className="font-mono font-bold tracking-wide">{pair}</span>
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  </div>
                  
                  {showPairDropdown && (
                    <div className="absolute top-12 left-0 right-0 max-h-48 bg-zinc-950 border border-zinc-900 rounded-xl shadow-2xl overflow-y-auto z-30 p-2 space-y-1.5">
                      <input
                        type="text"
                        placeholder="Search pairs..."
                        value={searchPair}
                        onChange={(e) => setSearchPair(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-emerald-400 font-mono uppercase"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="max-h-36 overflow-y-auto space-y-0.5">
                        {filteredPairs.map((p) => (
                          <div
                            key={p}
                            onClick={() => {
                              setPair(p);
                              setShowPairDropdown(false);
                            }}
                            className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded cursor-pointer flex justify-between items-center ${
                              pair === p ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-900'
                            }`}
                          >
                            <span>{p}</span>
                            {pair === p && <Check className="h-3 w-3" />}
                          </div>
                        ))}
                        {filteredPairs.length === 0 && (
                          <div
                            onClick={() => {
                              if (searchPair.trim()) {
                                setPair(searchPair.toUpperCase().trim());
                                setShowPairDropdown(false);
                              }
                            }}
                            className="p-2 text-[10px] text-zinc-500 text-center cursor-pointer hover:bg-zinc-900 hover:text-emerald-400 font-medium"
                          >
                            Use custom "{searchPair.toUpperCase()}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Direction Buy/Sell */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Direction</label>
                  <div className="grid grid-cols-2 p-0.5 bg-zinc-900 rounded-xl border border-zinc-900">
                    <button
                      type="button"
                      onClick={() => setDirection('BUY')}
                      className={`py-2 rounded-lg text-xs font-semibold uppercase cursor-pointer transition-all ${
                        direction === 'BUY' 
                          ? 'bg-emerald-500 text-zinc-950 shadow-sm' 
                          : 'text-zinc-450 hover:text-zinc-250'
                      }`}
                    >
                      Buy
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('SELL')}
                      className={`py-2 rounded-lg text-xs font-semibold uppercase cursor-pointer transition-all ${
                        direction === 'SELL' 
                          ? 'bg-rose-500 text-zinc-100 shadow-sm' 
                          : 'text-zinc-450 hover:text-zinc-255'
                      }`}
                    >
                      Sell
                    </button>
                  </div>
                </div>
              </div>

              {/* Entry Price & Lot Size */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Entry Price</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g., 1.08450"
                      value={entryPrice}
                      onChange={(e) => setEntryPrice(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-3.5 pr-8 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono font-medium"
                    />
                    <Coins className="absolute right-3 top-2.5 h-3.5 w-3.5 text-zinc-600" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Lot Size</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      placeholder="e.g., 0.10"
                      value={lotSize}
                      onChange={(e) => setLotSize(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-3.5 pr-8 py-2 text-xs text-white focus:outline-none focus:border-slate-400 font-mono font-medium"
                    />
                    <span className="absolute right-3 top-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-bold">Lot</span>
                  </div>
                </div>
              </div>

              {/* Take Profit & Stop Loss */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Take Profit (TP)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g., 1.09200"
                    value={tp}
                    onChange={(e) => setTp(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Stop Loss (SL)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g., 1.08100"
                    value={sl}
                    onChange={(e) => setSl(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-400 font-mono"
                  />
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Entry Timestamp</label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={entryTime}
                    required
                    onChange={(e) => setEntryTime(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-3.5 pr-8 py-2 text-xs text-zinc-300 focus:outline-none focus:border-emerald-400 font-mono"
                  />
                  <Clock className="absolute right-3 top-2.5 h-3.5 w-3.5 text-zinc-650 pointer-events-none" />
                </div>
              </div>

              {/* Strategy */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Strategy Theme / Reason</label>
                <div className="flex gap-2">
                  <select
                    value={strategyType}
                    onChange={(e) => setStrategyType(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-2 text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value="preset">Preset</option>
                    <option value="custom">Custom</option>
                  </select>

                  {strategyType === 'preset' ? (
                    <select
                      value={strategy}
                      onChange={(e) => setStrategy(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    >
                      {POPULAR_STRATEGIES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="Type custom entry reasoning..."
                      value={customStrategy}
                      onChange={(e) => setCustomStrategy(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                    />
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Exit specifications or Risk estimations */}
            <div className="space-y-4">
              
              {/* Conditional closed fields if Status is CLOSED */}
              {formStatus === 'CLOSED' ? (
                <div className="bg-zinc-900/30 border border-zinc-900/80 p-4 rounded-2xl space-y-4">
                  <h4 className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest border-b border-zinc-900 pb-1 flex items-center justify-between">
                    <span>Trade Exit Parameters</span>
                    <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded font-mono font-bold lowercase text-emerald-400">Exit details</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Exit Price</label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="e.g., 1.08950"
                        value={exitPrice}
                        onChange={(e) => setExitPrice(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Exit Timestamp</label>
                      <input
                        type="datetime-local"
                        value={exitTime}
                        onChange={(e) => setExitTime(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                      />
                    </div>
                  </div>

                  <div className="border-t border-zinc-900/60 pt-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="autoPnlCheck"
                        checked={useAutoPnl}
                        onChange={(e) => setUseAutoPnl(e.target.checked)}
                        className="rounded border-zinc-800 text-emerald-500 bg-zinc-900 focus:ring-0 cursor-pointer h-4 w-4"
                      />
                      <label htmlFor="autoPnlCheck" className="text-xs font-medium text-zinc-400 cursor-pointer select-none">
                        Auto-calculate P/L based on Quote Currency formulas
                      </label>
                    </div>

                    {useAutoPnl ? (
                      <div className="bg-zinc-950 px-3.5 py-2.5 rounded-xl border border-zinc-900 flex justify-between items-center text-xs">
                        <span className="text-zinc-500">Estimated Profit/Loss:</span>
                        <span className={`font-mono font-bold ${
                          parseFloat(exitPrice) && parseFloat(entryPrice)
                            ? (autoCalculatePnl(pair, direction, parseFloat(entryPrice), parseFloat(exitPrice), parseFloat(lotSize)) >= 0 
                                ? 'text-emerald-400' 
                                : 'text-rose-400')
                            : 'text-zinc-400'
                        }`}>
                          {parseFloat(exitPrice) && parseFloat(entryPrice)
                            ? `${autoCalculatePnl(pair, direction, parseFloat(entryPrice), parseFloat(exitPrice), parseFloat(lotSize)) >= 0 ? '+' : ''}${autoCalculatePnl(pair, direction, parseFloat(entryPrice), parseFloat(exitPrice), parseFloat(lotSize)).toLocaleString(undefined, {
                                style: 'currency',
                                currency: settings.baseCurrency
                              })}`
                            : `${settings.baseCurrency} --`}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">Manual P/L Override ({settings.baseCurrency})</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 150.00 or -50.00"
                          value={pnlOverride}
                          onChange={(e) => setPnlOverride(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* RISK CALCULATOR DYNAMIC COMPANION (Shown for OPEN trades!) */
                <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-2xl space-y-3.5">
                  <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest border-b border-zinc-900 pb-1 flex items-center justify-between">
                    <span>Risk Metrics Companion</span>
                    <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded font-mono text-zinc-500 font-bold uppercase">Form analysis</span>
                  </h4>

                  {riskPips > 0 ? (
                    <div className="space-y-3 font-sans text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 text-center">
                          <p className="text-[10px] font-medium text-zinc-500 uppercase">Stop Loss Dist.</p>
                          <p className="text-sm font-mono font-bold text-white mt-1">{riskPips.toFixed(1)} Pips</p>
                        </div>
                        <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 text-center">
                          <p className="text-[10px] font-medium text-zinc-500 uppercase">Estimated Loss</p>
                          <p className="text-sm font-mono font-bold text-rose-400 mt-1">-{riskAmount.toLocaleString(undefined, { style: 'currency', currency: settings.baseCurrency })}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-zinc-950 px-3 py-2 border border-zinc-900 rounded-xl text-xs">
                        <span className="text-zinc-500 font-medium">Risk of Capital:</span>
                        <span className={`font-semibold font-mono ${riskPercent > 2 ? 'text-amber-500' : 'text-emerald-400'}`}>
                          {riskPercent}%
                        </span>
                      </div>

                      {riskPercent > 3 && (
                        <div className="bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 rounded-lg flex gap-2 text-[11px] text-rose-400">
                          <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                          <p>
                            Alert: Sizing exceeds standard professional risk bounds (&gt;3%). Tap the helper below to auto-scale.
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={applyHalfPctRisk}
                        className="w-full text-center py-2 bg-zinc-900 text-emerald-400 hover:bg-zinc-850 rounded-xl border border-emerald-500/10 hover:border-emerald-500/20 text-xs font-semibold select-none cursor-pointer duration-150"
                      >
                        Adjust Lot size to standard 1% Risk Amount
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-zinc-500 text-xs flex flex-col items-center justify-center gap-1">
                      <HelpCircle className="h-5 w-5 text-zinc-600 mb-1" />
                      <p className="font-semibold">Determine risk dynamically</p>
                      <p className="max-w-[200px] text-[10px] text-zinc-650">Fill in Entry Price & Stop Loss fields to calculate pip distance and capital variance</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tags Selector Input */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-400">Strategy Labels (Tags)</label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto border border-zinc-900 p-2.5 bg-zinc-900/60 rounded-xl">
                  {POPULAR_TAGS.map(t => {
                    const isSelected = selectedTags.includes(t);
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => toggleTag(t)}
                        className={`px-2.5 py-1 rounded text-[11px] cursor-pointer font-medium select-none transition-all ${
                          isSelected 
                            ? 'bg-emerald-500/15 border border-emerald-400/40 text-emerald-400' 
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-450 hover:bg-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  placeholder="Type new custom tag and tap Enter"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={addCustomTag}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

            </div>
          </div>

          {/* Screenshots Uploder section */}
          <div className="border-t border-zinc-900 pt-5 space-y-4">
            <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest border-b border-zinc-900/60 pb-1">
              Visual Trade Ledger (Screenshots)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Before Screenshots */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <span>Entry Confirmation Chart (Before)</span>
                  <span className="text-[10px] text-zinc-600 font-sans font-normal">(Multiple supported)</span>
                </label>

                {/* Upload Zone */}
                <div className="relative border border-dashed border-zinc-800 hover:border-emerald-500/40 bg-zinc-900/20 hover:bg-zinc-900/30 rounded-2xl p-4 text-center transition-all cursor-pointer group">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'before')}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    id="upload-before"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Upload className="h-5 w-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                    <p className="text-[11px] font-semibold text-zinc-300">Drag Chart Screenshot or Browse</p>
                    <p className="text-[10px] text-zinc-500">JPEG, PNG files auto-resized for storage limits</p>
                  </div>
                </div>

                {/* Image Previews */}
                {screenshotsBefore.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {screenshotsBefore.map((src, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-zinc-805 h-16 bg-zinc-900">
                        <img src={src} alt="Pre-Trade" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeScreenshot(idx, 'before')}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-500 transition-all cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* After Screenshots */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <span>Outcome / Technical Study Chart (After)</span>
                  <span className="text-[10px] text-zinc-650 font-sans font-normal">(Multiple supported)</span>
                </label>

                {/* Upload Zone */}
                <div className="relative border border-dashed border-zinc-800 hover:border-emerald-500/40 bg-zinc-900/20 hover:bg-zinc-900/30 rounded-2xl p-4 text-center transition-all cursor-pointer group">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'after')}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    id="upload-after"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Upload className="h-5 w-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                    <p className="text-[11px] font-semibold text-zinc-300">Drag Chart Screenshot or Browse</p>
                    <p className="text-[10px] text-zinc-500">JPEG, PNG files auto-resized for storage limits</p>
                  </div>
                </div>

                {/* Image Previews */}
                {screenshotsAfter.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {screenshotsAfter.map((src, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-zinc-805 h-16 bg-zinc-900">
                        <img src={src} alt="Post-Trade" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeScreenshot(idx, 'after')}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-500 transition-all cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-400">Journal Narrative / Execution Comments</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record details about the trade structure, market sentiments, physical execution state, or mental biases felt during the trade."
              className="w-full h-24 bg-zinc-900 border border-zinc-850 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          {isCompressing && (
            <div className="text-[11px] text-amber-500 flex items-center gap-2 animate-pulse bg-amber-500/5 px-3 py-2 rounded-lg border border-amber-500/10 w-fit">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              <span>Optimizing chart screenshot sizes for client persistence... Please wait.</span>
            </div>
          )}

          {/* Action Buttons Footer */}
          <div className="flex gap-3 justify-end border-t border-zinc-900/60 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-350 px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCompressing}
              id="trade-save-btn"
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 font-bold px-7 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Confirm & Save Trade
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
