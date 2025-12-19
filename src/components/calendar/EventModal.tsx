'use client';

import React, { useState, useEffect } from 'react';
import { useCalendar } from '@/contexts/CalendarContext';
import {
    CalendarEvent,
    EventCategory,
    RecurrencePattern,
    CATEGORY_ICONS,
    CATEGORY_COLORS
} from '@/types/calendar';
import { format } from 'date-fns';
import {
    X,
    Save,
    Trash2,
    MapPin,
    Clock,
    Calendar,
    Users,
    Repeat,
    Tag
} from 'lucide-react';

const RECURRENCE_OPTIONS: { id: RecurrencePattern; label: string }[] = [
    { id: 'none', label: 'Does not repeat' },
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'biweekly', label: 'Every 2 weeks' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly', label: 'Yearly' },
];

const CATEGORY_OPTIONS: { id: EventCategory; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'school', label: 'School' },
    { id: 'medical', label: 'Medical' },
    { id: 'sports', label: 'Sports' },
    { id: 'music', label: 'Music' },
    { id: 'family', label: 'Family' },
    { id: 'work', label: 'Work' },
    { id: 'meal', label: 'Meal' },
    { id: 'routine', label: 'Routine' },
];

export function EventModal() {
    const {
        editingEvent,
        closeEventModal,
        addEvent,
        updateEvent,
        deleteEvent,
        calendars,
        familyMembers
    } = useCalendar();

    const isEditing = editingEvent?.id !== '';

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);
    const [calendarId, setCalendarId] = useState('family');
    const [category, setCategory] = useState<EventCategory>('general');
    const [recurrence, setRecurrence] = useState<RecurrencePattern>('none');
    const [assignedTo, setAssignedTo] = useState<string[]>([]);

    // Initialize form with editing event
    useEffect(() => {
        if (editingEvent) {
            setTitle(editingEvent.title || '');
            setDescription(editingEvent.description || '');
            setLocation(editingEvent.location || '');
            setStartDate(format(new Date(editingEvent.start), 'yyyy-MM-dd'));
            setStartTime(format(new Date(editingEvent.start), 'HH:mm'));
            setEndDate(format(new Date(editingEvent.end), 'yyyy-MM-dd'));
            setEndTime(format(new Date(editingEvent.end), 'HH:mm'));
            setIsAllDay(editingEvent.isAllDay);
            setCalendarId(editingEvent.calendarId);
            setCategory(editingEvent.category);
            setRecurrence(editingEvent.recurrence);
            setAssignedTo(editingEvent.assignedTo);
        }
    }, [editingEvent]);

    const handleSave = () => {
        if (!title.trim()) return;

        const start = new Date(`${startDate}T${isAllDay ? '00:00' : startTime}`);
        const end = new Date(`${endDate}T${isAllDay ? '23:59' : endTime}`);

        const eventData = {
            title: title.trim(),
            description: description.trim() || undefined,
            location: location.trim() || undefined,
            start,
            end,
            isAllDay,
            calendarId,
            category,
            recurrence,
            assignedTo,
        };

        if (isEditing && editingEvent) {
            updateEvent({
                ...editingEvent,
                ...eventData,
            });
        } else {
            addEvent(eventData);
        }

        closeEventModal();
    };

    const handleDelete = () => {
        if (editingEvent?.id && confirm('Are you sure you want to delete this event?')) {
            deleteEvent(editingEvent.id);
            closeEventModal();
        }
    };

    const toggleMember = (memberId: string) => {
        setAssignedTo(prev =>
            prev.includes(memberId)
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={closeEventModal}
            />

            {/* Modal */}
            <div className="relative bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-700">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                    <h2 className="text-lg font-semibold text-white">
                        {isEditing ? 'Edit Event' : 'New Event'}
                    </h2>
                    <button
                        onClick={closeEventModal}
                        className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Title */}
                    <div>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Event title"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                            autoFocus
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-zinc-400 text-sm">
                            <Clock className="w-4 h-4" />
                            <span>Date & Time</span>
                        </div>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={isAllDay}
                                onChange={(e) => setIsAllDay(e.target.checked)}
                                className="rounded border-zinc-600 bg-zinc-800 text-purple-500"
                            />
                            <span className="text-sm text-zinc-300">All day</span>
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-zinc-500 mb-1 block">Start</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                />
                            </div>
                            {!isAllDay && (
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">Time</label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-zinc-500 mb-1 block">End</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                />
                            </div>
                            {!isAllDay && (
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">Time</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                            <MapPin className="w-4 h-4" />
                            <span>Location</span>
                        </div>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Add location"
                            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 text-sm"
                        />
                    </div>

                    {/* Calendar Selection */}
                    <div>
                        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                            <Calendar className="w-4 h-4" />
                            <span>Calendar</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {calendars.map(cal => (
                                <button
                                    key={cal.id}
                                    onClick={() => setCalendarId(cal.id)}
                                    className={`
                    px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all
                    ${calendarId === cal.id
                                            ? 'ring-2 ring-offset-2 ring-offset-zinc-900'
                                            : 'opacity-60 hover:opacity-100'
                                        }
                  `}
                                    style={{
                                        backgroundColor: `${cal.color}20`,
                                        color: cal.color,
                                        '--tw-ring-color': calendarId === cal.id ? cal.color : 'transparent'
                                    } as React.CSSProperties}
                                >
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: cal.color }}
                                    />
                                    {cal.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                            <Tag className="w-4 h-4" />
                            <span>Category</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORY_OPTIONS.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategory(cat.id)}
                                    className={`
                    px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-all
                    ${category === cat.id
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                        }
                  `}
                                >
                                    <span>{CATEGORY_ICONS[cat.id]}</span>
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recurrence */}
                    <div>
                        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                            <Repeat className="w-4 h-4" />
                            <span>Repeat</span>
                        </div>
                        <select
                            value={recurrence}
                            onChange={(e) => setRecurrence(e.target.value as RecurrencePattern)}
                            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                        >
                            {RECURRENCE_OPTIONS.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Assign to Family Members */}
                    <div>
                        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                            <Users className="w-4 h-4" />
                            <span>Assign to</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {familyMembers.map(member => (
                                <button
                                    key={member.id}
                                    onClick={() => toggleMember(member.id)}
                                    className={`
                    px-3 py-1.5 rounded-full text-sm flex items-center gap-2 transition-all
                    ${assignedTo.includes(member.id)
                                            ? 'ring-2 ring-offset-2 ring-offset-zinc-900'
                                            : 'opacity-60 hover:opacity-100'
                                        }
                  `}
                                    style={{
                                        backgroundColor: `${member.color}20`,
                                        color: member.color,
                                        '--tw-ring-color': assignedTo.includes(member.id) ? member.color : 'transparent'
                                    } as React.CSSProperties}
                                >
                                    <span className="text-base">{member.avatar}</span>
                                    {member.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add notes..."
                            rows={3}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 text-sm resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-800/50">
                    {isEditing ? (
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    ) : (
                        <div />
                    )}

                    <div className="flex items-center gap-3">
                        <button
                            onClick={closeEventModal}
                            className="px-4 py-2 text-zinc-400 hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!title.trim()}
                            className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            {isEditing ? 'Save' : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
