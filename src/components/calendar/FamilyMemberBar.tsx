'use client';

import React from 'react';
import { FamilyMember } from '@/types/calendar';
import { useCalendar } from '@/contexts/CalendarContext';

interface FamilyMemberBarProps {
    className?: string;
}

export function FamilyMemberBar({ className = '' }: FamilyMemberBarProps) {
    const { familyMembers, selectedMemberIds, toggleMemberFilter, filteredEvents } = useCalendar();

    // Calculate event counts per member
    const getMemberEventCount = (memberId: string) => {
        return filteredEvents.filter(e => e.assignedTo.includes(memberId)).length;
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className="text-sm font-medium text-slate-500 mr-2">Today's Schedule</span>
            <div className="flex items-center gap-4">
                {familyMembers.map(member => {
                    const isSelected = selectedMemberIds.length === 0 || selectedMemberIds.includes(member.id);
                    const eventCount = getMemberEventCount(member.id);

                    return (
                        <button
                            key={member.id}
                            onClick={() => toggleMemberFilter(member.id)}
                            className={`flex flex-col items-center gap-1 transition-all duration-200 ${isSelected ? 'opacity-100 scale-100' : 'opacity-40 scale-95'
                                }`}
                        >
                            {/* Avatar with ring */}
                            <div
                                className="relative"
                                style={{ '--member-color': member.color } as React.CSSProperties}
                            >
                                {/* Progress ring background */}
                                <div
                                    className="absolute inset-0 rounded-full"
                                    style={{
                                        background: `conic-gradient(${member.color} ${Math.min(eventCount * 36, 360)}deg, transparent 0deg)`,
                                        padding: '3px',
                                    }}
                                >
                                    <div className="w-full h-full rounded-full bg-white" />
                                </div>

                                {/* Avatar */}
                                <div
                                    className="relative w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm border-2 border-white"
                                    style={{
                                        backgroundColor: `${member.color}20`,
                                    }}
                                >
                                    {member.avatar}
                                </div>

                                {/* Event count badge */}
                                {eventCount > 0 && (
                                    <div
                                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                                        style={{ backgroundColor: member.color }}
                                    >
                                        {eventCount}
                                    </div>
                                )}
                            </div>

                            {/* Name */}
                            <span
                                className="text-xs font-medium"
                                style={{ color: isSelected ? member.color : '#94a3b8' }}
                            >
                                {member.name}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Clear filter button */}
            {selectedMemberIds.length > 0 && (
                <button
                    onClick={() => selectedMemberIds.forEach(id => toggleMemberFilter(id))}
                    className="ml-4 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                    Show all
                </button>
            )}
        </div>
    );
}
