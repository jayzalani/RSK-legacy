// PATH: rsklegacy-frontend/src/components/vault/EmergencyCancelButton.tsx

"use client";
import { useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESS, RSK_LEGACY_ABI } from "@/lib/contract";
import { parseTxError } from "@/lib/txErrors";

export default function EmergencyCancelButton() {
  const [confirmed, setConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({ hash });

  // FIX (Issue #5): surface errors to the user.
  useEffect(() => {
    const err = writeError || receiptError;
    if (err) setErrorMsg(parseTxError(err));
  }, [writeError, receiptError]);

  function handleCancel() {
    if (!confirmed) { setConfirmed(true); return; }
    setErrorMsg(null);
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RSK_LEGACY_ABI,
      functionName: "emergencyCancel",
    });
  }

  return (
    <div className="space-y-2">
      {confirmed && !isPending && !isConfirming && (
        <p className="text-yellow-400 text-xs text-center">
          ⚠ This will withdraw ALL funds and permanently deactivate the vault. Click again to confirm.
        </p>
      )}
      <button
        onClick={handleCancel}
        disabled={isPending || isConfirming}
        aria-label={confirmed ? "Confirm emergency cancel" : "Emergency cancel vault"}
        className="w-full bg-red-600/20 hover:bg-red-600/40 border border-red-600/40 disabled:opacity-50 text-red-400 font-bold py-3 px-6 rounded-xl transition-colors text-sm"
      >
        {isPending ? "Confirm in Wallet…" : isConfirming ? "Processing…" : confirmed ? "⚠ Confirm Emergency Cancel" : "Emergency Cancel"}
      </button>
      {isSuccess && <p className="text-emerald-400 text-xs text-center">Vault cancelled. Funds returned.</p>}
      {errorMsg && (
        <p className="text-red-400 text-xs text-center border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}
    </div>
  );
}