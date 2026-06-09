/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Trade } from './types';

// Standard Forex pairs and their base/quote structure
export const POPULAR_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'EURCAD', 'EURAUD', 'GBPCAD',
  'XAUUSD', // Gold
  'BTCUSD', // Bitcoin
  'ETHUSD', // Ethereum
];

export const POPULAR_STRATEGIES = [
  'Support & Resistance Breakout',
  'Moving Average Crossover',
  'Fibonacci Retracement Bounce',
  'Order Block / Smart Money Concepts (SMC)',
  'Trendline Retest',
  'Double Top/Bottom Reversal',
  'Fair Value Gap (FVG) Fill',
  'Scalping Pivot Points',
];

export const POPULAR_TAGS = [
  'News High Impact', 'A-Setup', 'FOMC', 'London Session', 'New York Session',
  'Asia Session', 'Swing', 'Scalp', 'Intraday', 'Counter-trend'
];

/**
 * Checks if a pair is JPY-denominated
 */
export function isJpyPair(pair: string): boolean {
  return pair.toUpperCase().endsWith('JPY');
}

/**
 * Calculates pips for a given price difference
 */
export function calculatePips(pair: string, entry: number, exit: number, direction: 'BUY' | 'SELL'): number {
  if (!entry || !exit) return 0;
  const isJpy = isJpyPair(pair);
  const pipSize = isJpy ? 0.01 : 0.0001;
  const diff = direction === 'BUY' ? (exit - entry) : (entry - exit);
  return Number((diff / pipSize).toFixed(1));
}

/**
 * Automagic P/L estimation in primary currency
 * Standard lot size is 100,000 units. For JPY pairs, standard lot value is converted.
 */
export function autoCalculatePnl(
  pair: string,
  direction: 'BUY' | 'SELL',
  entry: number,
  exit: number,
  lotSize: number
): number {
  if (!entry || !exit || !lotSize) return 0;
  
  const isJpy = isJpyPair(pair);
  const isGold = pair.toUpperCase() === 'XAUUSD';
  const isCrypto = pair.toUpperCase().endsWith('USD') && (pair.toUpperCase().startsWith('BTC') || pair.toUpperCase().startsWith('ETH'));
  
  const diff = direction === 'BUY' ? (exit - entry) : (entry - exit);
  
  if (isGold) {
    // Gold: 1 lot = 100 ounces. Profit = diff * lotSize * 100
    return Number((diff * lotSize * 100).toFixed(2));
  } else if (isCrypto) {
    // Crypto: 1 lot = 1 coin. Profit = diff * lotSize
    return Number((diff * lotSize).toFixed(2));
  } else if (isJpy) {
    // JPY pairs: 1 lot = 100,000 units. Exit - Entry * lotSize * 100,000. 
    // Usually divided by USDJPY rate (let's assume approx ~150-160, let's divide by 155 for approx USD conversion or treat as roughly quote units)
    // We can do standard multiplier: (diff) * lotSize * 100,000 / 155.0
    const pipProfitInJPY = diff * lotSize * 100000;
    return Number((pipProfitInJPY / 155.0).toFixed(2)); // estimated USD conversion
  } else {
    // Normal Forex pairs (quote is USD e.g. EURUSD, GBPUSD): 1 lot of EURUSD means buying 100k EUR.
    // Pnl in USD (quote currency) = diff * 100,000 * lotSize
    return Number((diff * lotSize * 100000).toFixed(2));
  }
}

/**
 * Compresses an image selected by user to a smaller data URL (approx under 100kb)
 */
export function compressImage(file: File, maxWidth = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Image failed to load'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File reader failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * Estimates Win Rate, Sharpe, Max Drawdown
 */
export interface TradeStats {
  totalTrades: number;
  totalPnl: number;
  winRate: number; // 0 - 100
  wins: number;
  losses: number;
  bestPair: string;
  worstPair: string;
  profitFactor: number;
  avgRr: number;
  maxDrawdown: number;
  drawdownPercent: number;
}

export function calculateTradeStats(trades: Trade[], startingBalance: number): TradeStats {
  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const totalTrades = closedTrades.length;
  
  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      totalPnl: 0,
      winRate: 0,
      wins: 0,
      losses: 0,
      bestPair: '-',
      worstPair: '-',
      profitFactor: 0,
      avgRr: 0,
      maxDrawdown: 0,
      drawdownPercent: 0,
    };
  }

  let totalPnl = 0;
  let winsCount = 0;
  let lossesCount = 0;
  let totalWinPnl = 0;
  let totalLossPnl = 0;
  
  const pairPnls: { [key: string]: number } = {};
  let totalRR = 0;
  let validRRCount = 0;

  // Calculate drawdown variables
  let peak = startingBalance;
  let runningBalance = startingBalance;
  let maxDd = 0;

  // Sort closed trades by entry time or exit time to compute equity curve
  const sortedTrades = [...closedTrades].sort((a, b) => {
    return new Date(a.exitTime || a.entryTime).getTime() - new Date(b.exitTime || b.entryTime).getTime();
  });

  for (const t of sortedTrades) {
    const pnl = t.pnl || 0;
    totalPnl += pnl;
    runningBalance += pnl;

    if (runningBalance > peak) {
      peak = runningBalance;
    } else {
      const dd = peak - runningBalance;
      if (dd > maxDd) {
        maxDd = dd;
      }
    }

    if (pnl > 0) {
      winsCount++;
      totalWinPnl += pnl;
    } else if (pnl < 0) {
      lossesCount++;
      totalLossPnl += Math.abs(pnl);
    }

    // Accumulate P/L by pair
    pairPnls[t.pair] = (pairPnls[t.pair] || 0) + pnl;

    // Estimate Risk to Reward (R:R) ratio
    // Average RR based on (ExitPrice - EntryPrice) / (EntryPrice - SL)
    const riskDistance = Math.abs(t.entryPrice - t.sl);
    const rewardDistance = Math.abs((t.exitPrice || t.entryPrice) - t.entryPrice);
    if (riskDistance > 0 && rewardDistance > 0) {
      totalRR += (rewardDistance / riskDistance);
      validRRCount++;
    }
  }

  const winRate = Number(((winsCount / totalTrades) * 100).toFixed(1));
  const profitFactor = totalLossPnl === 0 ? totalWinPnl : Number((totalWinPnl / totalLossPnl).toFixed(2));
  const avgRr = validRRCount === 0 ? 0 : Number((totalRR / validRRCount).toFixed(2));

  // Determine best & worst currency pair
  let bestPair = '-';
  let worstPair = '-';
  let bestPnl = -Infinity;
  let worstPnl = Infinity;

  Object.entries(pairPnls).forEach(([pair, pnl]) => {
    if (pnl > bestPnl) {
      bestPnl = pnl;
      bestPair = pair;
    }
    if (pnl < worstPnl) {
      worstPnl = pnl;
      worstPair = pair;
    }
  });

  if (bestPnl <= 0) bestPair = '-';
  if (worstPnl >= 0) worstPair = '-';

  const drawdownPercent = Number(((maxDd / peak) * 100).toFixed(1));

  return {
    totalTrades,
    totalPnl: Number(totalPnl.toFixed(2)),
    winRate,
    wins: winsCount,
    losses: lossesCount,
    bestPair,
    worstPair,
    profitFactor,
    avgRr,
    maxDrawdown: Number(maxDd.toFixed(2)),
    drawdownPercent: isNaN(drawdownPercent) ? 0 : drawdownPercent,
  };
}
