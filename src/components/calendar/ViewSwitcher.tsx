'use client';

import React from 'react';
import { useCalendar } from '@/contexts/CalendarContext';
import { format, isToday } from 'date-fns';
import {
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    Columns,
    List,
    Sun
} from 'lucide-react';
import { CalendarViewType } from '@/types/calendar';

const VIEW_OPTIONS: { id: CalendarViewType; label: string; icon: React.ReactNode }[] = [
    { id: 'day', label: 'Day', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'week', label: 'Week', icon: <Columns className="w-3.5 h-3.5" /> },
    { id: 'month', label: 'Month', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'agenda', label: 'Agenda', icon: <List className="w-3.5 h-3.5" /> },
];

export function ViewSwitcher() {
    const {
        currentView,
        selectedDate,
        setView,
        goToToday,
        navigatePrev,
        navigateNext
    } = useCalendar();

    return (
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Navigation */}
            <div className="flex items-center gap-0.5">
                <button
                    onClick={navigatePrev}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={goToToday}
                    className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${isToday(selectedDate)
                            ? 'bg-gradient-to-r from-orange-400 to-amber-400 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                >
                    Today
                </button>
                <button
                    onClick={navigateNext}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* View Switcher Pills */}
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                {VIEW_OPTIONS.map(option => (
                    <button
                        key={option.id}
                        onClick={() => setView(option.id)}
                        className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all ${currentView === option.id
                                ? 'bg-white text-slate-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {option.icon}
                        <span className="hidden sm:inline">{option.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
