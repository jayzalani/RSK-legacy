// PATH: rsklegacy-frontend/src/app/page.tsx

"use client";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useWalletRole } from "@/hooks/useWalletRole";
import { useVaultStatus } from "@/hooks/useVaultStatus";
import { useEffect } from "react";

export default function LandingPage() {
  const { isConnected, connectWallet, isConnecting, isWrongNetwork, switchToRSK } = useWallet();
  const role = useWalletRole();
  const { status } = useVaultStatus();
  const router = useRouter();

  // Auto-redirect once wallet + role is known
  useEffect(() => {
    if (!isConnected) return;
    if (role === "owner")       router.push("/dashboard");
    if (role === "beneficiary") router.push("/claim");
    if (role === "stranger" && status?.initialized === false) router.push("/initialize");
  }, [role, isConnected, status, router]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center space-y-10 px-4">
      {/* Hero */}
      <div className="space-y-4 max-w-xl">
        <div className="inline-block border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-semibold px-4 py-1.5 rounded-full tracking-widest uppercase">
          Built on Rootstock
        </div>
        <h1 className="text-5xl font-bold tracking-tight leading-tight">
          Your rBTC.<br />
          <span className="text-orange-500">Your Legacy.</span>
        </h1>
        <p className="text-zinc-400 text-lg leading-relaxed">
          A dead-man's switch vault — if you stop checking in, your designated heir can claim your funds automatically.
          No lawyers. No middlemen. Just code.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-3 text-sm">
        {[
          "🔐 Non-custodial",
          "⏱ Inactivity deadline",
          "🔄 Two-step ownership",
          "🛡 Reentrancy protected",
          "📡 On-chain events",
        ].map((f) => (
          <span key={f} className="border border-zinc-700 bg-zinc-900 text-zinc-300 px-4 py-2 rounded-full">
            {f}
          </span>
        ))}
      </div>

      {/* CTA */}
      {!isConnected ? (
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold text-lg px-10 py-4 rounded-2xl transition-colors"
        >
          {isConnecting ? "Connecting…" : "Connect Wallet to Begin"}
        </button>
      ) : isWrongNetwork ? (
        <button
          onClick={switchToRSK}
          className="bg-red-600 hover:bg-red-700 text-white font-bold text-lg px-10 py-4 rounded-2xl transition-colors"
        >
          Switch to RSK Testnet
        </button>
      ) : (
        <p className="text-zinc-400 text-sm animate-pulse">Detecting vault role…</p>
      )}

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full pt-6">
        {[
          { step: "01", title: "Initialize",  desc: "Deploy the vault, set a beneficiary & inactivity window."       },
          { step: "02", title: "Ping Alive",  desc: "Regularly check in to reset the countdown timer."               },
          { step: "03", title: "Legacy",      desc: "If you stop, your heir claims the funds after the deadline."    },
        ].map((s) => (
          <div key={s.step} className="border border-zinc-800 bg-zinc-900 rounded-xl p-5 text-left">
            <p className="text-orange-500 font-mono text-xs mb-2">{s.step}</p>
            <p className="font-bold text-white mb-1">{s.title}</p>
            <p className="text-zinc-400 text-sm">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}