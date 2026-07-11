import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const HIGHLIGHT_CSS = `::highlight(hl-yellow){background-color:#fde68a;color:#111827}
::highlight(hl-green){background-color:#bbf7d0;color:#111827}
::highlight(hl-pink){background-color:#fbcfe8;color:#111827}
::highlight(hl-blue){background-color:#bfdbfe;color:#111827}`;

export const metadata: Metadata = {
  title: {
    default: "IELTS Mock Platform",
    template: "%s · IELTS Mock Platform"
  },
  description: "Computer-Delivered IELTS mock examinations — Listening, Reading, Writing."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: HIGHLIGHT_CSS }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
