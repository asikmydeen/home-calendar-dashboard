'use client';

import React, { useState } from 'react';
import { ExternalLink, Key, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { CalendarAccount } from '@/types/account';
import { DEFAULT_FAMILY_MEMBERS } from '@/types/calendar';

interface AppleAccountConnectProps {
    onConnect: (account: CalendarAccount) => void;
    onCancel: () => void;
}

export function AppleAccountConnect({ onConnect, onCancel }: AppleAccountConnectProps) {
    const [email, setEmail] = useState('');
    const [appPassword, setAppPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [selectedMember, setSelectedMember] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    const handleTestConnection = async () => {
        if (!email || !appPassword) {
            alert('Please enter both email and app password');
            return;
        }

        setTestResult('testing');

        // Simulate connection test
        await new Promise(resolve => setTimeout(resolve, 2000));

        // In demo mode, always succeed
        setTestResult('success');
    };

    const handleConnect = async () => {
        if (!email || !appPassword || !selectedMember) {
            alert('Please fill in all fields and select a family member');
            return;
        }

        setIsConnecting(true);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const member = DEFAULT_FAMILY_MEMBERS.find(m => m.id === selectedMember);

        const newAccount: CalendarAccount = {
            id: `apple-${Date.now()}`,
            provider: 'apple',
            email,
            displayName: `${member?.name}'s iCloud Calendar`,
            familyMemberId: selectedMember,
            color: member?.color || '#000000',
            isConnected: true,
            lastSyncedAt: new Date(),
            credentials: {
                caldavUrl: 'https://caldav.icloud.com',
                caldavUsername: email,
            },
        };

        setIsConnecting(false);
        onConnect(newAccount);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-zinc-700 flex items-center justify-center text-3xl">
                    🍎
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">Connect Apple Calendar</h3>
                    <p className="text-sm text-zinc-400">Use an app-specific password from iCloud</p>
                </div>
            </div>

            {/* Warning about app-specific password */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="text-amber-300 font-medium mb-1">App-Specific Password Required</p>
                        <p className="text-amber-200/70 mb-2">
                            Apple requires a special password for third-party apps. This is NOT your Apple ID password.
                        </p>
                        <a
                            href="https://appleid.apple.com/account/manage"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200"
                        >
                            Generate app-specific password <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                        Apple ID Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@icloud.com"
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                        <div className="flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            App-Specific Password
                        </div>
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={appPassword}
                            onChange={(e) => setAppPassword(e.target.value)}
                            placeholder="xxxx-xxxx-xxxx-xxxx"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-700 rounded"
                        >
                            {showPassword ? (
                                <EyeOff className="w-5 h-5 text-zinc-400" />
                            ) : (
                                <Eye className="w-5 h-5 text-zinc-400" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Test connection */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleTestConnection}
                        disabled={!email || !appPassword || testResult === 'testing'}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-300 rounded-lg transition-colors text-sm"
                    >
                        {testResult === 'testing' ? 'Testing...' : 'Test Connection'}
                    </button>
                    {testResult === 'success' && (
                        <div className="flex items-center gap-1 text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Connection successful
                        </div>
                    )}
                    {testResult === 'error' && (
                        <div className="text-red-400 text-sm">Connection failed</div>
                    )}
                </div>
            </div>

            {/* Family member selection */}
            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-3">
                    Who's calendar is this?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DEFAULT_FAMILY_MEMBERS.map(member => (
                        <button
                            key={member.id}
                            onClick={() => setSelectedMember(member.id)}
                            className={`
                p-3 rounded-xl text-center transition-all
                ${selectedMember === member.id
                                    ? 'bg-purple-600 ring-2 ring-purple-400 ring-offset-2 ring-offset-zinc-900'
                                    : 'bg-zinc-800 hover:bg-zinc-700'
                                }
              `}
                        >
                            <div className="text-2xl mb-1">{member.avatar}</div>
                            <div className="text-sm text-white">{member.name}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleConnect}
                    disabled={isConnecting || !email || !appPassword || !selectedMember}
                    className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
                >
                    {isConnecting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Connecting...
                        </>
                    ) : (
                        'Connect Apple Calendar'
                    )}
                </button>
            </div>
        </div>
    );
}
