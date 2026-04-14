// PATH: rsklegacy-frontend/src/components/vault/DepositForm.tsx

"use client";
import { useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { CONTRACT_ADDRESS, RSK_LEGACY_ABI } from "@/lib/contract";
import { parseTxError } from "@/lib/txErrors";

export default function DepositForm() {
  const [amount, setAmount] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({ hash });

  // FIX (Issue #5): surface errors to the user.
  useEffect(() => {
    const err = writeError || receiptError;
    if (err) setErrorMsg(parseTxError(err));
  }, [writeError, receiptError]);

  function handleDeposit() {
    if (!amount || parseFloat(amount) <= 0) return;
    setErrorMsg(null);
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
          aria-label="Deposit amount in rBTC"
        />
        <button
          onClick={handleDeposit}
          disabled={isPending || isConfirming || !amount}
          className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
          aria-label="Submit deposit"
        >
          {isPending ? "Confirm…" : isConfirming ? "Depositing…" : "Deposit"}
        </button>
      </div>
      {isSuccess && <p className="text-emerald-400 text-xs">Deposit confirmed!</p>}
      {errorMsg && (
        <p className="text-red-400 text-xs border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}
    </div>
  );
}