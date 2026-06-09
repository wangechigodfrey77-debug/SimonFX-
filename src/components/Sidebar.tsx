/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  TrendingUp, 
  Calculator, 
  Settings, 
  User, 
  TrendingDown,
  Coins,
  ChevronRight,
  TrendingUpDown
} from 'lucide-react';
import { ActiveTab, UserSettings } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  settings: UserSettings;
  updateSettings: (newSettings: UserSettings) => void;
}

export default function Sidebar({ activeTab, setActiveTab, settings, updateSettings }: SidebarProps) {
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [userName, setUserName] = useState(settings.userName);
  const [baseCurrency, setBaseCurrency] = useState(settings.baseCurrency);
  const [startingBalance, setStartingBalance] = useState(settings.startingBalance.toString());

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      userName: userName || 'Trader',
      baseCurrency: baseCurrency || 'USD',
      startingBalance: Math.max(1, parseFloat(startingBalance) || 10000)
    });
    setIsEditingSettings(false);
  };

  const menuItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'trades' as ActiveTab, label: 'Trade Journal', icon: FileSpreadsheet },
    { id: 'analytics' as ActiveTab, label: 'Analytics & Reports', icon: TrendingUp },
    { id: 'calculator' as ActiveTab, label: 'Risk Calculator', icon: Calculator },
  ];

  return (
    <aside id="app-sidebar" className="w-80 bg-zinc-950 border-r border-zinc-900 flex flex-col justify-between h-screen sticky top-0 text-zinc-100 shrink-0 select-none">
      {/* Top Brand / Header */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            <TrendingUpDown className="h-6 w-6 text-emerald-400 stroke-[2]" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-lg tracking-tight text-white leading-tight">
              ForexForge<span className="text-emerald-400 font-medium">.</span>
            </h1>
            <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
              Trade Performance Journal
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="mt-8 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-item-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-zinc-900 border-l-2 border-emerald-400 text-white shadow-md'
                    : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-emerald-400'} transition-colors`} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className={`h-3.5 w-3.5 opacity-0 ${isActive ? 'opacity-100 text-emerald-400' : 'group-hover:opacity-40'} transition-all`} />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Account Settings Widget */}
      <div className="p-6 border-t border-zinc-900 bg-zinc-950/60 font-sans">
        {isEditingSettings ? (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Edit Account Profile</h3>
            
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">Trader Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                placeholder="Name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">Base Currency</label>
                <select
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="CHF">CHF (₣)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">Starting Bal.</label>
                <input
                  type="number"
                  value={startingBalance}
                  onChange={(e) => setStartingBalance(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold rounded text-xs py-1.5 transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditingSettings(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs py-1.5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-zinc-950 font-bold text-sm">
                {settings.userName.substring(0, 2).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate max-w-[130px]">{settings.userName}</p>
                <p className="font-mono text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  <span>
                    {settings.startingBalance.toLocaleString(undefined, {
                      style: 'currency',
                      currency: settings.baseCurrency,
                      minimumFractionDigits: 0
                    })}
                  </span>
                </p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setUserName(settings.userName);
                setBaseCurrency(settings.baseCurrency);
                setStartingBalance(settings.startingBalance.toString());
                setIsEditingSettings(true);
              }}
              id="sidebar-settings-btn"
              className="p-2 text-zinc-500 hover:text-white bg-zinc-900/50 hover:bg-zinc-900 rounded-lg transition-colors group"
              title="Edit Profile Settings"
            >
              <Settings className="h-4 w-4 group-hover:rotate-45 transition-transform duration-300" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
