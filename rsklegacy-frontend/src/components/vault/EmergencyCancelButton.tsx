// PATH: rsklegacy-frontend/src/components/vault/EmergencyCancelButton.tsx

"use client";
import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESS, RSK_LEGACY_ABI } from "@/lib/contract";

export default function EmergencyCancelButton() {
  const [confirmed, setConfirmed] = useState(false);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function handleCancel() {
    if (!confirmed) { setConfirmed(true); return; }
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
        className="w-full bg-red-600/20 hover:bg-red-600/40 border border-red-600/40 disabled:opacity-50 text-red-400 font-bold py-3 px-6 rounded-xl transition-colors text-sm"
      >
        {isPending ? "Confirm in Wallet…" : isConfirming ? "Processing…" : confirmed ? "⚠ Confirm Emergency Cancel" : "Emergency Cancel"}
      </button>
      {isSuccess && <p className="text-emerald-400 text-xs text-center">Vault cancelled. Funds returned.</p>}
    </div>
  );
}