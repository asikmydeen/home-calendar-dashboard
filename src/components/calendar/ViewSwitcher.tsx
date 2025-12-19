'use client';

import React from 'react';
import { useCalendar } from '@/contexts/CalendarContext';
import { format, isToday } from 'date-fns';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    LayoutGrid,
    Columns,
    List,
    Sun
} from 'lucide-react';
import { CalendarViewType } from '@/types/calendar';

const VIEW_OPTIONS: { id: CalendarViewType; label: string; icon: React.ReactNode }[] = [
    { id: 'day', label: 'Day', icon: <Sun className="w-4 h-4" /> },
    { id: 'week', label: 'Week', icon: <Columns className="w-4 h-4" /> },
    { id: 'month', label: 'Month', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'agenda', label: 'Agenda', icon: <List className="w-4 h-4" /> },
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

    const getDateLabel = () => {
        switch (currentView) {
            case 'day':
                return format(selectedDate, 'EEEE, MMMM d, yyyy');
            case 'week':
                return format(selectedDate, "'Week of' MMM d, yyyy");
            case 'month':
                return format(selectedDate, 'MMMM yyyy');
            case 'agenda':
                return format(selectedDate, 'MMMM yyyy');
            default:
                return format(selectedDate, 'MMMM yyyy');
        }
    };

    return (
        <div className="flex items-center justify-between gap-4">
            {/* Left: Navigation & Date */}
            <div className="flex items-center gap-3">
                {/* Today button */}
                <button
                    onClick={goToToday}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${isToday(selectedDate)
                        ? 'bg-purple-600 text-white'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                >
                    Today
                </button>

                {/* Prev/Next */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={navigatePrev}
                        className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={navigateNext}
                        className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Date Label */}
                <h2 className="text-lg font-semibold text-white">
                    {getDateLabel()}
                </h2>
            </div>

            {/* Right: View Switcher */}
            <div className="flex items-center gap-1 bg-zinc-800/50 rounded-xl p-1">
                {VIEW_OPTIONS.map(option => (
                    <button
                        key={option.id}
                        onClick={() => setView(option.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${currentView === option.id
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
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
