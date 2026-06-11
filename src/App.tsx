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
  ArrowRight,
  TrendingUpDown,
  BarChart3,
  Globe,
  Lock,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  GoogleAuthProvider, 
  User 
} from 'firebase/auth';

import { auth, db, OperationType, handleFirestoreError, testConnection } from './firebase';
import { ActiveTab, Trade, UserSettings } from './types';
import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import TradeList from './components/TradeList';
import TradeEntryModal from './components/TradeEntryModal';
import AnalyticsReports from './components/AnalyticsReports';
import RiskCalculator from './components/RiskCalculator';
import WhitelistManager from './components/WhitelistManager';

const LOCAL_STORAGE_KEY = 'simonfx_trade_journal';
const SETTINGS_STORAGE_KEY = 'simonfx_user_settings';

const DEFAULT_SETTINGS: UserSettings = {
  userName: 'Trader',
  baseCurrency: 'KES',
  startingBalance: 1250000
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Whitelisting & role management permissions
  const [whitelistRole, setWhitelistRole] = useState<'admin' | 'viewer' | null>(null);
  const [isWhitelistedUser, setIsWhitelistedUser] = useState<boolean | null>(null);
  const [isWhitelistChecking, setIsWhitelistChecking] = useState(true);
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  
  // Mobile UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showIntegrationGuide, setShowIntegrationGuide] = useState(false);

  // Modal Sizing / Draft entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // 1. App Startup: Test Firestore link and track auth states
  useEffect(() => {
    testConnection();
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // 1a. Whitelist & privilege subscription lookup
  useEffect(() => {
    if (!currentUser) {
      setIsWhitelistedUser(null);
      setWhitelistRole(null);
      setIsWhitelistChecking(false);
      return;
    }

    const email = currentUser.email?.toLowerCase();
    if (!email) {
      console.error('Logged in user lacks email descriptor');
      setIsWhitelistedUser(false);
      setWhitelistRole(null);
      setIsWhitelistChecking(false);
      return;
    }

    setIsWhitelistChecking(true);
    const whitelistDocRef = doc(db, 'whitelist', email);
    
    const unsubscribeWhitelist = onSnapshot(whitelistDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setIsWhitelistedUser(true);
        // Force admin role for the primary master administrator
        const role = email === 'wangechigodfrey77@gmail.com' ? 'admin' : (data.role as 'admin' | 'viewer');
        setWhitelistRole(role);
        setIsWhitelistChecking(false);
      } else {
        // Bootstrap: check if specific email is the primary master administrator
        if (email === 'wangechigodfrey77@gmail.com') {
          const bootstrapData = {
            email: currentUser.email || email,
            role: 'admin',
            addedAt: new Date().toISOString()
          };
          
          const writes = [setDoc(whitelistDocRef, { ...bootstrapData, email })];
          if (currentUser.email && currentUser.email !== email) {
            writes.push(setDoc(doc(db, 'whitelist', currentUser.email), {
              ...bootstrapData,
              email: currentUser.email
            }));
          }

          Promise.all(writes)
            .then(() => {
              setIsWhitelistedUser(true);
              setWhitelistRole('admin');
              setIsWhitelistChecking(false);
            })
            .catch((err) => {
              console.error('Failed to write bootstrap master admin whitelist document:', err);
              setIsWhitelistedUser(true);
              setWhitelistRole('admin');
              setIsWhitelistChecking(false);
            });
        } else {
          setIsWhitelistedUser(false);
          setWhitelistRole(null);
          setIsWhitelistChecking(false);
        }
      }
    }, (error) => {
      console.error('Whitelist subscription fetch blocked or failed:', error);
      setIsWhitelistedUser(false);
      setWhitelistRole(null);
      setIsWhitelistChecking(false);
      handleFirestoreError(error, OperationType.GET, `whitelist/${email}`);
    });

    return () => unsubscribeWhitelist();
  }, [currentUser]);

  // 2. Load and Sync User Settings & Trades when logged in
  useEffect(() => {
    if (!currentUser || !isWhitelistedUser) {
      setTrades([]);
      setSettings(DEFAULT_SETTINGS);
      return;
    }

    const userId = 'shared';
    setIsSyncing(true);

    // Sync Settings document
    const settingsDocRef = doc(db, 'users', userId);
    const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as UserSettings);
      } else {
        // First log-in: initialize Firestore with existing localStorage, or defaults
        const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
        let settingsToUpload = DEFAULT_SETTINGS;
        if (savedSettings) {
          try {
            settingsToUpload = JSON.parse(savedSettings);
          } catch (e) {
            console.error('Failed to parse local settings', e);
          }
        }
        
        // Use a standard default of Prop Trader for the collaborative shared view
        if (!settingsToUpload.userName || settingsToUpload.userName === 'Trader') {
          settingsToUpload.userName = 'Prop Trader';
        }

        setDoc(settingsDocRef, settingsToUpload)
          .then(() => {
            setSettings(settingsToUpload);
          })
          .catch(err => {
            handleFirestoreError(err, OperationType.CREATE, `users/${userId}`);
          });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${userId}`);
    });

    // Sync Trades real-time subcollection
    const tradesCollectionRef = collection(db, 'users', userId, 'trades');
    const unsubscribeTrades = onSnapshot(tradesCollectionRef, (querySnap) => {
      const tradesArray: Trade[] = [];
      querySnap.forEach((doc) => {
        tradesArray.push(doc.data() as Trade);
      });
      
      // Sort by entryTime descending
      tradesArray.sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime());
      setTrades(tradesArray);
      setIsSyncing(false);

      // Migrations: if Firestore is empty but localStorage has legacy trades, push them up
      if (tradesArray.length === 0) {
        const savedTradesStr = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedTradesStr) {
          try {
            const localTrades = JSON.parse(savedTradesStr) as Trade[];
            if (localTrades && localTrades.length > 0) {
              console.log(`Migrating ${localTrades.length} local trades to cloud ledger`);
              localTrades.forEach(t => {
                setDoc(doc(db, 'users', userId, 'trades', t.id), t).catch(err => {
                  handleFirestoreError(err, OperationType.CREATE, `users/${userId}/trades/${t.id}`);
                });
              });
              // Wipe local storage to prevent duplicate checks
              localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
          } catch (e) {
            console.error('Error during automatic data migration', e);
          }
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `users/${userId}/trades`);
      setIsSyncing(false);
    });

    return () => {
      unsubscribeSettings();
      unsubscribeTrades();
    };
  }, [currentUser, isWhitelistedUser]);

  // Auth Operations
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error('Google accounts signing error', e);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSidebarOpen(false);
      await signOut(auth);
    } catch (e) {
      console.error('Log-out routine error', e);
    }
  };

  // Update Settings (Firestore synchronizes back via onSnapshot)
  const updateSettings = async (newSettings: UserSettings) => {
    if (currentUser) {
      const userId = 'shared';
      try {
        await setDoc(doc(db, 'users', userId), newSettings);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      }
    } else {
      setSettings(newSettings);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    }
  };

  // Save Trade Record (Create or Update)
  const handleSaveTrade = async (trade: Trade) => {
    if (currentUser) {
      const userId = 'shared';
      try {
        await setDoc(doc(db, 'users', userId, 'trades', trade.id), trade);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${userId}/trades/${trade.id}`);
      }
    } else {
      let updatedTrades;
      const exists = trades.some(t => t.id === trade.id);
      
      if (exists) {
        updatedTrades = trades.map(t => t.id === trade.id ? trade : t);
      } else {
        updatedTrades = [trade, ...trades];
      }

      setTrades(updatedTrades);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedTrades));
    }
  };

  // Delete trade
  const handleDeleteTrade = async (id: string) => {
    if (currentUser) {
      const userId = 'shared';
      try {
        await deleteDoc(doc(db, 'users', userId, 'trades', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${userId}/trades/${id}`);
      }
    } else {
      const updated = trades.filter(t => t.id !== id);
      setTrades(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  };

  // Close trade fast
  const handleCloseTrade = async (id: string, exitPrice: number, exitTime: string, pnl: number) => {
    if (currentUser) {
      const userId = 'shared';
      try {
        await updateDoc(doc(db, 'users', userId, 'trades', id), {
          status: 'CLOSED',
          exitPrice,
          exitTime,
          pnl
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/trades/${id}`);
      }
    } else {
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
    }
  };

  const handleEditClick = (trade: Trade) => {
    setEditingTrade(trade);
    setIsModalOpen(true);
  };

  const handleNewEntryClick = () => {
    setEditingTrade(null);
    setIsModalOpen(true);
  };

  // Loader state while configuring Auth & Checking access pools
  if (isAuthLoading || isWhitelistChecking) {
    return (
      <div className="flex flex-col items-center justify-center bg-zinc-950 min-h-screen text-zinc-100 font-sans p-6 selection:bg-emerald-500/30 select-none">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
          <h2 className="text-zinc-450 font-mono text-xs uppercase tracking-widest mt-2 animate-pulse">
            Authenticating access credentials...
          </h2>
        </div>
      </div>
    );
  }

  // Access Denied Shield for Un-whitelisted users
  if (currentUser && isWhitelistedUser === false) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-6 text-center select-none font-sans">
        <div className="bg-zinc-900/60 border border-zinc-900 max-w-md p-8 rounded-2xl space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />
          
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl w-fit mx-auto text-rose-400">
            <Lock className="h-6 w-6" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white tracking-tight">Access Locked</h2>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Your account <span className="text-white font-mono break-all">{currentUser.email}</span> is not on the system access whitelist.
            </p>
            <p className="text-zinc-500 text-[11px] leading-relaxed pt-1">
              Please contact the SimonFX system administrator to authorize your login privileges.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => handleSignOut()}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all cursor-pointer border border-zinc-750"
            >
              Sign Out / Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Brand-aligned high-fidelity login portal
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex items-center justify-center p-4 selection:bg-emerald-500/20 relative overflow-hidden">
        {/* Subtle background glow elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md bg-zinc-900/40 border border-zinc-900 rounded-3xl p-8 backdrop-blur-md relative z-10 space-y-8"
        >
          {/* Logo & Intro */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-lg">
              <TrendingUpDown className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
                SimonFX<span className="text-emerald-400">.</span>
              </h1>
              <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                Cloud Ledger Portal
              </p>
            </div>
            <p className="text-zinc-450 text-xs leading-relaxed max-w-xs mx-auto">
              Welcome to your institutional-grade Forex Trade Journal. Sync positions, historical metrics, and calculator balances securely across any device.
            </p>
          </div>

          {/* Action Area */}
          <div className="pt-2">
            <button
              onClick={handleGoogleSignIn}
              className="w-full h-11 bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-sm rounded-xl py-2.5 transition-all flex items-center justify-center gap-3 active:scale-98 cursor-pointer shadow-md shadow-black/20"
            >
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.81-2.61-.81-5.06 0-7.66z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Core App Benefits Grid */}
          <div className="border-t border-zinc-900 pt-6 grid grid-cols-2 gap-4 text-left">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-zinc-300 font-medium text-xs">
                <Database className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Cloud Storage</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-normal">
                Durable Firestore synchronization with lightning-quick data queries.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-zinc-300 font-medium text-xs">
                <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Zero-Trust Auth</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-normal">
                Secure Firebase authentication isolates and encrypts personal accounts.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex bg-zinc-950 min-h-screen text-zinc-100 font-sans selection:bg-emerald-500/20">
      
      {/* SIDEBAR FOR DESKTOP */}
      <div className="hidden lg:block shrink-0">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          settings={settings}
          updateSettings={updateSettings}
          currentUser={currentUser}
          onLogOut={handleSignOut}
          userRole={isWhitelistedUser ? whitelistRole : 'viewer'}
        />
      </div>

      {/* MOBILE HEADER/NAVIGATION BAR */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-950 border-b border-zinc-900 px-6 flex items-center justify-between z-30 select-none">
        <div className="flex items-center gap-2">
          {currentUser.photoURL && (
            <img 
              src={currentUser.photoURL} 
              alt="" 
              className="h-7 w-7 rounded-lg object-cover border border-zinc-800" 
              referrerPolicy="no-referrer"
            />
          )}
          <span className="font-sans font-bold text-base text-white tracking-tight">
            SimonFX<span className="text-emerald-400 font-medium">.</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isSyncing && (
            <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-zinc-400 hover:text-white"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE SIDEBAR DROPDOWN DRAWER */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 top-16 bg-black/80 z-30 flex"
          onClick={() => setIsSidebarOpen(false)}
        >
          <div 
            className="w-80 max-w-[85vw] h-full"
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
              currentUser={currentUser}
              onLogOut={handleSignOut}
              userRole={isWhitelistedUser ? whitelistRole : 'viewer'}
            />
          </div>
        </div>
      )}

      {/* MAIN CONTAINER CONTENT PANE */}
      <main className="flex-1 w-full min-h-screen flex flex-col pt-16 lg:pt-0 overflow-y-auto">
        
        {/* Unified Integration Guide Alert Header has been removed at the user's request */}

        {/* Tab Render Switchboard */}
        <div className="flex-1 h-full">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              trades={trades}
              settings={settings}
              onAddTradeClick={handleNewEntryClick}
              setActiveTab={setActiveTab}
              updateSettings={updateSettings}
              userRole={isWhitelistedUser ? whitelistRole : 'viewer'}
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
              userRole={isWhitelistedUser ? whitelistRole : 'viewer'}
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

          {activeTab === 'whitelist' && whitelistRole === 'admin' && (
            <WhitelistManager />
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
                <span>SimonFX Cloud Schema Blueprint</span>
              </h3>
              <p className="text-zinc-500 mt-1 text-xs">Real-time Cloud Firestore Entity modeling structure and isolation boundaries.</p>
            </div>

            <div className="space-y-4">
              <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-850 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">1. User Settings Entity (/users/{"{userId}"})</h4>
                <p className="text-[11px] text-zinc-500">Each authenticated user holds their trader profile information directly mapped under their secure Google UID folder.</p>
                <pre className="bg-zinc-950 p-3.5 rounded border border-zinc-900 overflow-x-auto text-[10px] font-mono text-zinc-400 select-all">
{`{
  userName: "Trader Display Name",
  baseCurrency: "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "CHF",
  startingBalance: 125000
}`}
                </pre>
              </div>

              <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-850 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">2. Trades Ledger Collection (/users/{"{userId}"}/trades)</h4>
                <p className="text-[11px] text-zinc-500">Subcollection containing historical open & closed Forex trades, keeping user records completely compartmentalized and safe.</p>
                <pre className="bg-zinc-950 p-3.5 rounded border border-zinc-900 overflow-x-auto text-[10px] font-mono text-zinc-400 select-all">
{`{
  id: "GUID_string",
  pair: "EURUSD",
  direction: "BUY" | "SELL",
  entryPrice: 1.0845,
  lotSize: 5,
  tp: 1.0920,
  sl: 1.0800,
  entryTime: "2026-06-10T12:00:00Z",
  strategy: "Order Block",
  tags: ["London Session", "Trend Continuation"],
  status: "OPEN" | "CLOSED",
  exitPrice?: 1.0905,
  exitTime?: "2026-06-10T14:30:00Z",
  pnl?: 3000,
  screenshotsBefore: ["base64_or_storage_link"],
  screenshotsAfter: ["base64_or_storage_link"],
  notes?: "Refined entries on lower timeframes"
}`}
                </pre>
              </div>
            </div>

            <button
              onClick={() => setShowIntegrationGuide(false)}
              className="w-full text-center py-2 bg-emerald-500 text-zinc-950 rounded-xl font-bold hover:bg-emerald-600 transition-colors cursor-pointer"
            >
              Back to Dashboard
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
