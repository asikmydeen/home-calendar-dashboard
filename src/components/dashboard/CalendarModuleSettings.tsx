'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Eye, EyeOff, ExternalLink, Key, LogIn } from 'lucide-react';
import {
    CalendarAccount,
    ConnectedCalendar,
    PROVIDER_INFO,
} from '@/types/account';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useAccounts } from '@/contexts/AccountsContext';
import { initiateGoogleAuth, fetchCalendarList, syncAllCalendars } from '@/lib/googleCalendar';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';

interface CalendarModuleSettingsProps {
    config: Record<string, any>;
    setConfig: (config: Record<string, any>) => void;
}

type AddAccountMode = null | 'google' | 'apple' | 'caldav';

export function CalendarModuleSettings({ config, setConfig }: CalendarModuleSettingsProps) {
    const [accounts, setAccounts] = useState<CalendarAccount[]>([]);
    const [calendars, setCalendars] = useState<ConnectedCalendar[]>([]);
    const [addMode, setAddMode] = useState<AddAccountMode>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedSection, setExpandedSection] = useState<'accounts' | 'calendars' | 'sync' | null>('accounts');
    const [user, setUser] = useState<User | null>(null);
    const { familyMembers, updateMember } = useHousehold();
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<string | null>(null);

    // Monitor auth state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // Check if Google is connected by listening to Firestore
    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const db = getFirestore();
        const unsubscribe = onSnapshot(
            doc(db, 'integrations', user.uid),
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data?.google?.accessToken) {
                        setIsGoogleConnected(true);

                        // NOTE: Account linking logic moved to HouseholdContext for global availability

                        // Create account object for display
                        const googleAccount: CalendarAccount = {
                            id: 'google-primary',
                            provider: 'google',
                            email: user.email || '',
                            displayName: 'Google Calendar',
                            familyMemberId: 'parent1', // Fallback or derived
                            color: '#4285F4',
                            isConnected: true,
                            lastSyncedAt: data.google.updatedAt?.toDate() || new Date(),
                        };
                        setAccounts([googleAccount]);
                    } else {
                        setIsGoogleConnected(false);
                        setAccounts([]);
                    }
                } else {
                    setIsGoogleConnected(false);
                    setAccounts([]);
                }
                setIsLoading(false);
            },
            (error) => {
                console.error('Error listening to integrations:', error);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user]);

    // Load calendars from Firestore cache
    useEffect(() => {
        if (!user || !isGoogleConnected) {
            setCalendars([]);
            return;
        }

        const db = getFirestore();
        const unsubscribe = onSnapshot(
            doc(db, 'cachedEvents', user.uid),
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data?.calendars) {
                        setCalendars(data.calendars.map((cal: any) => ({
                            id: cal.id,
                            accountId: 'google-primary',
                            name: cal.name,
                            color: cal.color || '#4285F4',
                            isVisible: true,
                            isPrimary: cal.primary,
                            provider: 'google' as const,
                        })));
                    }
                }
            }
        );

        return () => unsubscribe();
    }, [user, isGoogleConnected]);

    const saveCalendars = (newCalendars: ConnectedCalendar[]) => {
        setCalendars(newCalendars);
        // Calendars visibility is now managed through CalendarContext
    };

    const handleRemoveAccount = async (accountId: string) => {
        // TODO: Implement disconnect from Firestore
        if (confirm('Remove this account? Events won\'t sync from this account anymore.')) {
            setAccounts(accounts.filter(a => a.id !== accountId));
            setCalendars([]);

            // Also remove from family member
            // Identifying the member is tricky if there are multiple, but for Google Primary:
            const memberWithAccount = familyMembers.find(m =>
                m.connectedAccounts?.some(acc => acc.provider === 'google')
            );
            if (memberWithAccount) {
                updateMember({
                    ...memberWithAccount,
                    connectedAccounts: memberWithAccount.connectedAccounts?.filter(acc => acc.provider !== 'google')
                });
            }
        }
    };

    const handleSyncAccount = async (accountId: string) => {
        if (!user) return;
        setIsSyncing(true);
        setSyncStatus('Syncing...');

        try {
            const result = await syncAllCalendars();
            setSyncStatus(`Synced ${result.calendarsCount} calendars, ${result.eventsCount} events`);
            // Update the account's lastSyncedAt
            setAccounts(accounts.map(a =>
                a.id === accountId ? { ...a, lastSyncedAt: new Date() } : a
            ));
        } catch (error: any) {
            console.error('Sync failed:', error);
            setSyncStatus(`Sync failed: ${error.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleConnectGoogle = async (memberId?: string) => {
        console.log('handleConnectGoogle called, member:', memberId);
        if (!user) {
            alert('Please sign in first to connect your Google Calendar');
            return;
        }

        if (memberId) {
            localStorage.setItem('pending_google_auth_member_id', memberId);
        }

        try {
            console.log('Calling initiateGoogleAuth...');
            await initiateGoogleAuth();
            // This will redirect to Google, so no callback needed here
        } catch (error: any) {
            console.error('Failed to initiate Google auth:', error);
            alert('Failed to connect Google Calendar. Please try again.');
        }
    };

    const toggleCalendarVisibility = (calendarId: string) => {
        saveCalendars(calendars.map(c =>
            c.id === calendarId ? { ...c, isVisible: !c.isVisible } : c
        ));
    };

    // Add Account Form Component
    const AddAccountForm = () => {
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [selectedMember, setSelectedMember] = useState<string | null>(null);
        const [isConnecting, setIsConnecting] = useState(false);

        const handleConnect = async () => {
            if (addMode === 'google') {
                if (!selectedMember) {
                    alert('Please select a household member for this account');
                    return;
                }
                // Use real Google OAuth
                await handleConnectGoogle(selectedMember);
                return;
            }

            // For Apple/CalDAV - needs backend implementation
            if (!selectedMember) return;
            setIsConnecting(true);
            await new Promise(resolve => setTimeout(resolve, 1000));
            setAddMode(null);
            setIsConnecting(false);
            alert('Apple and CalDAV connections coming soon! Backend implementation required.');
        };

        return (
            <div className="space-y-4 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{PROVIDER_INFO[addMode as keyof typeof PROVIDER_INFO]?.icon}</span>
                        <span className="font-medium text-zinc-900 dark:text-white text-sm">
                            Add {PROVIDER_INFO[addMode as keyof typeof PROVIDER_INFO]?.name}
                        </span>
                    </div>
                    <button onClick={() => setAddMode(null)} className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                        Cancel
                    </button>
                </div>

                {addMode === 'apple' && (
                    <div className="space-y-3">
                        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-2 rounded-lg">
                            <strong>Note:</strong> Apple Calendar requires an{' '}
                            <a href="https://appleid.apple.com/account/manage" target="_blank" rel="noopener noreferrer" className="underline">
                                app-specific password
                            </a>
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Apple ID email"
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm"
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="App-specific password"
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm"
                        />
                    </div>
                )}

                {addMode === 'caldav' && (
                    <div className="space-y-3">
                        <input
                            type="url"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="CalDAV Server URL"
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                placeholder="Username"
                                className="px-3 py-2 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm"
                            />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="px-3 py-2 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm"
                            />
                        </div>
                    </div>
                )}

                {/* Family member selection - Required for all providers now */}
                <div>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 block mb-2">Assign to family member:</span>
                    <div className="flex flex-wrap gap-2">
                        {familyMembers.map(member => (
                            <button
                                key={member.id}
                                onClick={() => setSelectedMember(member.id)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${selectedMember === member.id
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-600'
                                    }`}
                            >
                                <span>{member.avatar || '👤'}</span>
                                <span>{member.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Google requires sign-in first */}
                {addMode === 'google' && !user && (
                    <div className="space-y-3">
                        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg">
                            <strong>Sign in required:</strong> Please sign in to your account first to connect Google Calendar.
                        </div>
                        <button
                            onClick={async () => {
                                const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
                                const provider = new GoogleAuthProvider();
                                try {
                                    await signInWithPopup(auth, provider);
                                } catch (error) {
                                    console.error('Sign in error:', error);
                                    alert('Failed to sign in. Please try again.');
                                }
                            }}
                            className="w-full py-2.5 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white text-sm font-medium rounded-lg transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-600 flex items-center justify-center gap-2"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Sign in with Google
                        </button>
                    </div>
                )}

                {/* Show connect button for Google when user is signed in, or for Apple/CalDAV */}
                {(addMode === 'google' && user) && (
                    <button
                        onClick={handleConnect}
                        disabled={isConnecting || !selectedMember}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" />
                        </svg>
                        {isConnecting ? 'Connecting...' : 'Connect Google Calendar'}
                    </button>
                )}

                {addMode !== 'google' && (
                    <button
                        onClick={handleConnect}
                        disabled={isConnecting || !selectedMember}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-400 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        {isConnecting ? 'Connecting...' : 'Connect'}
                    </button>
                )}
            </div>
        );
    };

    if (isLoading) {
        return <div className="text-center py-4 text-zinc-500">Loading...</div>;
    }

    return (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">


            {/* Connected Accounts Section */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                <button
                    onClick={() => setExpandedSection(expandedSection === 'accounts' ? null : 'accounts')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                    <span className="font-medium text-zinc-900 dark:text-white text-sm">Connected Accounts</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">{accounts.length} connected</span>
                        {expandedSection === 'accounts' ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                    </div>
                </button>

                {expandedSection === 'accounts' && (
                    <div className="p-3 space-y-3">
                        {/* Account List */}
                        {accounts.length === 0 ? (
                            <p className="text-sm text-zinc-500 text-center py-2">No accounts connected</p>
                        ) : (
                            <div className="space-y-2">
                                {accounts.map(account => {
                                    const provider = PROVIDER_INFO[account.provider];
                                    return (
                                        <div key={account.id} className="flex items-center gap-3 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                                            <span className="text-lg">{provider?.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-sm font-medium text-zinc-900 dark:text-white truncate">{account.displayName}</span>
                                                    {account.isConnected ? (
                                                        <CheckCircle className="w-3 h-3 text-green-500" />
                                                    ) : (
                                                        <AlertCircle className="w-3 h-3 text-red-500" />
                                                    )}
                                                </div>
                                                <span className="text-xs text-zinc-500 truncate block">{account.email}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleSyncAccount(account.id)}
                                                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                                                    title="Sync now"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveAccount(account.id)}
                                                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                                    title="Remove"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Add Account */}
                        {addMode ? (
                            <AddAccountForm />
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setAddMode('google')}
                                    className="flex flex-col items-center gap-1 p-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl transition-colors"
                                >
                                    <span className="text-lg">🔵</span>
                                    <span className="text-xs text-blue-700 dark:text-blue-300">Google</span>
                                </button>
                                <button
                                    onClick={() => setAddMode('apple')}
                                    className="flex flex-col items-center gap-1 p-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 rounded-xl transition-colors"
                                >
                                    <span className="text-lg">🍎</span>
                                    <span className="text-xs text-zinc-700 dark:text-zinc-300">Apple</span>
                                </button>
                                <button
                                    onClick={() => setAddMode('caldav')}
                                    className="flex flex-col items-center gap-1 p-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 rounded-xl transition-colors"
                                >
                                    <span className="text-lg">📅</span>
                                    <span className="text-xs text-zinc-700 dark:text-zinc-300">CalDAV</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Calendars Section */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                <button
                    onClick={() => setExpandedSection(expandedSection === 'calendars' ? null : 'calendars')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                    <span className="font-medium text-zinc-900 dark:text-white text-sm">Visible Calendars</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">{calendars.filter(c => c.isVisible).length}/{calendars.length} shown</span>
                        {expandedSection === 'calendars' ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                    </div>
                </button>

                {expandedSection === 'calendars' && (
                    <div className="p-3 space-y-2">
                        {calendars.length === 0 ? (
                            <p className="text-sm text-zinc-500 text-center py-2">No calendars available</p>
                        ) : (
                            calendars.map(calendar => (
                                <div
                                    key={calendar.id}
                                    className={`flex items-center gap-3 p-2 rounded-lg transition-all ${calendar.isVisible ? 'bg-zinc-50 dark:bg-zinc-800/50' : 'bg-zinc-50/50 dark:bg-zinc-800/20 opacity-60'
                                        }`}
                                >
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: calendar.color }}
                                    />
                                    <span className="flex-1 text-sm text-zinc-900 dark:text-white truncate">{calendar.name}</span>
                                    <button
                                        onClick={() => toggleCalendarVisibility(calendar.id)}
                                        className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                                    >
                                        {calendar.isVisible ? (
                                            <Eye className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <EyeOff className="w-4 h-4 text-zinc-400" />
                                        )}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Sync Settings Section */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                <button
                    onClick={() => setExpandedSection(expandedSection === 'sync' ? null : 'sync')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                    <span className="font-medium text-zinc-900 dark:text-white text-sm">Sync Settings</span>
                    {expandedSection === 'sync' ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                </button>

                {expandedSection === 'sync' && (
                    <div className="p-3 space-y-3">
                        <div>
                            <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">Auto-sync frequency</label>
                            <select
                                value={config.syncFrequency || '15min'}
                                onChange={(e) => setConfig({ ...config, syncFrequency: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm"
                            >
                                <option value="5min">Every 5 minutes</option>
                                <option value="15min">Every 15 minutes</option>
                                <option value="30min">Every 30 minutes</option>
                                <option value="1hour">Every hour</option>
                                <option value="manual">Manual only</option>
                            </select>
                        </div>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={config.showAllDayEvents !== false}
                                onChange={(e) => setConfig({ ...config, showAllDayEvents: e.target.checked })}
                                className="rounded border-zinc-300 dark:border-zinc-600"
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">Show all-day events</span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={config.showDeclinedEvents || false}
                                onChange={(e) => setConfig({ ...config, showDeclinedEvents: e.target.checked })}
                                className="rounded border-zinc-300 dark:border-zinc-600"
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">Show declined events</span>
                        </label>
                    </div>
                )}
            </div>

            {/* Status notice */}
            <p className="text-xs text-zinc-500 dark:text-zinc-500 text-center">
                {isGoogleConnected ? '✓ Google Calendar connected' : 'Connect Google Calendar to sync your events'}
            </p>
        </div>
    );
}
