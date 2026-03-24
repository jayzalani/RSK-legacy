// PATH: rsklegacy-frontend/src/components/vault/PingButton.tsx

"use client";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESS, RSK_LEGACY_ABI } from "@/lib/contract";

interface Props {
  onSuccess?: () => void;
}

export default function PingButton({ onSuccess }: Props) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function handlePing() {
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
      {hash && !isSuccess && (
        <p className="text-zinc-500 text-xs text-center font-mono truncate">tx: {hash}</p>
      )}
    </div>
  );
}