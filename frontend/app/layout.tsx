import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Sidebar from "./components/Sidebar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChartPost — AI Trading Chart Automation",
  description: "Automated TradingView chart analysis and social media publishing platform. Capture, analyze, and publish trading insights with AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <div className="app-layout">
          <Sidebar />
          <Header />
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="header">
      <div className="header-title">AI Chart Automation</div>
      <div className="header-actions">
        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </span>
      </div>
    </header>
  );
}
