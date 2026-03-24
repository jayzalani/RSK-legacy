// PATH: rsklegacy-frontend/src/app/beneficiary/page.tsx

"use client";
import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, RSK_LEGACY_ABI } from "@/lib/contract";
import { useVaultStatus } from "@/hooks/useVaultStatus";
import RoleGate from "@/components/layout/RoleGate";
import { truncateAddress, tsToDate } from "@/lib/utils";

const DELAY_SECS = 2 * 24 * 60 * 60; // 2 days

export default function BeneficiaryPage() {
  const { status, refetch } = useVaultStatus();
  const [proposed, setProposed] = useState("");
  const [error, setError] = useState("");

  // Read pending beneficiary state
  const { data: pendingBeneficiary } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RSK_LEGACY_ABI,
    functionName: "pendingBeneficiary",
  });
  const { data: requestedAt } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RSK_LEGACY_ABI,
    functionName: "beneficiaryChangeRequestedAt",
  });

  const hasPending  = pendingBeneficiary && pendingBeneficiary !== "0x0000000000000000000000000000000000000000";
  const effectiveAt = requestedAt ? Number(requestedAt) + DELAY_SECS : 0;
  const canConfirm  = hasPending && Date.now() / 1000 >= effectiveAt;

  // Request change
  const { writeContract: requestChange, data: reqHash, isPending: reqPending } = useWriteContract();
  const { isSuccess: reqSuccess } = useWaitForTransactionReceipt({ hash: reqHash });

  // Confirm change
  const { writeContract: confirmChange, data: confHash, isPending: confPending } = useWriteContract();
  const { isSuccess: confSuccess } = useWaitForTransactionReceipt({ hash: confHash });

  // Cancel change
  const { writeContract: cancelChange, data: cancelHash, isPending: cancelPending } = useWriteContract();
  const { isSuccess: cancelSuccess } = useWaitForTransactionReceipt({ hash: cancelHash });

  if (reqSuccess || confSuccess || cancelSuccess) refetch();

  function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^0x[0-9a-fA-F]{40}$/.test(proposed)) { setError("Invalid address."); return; }
    requestChange({ address: CONTRACT_ADDRESS, abi: RSK_LEGACY_ABI, functionName: "requestBeneficiaryChange", args: [proposed as `0x${string}`] });
  }

  return (
    <RoleGate allow={["owner"]}>
      <div className="max-w-lg mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Beneficiary Management</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Changes to the beneficiary require a 2-day time-lock before taking effect.
          </p>
        </div>

        {/* Current beneficiary */}
        <div className="border border-zinc-800 bg-zinc-900 rounded-xl p-5 space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Current Beneficiary</p>
          <p className="font-mono text-white break-all">{status?.beneficiary ?? "—"}</p>
        </div>

        {/* Pending change */}
        {hasPending && (
          <div className="border border-yellow-500/30 bg-yellow-500/10 rounded-xl p-5 space-y-3">
            <p className="text-xs text-yellow-400 uppercase tracking-widest">Pending Change</p>
            <p className="font-mono text-white break-all">{pendingBeneficiary as string}</p>
            <p className="text-zinc-400 text-sm">
              Effective after: <span className="text-white">{tsToDate(effectiveAt)}</span>
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => confirmChange({ address: CONTRACT_ADDRESS, abi: RSK_LEGACY_ABI, functionName: "confirmBeneficiaryChange" })}
                disabled={!canConfirm || confPending}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {confPending ? "Confirming…" : canConfirm ? "Confirm Change" : "Delay Not Elapsed"}
              </button>
              <button
                onClick={() => cancelChange({ address: CONTRACT_ADDRESS, abi: RSK_LEGACY_ABI, functionName: "cancelBeneficiaryChange" })}
                disabled={cancelPending}
                className="border border-red-600/40 text-red-400 hover:bg-red-600/10 disabled:opacity-40 text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {cancelPending ? "Cancelling…" : "Cancel"}
              </button>
            </div>
            {confSuccess  && <p className="text-emerald-400 text-xs">Beneficiary updated!</p>}
            {cancelSuccess && <p className="text-zinc-400 text-xs">Pending change cancelled.</p>}
          </div>
        )}

        {/* Request new beneficiary */}
        {!hasPending && (
          <form onSubmit={handleRequest} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-zinc-400 uppercase tracking-widest">Propose New Beneficiary</label>
              <input
                type="text"
                placeholder="0x..."
                value={proposed}
                onChange={(e) => setProposed(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none transition-colors"
              />
              <p className="text-xs text-zinc-500">
                A 2-day waiting period starts on submission. You can cancel within that window.
              </p>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={reqPending}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {reqPending ? "Confirm in Wallet…" : "Request Change"}
            </button>
            {reqSuccess && <p className="text-emerald-400 text-xs text-center">Change requested. Confirm after 2 days.</p>}
          </form>
        )}
      </div>
    </RoleGate>
  );
}