import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { CalendarProvider } from "@/contexts/CalendarContext";
import { HouseholdProvider } from "@/contexts/HouseholdContext";
import { AccountsProvider } from "@/contexts/AccountsContext";



const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PersonalPod - Your Personal Command Center",
  description: "Your family's digital hub. Calendars, widgets, and more—unified in one beautiful display for wall-mounted tablets, smart TVs, or any screen.",
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

