'use client';

import React, { useState } from 'react';
import { RefreshCw, Clock, CheckCircle, AlertTriangle, Settings } from 'lucide-react';

type SyncFrequency = '5min' | '15min' | '30min' | '1hour' | 'manual';

interface SyncSettings {
    frequency: SyncFrequency;
    backgroundSync: boolean;
    conflictResolution: 'newest' | 'oldest' | 'ask';
    offlineMode: boolean;
}

const FREQUENCY_OPTIONS: { value: SyncFrequency; label: string }[] = [
    { value: '5min', label: 'Every 5 minutes' },
    { value: '15min', label: 'Every 15 minutes' },
    { value: '30min', label: 'Every 30 minutes' },
    { value: '1hour', label: 'Every hour' },
    { value: 'manual', label: 'Manual only' },
];

export function SyncTab() {
    const [settings, setSettings] = useState<SyncSettings>({
        frequency: '15min',
        backgroundSync: true,
        conflictResolution: 'newest',
        offlineMode: true,
    });
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncResult, setLastSyncResult] = useState<'success' | 'error' | null>(null);

    const handleSyncNow = async () => {
        setIsSyncing(true);
        setLastSyncResult(null);

        // Simulate sync
        await new Promise(resolve => setTimeout(resolve, 2500));

        setIsSyncing(false);
        setLastSyncResult('success');
    };

    const updateSettings = (updates: Partial<SyncSettings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
    };

    return (
        <div className="space-y-6">
            {/* Sync Now Section */}
            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-white mb-1">Sync Calendars</h3>
                        <p className="text-sm text-zinc-400">
                            Pull latest events from all connected accounts
                        </p>
                    </div>

                    <button
                        onClick={handleSyncNow}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-xl transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                </div>

                {/* Sync result */}
                {lastSyncResult && (
                    <div className={`mt-4 flex items-center gap-2 text-sm ${lastSyncResult === 'success' ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {lastSyncResult === 'success' ? (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                All calendars synced successfully
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="w-4 h-4" />
                                Some calendars failed to sync
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Sync Frequency */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-sm font-medium text-zinc-300">Auto-Sync Frequency</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {FREQUENCY_OPTIONS.map(option => (
                        <button
                            key={option.value}
                            onClick={() => updateSettings({ frequency: option.value })}
                            className={`
                px-3 py-2 rounded-lg text-sm transition-all
                ${settings.frequency === option.value
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }
              `}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Additional Settings */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-sm font-medium text-zinc-300">Sync Options</h3>
                </div>

                <div className="space-y-3">
                    {/* Background sync */}
                    <label className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl cursor-pointer hover:bg-zinc-800">
                        <div>
                            <div className="text-sm text-white">Background Sync</div>
                            <div className="text-xs text-zinc-500">Sync calendars even when app is in background</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.backgroundSync}
                            onChange={(e) => updateSettings({ backgroundSync: e.target.checked })}
                            className="w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-purple-500 focus:ring-purple-500"
                        />
                    </label>

                    {/* Offline mode */}
                    <label className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl cursor-pointer hover:bg-zinc-800">
                        <div>
                            <div className="text-sm text-white">Offline Mode</div>
                            <div className="text-xs text-zinc-500">Cache events for offline viewing</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.offlineMode}
                            onChange={(e) => updateSettings({ offlineMode: e.target.checked })}
                            className="w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-purple-500 focus:ring-purple-500"
                        />
                    </label>
                </div>
            </div>

            {/* Conflict Resolution */}
            <div>
                <h3 className="text-sm font-medium text-zinc-300 mb-3">Conflict Resolution</h3>
                <p className="text-xs text-zinc-500 mb-3">
                    When the same event is modified on multiple devices, which version should be kept?
                </p>

                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => updateSettings({ conflictResolution: 'newest' })}
                        className={`
              p-3 rounded-xl text-sm transition-all text-center
              ${settings.conflictResolution === 'newest'
                                ? 'bg-purple-600 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }
            `}
                    >
                        <div className="font-medium">Newest Wins</div>
                        <div className="text-xs opacity-70">Most recent edit</div>
                    </button>

                    <button
                        onClick={() => updateSettings({ conflictResolution: 'oldest' })}
                        className={`
              p-3 rounded-xl text-sm transition-all text-center
              ${settings.conflictResolution === 'oldest'
                                ? 'bg-purple-600 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }
            `}
                    >
                        <div className="font-medium">Original</div>
                        <div className="text-xs opacity-70">Keep first version</div>
                    </button>

                    <button
                        onClick={() => updateSettings({ conflictResolution: 'ask' })}
                        className={`
              p-3 rounded-xl text-sm transition-all text-center
              ${settings.conflictResolution === 'ask'
                                ? 'bg-purple-600 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }
            `}
                    >
                        <div className="font-medium">Ask Me</div>
                        <div className="text-xs opacity-70">Show prompt</div>
                    </button>
                </div>
            </div>

            {/* Demo mode notice */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <p className="text-sm text-yellow-200/80">
                    <strong className="text-yellow-300">Demo Mode:</strong> Sync settings are saved locally.
                    Connect real calendar accounts to enable actual syncing.
                </p>
            </div>
        </div>
    );
}
