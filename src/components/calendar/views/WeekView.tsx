'use client';

import React from 'react';
import { useCalendar } from '@/contexts/CalendarContext';
import {
    format,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isToday,
    isSameDay,
    setHours,
    setMinutes
} from 'date-fns';
import { EventCard } from '../EventCard';
import { getEventsForDate, sortEventsByTime } from '@/types/calendar';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WeekView() {
    const { selectedDate, filteredEvents, setDate, setView, openEventModal } = useCalendar();

    const weekStart = startOfWeek(selectedDate);
    const weekEnd = endOfWeek(selectedDate);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const handleTimeSlotClick = (day: Date, hour: number) => {
        const start = setMinutes(setHours(day, hour), 0);
        const end = setMinutes(setHours(day, hour + 1), 0);

        // Open modal with pre-filled time
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

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Day headers */}
            <div className="flex border-b border-zinc-800 flex-shrink-0">
                {/* Time gutter */}
                <div className="w-16 flex-shrink-0 border-r border-zinc-800" />

                {/* Day headers */}
                {weekDays.map(day => {
                    const isTodayDate = isToday(day);
                    const isSelected = isSameDay(day, selectedDate);

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => { setDate(day); setView('day'); }}
                            className={`
                flex-1 py-3 text-center border-r border-zinc-800/50 last:border-r-0 cursor-pointer
                transition-colors hover:bg-zinc-800/30
                ${isTodayDate ? 'bg-purple-600/10' : ''}
              `}
                        >
                            <div className="text-xs text-zinc-500 uppercase font-medium">
                                {format(day, 'EEE')}
                            </div>
                            <div className={`
                w-8 h-8 mx-auto mt-1 flex items-center justify-center rounded-full text-lg font-semibold
                ${isTodayDate
                                    ? 'bg-purple-600 text-white'
                                    : 'text-zinc-300'
                                }
              `}>
                                {format(day, 'd')}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* All-day events row */}
            <div className="flex border-b border-zinc-800 flex-shrink-0 min-h-[40px]">
                <div className="w-16 flex-shrink-0 border-r border-zinc-800 flex items-center justify-center">
                    <span className="text-xs text-zinc-500">All day</span>
                </div>
                {weekDays.map(day => {
                    const allDayEvents = getEventsForDate(filteredEvents, day).filter(e => e.isAllDay);

                    return (
                        <div
                            key={day.toISOString()}
                            className="flex-1 p-1 border-r border-zinc-800/50 last:border-r-0 overflow-hidden"
                        >
                            {allDayEvents.slice(0, 2).map(event => (
                                <EventCard key={event.id} event={event} variant="compact" />
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* Time grid */}
            <div className="flex-1 overflow-y-auto">
                <div className="relative">
                    {HOURS.map(hour => (
                        <div key={hour} className="flex h-16 border-b border-zinc-800/30">
                            {/* Time label */}
                            <div className="w-16 flex-shrink-0 border-r border-zinc-800 flex items-start justify-end pr-2 pt-0">
                                <span className="text-xs text-zinc-500 -mt-2">
                                    {format(setHours(new Date(), hour), 'h a')}
                                </span>
                            </div>

                            {/* Day columns */}
                            {weekDays.map(day => {
                                const isTodayDate = isToday(day);
                                const hourEvents = getEventsForDate(filteredEvents, day).filter(event => {
                                    if (event.isAllDay) return false;
                                    const eventHour = new Date(event.start).getHours();
                                    return eventHour === hour;
                                });

                                return (
                                    <div
                                        key={day.toISOString()}
                                        onClick={() => handleTimeSlotClick(day, hour)}
                                        className={`
                      flex-1 border-r border-zinc-800/30 last:border-r-0 relative cursor-pointer
                      hover:bg-zinc-800/20 transition-colors
                      ${isTodayDate ? 'bg-purple-600/5' : ''}
                    `}
                                    >
                                        {hourEvents.map(event => (
                                            <div
                                                key={event.id}
                                                className="absolute inset-x-0.5 top-0.5"
                                            >
                                                <EventCard event={event} variant="time" />
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
