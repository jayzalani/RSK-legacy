// PATH: rsklegacy-frontend/src/app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Navbar from "@/components/layout/Navbar";
import ErrorBoundary from "@/components/layout/ErrorBoundary";

export const metadata: Metadata = {
  title: "RSKLegacy — Decentralized Inheritance Vault",
  description: "Dead-man's switch vault for rBTC on Rootstock",
};

/**
 * FIX (Issue #10): Wrapped the entire app in <ErrorBoundary> so that
 * uncaught RPC errors or unexpected contract read failures show a recovery
 * UI instead of crashing the page to a blank screen.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 antialiased min-h-screen">
        <ErrorBoundary>
          <Providers>
            <Navbar />
            <main className="max-w-4xl mx-auto px-4 py-10">{children}</main>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}