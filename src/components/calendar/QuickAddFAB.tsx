'use client';

import React, { useState } from 'react';
import { useCalendar } from '@/contexts/CalendarContext';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Plus, X, Calendar, Clock, Zap } from 'lucide-react';
import { format, addHours, setHours, setMinutes, startOfDay } from 'date-fns';

// Quick add templates
const QUICK_TEMPLATES = [
    { emoji: '🏫', label: 'School', category: 'school' as const },
    { emoji: '🏥', label: 'Doctor', category: 'medical' as const },
    { emoji: '🏃', label: 'Sports', category: 'sports' as const },
    { emoji: '🎵', label: 'Music', category: 'music' as const },
    { emoji: '👨‍👩‍👧', label: 'Family', category: 'family' as const },
    { emoji: '🍽️', label: 'Meal', category: 'meal' as const },
];

export function QuickAddFAB() {
    const { openEventModal, addEvent, selectedDate } = useCalendar();
    const { familyMembers } = useHousehold();
    const [isExpanded, setIsExpanded] = useState(false);
    const [quickTitle, setQuickTitle] = useState('');

    const handleQuickAdd = () => {
        if (quickTitle.trim()) {
            const now = new Date();
            const start = setMinutes(setHours(new Date(selectedDate), now.getHours() + 1), 0);
            const end = addHours(start, 1);

            // BROADCAST LOGIC: Default to everyone (Family)
            familyMembers.forEach((member: any) => {
                let targetCalId = `cal-${member.id}`;
                const googleAccount = member.connectedAccounts?.find((acc: any) => acc.provider === 'google');

                if (googleAccount && googleAccount.accountId) {
                    targetCalId = `google-primary-${googleAccount.accountId}`;
                }

                addEvent({
                    title: quickTitle.trim(),
                    start,
                    end,
                    isAllDay: false,
                    calendarId: targetCalId,
                    category: 'general',
                    recurrence: 'none',
                    assignedTo: [member.id],
                });
            });

            setQuickTitle('');
            setIsExpanded(false);
        }
    };

    const handleTemplateClick = (template: typeof QUICK_TEMPLATES[0]) => {
        const now = new Date();
        const start = setMinutes(setHours(new Date(selectedDate), now.getHours() + 1), 0);
        const end = addHours(start, 1);

        openEventModal({
            id: '',
            title: template.label,
            start,
            end,
            isAllDay: false,
            calendarId: 'family',
            category: template.category,
            recurrence: 'none',
            assignedTo: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        setIsExpanded(false);
    };

    const handleFullModalOpen = () => {
        const now = new Date();
        const start = setMinutes(setHours(new Date(selectedDate), now.getHours() + 1), 0);
        const end = addHours(start, 1);

        openEventModal({
            id: '',
            title: quickTitle, // Pass typed title if any
            start,
            end,
            isAllDay: false,
            calendarId: 'family',
            category: 'general',
            recurrence: 'none',
            assignedTo: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        setIsExpanded(false);
    };

    return (
        <>
            {/* Backdrop when expanded */}
            {isExpanded && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsExpanded(false)}
                />
            )}

            {/* FAB Container */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
                {/* Expanded Panel */}
                {isExpanded && (
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-4 w-80 animate-in slide-in-from-bottom-4 fade-in duration-200">
                        {/* Quick input */}
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={quickTitle}
                                onChange={(e) => setQuickTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                                placeholder="Quick add event..."
                                className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 text-sm focus:ring-2 focus:ring-purple-500"
                                autoFocus
                            />
                            <button
                                onClick={handleQuickAdd}
                                disabled={!quickTitle.trim()}
                                className="p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 rounded-xl transition-colors"
                            >
                                <Plus className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Quick templates */}
                        <div className="mb-4">
                            <div className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                Quick Templates
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {QUICK_TEMPLATES.map(template => (
                                    <button
                                        key={template.label}
                                        onClick={() => handleTemplateClick(template)}
                                        className="flex flex-col items-center gap-1 p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors"
                                    >
                                        <span className="text-xl">{template.emoji}</span>
                                        <span className="text-xs text-zinc-400">{template.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Full form button */}
                        <button
                            onClick={handleFullModalOpen}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors text-sm"
                        >
                            Open Full Form
                        </button>

                        {/* Date indicator */}
                        <div className="mt-3 text-center text-xs text-zinc-500">
                            Adding to Family Calendar • {format(selectedDate, 'EEEE, MMM d')}
                        </div>
                    </div>
                )}

                {/* Main FAB Button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`
            w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200
            ${isExpanded
                            ? 'bg-zinc-700 hover:bg-zinc-600 rotate-45'
                            : 'bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 hover:scale-110'
                        }
          `}
                >
                    {isExpanded ? (
                        <X className="w-6 h-6 text-white" />
                    ) : (
                        <Plus className="w-6 h-6 text-white" />
                    )}
                </button>
            </div>
        </>
    );
}
