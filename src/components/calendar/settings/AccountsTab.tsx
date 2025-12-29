'use client';

import React, { useState } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle, RefreshCw, User, AlertTriangle, RotateCcw } from 'lucide-react';
import { PROVIDER_INFO, formatLastSynced } from '@/types/account';
import { GoogleAccountConnect } from './GoogleAccountConnect';
import { AppleAccountConnect } from './AppleAccountConnect';
import { CalDAVAccountConnect } from './CalDAVAccountConnect';
import { useAccounts } from '@/contexts/AccountsContext';
import { useHousehold } from '@/contexts/HouseholdContext';

type AddAccountMode = null | { provider: 'google' | 'apple' | 'caldav'; memberId: string };

export function AccountsTab() {
    const { accounts, isLoading, syncStatus, disconnectAccount, syncAllAccounts, reconnectAccount, accountsNeedingReauth } = useAccounts();
    const { familyMembers } = useHousehold();
    const [addMode, setAddMode] = useState<AddAccountMode>(null);
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

    const handleRemoveAccount = async (accountId: string) => {
        if (confirm('Remove this account? All synced events will remain but won\'t sync anymore.')) {
            try {
                await disconnectAccount(accountId);
            } catch (error: any) {
                alert('Failed to remove account: ' + error.message);
            }
        }
    };

    const handleSync = async () => {
        try {
            await syncAllAccounts();
        } catch (error: any) {
            alert('Sync failed: ' + error.message);
        }
    };

    const handleReconnect = async (accountId: string) => {
        try {
            await reconnectAccount(accountId);
        } catch (error: any) {
            alert('Failed to reconnect: ' + error.message);
        }
    };

    // Group accounts by family member
    const accountsByMember = familyMembers.map(member => ({
        member,
        accounts: accounts.filter(acc => acc.linkedMemberId === member.id)
    }));

    // Accounts not linked to any member
    const unlinkedAccounts = accounts.filter(acc => !acc.linkedMemberId);

    if (addMode) {
        return (
            <div>
                <button
                    onClick={() => setAddMode(null)}
                    className="mb-4 text-sm text-zinc-400 hover:text-white flex items-center gap-1"
                >
                    ← Back to accounts
                </button>

                {addMode.provider === 'google' && (
                    <GoogleAccountConnect
                        memberId={addMode.memberId}
                        onCancel={() => setAddMode(null)}
                    />
                )}
                {addMode.provider === 'apple' && (
                    <AppleAccountConnect
                        onConnect={() => setAddMode(null)}
                        onCancel={() => setAddMode(null)}
                    />
                )}
                {addMode.provider === 'caldav' && (
                    <CalDAVAccountConnect
                        onConnect={() => setAddMode(null)}
                        onCancel={() => setAddMode(null)}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Accounts Needing Re-authentication Banner */}
            {accountsNeedingReauth.length > 0 && (
                <div className="p-4 bg-red-900/30 rounded-lg border border-red-700/50">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-300 mb-1">
                                {accountsNeedingReauth.length} account{accountsNeedingReauth.length !== 1 ? 's need' : ' needs'} re-authentication
                            </h3>
                            <p className="text-xs text-red-400/80 mb-3">
                                Google authorization has expired or been revoked. Please reconnect to continue syncing.
                            </p>
                            <div className="space-y-2">
                                {accountsNeedingReauth.map(account => (
                                    <div key={account.accountId} className="flex items-center justify-between p-2 bg-red-900/20 rounded">
                                        <span className="text-sm text-white">{account.email}</span>
                                        <button
                                            onClick={() => handleReconnect(account.accountId)}
                                            className="flex items-center gap-1.5 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            Reconnect
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sync Status Bar */}
            {accounts.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                    <span className="text-sm text-zinc-400">
                        {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
                        {accountsNeedingReauth.length > 0 && (
                            <span className="text-red-400 ml-1">
                                ({accountsNeedingReauth.length} need{accountsNeedingReauth.length !== 1 ? '' : 's'} attention)
                            </span>
                        )}
                    </span>
                    <button
                        onClick={handleSync}
                        disabled={syncStatus === 'syncing'}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${syncStatus === 'syncing'
                                ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                                : 'bg-purple-600 hover:bg-purple-700 text-white'
                            }`}
                    >
                        <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                        {syncStatus === 'syncing' ? 'Syncing...' : 'Sync All'}
                    </button>
                </div>
            )}

            {/* Accounts by Family Member */}
            {isLoading ? (
                <div className="text-center py-8 text-zinc-500">Loading accounts...</div>
            ) : (
                <div className="space-y-6">
                    {accountsByMember.map(({ member, accounts: memberAccounts }) => (
                        <div key={member.id} className="space-y-3">
                            {/* Member Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                                        style={{ backgroundColor: member.color + '30' }}
                                    >
                                        {member.avatar || '👤'}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-white">{member.name}</h3>
                                        <p className="text-xs text-zinc-500 capitalize">{member.role}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedMemberId(selectedMemberId === member.id ? null : member.id)}
                                    className="text-xs text-purple-400 hover:text-purple-300"
                                >
                                    {selectedMemberId === member.id ? 'Cancel' : '+ Add Calendar'}
                                </button>
                            </div>

                            {/* Add Account Options for this Member */}
                            {selectedMemberId === member.id && (
                                <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                                    <button
                                        onClick={() => {
                                            setAddMode({ provider: 'google', memberId: member.id });
                                            setSelectedMemberId(null);
                                        }}
                                        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-zinc-700/50 transition-colors"
                                    >
                                        <span className="text-xl">🔵</span>
                                        <span className="text-xs text-zinc-400">Google</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setAddMode({ provider: 'apple', memberId: member.id });
                                            setSelectedMemberId(null);
                                        }}
                                        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-zinc-700/50 transition-colors"
                                    >
                                        <span className="text-xl">🍎</span>
                                        <span className="text-xs text-zinc-400">Apple</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setAddMode({ provider: 'caldav', memberId: member.id });
                                            setSelectedMemberId(null);
                                        }}
                                        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-zinc-700/50 transition-colors"
                                    >
                                        <span className="text-xl">📅</span>
                                        <span className="text-xs text-zinc-400">CalDAV</span>
                                    </button>
                                </div>
                            )}

                            {/* Member's Connected Accounts */}
                            {memberAccounts.length > 0 ? (
                                <div className="space-y-2 pl-11">
                                    {memberAccounts.map(account => {
                                        const provider = PROVIDER_INFO[account.provider];
                                        const needsReauth = account.needsReauth;
                                        
                                        return (
                                            <div
                                                key={account.accountId}
                                                className={`flex items-center justify-between p-3 rounded-lg border ${
                                                    needsReauth
                                                        ? 'bg-red-900/20 border-red-700/30'
                                                        : 'bg-zinc-800/30 border-zinc-700/30'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg">{provider?.icon || '📧'}</span>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-white">{account.email}</span>
                                                            {needsReauth ? (
                                                                <AlertTriangle className="w-3 h-3 text-red-400" />
                                                            ) : account.isConnected ? (
                                                                <CheckCircle className="w-3 h-3 text-green-500" />
                                                            ) : (
                                                                <AlertCircle className="w-3 h-3 text-amber-500" />
                                                            )}
                                                        </div>
                                                        {needsReauth ? (
                                                            <span className="text-xs text-red-400">
                                                                Authorization expired - reconnect required
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-zinc-500">
                                                                {formatLastSynced(account.lastSyncedAt)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {needsReauth && (
                                                        <button
                                                            onClick={() => handleReconnect(account.accountId)}
                                                            className="p-1.5 hover:bg-red-500/30 rounded transition-colors"
                                                            title="Reconnect account"
                                                        >
                                                            <RotateCcw className="w-4 h-4 text-red-400 hover:text-red-300" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleRemoveAccount(account.accountId)}
                                                        className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                                                        title="Remove account"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-zinc-500 hover:text-red-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="pl-11 text-xs text-zinc-600">
                                    No calendars connected
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Unlinked Accounts */}
                    {unlinkedAccounts.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-zinc-800">
                            <h3 className="text-sm font-medium text-zinc-400">Unlinked Accounts</h3>
                            <p className="text-xs text-zinc-600">
                                These accounts need to be linked to a family member
                            </p>
                            {unlinkedAccounts.map(account => {
                                const provider = PROVIDER_INFO[account.provider];
                                return (
                                    <div
                                        key={account.accountId}
                                        className="flex items-center justify-between p-3 bg-amber-900/20 rounded-lg border border-amber-700/30"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">{provider?.icon || '📧'}</span>
                                            <span className="text-sm text-white">{account.email}</span>
                                        </div>
                                        <Trash2
                                            className="w-4 h-4 text-zinc-500 hover:text-red-400 cursor-pointer"
                                            onClick={() => handleRemoveAccount(account.accountId)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && accounts.length === 0 && (
                <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                        <User className="w-8 h-8 text-zinc-600" />
                    </div>
                    <p className="text-zinc-400 mb-2">No calendar accounts connected</p>
                    <p className="text-xs text-zinc-600 mb-4">
                        Select a family member above and add their calendar
                    </p>
                </div>
            )}
        </div>
    );
}
