import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HR-Agent — анализ рисков персонала",
  description: "Предиктивный анализ выгорания и перегрузки на основе данных ITSM-системы",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply saved theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{if(localStorage.getItem('hr-agent-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`,
        }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
