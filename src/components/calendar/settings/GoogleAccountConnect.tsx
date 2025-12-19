'use client';

import React, { useState } from 'react';
import { ExternalLink, Shield, AlertCircle } from 'lucide-react';
import { useAccounts } from '@/contexts/AccountsContext';
import { useHousehold } from '@/contexts/HouseholdContext';

interface GoogleAccountConnectProps {
    memberId: string; // Pre-selected family member
    onCancel: () => void;
}

export function GoogleAccountConnect({ memberId, onCancel }: GoogleAccountConnectProps) {
    const { connectGoogleAccount } = useAccounts();
    const { familyMembers } = useHousehold();
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const member = familyMembers.find(m => m.id === memberId);

    const handleGoogleSignIn = async () => {
        setIsConnecting(true);
        setError(null);

        try {
            await connectGoogleAccount(memberId);
            // Note: This redirects to Google OAuth, so the page will navigate away
            // The AccountsContext handles the callback and linking
        } catch (err: any) {
            setIsConnecting(false);
            setError(err.message || 'Failed to initiate Google connection');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center text-3xl">
                    🔵
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">Connect Google Calendar</h3>
                    <p className="text-sm text-zinc-400">
                        Adding calendar for <span className="text-white font-medium">{member?.name || 'family member'}</span>
                    </p>
                </div>
            </div>

            {/* Info box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex gap-3">
                    <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="text-blue-300 font-medium mb-1">Secure OAuth Connection</p>
                        <p className="text-blue-200/70">
                            We'll redirect you to Google to sign in. We only request access to your calendar data
                            and never see your password.
                        </p>
                    </div>
                </div>
            </div>

            {/* Selected member display */}
            {member && (
                <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                        style={{ backgroundColor: member.color + '30' }}
                    >
                        {member.avatar || '👤'}
                    </div>
                    <div>
                        <p className="text-white font-medium">{member.name}</p>
                        <p className="text-xs text-zinc-500 capitalize">{member.role}</p>
                    </div>
                </div>
            )}

            {/* Permissions info */}
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <p className="text-sm text-zinc-400 mb-3">This app will request access to:</p>
                <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2 text-zinc-300">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        View and manage your calendars
                    </li>
                    <li className="flex items-center gap-2 text-zinc-300">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Create, edit, and delete events
                    </li>
                    <li className="flex items-center gap-2 text-zinc-300">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        View your email address
                    </li>
                </ul>
            </div>

            {/* Error display */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
                <button
                    onClick={onCancel}
                    disabled={isConnecting}
                    className="px-4 py-2 text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={handleGoogleSignIn}
                    disabled={isConnecting}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                    {isConnecting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Connecting...
                        </>
                    ) : (
                        <>
                            Sign in with Google
                            <ExternalLink className="w-4 h-4" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
