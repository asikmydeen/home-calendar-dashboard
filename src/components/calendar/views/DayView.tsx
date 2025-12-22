'use client';

import React from 'react';
import { useCalendar } from '@/contexts/CalendarContext';
import {
    format,
    isToday,
    setHours,
    setMinutes,
    differenceInMinutes
} from 'date-fns';
import { EventCard } from '../EventCard';
import { getEventsForDate, sortEventsByTime, CalendarEvent } from '@/types/calendar';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM
const HOUR_HEIGHT = 64;

function getContrastColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#374151' : '#ffffff';
}

export function DayView() {
    const { selectedDate, filteredEvents, calendars, openEventModal } = useCalendar();

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

    const getEventColor = (event: CalendarEvent) => {
        const calendar = calendars.find(c => c.id === event.calendarId);
        return event.color || calendar?.color || '#E8B4BC';
    };

    // Get current time position
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const currentTimeTop = (currentHour - 7) * HOUR_HEIGHT;
    const showCurrentTime = isTodayDate && currentHour >= 7 && currentHour <= 20;

    return (
        <div className="h-full flex flex-col overflow-hidden bg-white">
            {/* Day header */}
            <div className={`
                p-5 border-b border-slate-100 flex-shrink-0 text-center
                ${isTodayDate ? 'bg-orange-50' : 'bg-slate-50/50'}
            `}>
                <div className="text-sm text-slate-400 uppercase font-medium tracking-wide">
                    {format(selectedDate, 'EEEE')}
                </div>
                <div className={`
                    w-16 h-16 mx-auto mt-2 flex items-center justify-center rounded-full text-2xl font-bold
                    ${isTodayDate
                        ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-md'
                        : 'text-slate-700 bg-slate-100'
                    }
                `}>
                    {format(selectedDate, 'd')}
                </div>
            </div>

            {/* All-day events */}
            {allDayEvents.length > 0 && (
                <div className="border-b border-slate-100 p-3 flex-shrink-0 bg-slate-50/30">
                    <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">All Day</div>
                    <div className="space-y-1.5">
                        {allDayEvents.map(event => (
                            <EventCard key={event.id} event={event} variant="full" />
                        ))}
                    </div>
                </div>
            )}

            {/* Time grid */}
            <div className="flex-1 overflow-y-auto">
                <div className="relative">
                    {/* Current time indicator */}
                    {showCurrentTime && (
                        <div
                            className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                            style={{ top: `${currentTimeTop}px` }}
                        >
                            <div className="w-20 flex justify-end pr-1">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                            </div>
                            <div className="flex-1 h-0.5 bg-red-500" />
                        </div>
                    )}

                    {HOURS.map(hour => {
                        const isCurrentHour = isTodayDate && new Date().getHours() === hour;

                        return (
                            <div
                                key={hour}
                                onClick={() => handleTimeSlotClick(hour)}
                                className={`
                                    flex border-b border-slate-100 cursor-pointer
                                    hover:bg-slate-50 transition-colors
                                    ${isCurrentHour ? 'bg-orange-50/50' : ''}
                                `}
                                style={{ height: `${HOUR_HEIGHT}px` }}
                            >
                                {/* Time label */}
                                <div className="w-20 flex-shrink-0 border-r border-slate-200 flex items-start justify-end pr-3 pt-0">
                                    <span className={`text-xs font-medium -mt-2 ${isCurrentHour ? 'text-orange-500' : 'text-slate-400'}`}>
                                        {format(setHours(new Date(), hour), 'h a')}
                                    </span>
                                </div>

                                {/* Events column */}
                                <div className="flex-1 relative" />
                            </div>
                        );
                    })}

                    {/* Event blocks overlay */}
                    <div className="absolute top-0 left-20 right-0 bottom-0 pointer-events-none">
                        {timedEvents.map(event => {
                            const startDate = new Date(event.start);
                            const endDate = new Date(event.end);
                            const startHour = startDate.getHours() + startDate.getMinutes() / 60;
                            const duration = differenceInMinutes(endDate, startDate) / 60;

                            const topOffset = (startHour - 7) * HOUR_HEIGHT;
                            const height = Math.max(duration * HOUR_HEIGHT, 32);
                            const color = getEventColor(event);
                            const textColor = getContrastColor(color);

                            return (
                                <div
                                    key={event.id}
                                    onClick={(e) => { e.stopPropagation(); openEventModal(event); }}
                                    className="absolute left-2 right-2 rounded-xl px-3 py-2 cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-lg pointer-events-auto"
                                    style={{
                                        top: `${topOffset}px`,
                                        height: `${height - 4}px`,
                                        backgroundColor: color,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    <div
                                        className="font-semibold text-sm truncate"
                                        style={{ color: textColor }}
                                    >
                                        {event.title}
                                    </div>
                                    {height > 50 && (
                                        <div
                                            className="text-xs opacity-80"
                                            style={{ color: textColor }}
                                        >
                                            {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
