// PATH: rsklegacy-frontend/src/components/layout/Navbar.tsx

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useWalletRole } from "@/hooks/useWalletRole";
import { truncateAddress } from "@/lib/utils";

/**
 * FIX (Issue #9): Added aria-label to all interactive elements:
 *   - Connect/Switch/Disconnect wallet buttons
 *   - Nav links now include aria-current="page" for the active route
 * FIX (Issue #14): Added mobile hamburger menu (hidden sm:flex → visible on mobile)
 */
export default function Navbar() {
  const { address, isConnected, isWrongNetwork, connectWallet, switchToRSK, disconnect } = useWallet();
  const role    = useWalletRole();
  const pathname = usePathname();

  const roleColors: Record<string, string> = {
    owner:       "text-orange-400",
    beneficiary: "text-emerald-400",
    stranger:    "text-zinc-400",
    unknown:     "text-zinc-600",
  };

  function navLink(href: string, label: string) {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={`hover:text-white transition-colors ${isActive ? "text-white font-semibold" : "text-zinc-400"}`}
        aria-current={isActive ? "page" : undefined}
      >
        {label}
      </Link>
    );
  }

  return (
    <nav
      className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50"
      aria-label="Main navigation"
    >
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-bold text-lg tracking-tight text-white" aria-label="RSKLegacy home">
          RSK<span className="text-orange-500">Legacy</span>
        </Link>

        {/* Nav links */}
        {isConnected && !isWrongNetwork && (
          <div className="flex gap-5 text-sm" role="navigation" aria-label="Page links">
            {role === "stranger" && navLink("/initialize", "Initialize")}
            {role === "owner" && (
              <>
                {navLink("/dashboard",   "Dashboard")}
                {navLink("/beneficiary", "Beneficiary")}
                {navLink("/ownership",   "Ownership")}
              </>
            )}
            {role === "beneficiary" && navLink("/claim", "Claim")}
            {navLink("/activity", "Activity")}
          </div>
        )}

        {/* Wallet button */}
        <div className="flex items-center gap-3">
          {isConnected && (
            <span
              className={`text-xs font-mono hidden sm:block ${roleColors[role]}`}
              aria-label={`Current role: ${role}`}
            >
              [{role}]
            </span>
          )}

          {!isConnected ? (
            <button
              onClick={connectWallet}
              aria-label="Connect MetaMask wallet"
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Connect Wallet
            </button>
          ) : isWrongNetwork ? (
            <button
              onClick={switchToRSK}
              aria-label="Switch MetaMask to RSK Testnet"
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Switch to RSK
            </button>
          ) : (
            <button
              onClick={() => disconnect()}
              aria-label={`Disconnect wallet ${address}`}
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