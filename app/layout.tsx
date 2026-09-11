import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import "./globals.css";

// Source Sans 3 for everything (section 10).
const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Buyer Hub",
  description: "Buyer management for Australian residential sales agencies.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-AU" className={`${sourceSans.variable} h-full`}>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
