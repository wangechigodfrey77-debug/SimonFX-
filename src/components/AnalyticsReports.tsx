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
import { Download, TrendingUp, Award, CalendarDays, FileDown } from 'lucide-react';
import { Trade, UserSettings } from '../types';
import { calculateTradeStats } from '../utils';
import { jsPDF } from 'jspdf';

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

  // 5. Prepare YTD Monthly Performance Data
  const getYtdMonthlyTrendData = () => {
    const months = [
      { name: 'January', key: 'Jan', index: 0 },
      { name: 'February', key: 'Feb', index: 1 },
      { name: 'March', key: 'Mar', index: 2 },
      { name: 'April', key: 'Apr', index: 3 },
      { name: 'May', key: 'May', index: 4 },
      { name: 'June', key: 'Jun', index: 5 },
      { name: 'July', key: 'Jul', index: 6 },
      { name: 'August', key: 'Aug', index: 7 },
      { name: 'September', key: 'Sep', index: 8 },
      { name: 'October', key: 'Oct', index: 9 },
      { name: 'November', key: 'Nov', index: 10 },
      { name: 'December', key: 'Dec', index: 11 }
    ];

    const currentYear = trades.length > 0
      ? new Date(trades.reduce((latest, t) => {
          const tTime = new Date(t.exitTime || t.entryTime).getTime();
          return tTime > latest ? tTime : latest;
        }, 0)).getFullYear()
      : new Date().getFullYear();

    const closedInYear = trades.filter(t => {
      if (t.status !== 'CLOSED') return false;
      const d = new Date(t.exitTime || t.entryTime);
      return d.getFullYear() === currentYear;
    });

    let runningEquity = settings.startingBalance;

    const monthlyStats = months.map(m => {
      const monthTrades = closedInYear.filter(t => {
        const d = new Date(t.exitTime || t.entryTime);
        return d.getMonth() === m.index;
      });

      let pnlValue = 0;
      let winsCount = 0;
      let lossesCount = 0;

      monthTrades.forEach(t => {
        const val = t.pnl || 0;
        pnlValue += val;
        if (val > 0) winsCount++;
        else if (val < 0) lossesCount++;
      });

      runningEquity += pnlValue;
      const total = monthTrades.length;
      const winRate = total === 0 ? 0 : Math.round((winsCount / total) * 100);

      return {
        name: m.name,
        shortName: m.key,
        pnl: Number(pnlValue.toFixed(2)),
        cumulativeEquity: Number(runningEquity.toFixed(2)),
        winRate,
        wins: winsCount,
        losses: lossesCount,
        totalTrades: total
      };
    });

    const now = new Date();
    // Return based on current year or full year for past entries
    if (currentYear === now.getFullYear()) {
      return monthlyStats.slice(0, now.getMonth() + 1);
    }
    return monthlyStats;
  };

  const winLossData = getWinLossPieData();
  const pairPerfData = getPairPerformanceData();
  const strategyPerfData = getStrategyPerformanceData();
  const ytdMonthlyData = getYtdMonthlyTrendData();
  const ytdTotalPnl = ytdMonthlyData.reduce((total, m) => total + m.pnl, 0);
  const hasAnyMonthlyData = ytdMonthlyData.some(m => m.pnl !== 0);

  const currentYear = ytdMonthlyData.length > 0 
    ? new Date(trades.reduce((latest, t) => {
        const tTime = new Date(t.exitTime || t.entryTime).getTime();
        return tTime > latest ? tTime : latest;
      }, 0)).getFullYear()
    : new Date().getFullYear();

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
    link.setAttribute("download", `simonfx_journal_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Performance Report to PDF (programmatic pdf template generation with charts)
  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Color definitions
    const primaryColor = [15, 23, 42]; // Slate 900
    const accentColor = [16, 185, 129]; // Emerald 500
    const roseColor = [244, 63, 94]; // Rose 500
    
    const pageHeight = 297;
    let pageNum = 1;
    
    const drawHeader = (titleString: string) => {
      // Top elegant accent bar
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 15, 'F');
      
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(0, 15, 210, 2, 'F');
      
      // Header Brand Text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text("SimonFX Performance Ledger", 15, 11);
      
      // Header Page Title
      doc.setTextColor(51, 65, 85); // Slate 700
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(titleString, 15, 29);
      
      // Meta Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // Slate 500
      doc.text(`Official Analytical Statement • Scope: ${timeScope === 'ALL' ? 'All-Time Records' : timeScope === 'WEEK' ? '7-Day Span' : timeScope === 'MONTH' ? '30-Day Span' : timeScope === 'QUARTER' ? 'Quarterly Summary' : 'Yearly Summary'}`, 15, 34);
      
      // Divider line
      doc.setDrawColor(203, 213, 225); // Slate 300
      doc.setLineWidth(0.3);
      doc.line(15, 38, 195, 38);
    };

    const drawFooter = () => {
      doc.setDrawColor(226, 232, 240); // Slate 200
      doc.setLineWidth(0.25);
      doc.line(15, pageHeight - 15, 195, pageHeight - 15);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text(`SimonFX Journal • Generated: ${new Date().toLocaleString()}`, 15, pageHeight - 10);
      doc.text(`Page ${pageNum}`, 195, pageHeight - 10, { align: 'right' });
    };

    // --- PAGE 1: METRICS & YTD MONTHLY TREND ---
    drawHeader("Executive Analytics Summary");
    
    // Trader Metadata Box
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.rect(15, 42, 180, 20, 'F');
    
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("ACCOUNT PREFERENCES & CAPITAL SUMMARY", 20, 47);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Trader Profile: ${settings.userName}`, 20, 53);
    doc.text(`Initial Balance Reference: ${formatCurrency(settings.startingBalance)}`, 20, 58);
    
    // Calculated net stats
    const netGrowthPct = ((stats.totalPnl / settings.startingBalance) * 100).toFixed(2);
    doc.text(`Net Income Generated: ${stats.totalPnl >= 0 ? '+' : ''}${formatCurrency(stats.totalPnl)} (${netGrowthPct}%)`, 105, 53);
    doc.text(`Operational Currency: ${settings.baseCurrency} account base`, 105, 58);

    // KEY PERFORMANCE INDICATORS BLOCKS
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text("KEY STATISTICAL BENCHMARKS", 15, 70);
    
    // 4 Columns of KPI Cards
    const kpis = [
      { label: "TRADES SCOPED", val: `${stats.totalTrades}`, detail: `${stats.wins} W / ${stats.losses} L` },
      { label: "PROFIT FACTOR", val: `${stats.profitFactor}`, detail: "Gross profit / Gross loss" },
      { label: "CONCLUDED WIN RATE", val: `${stats.winRate}%`, detail: stats.winRate > 50 ? "Positive expectancy" : "Risk border alert" },
      { label: "NET INCOME EARNED", val: `${stats.totalPnl >= 0 ? '+' : ''}${formatCurrency(stats.totalPnl)}`, detail: `Based on ${settings.baseCurrency}` }
    ];
    
    kpis.forEach((k, idx) => {
      const x = 15 + idx * 46;
      doc.setFillColor(248, 250, 252); // Slate 50
      doc.setDrawColor(226, 232, 240); // slate 200
      doc.rect(x - 0.5, 74, 43, 21, 'FD');
      
      // Label
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(k.label, x + 2, 79);
      
      // Value
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(k.val, x + 2, 85);
      
      // Detail
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(k.detail, x + 2, 91);
    });

    // YTD MONTHLY TREND SECTION
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`YEAR-TO-DATE (YTD) MONTHLY TREND ANALYSIS (${currentYear})`, 15, 103);
    
    // Column headers for Monthly trend
    doc.setFillColor(15, 23, 42); // Black Slate Header
    doc.rect(15, 107, 180, 7.5, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text("Calendar Month", 18, 112);
    doc.text("Trades Count", 65, 112, { align: 'center' });
    doc.text("Win / Loss Record", 105, 112, { align: 'center' });
    doc.text("Win Rate %", 145, 112, { align: 'center' });
    doc.text("P/L Contribution", 192, 112, { align: 'right' });

    // Draw rows
    let currentY = 114.5;
    
    ytdMonthlyData.forEach((m, idx) => {
      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(15, currentY, 180, 7.5, 'F');
      
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(15, currentY + 7.5, 195, currentY + 7.5);
      
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(m.name, 18, currentY + 5);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`${m.totalTrades}`, 65, currentY + 5, { align: 'center' });
      doc.text(`${m.wins} W - ${m.losses} L`, 105, currentY + 5, { align: 'center' });
      
      // Win rate with text color
      if (m.totalTrades > 0) {
        if (m.winRate >= 50) {
          doc.setTextColor(16, 185, 129); // emerald
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setTextColor(244, 63, 94); // rose
        }
        doc.text(`${m.winRate}%`, 145, currentY + 5, { align: 'center' });
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text("-", 145, currentY + 5, { align: 'center' });
      }
      
      // PNL Contribution
      const pnlColor = m.pnl > 0 ? accentColor : m.pnl < 0 ? roseColor : [148, 163, 184];
      doc.setTextColor(pnlColor[0], pnlColor[1], pnlColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(m.pnl !== 0 ? `${m.pnl > 0 ? '+' : ''}${formatCurrency(m.pnl)}` : formatCurrency(0), 192, currentY + 5, { align: 'right' });
      
      currentY += 7.5;
    });

    // Drawing raw vector progress bars for monthly performance!
    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("VISUAL MONTHLY P/L SPECTROMETER", 15, currentY);
    
    currentY += 3;
    const hasAnyMonthlyDataVal = ytdMonthlyData.some(m => m.pnl !== 0);
    
    if (!hasAnyMonthlyDataVal) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("No concluded monthly trends to display on chart spectrum yet.", 15, currentY + 5);
    } else {
      ytdMonthlyData.forEach((m) => {
        if (m.pnl === 0) return;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(m.shortName, 15, currentY + 3.5);
        
        // Draw progress base line
        doc.setFillColor(241, 245, 249);
        doc.rect(25, currentY + 1, 120, 3, 'F');
        
        // Draw gain or loss bar
        const maxPnl = Math.max(...ytdMonthlyData.map(val => Math.abs(val.pnl)), 100);
        const width = Math.min(120, Math.max(2, (Math.abs(m.pnl) / maxPnl) * 120));
        
        if (m.pnl > 0) {
          doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        } else {
          doc.setFillColor(roseColor[0], roseColor[1], roseColor[2]);
        }
        doc.rect(25, currentY + 1, width, 3, 'F');
        
        // Label P/L block value
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(m.pnl > 0 ? accentColor[0] : roseColor[0], m.pnl > 0 ? accentColor[1] : roseColor[1], m.pnl > 0 ? accentColor[2] : roseColor[2]);
        doc.text(`${m.pnl > 0 ? '+' : ''}${formatCurrency(m.pnl)}`, 150, currentY + 3.5);
        
        currentY += 6;
      });
    }

    drawFooter();

    // --- PAGE 2: STRATEGIES & CURRENCY PAIRS MATRIX ---
    doc.addPage();
    pageNum = 2;
    drawHeader("Strategic Performance Metrics Matrix");
    
    // Currency Pair Contribution header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text("PROFIT / LOSS ALLOCATION BY CURRENCY PAIR", 15, 45);
    
    // table
    doc.setFillColor(15, 23, 42);
    doc.rect(15, 49, 180, 7.5, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text("Asset Pair / Commodity", 18, 54);
    doc.text("Cumulative P/L Impact", 192, 54, { align: 'right' });
    
    let pairY = 56.5;
    if (pairPerfData.length === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, pairY, 180, 8, 'F');
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text("No trade metrics recorded under selected period.", 18, pairY + 5);
      pairY += 8;
    } else {
      pairPerfData.forEach((p, idx) => {
        doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
        doc.rect(15, pairY, 180, 8, 'F');
        
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(15, pairY + 8, 195, pairY + 8);
        
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(p.name, 18, pairY + 5);
        
        // Progress bar inside table
        const maxValItem = Math.max(...pairPerfData.map(item => Math.abs(item.pnl)), 1);
        const relativeWidth = Math.min(60, (Math.abs(p.pnl) / maxValItem) * 60);
        
        doc.setFillColor(241, 245, 249);
        doc.rect(75, pairY + 2.5, 60, 2.5, 'F');
        
        doc.setFillColor(p.pnl >= 0 ? accentColor[0] : roseColor[0], p.pnl >= 0 ? accentColor[1] : roseColor[1], p.pnl >= 0 ? accentColor[2] : roseColor[2]);
        doc.rect(75, pairY + 2.5, relativeWidth, 2.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(p.pnl >= 0 ? accentColor[0] : roseColor[0], p.pnl >= 0 ? accentColor[1] : roseColor[1], p.pnl >= 0 ? accentColor[2] : roseColor[2]);
        doc.text(`${p.pnl >= 0 ? '+' : ''}${formatCurrency(p.pnl)}`, 192, pairY + 5, { align: 'right' });
        
        pairY += 8;
      });
    }

    // Dynamic Strategy Performance Matrix
    let strategyY = pairY + 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text("STRATEGY PERFORMANCE METRICS MATRIX", 15, strategyY);
    
    strategyY += 4;
    doc.setFillColor(15, 23, 42);
    doc.rect(15, strategyY, 180, 7.5, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text("Strategy Formula / Execution Context", 18, strategyY + 5);
    doc.text("Concluded", 95, strategyY + 5, { align: 'center' });
    doc.text("Win Rate %", 140, strategyY + 5, { align: 'center' });
    doc.text("Net Profit / Loss", 192, strategyY + 5, { align: 'right' });
    
    strategyY += 7.5;
    
    if (strategyPerfData.length === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, strategyY, 180, 8, 'F');
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text("No strategy formulas identified.", 18, strategyY + 5);
    } else {
      strategyPerfData.forEach((strat, idx) => {
        doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
        doc.rect(15, strategyY, 180, 8, 'F');
        
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(15, strategyY + 8, 195, strategyY + 8);
        
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(strat.name, 18, strategyY + 5);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`${strat.totalTrades}`, 95, strategyY + 5, { align: 'center' });
        doc.text(`${strat.winRate}%`, 140, strategyY + 5, { align: 'center' });
        
        doc.setTextColor(strat.pnl >= 0 ? accentColor[0] : roseColor[0], strat.pnl >= 0 ? accentColor[1] : roseColor[1], strat.pnl >= 0 ? accentColor[2] : roseColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(`${strat.pnl >= 0 ? '+' : ''}${formatCurrency(strat.pnl)}`, 192, strategyY + 5, { align: 'right' });
        
        strategyY += 8;
      });
    }

    drawFooter();
    
    // Save report download
    doc.save(`simonfx_ledger_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div id="analytics-view" className="space-y-6 font-sans text-zinc-100 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto select-none">
      
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

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <button
            onClick={exportToPDF}
            id="export-pdf-btn"
            className="bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-600 px-4.5 py-2.5 rounded-lg text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <FileDown className="h-4 w-4" />
            <span>Save Report as PDF</span>
          </button>

          <button
            onClick={exportToCSV}
            id="export-csv-btn"
            className="bg-zinc-900 border border-zinc-805 hover:bg-zinc-850 hover:text-white text-zinc-300 font-semibold px-4.5 py-2.5 rounded-lg text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Export Ledger as CSV</span>
          </button>
        </div>
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
                SimonFX Contribution Spectrum
              </div>
            </div>

          </div>

          {/* Year-To-Date (YTD) Monthly Trend Block */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white">YTD Monthly Performance Trend ({currentYear})</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Month-by-month profit breakdown and cumulative account equity progression</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">YTD Net Earnings</span>
                <span className={`text-[13px] font-bold font-mono ${ytdTotalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {ytdTotalPnl >= 0 ? '+' : ''}{formatCurrency(ytdTotalPnl)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Monthly bar graph */}
              <div className="lg:col-span-2 h-64 w-full mt-2">
                {!hasAnyMonthlyData ? (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-650">No monthly data points available for {currentYear}</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ytdMonthlyData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#18181b" vertical={false} />
                      <XAxis 
                        dataKey="shortName" 
                        stroke="#52525b" 
                        fontSize={10} 
                        tickLine={false} 
                      />
                      <YAxis 
                        stroke="#52525b" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip formatter={(value: any, name: string) => {
                        if (name === 'pnl') return [`$${value}`, 'Net P/L'];
                        return [value, name];
                      }} />
                      <Legend verticalAlign="top" height={36} content={() => (
                        <div className="flex justify-center gap-6 text-xs text-zinc-400 select-none pb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-4 rounded-xs bg-emerald-500" />
                            <span>Monthly Gain (Positive)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-4 rounded-xs bg-rose-500" />
                            <span>Monthly Loss (Negative)</span>
                          </div>
                        </div>
                      )} />
                      <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                        {ytdMonthlyData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* YTD Monthly breakdown ledger table */}
              <div className="overflow-x-auto bg-zinc-900/10 border border-zinc-900/60 rounded-xl p-3.5">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 text-[9px] uppercase font-bold tracking-wider font-mono">
                      <th className="pb-2">Month</th>
                      <th className="pb-2 text-center">Trades</th>
                      <th className="pb-2 text-center">Win %</th>
                      <th className="pb-2 text-right">P/L Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/50">
                    {ytdMonthlyData.map((m, idx) => (
                      <tr key={idx} className="hover:bg-zinc-850/30">
                        <td className="py-2.5 text-zinc-300 font-semibold">{m.name}</td>
                        <td className="py-2.5 text-center font-mono text-zinc-450">{m.totalTrades}</td>
                        <td className="py-2.5 text-center font-mono text-zinc-500">{m.totalTrades > 0 ? `${m.winRate}%` : '-'}</td>
                        <td className={`py-2.5 text-right font-mono font-bold ${m.pnl >= 0 ? (m.pnl > 0 ? 'text-emerald-400' : 'text-zinc-500') : 'text-rose-450'}`}>
                          {m.pnl > 0 ? '+' : ''}{m.pnl !== 0 ? formatCurrency(m.pnl) : formatCurrency(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
