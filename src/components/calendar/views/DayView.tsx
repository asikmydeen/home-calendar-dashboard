'use client';

import React from 'react';
import { useCalendar } from '@/contexts/CalendarContext';
import {
    format,
    isToday,
    setHours,
    setMinutes
} from 'date-fns';
import { EventCard } from '../EventCard';
import { getEventsForDate, sortEventsByTime } from '@/types/calendar';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function DayView() {
    const { selectedDate, filteredEvents, openEventModal } = useCalendar();

    const dayEvents = sortEventsByTime(getEventsForDate(filteredEvents, selectedDate));
    const allDayEvents = dayEvents.filter(e => e.isAllDay);
    const timedEvents = dayEvents.filter(e => !e.isAllDay);
    const isTodayDate = isToday(selectedDate);

    const handleTimeSlotClick = (hour: number) => {
        const start = setMinutes(setHours(new Date(selectedDate), hour), 0);
        const end = setMinutes(setHours(new Date(selectedDate), hour + 1), 0);

        openEventModal({
            id: '',
            title: '',
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
    };

    // Get events for a specific hour
    const getEventsForHour = (hour: number) => {
        return timedEvents.filter(event => {
            const eventHour = new Date(event.start).getHours();
            return eventHour === hour;
        });
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Day header */}
            <div className={`
        p-4 border-b border-zinc-800 flex-shrink-0 text-center
        ${isTodayDate ? 'bg-purple-600/10' : ''}
      `}>
                <div className="text-sm text-zinc-500 uppercase font-medium">
                    {format(selectedDate, 'EEEE')}
                </div>
                <div className={`
          w-14 h-14 mx-auto mt-2 flex items-center justify-center rounded-full text-2xl font-bold
          ${isTodayDate
                        ? 'bg-purple-600 text-white'
                        : 'text-zinc-300 bg-zinc-800'
                    }
        `}>
                    {format(selectedDate, 'd')}
                </div>
            </div>

            {/* All-day events */}
            {allDayEvents.length > 0 && (
                <div className="border-b border-zinc-800 p-3 flex-shrink-0">
                    <div className="text-xs text-zinc-500 mb-2 font-medium">All Day</div>
                    <div className="space-y-1">
                        {allDayEvents.map(event => (
                            <EventCard key={event.id} event={event} variant="full" />
                        ))}
                    </div>
                </div>
            )}

            {/* Time grid */}
            <div className="flex-1 overflow-y-auto">
                <div className="relative">
                    {HOURS.map(hour => {
                        const hourEvents = getEventsForHour(hour);
                        const isCurrentHour = isTodayDate && new Date().getHours() === hour;

                        return (
                            <div
                                key={hour}
                                onClick={() => handleTimeSlotClick(hour)}
                                className={`
                  flex min-h-[60px] border-b border-zinc-800/30 cursor-pointer
                  hover:bg-zinc-800/20 transition-colors
                  ${isCurrentHour ? 'bg-purple-600/10' : ''}
                `}
                            >
                                {/* Time label */}
                                <div className="w-20 flex-shrink-0 border-r border-zinc-800 flex items-start justify-end pr-3 pt-1">
                                    <span className={`text-xs ${isCurrentHour ? 'text-purple-400 font-semibold' : 'text-zinc-500'}`}>
                                        {format(setHours(new Date(), hour), 'h:mm a')}
                                    </span>
                                </div>

                                {/* Events */}
                                <div className="flex-1 p-1 relative">
                                    {hourEvents.length > 0 ? (
                                        <div className="space-y-1">
                                            {hourEvents.map(event => (
                                                <EventCard key={event.id} event={event} variant="full" />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full w-full" />
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Current time indicator */}
                    {isTodayDate && (
                        <div
                            className="absolute left-0 right-0 z-10 pointer-events-none"
                            style={{
                                top: `${(new Date().getHours() * 60 + new Date().getMinutes()) / 1440 * 100}%`
                            }}
                        >
                            <div className="flex items-center">
                                <div className="w-20 flex justify-end pr-1">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                </div>
                                <div className="flex-1 h-0.5 bg-red-500" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
