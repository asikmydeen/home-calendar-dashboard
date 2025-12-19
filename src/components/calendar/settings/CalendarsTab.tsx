'use client';

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { PROVIDER_INFO } from '@/types/account';
import { useAccounts } from '@/contexts/AccountsContext';
import { useCalendar } from '@/contexts/CalendarContext';

export function CalendarsTab() {
    const { accounts, isLoading } = useAccounts();
    const { calendars, toggleCalendarVisibility, visibleCalendarIds } = useCalendar();

    if (isLoading) {
        return <div className="text-center py-8 text-zinc-500">Loading...</div>;
    }

    // Group calendars by the accounts that own them
    const groupedCalendars = accounts.map(account => ({
        account,
        calendars: calendars.filter(c => c.ownerId === account.linkedMemberId || c.id.includes(account.accountId))
    }));

    return (
        <div className="space-y-6">
            <p className="text-sm text-zinc-400">
                Choose which calendars to show on your dashboard. Toggle visibility with the eye icon.
            </p>

            {accounts.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-zinc-500">No accounts connected</p>
                    <p className="text-xs text-zinc-600 mt-1">Go to Accounts tab to add calendars</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {groupedCalendars.map(({ account, calendars: accountCalendars }) => {
                        const provider = PROVIDER_INFO[account.provider as keyof typeof PROVIDER_INFO];

                        return (
                            <div key={account.accountId}>
                                {/* Account header */}
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg">{provider?.icon || '📧'}</span>
                                    <span className="text-sm font-medium text-zinc-300">{account.displayName}</span>
                                    <span className="text-xs text-zinc-600">({account.email})</span>
                                </div>

                                {/* Calendars */}
                                <div className="space-y-2">
                                    {accountCalendars.length === 0 ? (
                                        <p className="text-xs text-zinc-600 pl-6">No calendars found</p>
                                    ) : (
                                        accountCalendars.map(calendar => (
                                            <div
                                                key={calendar.id}
                                                className={`
                          flex items-center gap-3 p-3 rounded-xl transition-all
                          ${visibleCalendarIds.includes(calendar.id) ? 'bg-zinc-800/50' : 'bg-zinc-900/50 opacity-60'}
                        `}
                                            >
                                                {/* Color indicator */}
                                                <div
                                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: calendar.color }}
                                                />

                                                {/* Calendar name */}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white text-sm">{calendar.name}</span>
                                                    </div>
                                                </div>

                                                {/* Toggle visibility */}
                                                <button
                                                    onClick={() => toggleCalendarVisibility(calendar.id)}
                                                    className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                                                >
                                                    {visibleCalendarIds.includes(calendar.id) ? (
                                                        <Eye className="w-4 h-4 text-green-400" />
                                                    ) : (
                                                        <EyeOff className="w-4 h-4 text-zinc-600" />
                                                    )}
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Show local/family calendars */}
                    {calendars.filter(c => c.source === 'local').length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-lg">📅</span>
                                <span className="text-sm font-medium text-zinc-300">Local Calendars</span>
                            </div>
                            <div className="space-y-2">
                                {calendars.filter(c => c.source === 'local').map(calendar => (
                                    <div
                                        key={calendar.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${visibleCalendarIds.includes(calendar.id) ? 'bg-zinc-800/50' : 'bg-zinc-900/50 opacity-60'}`}
                                    >
                                        <div
                                            className="w-4 h-4 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: calendar.color }}
                                        />
                                        <span className="flex-1 text-white text-sm">{calendar.name}</span>
                                        <button
                                            onClick={() => toggleCalendarVisibility(calendar.id)}
                                            className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                                        >
                                            {visibleCalendarIds.includes(calendar.id) ? (
                                                <Eye className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-zinc-600" />
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
