'use client';

import React from 'react';
import { useCalendar } from '@/contexts/CalendarContext';
import {
    format,
    isToday,
    isTomorrow,
    addWeeks,
    startOfDay,
    endOfDay,
    isBefore
} from 'date-fns';
import { EventCard } from '../EventCard';
import { sortEventsByTime } from '@/types/calendar';
import { Calendar } from 'lucide-react';

interface EventGroup {
    label: string;
    events: ReturnType<typeof sortEventsByTime>;
    isToday?: boolean;
}

export function AgendaView() {
    const { selectedDate, filteredEvents } = useCalendar();

    const groupEvents = (): EventGroup[] => {
        const groups: EventGroup[] = [];
        const anchorDate = startOfDay(selectedDate);
        const endDate = endOfDay(addWeeks(anchorDate, 2));

        const sortedEvents = [...filteredEvents].sort(
            (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
        );

        const upcomingEvents = sortedEvents.filter(
            event => !isBefore(endOfDay(new Date(event.start)), anchorDate)
        );

        const eventsByDate = new Map<string, typeof upcomingEvents>();
        upcomingEvents.forEach(event => {
            const dateKey = format(new Date(event.start), 'yyyy-MM-dd');
            if (!eventsByDate.has(dateKey)) {
                eventsByDate.set(dateKey, []);
            }
            eventsByDate.get(dateKey)!.push(event);
        });

        eventsByDate.forEach((events, dateKey) => {
            const date = new Date(dateKey);
            let label: string;

            if (isToday(date)) {
                label = '📍 Today';
            } else if (isTomorrow(date)) {
                label = '🌅 Tomorrow';
            } else if (isBefore(date, addWeeks(startOfDay(new Date()), 1))) {
                label = format(date, 'EEEE');
            } else {
                label = format(date, 'EEEE, MMMM d');
            }

            groups.push({
                label,
                events: sortEventsByTime(events),
                isToday: isToday(date),
            });
        });

        return groups;
    };

    const eventGroups = groupEvents();

    if (eventGroups.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Calendar className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No upcoming events</h3>
                <p className="text-slate-500 max-w-sm">
                    Your schedule is clear! Tap the + button to add a new event.
                </p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4 bg-white">
            <div className="max-w-2xl mx-auto space-y-6">
                {eventGroups.map((group, groupIndex) => (
                    <div key={groupIndex}>
                        {/* Group header */}
                        <div className={`
                            sticky top-0 z-10 py-2 px-4 rounded-xl mb-3 backdrop-blur-sm
                            ${group.isToday
                                ? 'bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700'
                                : 'bg-slate-100 text-slate-600'
                            }
                        `}>
                            <h3 className="text-sm font-semibold">{group.label}</h3>
                        </div>

                        {/* Events */}
                        <div className="space-y-3 pl-2">
                            {group.events.map(event => (
                                <div
                                    key={event.id}
                                    className="flex gap-4 group"
                                >
                                    {/* Time column */}
                                    <div className="w-20 flex-shrink-0 pt-3 text-right">
                                        {event.isAllDay ? (
                                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-md font-medium">
                                                All day
                                            </span>
                                        ) : (
                                            <div>
                                                <div className="text-sm font-semibold text-slate-700">
                                                    {format(new Date(event.start), 'h:mm a')}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {format(new Date(event.end), 'h:mm a')}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Event card */}
                                    <div className="flex-1">
                                        <EventCard event={event} variant="full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* End spacer */}
                <div className="h-24" />
            </div>
        </div>
    );
}
