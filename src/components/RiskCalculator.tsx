/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calculator, AlertTriangle, HelpCircle, Coins, Target, Percent } from 'lucide-react';
import { UserSettings } from '../types';
import { POPULAR_PAIRS } from '../utils';

interface RiskCalculatorProps {
  settings: UserSettings;
}

export default function RiskCalculator({ settings }: RiskCalculatorProps) {
  // Input states
  const [balance, setBalance] = useState(settings.startingBalance.toString());
  const [riskPercent, setRiskPercent] = useState('1.0');
  const [pair, setPair] = useState('EURUSD');
  
  // Sizing mode (direct pips entry vs prices entry)
  const [inputMode, setInputMode] = useState<'pips' | 'price'>('pips');
  const [stopLossPips, setStopLossPips] = useState('25');
  
  // Prices entry parameters
  const [calcEntryPrice, setCalcEntryPrice] = useState('1.08500');
  const [calcSlPrice, setCalcSlPrice] = useState('1.08250');

  // Outputs
  const [cashAtRisk, setCashAtRisk] = useState(0);
  const [standardLots, setStandardLots] = useState(0);
  const [miniLots, setMiniLots] = useState(0);
  const [microLots, setMicroLots] = useState(0);
  const [finalPips, setFinalPips] = useState(0);

  // Parse and calculate on every change
  useEffect(() => {
    const balNum = parseFloat(balance) || settings.startingBalance;
    const rPct = parseFloat(riskPercent) || 1.0;
    
    // 1. Calculate final Cash Amount at Risk
    const calculatedCashAtRisk = balNum * (rPct / 100);
    setCashAtRisk(Number(calculatedCashAtRisk.toFixed(2)));

    // 2. Resolve Stop loss in pips
    let pips = 0;
    if (inputMode === 'pips') {
      pips = parseFloat(stopLossPips) || 0;
    } else {
      const entry = parseFloat(calcEntryPrice) || 0;
      const sl = parseFloat(calcSlPrice) || 0;
      if (entry > 0 && sl > 0) {
        const isJpy = pair.toUpperCase().endsWith('JPY');
        const pipSize = isJpy ? 0.01 : 0.0001;
        pips = Math.abs(entry - sl) / pipSize;
      }
    }
    setFinalPips(Number(pips.toFixed(1)));

    // 3. Formulate standard lots size
    // For standard pairs: Risk in USD = Pips * LotSize * 10 
    // Therefore, LotSize = RiskAtUSD / (Pips * 10)
    // For JPY pairs: Risk is slightly converted (assume JPY factor / rate division)
    // For Gold (XAUUSD): 1 pip = 0.10 price points. Standard contract: Profit = diff * lots * 100
    if (pips > 0) {
      const isGold = pair.toUpperCase() === 'XAUUSD';
      let lotSizeDivider = 10; // Standard USD contract pip gain at 1 lot

      if (isGold) {
        // Gold: Risk = Pips * Lots * 10 (Gold pip size is 0.1, so 1 pip = $10 on 1 Lot size)
        lotSizeDivider = 10;
      } else if (pair.toUpperCase().endsWith('JPY')) {
        // JPY pairs: estimated divisor normalized by 155.0 rate USD conversion
        // LotSize = RiskAmount / (Pips * (1000 / 155.0)) = RiskAmount / (Pips * 6.45)
        lotSizeDivider = 6.45;
      }

      const lots = calculatedCashAtRisk / (pips * lotSizeDivider);
      const roundedLots = Number(Math.max(0.01, lots).toFixed(2));
      
      setStandardLots(roundedLots);
      setMiniLots(Number((roundedLots * 10).toFixed(2)));
      setMicroLots(Number((roundedLots * 100).toFixed(2)));
    } else {
      setStandardLots(0);
      setMiniLots(0);
      setMicroLots(0);
    }
  }, [balance, riskPercent, pair, inputMode, stopLossPips, calcEntryPrice, calcSlPrice]);

  return (
    <div id="risk-calculator" className="space-y-6 font-sans text-zinc-100 p-8 max-w-4xl mx-auto select-none">
      
      {/* Header */}
      <div className="border-b border-zinc-900 pb-6">
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Calculator className="h-6 w-6 text-emerald-400" />
          <span>Interactive Risk & Sizing Calculator</span>
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Perform rigorous mathematics prior to executing orders. Protect your capital with correct structural sizing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* INPUT PARAMETERS BOX */}
        <div className="bg-zinc-950 border border-zinc-904 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-semibold text-zinc-450 uppercase tracking-widest border-b border-zinc-900 pb-1.5 flex items-center gap-1.5">
            <Coins className="h-4 w-4 text-emerald-400" />
            <span>Capital Settings</span>
          </h3>

          {/* Account Balance and Risk Percent */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Account Balance ({settings.baseCurrency})</label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-805 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-700 font-bold"
                placeholder="Initial capital"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Capital Risk Percent (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-805 rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-400 font-bold"
                  placeholder="e.g. 1.0%"
                  required
                />
                <Percent className="absolute right-3 top-3 h-3.5 w-3.5 text-zinc-600" />
              </div>
            </div>
          </div>

          {/* Currency Pair and Sizing Mode selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Forex Asset Class</label>
              <select
                value={pair}
                onChange={(e) => setPair(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-805 rounded-xl px-3 py-2.5 text-xs text-white font-sans focus:outline-none"
              >
                {POPULAR_PAIRS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Stop Loss Input Mode</label>
              <div className="grid grid-cols-2 p-0.5 bg-zinc-900 rounded-xl border border-zinc-850">
                <button
                  type="button"
                  onClick={() => setInputMode('pips')}
                  className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    inputMode === 'pips' 
                      ? 'bg-zinc-805 text-white' 
                      : 'text-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  Pips Count
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('price')}
                  className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    inputMode === 'price' 
                      ? 'bg-zinc-850 text-white' 
                      : 'text-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  Market Price
                </button>
              </div>
            </div>
          </div>

          {/* Stop Loss direct or price parameters */}
          {inputMode === 'pips' ? (
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Stop Loss Distance (In Pips)</label>
              <input
                type="number"
                value={stopLossPips}
                onChange={(e) => setStopLossPips(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-805 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-700"
                placeholder="e.g. 25 pips"
                required
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Entry Execution Level</label>
                <input
                  type="number"
                  step="any"
                  value={calcEntryPrice}
                  onChange={(e) => setCalcEntryPrice(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-805 rounded-xl px-3.5 py-2.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-700"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Stop Loss Level</label>
                <input
                  type="number"
                  step="any"
                  value={calcSlPrice}
                  onChange={(e) => setCalcSlPrice(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-805 rounded-xl px-3.5 py-2.5 text-xs text-zinc-330 font-mono focus:outline-none focus:border-rose-450"
                  required
                />
              </div>
            </div>
          )}

          <div className="border-t border-zinc-900/60 pt-4 bg-zinc-900/20 p-3.5 rounded-xl border border-zinc-901 text-center text-xs text-zinc-500 font-medium">
            Forex contract sizing formula: Lots = CapitalRisk / (StopLossPips * StandardPipValue). Gold (XAU) uses contract sizes of 100oz.
          </div>
        </div>

        {/* CALCULATED OUTPUTS PANEL */}
        <div className="bg-zinc-950 border border-zinc-904 p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold text-zinc-450 uppercase tracking-widest border-b border-zinc-900 pb-1.5 flex items-center gap-1.5">
              <Target className="h-4 w-4 text-emerald-400" />
              <span>Sizing & Risk Output</span>
            </h3>

            {/* Prominent Large Stat blocks */}
            <div className="space-y-4 py-4">
              {/* Max aggregate cash risk */}
              <div className="bg-zinc-900/35 border border-zinc-900 rounded-xl p-4.5 flex justify-between items-center">
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Net Capital at Risk</span>
                <span className="text-xl font-bold font-mono text-rose-400">
                  {cashAtRisk.toLocaleString(undefined, {
                    style: 'currency',
                    currency: settings.baseCurrency
                  })}
                </span>
              </div>

              {/* standard lots list block */}
              <div className="bg-zinc-900/35 border border-zinc-950 rounded-xl p-4 space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-medium">Standard Lot Size (100k Units):</span>
                  <span className="text-base font-bold font-mono text-emerald-400">{standardLots} Lots</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-550">Mini Lot size (10k units):</span>
                  <span className="font-mono font-semibold text-zinc-350">{miniLots} Mini Lots</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-550">Micro Lot size (1k units):</span>
                  <span className="font-mono font-semibold text-zinc-350">{microLots} Micro Lots</span>
                </div>
              </div>

              {/* Pip metrics detail */}
              <div className="text-xs text-zinc-450 bg-zinc-950 p-3 rounded-lg border border-zinc-905 flex justify-between">
                <span>Calculated Stop pips count:</span>
                <span className="font-mono font-bold text-white">{finalPips} Pips</span>
              </div>
            </div>
          </div>

          {/* Conditional Alerts */}
          {parseFloat(riskPercent) > 2.5 ? (
            <div className="bg-rose-500/10 border border-rose-500/20 px-3.5 py-3 rounded-xl flex gap-2 text-xs text-rose-400 mt-2">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Excessive Sizing Alert</p>
                <p className="text-[11px] text-rose-500/90 mt-0.5 leading-relaxed">
                  Trading with a risk exceeding 2% can lead to rapid drawdown cycles and severe capital decay. Limit entries to 0.5% - 1.5% allocations.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-3 rounded-xl flex gap-2 text-xs text-emerald-400 mt-2">
              <HelpCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Professional Allocation</p>
                <p className="text-[11px] text-emerald-500/80 mt-0.5 leading-relaxed">
                  Your sizing remains within institutional risk standards (&lt;=2%), which allows your account to buffer natural market volatility cycles.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Contract descriptions guide */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Trading Lot Contract Scale Guides</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans text-zinc-450 leading-relaxed">
          <div className="bg-zinc-900/30 p-3.5 rounded-xl border border-zinc-905">
            <span className="font-bold text-zinc-300">Standard Lot (1.0 Lots)</span>
            <p className="text-[11px] text-zinc-550 mt-1">Represents 100,000 units of currency. Typical pip value is $10.00 USD for standard pairs.</p>
          </div>
          <div className="bg-zinc-900/30 p-3.5 rounded-xl border border-zinc-905">
            <span className="font-bold text-zinc-300">Mini Lot (0.1 Lots)</span>
            <p className="text-[11px] text-zinc-550 mt-1">Represents 10,000 units of currency. Typical pip value is $1.00 USD for standard pairs.</p>
          </div>
          <div className="bg-zinc-900/30 p-3.5 rounded-xl border border-zinc-905">
            <span className="font-bold text-zinc-300">Micro Lot (0.01 Lots)</span>
            <p className="text-[11px] text-zinc-550 mt-1">Represents 1,000 units of currency. Typical pip value is $0.10 USD for standard pairs.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
