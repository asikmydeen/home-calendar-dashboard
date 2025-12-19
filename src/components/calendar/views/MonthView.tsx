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
        <div className="h-full flex flex-col overflow-hidden bg-zinc-900/50">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-zinc-800">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div
                        key={day}
                        className="px-2 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="flex-1 grid grid-rows-6 overflow-hidden">
                {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 border-b border-zinc-800/50">
                        {week.map(day => {
                            const isCurrentMonth = isSameMonth(day, selectedDate);
                            const isTodayDate = isToday(day);
                            const dayEvents = sortEventsByTime(getEventsForDate(filteredEvents, day));
                            const maxVisibleEvents = 3;
                            const hiddenCount = Math.max(0, dayEvents.length - maxVisibleEvents);

                            return (
                                <div
                                    key={day.toISOString()}
                                    onClick={() => handleDayClick(day)}
                                    className={`
                    min-h-[100px] p-1 border-r border-zinc-800/50 last:border-r-0 cursor-pointer
                    transition-colors hover:bg-zinc-800/30
                    ${!isCurrentMonth ? 'bg-zinc-900/50' : ''}
                  `}
                                >
                                    {/* Day number */}
                                    <div className={`
                    w-7 h-7 mb-1 flex items-center justify-center rounded-full text-sm font-medium
                    ${isTodayDate
                                            ? 'bg-purple-600 text-white'
                                            : isCurrentMonth
                                                ? 'text-zinc-300 hover:bg-zinc-700'
                                                : 'text-zinc-600'
                                        }
                  `}>
                                        {format(day, 'd')}
                                    </div>

                                    {/* Events */}
                                    <div className="space-y-0.5 overflow-hidden">
                                        {dayEvents.slice(0, maxVisibleEvents).map(event => (
                                            <EventCard
                                                key={event.id}
                                                event={event}
                                                variant="compact"
                                            />
                                        ))}
                                        {hiddenCount > 0 && (
                                            <div className="text-xs text-zinc-500 pl-1 font-medium">
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
