"use client";
import { useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESS, RSK_LEGACY_ABI } from "@/lib/contract";
import { parseTxError } from "@/lib/txErrors";
import TxHashLink from "@/components/ui/TxHashLink";

interface Props {
  disabled?: boolean;
}

export default function ClaimButton({ disabled }: Props) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({ hash });

  // FIX (Issue #5): surface errors to the user.
  useEffect(() => {
    const err = writeError || receiptError;
    if (err) setErrorMsg(parseTxError(err));
  }, [writeError, receiptError]);

  function handleClaim() {
    setErrorMsg(null);
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RSK_LEGACY_ABI,
      functionName: "claim",
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClaim}
        disabled={disabled || isPending || isConfirming}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-colors text-base"
      >
        {isPending ? "Confirm in Wallet…" : isConfirming ? "Claiming…" : "Claim Inheritance"}
      </button>
      {isSuccess && (
        <p className="text-emerald-400 text-sm text-center font-semibold">
          ✓ Inheritance claimed successfully.
        </p>
      )}
      {/* {hash && !isSuccess && !errorMsg && (
        <p className="text-zinc-500 text-xs text-center font-mono truncate">tx: {hash}</p>
      )} */}
      {hash && !isSuccess && !errorMsg && <TxHashLink hash={hash} />}
      {errorMsg && (
        <p className="text-red-400 text-xs text-center border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}
    </div>
  );
}