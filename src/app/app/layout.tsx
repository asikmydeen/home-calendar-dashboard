'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import AppNavbar from '@/components/navigation/AppNavbar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Determine if navbar should be visible
  // Hide on main dashboard to avoid overlapping with existing controls
  const showNavbar = pathname !== '/app';

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Show loading spinner while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  // Don't render children until we confirm user is authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  // User is authenticated, render children with optional navbar
  return (
    <>
      {showNavbar && <AppNavbar />}
      <div className={showNavbar ? 'pt-14' : ''}>
        {children}
      </div>
    </>
  );
}
