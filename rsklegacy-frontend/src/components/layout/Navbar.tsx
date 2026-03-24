// PATH: rsklegacy-frontend/src/components/layout/Navbar.tsx

"use client";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useWalletRole } from "@/hooks/useWalletRole";
import { truncateAddress } from "@/lib/utils";

export default function Navbar() {
  const { address, isConnected, isWrongNetwork, connectWallet, switchToRSK, disconnect } = useWallet();
  const role = useWalletRole();

  const roleColors: Record<string, string> = {
    owner:       "text-orange-400",
    beneficiary: "text-emerald-400",
    stranger:    "text-zinc-400",
    unknown:     "text-zinc-600",
  };

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-bold text-lg tracking-tight text-white">
          RSK<span className="text-orange-500">Legacy</span>
        </Link>

        {/* Nav links — only show relevant ones */}
        {isConnected && !isWrongNetwork && (
          <div className="hidden sm:flex gap-5 text-sm text-zinc-400">
            {role === "stranger" && (
              <Link href="/initialize" className="hover:text-white transition-colors">Initialize</Link>
            )}
            {role === "owner" && (
              <>
                <Link href="/dashboard"    className="hover:text-white transition-colors">Dashboard</Link>
                <Link href="/beneficiary"  className="hover:text-white transition-colors">Beneficiary</Link>
                <Link href="/ownership"    className="hover:text-white transition-colors">Ownership</Link>
              </>
            )}
            {role === "beneficiary" && (
              <Link href="/claim" className="hover:text-white transition-colors">Claim</Link>
            )}
            <Link href="/activity" className="hover:text-white transition-colors">Activity</Link>
          </div>
        )}

        {/* Wallet button */}
        <div className="flex items-center gap-3">
          {isConnected && (
            <span className={`text-xs font-mono hidden sm:block ${roleColors[role]}`}>
              [{role}]
            </span>
          )}

          {!isConnected ? (
            <button
              onClick={connectWallet}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Connect Wallet
            </button>
          ) : isWrongNetwork ? (
            <button
              onClick={switchToRSK}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Switch to RSK
            </button>
          ) : (
            <button
              onClick={() => disconnect()}
              className="border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-sm font-mono px-4 py-2 rounded-lg transition-colors"
            >
              {truncateAddress(address!)}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}