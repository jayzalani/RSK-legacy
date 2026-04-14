// PATH: rsklegacy-frontend/src/components/vault/PingButton.tsx

"use client";
import { useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESS, RSK_LEGACY_ABI } from "@/lib/contract";
import { parseTxError } from "@/lib/txErrors";

interface Props {
  onSuccess?: () => void;
}

export default function PingButton({ onSuccess }: Props) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({ hash });

  // FIX (Issue #5): surface write and receipt errors to the user.
  useEffect(() => {
    const err = writeError || receiptError;
    if (err) setErrorMsg(parseTxError(err));
  }, [writeError, receiptError]);

  function handlePing() {
    setErrorMsg(null);
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RSK_LEGACY_ABI,
      functionName: "ping",
    });
  }

  if (isSuccess && onSuccess) onSuccess();

  return (
    <div className="space-y-2">
      <button
        onClick={handlePing}
        disabled={isPending || isConfirming}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-colors text-sm"
      >
        {isPending ? "Confirm in Wallet…" : isConfirming ? "Confirming…" : "🏓 Ping — I'm Alive"}
      </button>
      {isSuccess && (
        <p className="text-emerald-400 text-xs text-center">Ping confirmed! Deadline reset.</p>
      )}
      {hash && !isSuccess && !errorMsg && (
        <p className="text-zinc-500 text-xs text-center font-mono truncate">tx: {hash}</p>
      )}
      {errorMsg && (
        <p className="text-red-400 text-xs text-center border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}
    </div>
  );
}