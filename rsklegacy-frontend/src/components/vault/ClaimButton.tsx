// PATH: rsklegacy-frontend/src/components/vault/ClaimButton.tsx

"use client";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESS, RSK_LEGACY_ABI } from "@/lib/contract";

interface Props {
  disabled?: boolean;
}

export default function ClaimButton({ disabled }: Props) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function handleClaim() {
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
      {hash && !isSuccess && (
        <p className="text-zinc-500 text-xs text-center font-mono truncate">tx: {hash}</p>
      )}
    </div>
  );
}