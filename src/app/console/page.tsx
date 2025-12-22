'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, Monitor, Trash2, ExternalLink, Copy, Check } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, getDocs, getDoc, setDoc, Timestamp } from 'firebase/firestore';

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
            // We can't easily read it without state, but we can try to set if missing
            // or just subscribe to it?
            // Let's just run a transaction or robust check?
            // For simplicity: Read user doc. If license missing, set it.
            // Note: We need a 'users' collection rule to allow this. We added `isOwner` rule so it's fine.

            try {
                // We use a separate listener or just getDoc once
                // Actually, let's just use `setDoc` with merge to ensure it's there?
                // But we don't want to reset `validUntil` every time.
                // So we MUST read first.
                // But `setDoc` with merge won't work if we need conditional logic.
                // Let's just use `getDoc` implicitly via a new listener or just rely on the assumption
                // that we should do this "once".

                // Better: useEffect on mount.
                // Need 'getDoc' import

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
        <div className="min-h-screen bg-zinc-950 text-white p-8 font-sans">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                    <div>
                        <h1 className="text-3xl font-light tracking-tight mb-2">My Console</h1>
                        <p className="text-zinc-400">Manage your displays and subscription</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-4 py-2 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-sm font-medium">
                            License Active (Free Tier)
                        </div>
                        {user.photoURL && (
                            <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full border border-white/10" />
                        )}
                    </div>
                </div>

                {/* Create Display Section */}
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <h2 className="text-xl font-light mb-4 flex items-center gap-2">
                        <Monitor className="w-5 h-5" />
                        New Display
                    </h2>
                    <form onSubmit={handleCreateDisplay} className="flex gap-4">
                        <input
                            type="text"
                            value={newDisplayName}
                            onChange={(e) => setNewDisplayName(e.target.value)}
                            placeholder="e.g. Living Room TV"
                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={isCreating || !newDisplayName.trim()}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Create
                        </button>
                    </form>
                </div>

                {/* Displays List */}
                <div className="space-y-4">
                    <h2 className="text-xl font-light text-zinc-400">Your Displays</h2>
                    {displays.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                            <Monitor className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                            <p className="text-zinc-500">No displays created yet</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {displays.map((display) => (
                                <div key={display.id} className="bg-white/5 rounded-2xl p-6 border border-white/10 flex items-center justify-between group hover:border-white/20 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                                            <Monitor className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-lg">{display.name}</h3>
                                            <div className="flex items-center gap-2 text-sm text-zinc-400">
                                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                Active
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => window.open(`/display?id=${display.id}`, '_blank')}
                                            className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                                            title="Open Display"
                                        >
                                            <ExternalLink className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => copyLink(display.id)}
                                            className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors relative"
                                            title="Copy Link"
                                        >
                                            {copiedId === display.id ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                                        </button>
                                        <div className="w-px h-8 bg-white/10 mx-2" />
                                        <button
                                            onClick={() => handleDeleteDisplay(display.id)}
                                            className="p-2 hover:bg-red-500/20 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
                                            title="Delete Display"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
