// PATH: rsklegacy-frontend/src/app/initialize/page.tsx

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { CONTRACT_ADDRESS, RSK_LEGACY_ABI } from "@/lib/contract";
import { durationToSeconds } from "@/lib/utils";
import RoleGate from "@/components/layout/RoleGate";

type DurationUnit = "days" | "months" | "years";

export default function InitializePage() {
  const router = useRouter();
  const [beneficiary,   setBeneficiary]   = useState("");
  const [durationAmt,   setDurationAmt]   = useState(365);
  const [durationUnit,  setDurationUnit]  = useState<DurationUnit>("days");
  const [depositAmount, setDepositAmount] = useState("");
  const [error, setError] = useState("");

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess }   = useWaitForTransactionReceipt({ hash });

  if (isSuccess) router.push("/dashboard");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!/^0x[0-9a-fA-F]{40}$/.test(beneficiary)) {
      setError("Enter a valid Ethereum/RSK address."); return;
    }
    if (durationAmt <= 0) {
      setError("Duration must be greater than 0."); return;
    }

    const lockSecs = durationToSeconds(durationAmt, durationUnit);
    const value    = depositAmount ? parseEther(depositAmount) : 0n;

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RSK_LEGACY_ABI,
      functionName: "initialize",
      args: [beneficiary as `0x${string}`, BigInt(lockSecs)],
      value,
    });
  }

  return (
    <RoleGate allow={["stranger"]}>
      <div className="max-w-lg mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Initialize Vault</h1>
          <p className="text-zinc-400 mt-2 text-sm">
            Set up your inheritance vault once. This action cannot be undone.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Beneficiary */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 uppercase tracking-widest">Beneficiary Address</label>
            <input
              type="text"
              placeholder="0x..."
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none transition-colors"
            />
            <p className="text-xs text-zinc-500">The wallet address that will inherit your funds.</p>
          </div>

          {/* Lock duration */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 uppercase tracking-widest">Inactivity Window</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={durationAmt}
                onChange={(e) => setDurationAmt(Number(e.target.value))}
                className="w-28 bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none transition-colors"
              />
              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
                className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
              >
                <option value="days">Days</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
            <p className="text-xs text-zinc-500">
              If you don't ping within this window, your beneficiary can claim the vault.
            </p>
          </div>

          {/* Initial deposit */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 uppercase tracking-widest">
              Initial Deposit <span className="text-zinc-600 normal-case">(optional)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.0001"
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-3 pr-16 text-white font-mono text-sm outline-none transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-mono">rBTC</span>
            </div>
            <p className="text-xs text-zinc-500">You can deposit more later from the dashboard.</p>
          </div>

          {/* Summary box */}
          <div className="border border-zinc-800 bg-zinc-900/50 rounded-xl p-4 space-y-1 text-sm">
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Summary</p>
            <div className="flex justify-between">
              <span className="text-zinc-400">Beneficiary</span>
              <span className="font-mono text-xs text-white">{beneficiary || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Lock Duration</span>
              <span className="text-white">{durationAmt} {durationUnit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Initial Deposit</span>
              <span className="text-white">{depositAmount || "0"} rBTC</span>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm border border-red-500/30 bg-red-500/10 rounded-lg px-4 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={isPending || isConfirming}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors"
          >
            {isPending ? "Confirm in Wallet…" : isConfirming ? "Initializing…" : "Initialize Vault"}
          </button>
        </form>
      </div>
    </RoleGate>
  );
}