// PATH: rsklegacy-frontend/src/app/ownership/page.tsx

"use client";
import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, RSK_LEGACY_ABI } from "@/lib/contract";
import { useVaultStatus } from "@/hooks/useVaultStatus";
import { useWallet } from "@/hooks/useWallet";
import RoleGate from "@/components/layout/RoleGate";
import { truncateAddress } from "@/lib/utils";

export default function OwnershipPage() {
  const { status, refetch } = useVaultStatus();
  const { address } = useWallet();
  const [newOwner, setNewOwner] = useState("");
  const [error, setError]       = useState("");

  const { data: pendingOwner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RSK_LEGACY_ABI,
    functionName: "pendingOwner",
  });

  const hasPending    = pendingOwner && pendingOwner !== "0x0000000000000000000000000000000000000000";
  const isNewOwner    = address?.toLowerCase() === (pendingOwner as string)?.toLowerCase();

  // Initiate transfer
  const { writeContract: initiate, data: initHash, isPending: initPending } = useWriteContract();
  const { isSuccess: initSuccess } = useWaitForTransactionReceipt({ hash: initHash });

  // Accept ownership
  const { writeContract: accept, data: acceptHash, isPending: acceptPending } = useWriteContract();
  const { isSuccess: acceptSuccess } = useWaitForTransactionReceipt({ hash: acceptHash });

  // Cancel transfer
  const { writeContract: cancel, data: cancelHash, isPending: cancelPending } = useWriteContract();
  const { isSuccess: cancelSuccess } = useWaitForTransactionReceipt({ hash: cancelHash });

  if (initSuccess || acceptSuccess || cancelSuccess) refetch();

  function handleInitiate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^0x[0-9a-fA-F]{40}$/.test(newOwner)) { setError("Invalid address."); return; }
    initiate({ address: CONTRACT_ADDRESS, abi: RSK_LEGACY_ABI, functionName: "transferOwnership", args: [newOwner as `0x${string}`] });
  }

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Ownership Transfer</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Transfer vault ownership using a secure two-step process.
        </p>
      </div>

      {/* Current owner */}
      <div className="border border-zinc-800 bg-zinc-900 rounded-xl p-5 space-y-1">
        <p className="text-xs text-zinc-500 uppercase tracking-widest">Current Owner</p>
        <p className="font-mono text-white break-all">{status?.owner ?? "—"}</p>
      </div>

      {/* Pending owner section */}
      {hasPending && (
        <div className="border border-blue-500/30 bg-blue-500/10 rounded-xl p-5 space-y-3">
          <p className="text-xs text-blue-400 uppercase tracking-widest">Pending Owner</p>
          <p className="font-mono text-white break-all">{pendingOwner as string}</p>

          {/* Accept (shown to pending owner) */}
          {isNewOwner && (
            <div className="space-y-2">
              <p className="text-zinc-400 text-sm">You are the pending owner. Accept to complete the transfer.</p>
              <button
                onClick={() => accept({ address: CONTRACT_ADDRESS, abi: RSK_LEGACY_ABI, functionName: "acceptOwnership" })}
                disabled={acceptPending}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {acceptPending ? "Confirm in Wallet…" : "Accept Ownership"}
              </button>
              {acceptSuccess && <p className="text-emerald-400 text-xs text-center">Ownership accepted!</p>}
            </div>
          )}

          {/* Cancel (shown to current owner) */}
          <RoleGate allow={["owner"]} fallback={null}>
            <button
              onClick={() => cancel({ address: CONTRACT_ADDRESS, abi: RSK_LEGACY_ABI, functionName: "cancelOwnershipTransfer" })}
              disabled={cancelPending}
              className="border border-red-600/40 text-red-400 hover:bg-red-600/10 disabled:opacity-40 text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {cancelPending ? "Cancelling…" : "Cancel Transfer"}
            </button>
            {cancelSuccess && <p className="text-zinc-400 text-xs">Transfer cancelled.</p>}
          </RoleGate>
        </div>
      )}

      {/* Initiate transfer form */}
      <RoleGate allow={["owner"]} fallback={
        !hasPending ? null : (
          <p className="text-zinc-500 text-sm text-center">
            Connect as the current owner to initiate a transfer.
          </p>
        )
      }>
        {!hasPending && (
          <form onSubmit={handleInitiate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-zinc-400 uppercase tracking-widest">New Owner Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none transition-colors"
              />
              <p className="text-xs text-zinc-500">
                The new owner must call Accept Ownership from their wallet to complete the transfer.
              </p>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={initPending}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {initPending ? "Confirm in Wallet…" : "Initiate Transfer"}
            </button>
            {initSuccess && <p className="text-emerald-400 text-xs text-center">Transfer initiated. Pending owner must accept.</p>}
          </form>
        )}
      </RoleGate>
    </div>
  );
}