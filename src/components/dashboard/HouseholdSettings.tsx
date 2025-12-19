'use client';

import React, { useState, useEffect } from 'react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useAccounts } from '@/contexts/AccountsContext';
import { FamilyMember, FamilyRole, Gender } from '@/types/calendar';
import { Plus, Trash2, Edit2, X, Mail, ExternalLink } from 'lucide-react';

export function HouseholdSettings() {
    const { familyMembers, addMember, updateMember, deleteMember } = useHousehold();
    const { connectGoogleAccount, getAccountsForMember } = useAccounts();
    const [isAdding, setIsAdding] = useState(false);
    const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<FamilyRole>('others');
    const [gender, setGender] = useState<Gender>('other');
    const [color, setColor] = useState('#6366f1');
    const [avatar, setAvatar] = useState('👤');

    // Keep editingMember in sync with live familyMembers data (for connected accounts updates)
    useEffect(() => {
        if (editingMember) {
            const liveMember = familyMembers.find(m => m.id === editingMember.id);
            if (liveMember) {
                // Compare array lengths and content - not reference
                const liveAccounts = liveMember.connectedAccounts || [];
                const editingAccounts = editingMember.connectedAccounts || [];
                const hasChanged = liveAccounts.length !== editingAccounts.length ||
                    JSON.stringify(liveAccounts) !== JSON.stringify(editingAccounts);

                if (hasChanged) {
                    console.log('[HouseholdSettings] Syncing connected accounts:', liveAccounts);
                    setEditingMember(prev => prev ? { ...prev, connectedAccounts: liveAccounts } : null);
                }
            }
        }
    }, [familyMembers, editingMember?.id]);

    const resetForm = () => {
        setName('');
        setEmail('');
        setRole('others');
        setGender('other');
        setColor('#6366f1');
        setAvatar('👤');
        setIsAdding(false);
        setEditingMember(null);
    };

    const handleEdit = (member: FamilyMember) => {
        setEditingMember(member);
        setName(member.name);
        setEmail(member.email || '');
        setRole(member.role);
        setGender(member.gender || 'other');
        setColor(member.color);
        setAvatar(member.avatar || '👤');
        setIsAdding(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const memberData: FamilyMember = {
            id: editingMember ? editingMember.id : crypto.randomUUID(),
            name: name.trim(),
            email: email.trim() || undefined,
            role,
            gender,
            color,
            avatar,
            connectedAccounts: editingMember?.connectedAccounts || [],
        };

        if (editingMember) {
            updateMember(memberData);
        } else {
            addMember(memberData);
        }
        resetForm();
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure? This will remove their personal calendar and assignments.')) {
            deleteMember(id);
        }
    };

    const handleConnectGoogle = async (memberId: string) => {
        setIsConnecting(true);
        try {
            await connectGoogleAccount(memberId);
            // Popup is now open - reset connecting state
            // The Firestore listener will update the UI when the account is added
            setIsConnecting(false);
        } catch (e: any) {
            console.error(e);
            alert('Failed to connect Google Calendar: ' + (e.message || 'Unknown error'));
            setIsConnecting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Household Members</h3>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400"
                    >
                        <Plus className="w-3 h-3" />
                        Add Member
                    </button>
                )}
            </div>

            {isAdding ? (
                <form onSubmit={handleSubmit} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-3 border border-zinc-200 dark:border-zinc-700">
                    <div className="flex justify-between items-start">
                        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                            {editingMember ? 'Edit Member' : 'New Member'}
                        </h4>
                        <button type="button" onClick={resetForm} className="text-zinc-400 hover:text-zinc-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-zinc-500 block mb-1">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm"
                                placeholder="e.g. Dad"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs text-zinc-500 block mb-1">Email (Optional)</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm"
                                placeholder="e.g. spouse@example.com"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">Role</label>
                                <select
                                    value={role}
                                    onChange={e => setRole(e.target.value as FamilyRole)}
                                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm"
                                >
                                    <option value="husband">Husband</option>
                                    <option value="wife">Wife</option>
                                    <option value="kids">Kids</option>
                                    <option value="others">Others</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">Gender</label>
                                <select
                                    value={gender}
                                    onChange={e => setGender(e.target.value as Gender)}
                                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm"
                                >
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">Avatar (Emoji)</label>
                                <input
                                    type="text"
                                    value={avatar}
                                    onChange={e => setAvatar(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm"
                                    maxLength={2}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">Color</label>
                                <div className="flex gap-2 items-center h-[38px]">
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={e => setColor(e.target.value)}
                                        className="w-8 h-8 rounded cursor-pointer"
                                    />
                                    <span className="text-xs text-zinc-500">{color}</span>
                                </div>
                            </div>
                        </div>

                        {/* Connected Accounts Section */}
                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                            <label className="text-xs text-zinc-500 block mb-2">Connected Calendars</label>
                            <div className="space-y-2">
                                {editingMember?.connectedAccounts?.map((acc, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
                                        <div className="flex items-center gap-1">
                                            <Mail className="w-3 h-3" />
                                            <span>{acc.email} ({acc.provider})</span>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => editingMember?.id && handleConnectGoogle(editingMember.id)}
                                    disabled={isConnecting || !editingMember?.id}
                                    className="w-full flex items-center justify-center gap-2 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium text-zinc-700 dark:text-zinc-300"
                                >
                                    {isConnecting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-700 rounded-full animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                            Connect Google Calendar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                            {editingMember ? 'Save Changes' : 'Add Member'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="space-y-2">
                    {familyMembers.map(member => (
                        <div
                            key={member.id}
                            className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{member.avatar || '👤'}</span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                            {member.name}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 capitalize">
                                            {member.role}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1 mt-1">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: member.color }}
                                            />
                                            <span className="text-xs text-zinc-500 capitalize">{member.gender}</span>
                                        </div>
                                        {/* Connected Accounts Display */}
                                        {member.connectedAccounts && member.connectedAccounts.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {member.connectedAccounts.map((account, idx) => (
                                                    <span key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                                                        <Mail className="w-2.5 h-2.5" />
                                                        {account.email}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleEdit(member)}
                                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(member.id)}
                                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
