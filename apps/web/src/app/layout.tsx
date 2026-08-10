import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sora } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap"
});

const HIGHLIGHT_CSS = `::highlight(hl-yellow){background-color:#fde68a;color:#111827}
::highlight(hl-green){background-color:#bbf7d0;color:#111827}
::highlight(hl-pink){background-color:#fbcfe8;color:#111827}
::highlight(hl-blue){background-color:#bfdbfe;color:#111827}`;

const THEME_INIT = `(function(){try{var t=localStorage.getItem("ziyomock-theme")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export const metadata: Metadata = {
  title: {
    default: "IELTS Mock Platform",
    template: "%s · IELTS Mock Platform"
  },
  description: "Computer-Delivered IELTS mock examinations — Listening, Reading, Writing."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={sora.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <style dangerouslySetInnerHTML={{ __html: HIGHLIGHT_CSS }} />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
