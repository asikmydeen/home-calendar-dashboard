'use client';

import React, { useState } from 'react';
import { X, Users, Calendar, RefreshCw, Settings2 } from 'lucide-react';
import { AccountsTab } from './settings/AccountsTab';
import { CalendarsTab } from './settings/CalendarsTab';
import { SyncTab } from './settings/SyncTab';

type SettingsTab = 'accounts' | 'calendars' | 'sync';

interface CalendarSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'accounts', label: 'Accounts', icon: <Settings2 className="w-4 h-4" /> },
    { id: 'calendars', label: 'Calendars', icon: <Calendar className="w-4 h-4" /> },
    { id: 'sync', label: 'Sync', icon: <RefreshCw className="w-4 h-4" /> },
];

export function CalendarSettings({ isOpen, onClose }: CalendarSettingsProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>('accounts');

    if (!isOpen) return null;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'accounts':
                return <AccountsTab />;
            case 'calendars':
                return <CalendarsTab />;
            case 'sync':
                return <SyncTab />;
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-zinc-700 max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Calendar Settings</h2>
                            <p className="text-xs text-zinc-500">Manage accounts and sync preferences</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-800 px-6 flex-shrink-0">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative
                ${activeTab === tab.id
                                    ? 'text-purple-400'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                }
              `}
                        >
                            {tab.icon}
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
}
