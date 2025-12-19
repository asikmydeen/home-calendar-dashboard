import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { CalendarProvider } from "@/contexts/CalendarContext";
import { HouseholdProvider } from "@/contexts/HouseholdContext";
import { AccountsProvider } from "@/contexts/AccountsContext";

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Home Dashboard",
  description: "A smart home dashboard for your wall",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <HouseholdProvider>
            <AccountsProvider>
              <CalendarProvider>
                {children}
              </CalendarProvider>
            </AccountsProvider>
          </HouseholdProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

