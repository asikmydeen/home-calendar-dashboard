'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, Monitor, Trash2, ExternalLink, Copy, Check, Sparkles, Tv } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, getDoc, setDoc, Timestamp } from 'firebase/firestore';

interface Display {
    id: string;
    name: string;
    ownerId: string;
    createdAt: any;
    status: 'active' | 'inactive';
}

export default function ConsolePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [displays, setDisplays] = useState<Display[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'displays'),
            where('ownerId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const displaysData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Display[];
            setDisplays(displaysData);
        });

        return () => unsubscribe();
    }, [user]);

    // Check and Assign License
    useEffect(() => {
        if (!user) return;

        const checkLicense = async () => {
            const userRef = doc(db, 'users', user.uid);

            try {
                const snapshot = await getDoc(userRef);
                const data = snapshot.data();

                if (!data?.license) {
                    // Assign 1 year free
                    const oneYearLater = new Date();
                    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

                    await setDoc(userRef, {
                        email: user.email,
                        license: {
                            type: 'free_tier',
                            validUntil: Timestamp.fromDate(oneYearLater),
                            assignedAt: Timestamp.now()
                        }
                    }, { merge: true });
                    console.log('Assigned free license');
                }
            } catch (err) {
                console.error('Error checking license:', err);
            }
        };

        checkLicense();
    }, [user]);

    const handleCreateDisplay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newDisplayName.trim()) return;

        setIsCreating(true);
        try {
            await addDoc(collection(db, 'displays'), {
                name: newDisplayName,
                ownerId: user.uid,
                createdAt: serverTimestamp(),
                status: 'active'
            });
            setNewDisplayName('');
        } catch (error) {
            console.error('Error creating display:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteDisplay = async (displayId: string) => {
        if (!confirm('Are you sure you want to delete this display?')) return;
        try {
            await deleteDoc(doc(db, 'displays', displayId));
        } catch (error) {
            console.error('Error deleting display:', error);
        }
    };

    const copyLink = (displayId: string) => {
        const url = `${window.location.origin}/display?id=${displayId}`;
        navigator.clipboard.writeText(url);
        setCopiedId(displayId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading || !user) return null;

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-slate-900 to-blue-900/20" />
            
            {/* Animated background orbs */}
            <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

            {/* Content */}
            <div className="relative z-10 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto space-y-10">
                    {/* Header */}
                    <div className="text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
                                    <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                                        Display Console
                                    </span>
                                </h1>
                                <p className="text-lg text-white/60">
                                    Manage your displays and control your command centers
                                </p>
                            </div>
                            <div className="flex items-center gap-4 justify-center sm:justify-end">
                                {/* License Badge */}
                                <div className="group relative">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur opacity-30 group-hover:opacity-50 transition duration-300" />
                                    <div className="relative px-4 py-2 rounded-full bg-slate-800/80 backdrop-blur-sm border border-green-500/30 flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                        <span className="text-sm font-medium text-green-400">Free Tier Active</span>
                                    </div>
                                </div>
                                {/* User Avatar */}
                                {user.photoURL && (
                                    <div className="relative group">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full blur opacity-0 group-hover:opacity-50 transition duration-300" />
                                        <img 
                                            src={user.photoURL} 
                                            alt="" 
                                            className="relative w-11 h-11 rounded-full border-2 border-white/20 group-hover:border-purple-400/50 transition-colors" 
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Create Display Section */}
                    <div className="group relative">
                        {/* Gradient border effect */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/50 via-pink-500/50 to-cyan-500/50 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                        <div className="relative bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-slate-700/50">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/20">
                                    <Plus className="w-5 h-5 text-purple-400" />
                                </div>
                                <h2 className="text-xl font-semibold text-white">Create New Display</h2>
                            </div>
                            <form onSubmit={handleCreateDisplay} className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 relative group/input">
                                    <input
                                        type="text"
                                        value={newDisplayName}
                                        onChange={(e) => setNewDisplayName(e.target.value)}
                                        placeholder="e.g. Living Room TV, Kitchen Display..."
                                        className="w-full bg-slate-900/50 border border-slate-600/50 rounded-xl px-5 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isCreating || !newDisplayName.trim()}
                                    className="relative group/btn px-8 py-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                                >
                                    {/* Button gradient background */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 transition-transform duration-300 group-hover/btn:scale-105" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 blur-xl opacity-50 group-hover/btn:opacity-75 transition-opacity" />
                                    <span className="relative flex items-center justify-center gap-2 text-white">
                                        <Plus className="w-5 h-5" />
                                        Create Display
                                    </span>
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Displays List */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Monitor className="w-5 h-5 text-purple-400" />
                            <h2 className="text-xl font-semibold text-white/80">Your Displays</h2>
                            <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-medium text-purple-400">
                                {displays.length} {displays.length === 1 ? 'display' : 'displays'}
                            </span>
                        </div>
                        
                        {displays.length === 0 ? (
                            /* Empty State */
                            <div className="group relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-cyan-500/30 rounded-2xl blur opacity-20" />
                                <div className="relative bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 border-dashed py-16 px-6">
                                    <div className="flex flex-col items-center text-center">
                                        <div className="relative mb-6">
                                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-2xl blur-xl opacity-30 animate-pulse" />
                                            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-purple-500/20">
                                                <Tv className="w-12 h-12 text-purple-400" />
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-semibold text-white mb-2">No displays yet</h3>
                                        <p className="text-white/50 max-w-md mb-6">
                                            Create your first display to start building your personal command center. 
                                            Perfect for wall-mounted tablets, smart TVs, or any screen.
                                        </p>
                                        <div className="flex items-center gap-2 text-sm text-purple-400">
                                            <Sparkles className="w-4 h-4" />
                                            <span>Use the form above to get started</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {displays.map((display) => (
                                    <div 
                                        key={display.id} 
                                        className="group relative"
                                    >
                                        {/* Gradient border on hover */}
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/50 to-cyan-500/50 rounded-2xl blur opacity-0 group-hover:opacity-30 transition-all duration-500" />
                                        
                                        <div className="relative bg-slate-800/50 backdrop-blur-xl rounded-2xl p-5 sm:p-6 border border-slate-700/50 group-hover:border-purple-500/30 transition-all duration-300 group-hover:-translate-y-0.5">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    {/* Display Icon */}
                                                    <div className="relative">
                                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
                                                        <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/20 flex items-center justify-center">
                                                            <Monitor className="w-7 h-7 text-purple-400" />
                                                        </div>
                                                    </div>
                                                    
                                                    <div>
                                                        <h3 className="font-semibold text-lg text-white group-hover:text-purple-200 transition-colors">
                                                            {display.name}
                                                        </h3>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            {/* Active Badge */}
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="relative flex h-2 w-2">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                                </span>
                                                                <span className="text-sm text-green-400 font-medium">Active</span>
                                                            </div>
                                                            <span className="text-slate-600">•</span>
                                                            <span className="text-sm text-slate-500 font-mono">
                                                                {display.id.slice(0, 8)}...
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 sm:gap-3">
                                                    {/* Open Button */}
                                                    <button
                                                        onClick={() => window.open(`/display?id=${display.id}`, '_blank')}
                                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700/50 hover:bg-purple-500/20 border border-slate-600/50 hover:border-purple-500/30 text-slate-300 hover:text-purple-300 transition-all duration-300"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                        <span className="text-sm font-medium">Open</span>
                                                    </button>
                                                    
                                                    {/* Copy Link Button */}
                                                    <button
                                                        onClick={() => copyLink(display.id)}
                                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                                                            copiedId === display.id 
                                                                ? 'bg-green-500/20 border-green-500/30 text-green-400'
                                                                : 'bg-slate-700/50 hover:bg-cyan-500/20 border-slate-600/50 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-300'
                                                        }`}
                                                    >
                                                        {copiedId === display.id ? (
                                                            <>
                                                                <Check className="w-4 h-4" />
                                                                <span className="text-sm font-medium">Copied!</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-4 h-4" />
                                                                <span className="text-sm font-medium">Copy URL</span>
                                                            </>
                                                        )}
                                                    </button>
                                                    
                                                    {/* Divider */}
                                                    <div className="w-px h-8 bg-slate-700/50 mx-1 hidden sm:block" />
                                                    
                                                    {/* Delete Button */}
                                                    <button
                                                        onClick={() => handleDeleteDisplay(display.id)}
                                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700/50 hover:bg-red-500/20 border border-slate-600/50 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-all duration-300"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        <span className="text-sm font-medium hidden sm:inline">Delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer decoration */}
                    {displays.length > 0 && (
                        <div className="text-center pt-8">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/40 text-sm">
                                <span>◉</span>
                                <span>PersonalPod — Your Personal Command Center</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
