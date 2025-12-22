'use client';

import React from 'react';
import { useCalendar } from '@/contexts/CalendarContext';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    isSameDay
} from 'date-fns';
import { EventCard } from '../EventCard';
import { getEventsForDate, sortEventsByTime } from '@/types/calendar';

export function MonthView() {
    const { selectedDate, filteredEvents, setDate, setView } = useCalendar();

    // Calculate month grid
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    // Group days into weeks
    const weeks: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
        weeks.push(calendarDays.slice(i, i + 7));
    }

    const handleDayClick = (day: Date) => {
        setDate(day);
        setView('day');
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-white">
            {/* Month/Year Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-slate-100">
                <h2 className="text-xl font-semibold text-slate-800">
                    {format(selectedDate, 'MMMM yyyy')}
                </h2>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <div
                        key={day}
                        className={`px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider ${index === 0 || index === 6 ? 'text-slate-400 bg-slate-50/50' : 'text-slate-500'
                            }`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex-1 min-h-0 grid grid-cols-7 border-b border-slate-100 last:border-b-0">
                        {week.map((day, dayIndex) => {
                            const isCurrentMonth = isSameMonth(day, selectedDate);
                            const isTodayDate = isToday(day);
                            const isWeekend = dayIndex === 0 || dayIndex === 6;
                            const dayEvents = sortEventsByTime(getEventsForDate(filteredEvents, day));
                            const maxVisibleEvents = 3;
                            const hiddenCount = Math.max(0, dayEvents.length - maxVisibleEvents);

                            return (
                                <div
                                    key={day.toISOString()}
                                    onClick={() => handleDayClick(day)}
                                    className={`
                                        flex-1 min-h-0 p-1.5 border-r border-slate-100 last:border-r-0 cursor-pointer
                                        transition-colors hover:bg-slate-50 overflow-hidden flex flex-col
                                        ${!isCurrentMonth ? 'bg-slate-50/50' : isWeekend ? 'bg-orange-50/20' : ''}
                                    `}
                                >
                                    {/* Day number */}
                                    <div className={`
                                        w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full text-sm font-medium mb-1
                                        ${isTodayDate
                                            ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-sm'
                                            : isCurrentMonth
                                                ? 'text-slate-700 hover:bg-slate-100'
                                                : 'text-slate-400'
                                        }
                                    `}>
                                        {format(day, 'd')}
                                    </div>

                                    {/* Events */}
                                    <div className="flex-1 min-h-0 space-y-0.5 overflow-hidden">
                                        {dayEvents.slice(0, maxVisibleEvents).map(event => (
                                            <EventCard
                                                key={event.id}
                                                event={event}
                                                variant="compact"
                                            />
                                        ))}
                                        {hiddenCount > 0 && (
                                            <div className="text-xs text-slate-500 pl-1 font-medium">
                                                +{hiddenCount} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
