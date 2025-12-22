'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Monitor, LayoutDashboard, LogOut, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function AppNavbar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navLinks = [
        { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/app/console', label: 'Console', icon: Monitor },
    ];

    const isActive = (href: string) => {
        if (href === '/app') {
            return pathname === '/app';
        }
        return pathname.startsWith(href);
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-[60] bg-black/40 backdrop-blur-xl border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-14">
                    {/* Left: Logo and Navigation */}
                    <div className="flex items-center gap-6">
                        {/* Logo */}
                        <Link 
                            href="/app" 
                            className="flex items-center gap-2 text-white font-semibold text-lg hover:opacity-80 transition-opacity"
                        >
                            <span className="text-2xl">◉</span>
                            <span className="hidden sm:inline">PersonalPod</span>
                        </Link>

                        {/* Navigation Links */}
                        <div className="flex items-center gap-1">
                            {navLinks.map((link) => {
                                const Icon = link.icon;
                                const active = isActive(link.href);
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            active
                                                ? 'bg-white/15 text-white'
                                                : 'text-zinc-400 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{link.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: User Menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            {user?.photoURL ? (
                                <img 
                                    src={user.photoURL} 
                                    alt="" 
                                    className="w-7 h-7 rounded-full border border-white/20" 
                                />
                            ) : (
                                <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-xs font-medium text-white">
                                    {user?.email?.[0]?.toUpperCase() || '?'}
                                </div>
                            )}
                            <span className="hidden md:inline text-sm text-white max-w-[120px] truncate">
                                {user?.displayName || user?.email?.split('@')[0] || 'User'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {showUserMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 overflow-hidden">
                                <div className="px-4 py-3 border-b border-white/10">
                                    <p className="text-sm font-medium text-white truncate">
                                        {user?.displayName || 'User'}
                                    </p>
                                    <p className="text-xs text-zinc-400 truncate">
                                        {user?.email}
                                    </p>
                                </div>
                                
                                <div className="p-2">
                                    <Link
                                        href="/app/console"
                                        onClick={() => setShowUserMenu(false)}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <Monitor className="w-4 h-4" />
                                        Display Management
                                    </Link>
                                </div>

                                <div className="p-2 border-t border-white/10">
                                    <button
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            logout();
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
