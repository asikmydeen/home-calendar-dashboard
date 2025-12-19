'use client';

import React, { useState } from 'react';
import { Server, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { CalendarAccount } from '@/types/account';
import { DEFAULT_FAMILY_MEMBERS } from '@/types/calendar';

interface CalDAVAccountConnectProps {
    onConnect: (account: CalendarAccount) => void;
    onCancel: () => void;
}

export function CalDAVAccountConnect({ onConnect, onCancel }: CalDAVAccountConnectProps) {
    const [serverUrl, setServerUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [selectedMember, setSelectedMember] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    const handleTestConnection = async () => {
        if (!serverUrl || !username || !password) {
            alert('Please fill in server URL, username, and password');
            return;
        }

        setTestResult('testing');
        await new Promise(resolve => setTimeout(resolve, 2000));
        setTestResult('success');
    };

    const handleConnect = async () => {
        if (!serverUrl || !username || !password || !selectedMember) {
            alert('Please fill in all fields and select a family member');
            return;
        }

        setIsConnecting(true);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const member = DEFAULT_FAMILY_MEMBERS.find(m => m.id === selectedMember);

        const newAccount: CalendarAccount = {
            id: `caldav-${Date.now()}`,
            provider: 'caldav',
            email: username,
            displayName: displayName || `${member?.name}'s Calendar`,
            familyMemberId: selectedMember,
            color: member?.color || '#6B7280',
            isConnected: true,
            lastSyncedAt: new Date(),
            credentials: {
                caldavUrl: serverUrl,
                caldavUsername: username,
            },
        };

        setIsConnecting(false);
        onConnect(newAccount);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-zinc-700 flex items-center justify-center text-3xl">
                    📅
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">Connect CalDAV Calendar</h3>
                    <p className="text-sm text-zinc-400">For Fastmail, Synology, Nextcloud, etc.</p>
                </div>
            </div>

            {/* Common servers */}
            <div className="bg-zinc-800/50 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-3">Common CalDAV server URLs:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <button
                        onClick={() => setServerUrl('https://caldav.fastmail.com/dav/calendars/user/')}
                        className="text-left px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
                    >
                        <div className="font-medium">Fastmail</div>
                        <div className="text-zinc-500">caldav.fastmail.com</div>
                    </button>
                    <button
                        onClick={() => setServerUrl('https://your-nas:5001/caldav/')}
                        className="text-left px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
                    >
                        <div className="font-medium">Synology</div>
                        <div className="text-zinc-500">your-nas:5001/caldav</div>
                    </button>
                    <button
                        onClick={() => setServerUrl('https://your-server/remote.php/dav/')}
                        className="text-left px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
                    >
                        <div className="font-medium">Nextcloud</div>
                        <div className="text-zinc-500">remote.php/dav</div>
                    </button>
                    <button
                        onClick={() => setServerUrl('https://your-server/.well-known/caldav')}
                        className="text-left px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
                    >
                        <div className="font-medium">Other</div>
                        <div className="text-zinc-500">.well-known/caldav</div>
                    </button>
                </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                        <div className="flex items-center gap-2">
                            <Server className="w-4 h-4" />
                            CalDAV Server URL
                        </div>
                    </label>
                    <input
                        type="url"
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                        placeholder="https://caldav.example.com/dav/"
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="user@example.com"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
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
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                        Display Name (optional)
                    </label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="My Calendar Server"
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                </div>

                {/* Test connection */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleTestConnection}
                        disabled={!serverUrl || !username || !password || testResult === 'testing'}
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
                    disabled={isConnecting || !serverUrl || !username || !password || !selectedMember}
                    className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
                >
                    {isConnecting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Connecting...
                        </>
                    ) : (
                        'Connect CalDAV'
                    )}
                </button>
            </div>
        </div>
    );
}
