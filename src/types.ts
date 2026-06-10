/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Trade {
  id: string;
  pair: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  lotSize: number;
  tp: number;
  sl: number;
  entryTime: string; // ISO String
  strategy: string;
  tags: string[];
  status: 'OPEN' | 'CLOSED';
  exitPrice?: number;
  exitTime?: string; // ISO String
  pnl?: number; // Automatic or custom field
  screenshotsBefore: string[]; // Base64 data URLs
  screenshotsAfter: string[];  // Base64 data URLs
  notes?: string;
}

export interface UserSettings {
  baseCurrency: string;
  startingBalance: number;
  userName: string;
}

export type ActiveTab = 'dashboard' | 'trades' | 'analytics' | 'calculator' | 'whitelist';
