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
    setMinutes,
    differenceInMinutes
} from 'date-fns';
import { getEventsForDate, sortEventsByTime, CalendarEvent } from '@/types/calendar';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM
const HOUR_HEIGHT = 64; // pixels per hour

import { getContrastColor } from '@/lib/utils';

interface EventBlockProps {
    event: CalendarEvent;
    color: string;
    onClick: () => void;
}

function EventBlock({ event, color, onClick }: EventBlockProps) {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const startHour = startDate.getHours() + startDate.getMinutes() / 60;
    const duration = differenceInMinutes(endDate, startDate) / 60;

    // Calculate position relative to 7 AM
    const topOffset = (startHour - 7) * HOUR_HEIGHT;
    const height = Math.max(duration * HOUR_HEIGHT, 24); // Minimum height

    const textColor = getContrastColor(color);

    return (
        <div
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="absolute left-1 right-1 rounded-lg px-2 py-1 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg overflow-hidden"
            style={{
                top: `${topOffset}px`,
                height: `${height - 2}px`,
                backgroundColor: color,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
        >
            <div
                className="font-semibold text-sm truncate"
                style={{ color: textColor }}
            >
                {event.title}
            </div>
            {height > 40 && (
                <div
                    className="text-xs opacity-80 truncate"
                    style={{ color: textColor }}
                >
                    {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                </div>
            )}
        </div>
    );
}

export function WeekView() {
    const { selectedDate, filteredEvents, calendars, setDate, setView, openEventModal } = useCalendar();

    const weekStart = startOfWeek(selectedDate);
    const weekEnd = endOfWeek(selectedDate);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const handleTimeSlotClick = (day: Date, hour: number) => {
        const start = setMinutes(setHours(day, hour), 0);
        const end = setMinutes(setHours(day, hour + 1), 0);

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
    const showCurrentTime = currentHour >= 7 && currentHour <= 20;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Day headers */}
            <div className="flex border-b border-slate-200 flex-shrink-0 bg-slate-50/50">
                {/* Time gutter */}
                <div className="w-16 flex-shrink-0 border-r border-slate-200" />

                {/* Day headers */}
                {weekDays.map(day => {
                    const isTodayDate = isToday(day);
                    const isSelected = isSameDay(day, selectedDate);

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => { setDate(day); setView('day'); }}
                            className={`
                                flex-1 py-3 text-center border-r border-slate-100 last:border-r-0 cursor-pointer
                                transition-colors hover:bg-slate-100/50
                                ${isTodayDate ? 'bg-orange-50' : ''}
                            `}
                        >
                            <div className="text-xs text-slate-400 uppercase font-medium tracking-wide">
                                {format(day, 'EEE')}
                            </div>
                            <div className={`
                                w-9 h-9 mx-auto mt-1 flex items-center justify-center rounded-full text-lg font-semibold
                                ${isTodayDate
                                    ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-sm'
                                    : 'text-slate-700 hover:bg-slate-200'
                                }
                            `}>
                                {format(day, 'd')}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* All-day events row */}
            <div className="flex border-b border-slate-200 flex-shrink-0 min-h-[44px] bg-slate-50/30">
                <div className="w-16 flex-shrink-0 border-r border-slate-200 flex items-center justify-center">
                    <span className="text-xs text-slate-400 font-medium">All day</span>
                </div>
                {weekDays.map(day => {
                    const rawAllDayEvents = getEventsForDate(filteredEvents, day).filter(e => e.isAllDay);
                    // Deduplicate events by ID (same event may exist in multiple accounts)
                    const allDayEvents = rawAllDayEvents.filter((event, index, self) =>
                        index === self.findIndex(e => e.id === event.id)
                    );

                    return (
                        <div
                            key={day.toISOString()}
                            className="flex-1 p-1 border-r border-slate-100 last:border-r-0 overflow-hidden flex flex-wrap gap-1"
                        >
                            {allDayEvents.slice(0, 2).map(event => {
                                const color = getEventColor(event);
                                return (
                                    <div
                                        key={event.id}
                                        onClick={(e) => { e.stopPropagation(); openEventModal(event); }}
                                        className="px-2 py-0.5 rounded text-xs font-medium truncate cursor-pointer hover:opacity-80 transition-opacity"
                                        style={{
                                            backgroundColor: color,
                                            color: getContrastColor(color)
                                        }}
                                    >
                                        {event.title}
                                    </div>
                                );
                            })}
                            {allDayEvents.length > 2 && (
                                <span className="text-xs text-slate-400">+{allDayEvents.length - 2}</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Time grid */}
            <div className="flex-1 overflow-y-auto">
                <div className="relative">
                    {/* Current time indicator */}
                    {showCurrentTime && isToday(weekDays[0]) && (
                        <div
                            className="absolute left-16 right-0 z-20 flex items-center pointer-events-none"
                            style={{ top: `${currentTimeTop}px` }}
                        >
                            <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                            <div className="flex-1 h-0.5 bg-red-500" />
                        </div>
                    )}

                    {HOURS.map(hour => (
                        <div key={hour} className="flex" style={{ height: `${HOUR_HEIGHT}px` }}>
                            {/* Time label */}
                            <div className="w-16 flex-shrink-0 border-r border-slate-200 flex items-start justify-end pr-2 pt-0">
                                <span className="text-xs text-slate-400 font-medium -mt-2">
                                    {format(setHours(new Date(), hour), 'h a')}
                                </span>
                            </div>

                            {/* Day columns */}
                            {weekDays.map(day => {
                                const isTodayDate = isToday(day);

                                return (
                                    <div
                                        key={day.toISOString()}
                                        onClick={() => handleTimeSlotClick(day, hour)}
                                        className={`
                                            flex-1 border-r border-slate-100 last:border-r-0 border-b border-slate-100
                                            cursor-pointer hover:bg-slate-50 transition-colors relative
                                            ${isTodayDate ? 'bg-orange-50/30' : ''}
                                        `}
                                    />
                                );
                            })}
                        </div>
                    ))}

                    {/* Event blocks overlay */}
                    <div className="absolute top-0 left-16 right-0 bottom-0 pointer-events-none">
                        <div className="relative h-full flex">
                            {weekDays.map(day => {
                                const rawDayEvents = sortEventsByTime(
                                    getEventsForDate(filteredEvents, day).filter(e => !e.isAllDay)
                                );
                                // Deduplicate events by ID (same event may exist in multiple accounts)
                                const dayEvents = rawDayEvents.filter((event, index, self) =>
                                    index === self.findIndex(e => e.id === event.id)
                                );

                                return (
                                    <div
                                        key={day.toISOString()}
                                        className="flex-1 relative pointer-events-auto"
                                    >
                                        {dayEvents.map(event => (
                                            <EventBlock
                                                key={event.id}
                                                event={event}
                                                color={getEventColor(event)}
                                                onClick={() => openEventModal(event)}
                                            />
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
