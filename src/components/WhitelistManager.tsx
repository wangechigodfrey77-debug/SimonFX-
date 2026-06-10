/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  ShieldCheck, 
  User, 
  Trash2, 
  Plus, 
  Loader2, 
  CheckCircle,
  Mail,
  Users,
  ShieldAlert,
  Search
} from 'lucide-react';

interface WhitelistEntry {
  email: string;
  role: 'admin' | 'viewer';
  addedAt?: any;
}

export default function WhitelistManager() {
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New whitelisted account form
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'viewer'>('viewer');
  const [isAdding, setIsAdding] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Subscribe to whitelist entries in real-time
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'whitelist'), (snapshot) => {
      const list: WhitelistEntry[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as WhitelistEntry);
      });
      // Sort: admins first, then alphabetical email
      list.sort((a, b) => {
        if (a.role === b.role) return a.email.localeCompare(b.email);
        return a.role === 'admin' ? -1 : 1;
      });
      setWhitelist(list);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'whitelist');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    
    const emailSanitized = newEmail.trim().toLowerCase();
    if (!emailSanitized) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailSanitized)) {
      setFeedback({ type: 'error', message: 'Please provide a valid email address.' });
      return;
    }

    setIsAdding(true);
    try {
      const docRef = doc(db, 'whitelist', emailSanitized);
      await setDoc(docRef, {
        email: emailSanitized,
        role: newRole,
        addedAt: new Date().toISOString()
      });
      setFeedback({ 
        type: 'success', 
        message: `Successfully whitelisted ${emailSanitized} as a ${newRole}.` 
      });
      setNewEmail('');
    } catch (error) {
      console.error('Error adding user to whitelist:', error);
      setFeedback({ 
        type: 'error', 
        message: 'Insufficient permissions or database error occurred.' 
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteUser = async (emailToDelete: string) => {
    setFeedback(null);
    if (emailToDelete === 'wangechigodfrey77@gmail.com') {
      setFeedback({ type: 'error', message: 'The primary master administrator cannot be removed.' });
      return;
    }

    if (!window.confirm(`Are you sure you want to revoke system access for ${emailToDelete}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'whitelist', emailToDelete));
      setFeedback({ type: 'success', message: `Revoked access for ${emailToDelete}.` });
    } catch (error) {
      console.error('Error deleting user from whitelist:', error);
      setFeedback({ type: 'error', message: 'Failed to delete user. Insufficient permissions.' });
    }
  };

  const filteredWhitelist = whitelist.filter(entry => 
    entry.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans">
      {/* Title block */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-400" />
          <span>System Access Whitelist</span>
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Add specific emails to grant access. Whitelisted accounts are divided into admins (can edit/journal trades) or viewers (read-only).
        </p>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-semibold tracking-wide ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
          ) : (
            <ShieldAlert className="h-5 w-5 shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Register/Add Form */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 h-fit space-y-5">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-3">
            <Plus className="h-4.5 w-4.5 text-emerald-400" />
            <span>Whitelist New Member</span>
          </div>

          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
                Google Account Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                  placeholder="name@gmail.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
                Access Privilege level
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setNewRole('viewer')}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    newRole === 'viewer'
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 font-bold'
                      : 'bg-zinc-900 border-zinc-850 hover:border-zinc-700 text-zinc-400'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center p-1">
                    <User className="h-4.5 w-4.5 mb-1" />
                    <span>Viewer</span>
                    <span className="text-[9px] text-zinc-500 font-medium font-sans mt-0.5">Read-Only</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewRole('admin')}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    newRole === 'admin'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold'
                      : 'bg-zinc-900 border-zinc-850 hover:border-zinc-700 text-zinc-400'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center p-1">
                    <ShieldCheck className="h-4.5 w-4.5 mb-1" />
                    <span>Admin</span>
                    <span className="text-[9px] text-zinc-500 font-medium font-sans mt-0.5">Full Edit</span>
                  </div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isAdding}
              className="w-full h-10 mt-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>Grant Whitelist Access</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* List View */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 lg:col-span-2 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-zinc-900 pb-4">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-zinc-400">
              <Users className="h-4.5 w-4.5 text-emerald-400" />
              <span>Whitelisted Accounts ({whitelist.length})</span>
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-850 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                placeholder="Search whitelisted emails..."
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
              <p className="text-xs text-zinc-500">Loading authorized users pool...</p>
            </div>
          ) : filteredWhitelist.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <Mail className="h-10 w-10 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-400">No whitelisted accounts found</p>
              <p className="text-xs text-zinc-500">Add an email or modify search term to populate entries.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-semibold">User Email Address</th>
                    <th className="py-3 px-4 font-semibold text-center">Authorization Level</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40">
                  {filteredWhitelist.map((entry) => (
                    <tr key={entry.email} className="hover:bg-zinc-900/20 group transition-colors">
                      <td className="py-3.5 px-4 font-medium text-white font-mono break-all max-w-[200px]">
                        {entry.email}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          entry.role === 'admin'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                          {entry.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {entry.email === 'wangechigodfrey77@gmail.com' ? (
                          <span className="text-[10px] text-zinc-500 font-sans italic pr-2">Master Owner</span>
                        ) : (
                          <button
                            onClick={() => handleDeleteUser(entry.email)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 bg-zinc-900/30 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                            title="Revoke Permission"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
