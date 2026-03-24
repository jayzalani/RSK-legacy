// PATH: rsklegacy-frontend/src/app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Navbar from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "RSKLegacy — Decentralized Inheritance Vault",
  description: "Dead-man's switch vault for rBTC on Rootstock",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 antialiased min-h-screen">
        <Providers>
          <Navbar />
          <main className="max-w-4xl mx-auto px-4 py-10">{children}</main>
        </Providers>
      </body>
    </html>
  );
}