// PATH: rsklegacy-frontend/src/components/vault/DepositForm.tsx

"use client";
import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { CONTRACT_ADDRESS, RSK_LEGACY_ABI } from "@/lib/contract";

export default function DepositForm() {
  const [amount, setAmount] = useState("");
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function handleDeposit() {
    if (!amount || parseFloat(amount) <= 0) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RSK_LEGACY_ABI,
      functionName: "deposit",
      value: parseEther(amount),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="number"
          min="0"
          step="0.0001"
          placeholder="0.01 rBTC"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-500"
        />
        <button
          onClick={handleDeposit}
          disabled={isPending || isConfirming || !amount}
          className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
        >
          {isPending ? "Confirm…" : isConfirming ? "Depositing…" : "Deposit"}
        </button>
      </div>
      {isSuccess && <p className="text-emerald-400 text-xs">Deposit confirmed!</p>}
    </div>
  );
}