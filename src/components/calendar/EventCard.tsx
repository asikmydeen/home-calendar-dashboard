'use client';

import React from 'react';
import { CalendarEvent, CATEGORY_ICONS } from '@/types/calendar';
import { useCalendar } from '@/contexts/CalendarContext';
import { format } from 'date-fns';
import { MapPin, Users } from 'lucide-react';

interface EventCardProps {
    event: CalendarEvent;
    variant?: 'compact' | 'time' | 'full';
}

export function EventCard({ event, variant = 'compact' }: EventCardProps) {
    const { calendars, familyMembers, openEventModal } = useCalendar();

    const calendar = calendars.find(c => c.id === event.calendarId);
    const color = event.color || calendar?.color || '#6366f1';
    const categoryIcon = CATEGORY_ICONS[event.category];
    const assignedMembers = familyMembers.filter(m => event.assignedTo.includes(m.id));

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        openEventModal(event);
    };

    if (variant === 'compact') {
        return (
            <div
                onClick={handleClick}
                className="group flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs cursor-pointer hover:ring-1 ring-white/20 transition-all"
                style={{ backgroundColor: `${color}30` }}
            >
                <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                />
                <span
                    className="truncate font-medium"
                    style={{ color }}
                >
                    {event.title}
                </span>
            </div>
        );
    }

    if (variant === 'time') {
        return (
            <div
                onClick={handleClick}
                className="group rounded-md px-2 py-1 text-xs cursor-pointer transition-all hover:ring-1 ring-white/20"
                style={{ backgroundColor: `${color}40` }}
            >
                <div
                    className="font-medium truncate"
                    style={{ color }}
                >
                    {event.title}
                </div>
                <div className="text-zinc-400 text-[10px]">
                    {format(new Date(event.start), 'h:mm a')}
                </div>
            </div>
        );
    }

    // Full variant
    return (
        <div
            onClick={handleClick}
            className="group rounded-xl p-3 cursor-pointer transition-all hover:ring-1 ring-white/20 hover:scale-[1.01]"
            style={{ backgroundColor: `${color}15` }}
        >
            <div className="flex items-start gap-3">
                {/* Color bar */}
                <div
                    className="w-1 rounded-full self-stretch min-h-[40px]"
                    style={{ backgroundColor: color }}
                />

                <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{categoryIcon}</span>
                        <h4 className="font-semibold text-zinc-100 truncate flex-1">
                            {event.title}
                        </h4>
                    </div>

                    {/* Description */}
                    {event.description && (
                        <p className="text-sm text-zinc-400 mb-2 line-clamp-2">
                            {event.description}
                        </p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                        {/* Time */}
                        {!event.isAllDay && (
                            <span>
                                {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
                            </span>
                        )}

                        {/* Location */}
                        {event.location && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate max-w-[120px]">{event.location}</span>
                            </span>
                        )}
                    </div>

                    {/* Assigned members */}
                    {assignedMembers.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                            {assignedMembers.slice(0, 4).map(member => (
                                <div
                                    key={member.id}
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                                    style={{ backgroundColor: `${member.color}30` }}
                                    title={member.name}
                                >
                                    {member.avatar}
                                </div>
                            ))}
                            {assignedMembers.length > 4 && (
                                <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
                                    +{assignedMembers.length - 4}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
