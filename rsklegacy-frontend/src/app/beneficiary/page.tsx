// PATH: rsklegacy-frontend/src/app/beneficiary/page.tsx

"use client";
import { useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import type { Address } from "viem";
import { CONTRACT_ADDRESS, RSK_LEGACY_ABI } from "@/lib/contract";
import { useVaultStatus } from "@/hooks/useVaultStatus";
import RoleGate from "@/components/layout/RoleGate";
import { truncateAddress, tsToDate } from "@/lib/utils";
import { parseTxError } from "@/lib/txErrors";

/**
 * FIX (Issue #11): Replaced all `pendingBeneficiary as string` type assertions.
 * useReadContract returns `Address | undefined`. We now:
 *   - Type the result as `Address | undefined` explicitly
 *   - Use a null-safe `hasPending` guard before all reads
 *   - Pass the address with a null-safe fallback `?? ""` where a string is needed
 * This prevents runtime errors when the value is undefined.
 *
 * FIX (Issue #5): Added error handling to all writeContract calls.
 */

// 2 days in seconds — kept as a named constant to avoid magic numbers.
const BENEFICIARY_CHANGE_DELAY_SECS = 2 * 24 * 60 * 60;

export default function BeneficiaryPage() {
  const { status, refetch } = useVaultStatus();
  const [proposed, setProposed] = useState("");
  const [formError, setFormError] = useState("");

  // FIX (Issue #11): Typed as Address | undefined — no more `as string`.
  const { data: pendingBeneficiary } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RSK_LEGACY_ABI,
    functionName: "pendingBeneficiary",
  }) as { data: Address | undefined };

  const { data: requestedAt } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RSK_LEGACY_ABI,
    functionName: "beneficiaryChangeRequestedAt",
  }) as { data: bigint | undefined };

  // FIX (Issue #11): Guard — only read these when pendingBeneficiary is defined and non-zero.
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const hasPending = !!pendingBeneficiary && pendingBeneficiary !== ZERO_ADDRESS;

  const effectiveAt = requestedAt != null
    ? Number(requestedAt) + BENEFICIARY_CHANGE_DELAY_SECS
    : 0;

  const canConfirm = hasPending && Date.now() / 1000 >= effectiveAt;

  // Request change
  const { writeContract: requestChange, data: reqHash, isPending: reqPending, error: reqWriteError } = useWriteContract();
  const { isSuccess: reqSuccess, error: reqReceiptError } = useWaitForTransactionReceipt({ hash: reqHash });

  // Confirm change
  const { writeContract: confirmChange, data: confHash, isPending: confPending, error: confWriteError } = useWriteContract();
  const { isSuccess: confSuccess, error: confReceiptError } = useWaitForTransactionReceipt({ hash: confHash });

  // Cancel change
  const { writeContract: cancelChange, data: cancelHash, isPending: cancelPending, error: cancelWriteError } = useWriteContract();
  const { isSuccess: cancelSuccess, error: cancelReceiptError } = useWaitForTransactionReceipt({ hash: cancelHash });

  // FIX (Issue #5): Surface transaction errors.
  const [txError, setTxError] = useState<string | null>(null);
  useEffect(() => {
    const err = reqWriteError || reqReceiptError || confWriteError || confReceiptError || cancelWriteError || cancelReceiptError;
    if (err) setTxError(parseTxError(err));
  }, [reqWriteError, reqReceiptError, confWriteError, confReceiptError, cancelWriteError, cancelReceiptError]);

  if (reqSuccess || confSuccess || cancelSuccess) refetch();

  function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setTxError(null);
    if (!/^0x[0-9a-fA-F]{40}$/.test(proposed)) {
      setFormError("Invalid address.");
      return;
    }
    requestChange({
      address: CONTRACT_ADDRESS,
      abi: RSK_LEGACY_ABI,
      functionName: "requestBeneficiaryChange",
      args: [proposed as Address],
    });
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
            {/* FIX (Issue #11): pendingBeneficiary is guaranteed non-null here due to hasPending guard */}
            <p className="font-mono text-white break-all">{pendingBeneficiary}</p>
            <p className="text-zinc-400 text-sm">
              Effective after: <span className="text-white">{tsToDate(effectiveAt)}</span>
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => {
                  setTxError(null);
                  confirmChange({
                    address: CONTRACT_ADDRESS,
                    abi: RSK_LEGACY_ABI,
                    functionName: "confirmBeneficiaryChange",
                  });
                }}
                disabled={!canConfirm || confPending}
                aria-label="Confirm beneficiary change"
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {confPending ? "Confirming…" : canConfirm ? "Confirm Change" : "Delay Not Elapsed"}
              </button>
              <button
                onClick={() => {
                  setTxError(null);
                  cancelChange({
                    address: CONTRACT_ADDRESS,
                    abi: RSK_LEGACY_ABI,
                    functionName: "cancelBeneficiaryChange",
                  });
                }}
                disabled={cancelPending}
                aria-label="Cancel pending beneficiary change"
                className="border border-red-600/40 text-red-400 hover:bg-red-600/10 disabled:opacity-40 text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {cancelPending ? "Cancelling…" : "Cancel"}
              </button>
            </div>
            {confSuccess   && <p className="text-emerald-400 text-xs">Beneficiary updated!</p>}
            {cancelSuccess && <p className="text-zinc-400 text-xs">Pending change cancelled.</p>}
          </div>
        )}

        {/* Request new beneficiary */}
        {!hasPending && (
          <form onSubmit={handleRequest} className="space-y-4" aria-label="Request beneficiary change form">
            <div className="space-y-2">
              <label htmlFor="beneficiary-input" className="text-sm text-zinc-400 uppercase tracking-widest">
                Propose New Beneficiary
              </label>
              <input
                id="beneficiary-input"
                type="text"
                placeholder="0x..."
                value={proposed}
                onChange={(e) => setProposed(e.target.value)}
                aria-label="New beneficiary address"
                aria-describedby="beneficiary-hint"
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none transition-colors"
              />
              <p id="beneficiary-hint" className="text-xs text-zinc-500">
                A 2-day waiting period starts on submission. You can cancel within that window.
              </p>
            </div>
            {formError && <p className="text-red-400 text-sm" role="alert">{formError}</p>}
            {txError   && <p className="text-red-400 text-sm border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2" role="alert">{txError}</p>}
            <button
              type="submit"
              disabled={reqPending}
              aria-label="Submit beneficiary change request"
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {reqPending ? "Confirm in Wallet…" : "Request Change"}
            </button>
            {reqSuccess && (
              <p className="text-emerald-400 text-xs text-center">Change requested. Confirm after 2 days.</p>
            )}
          </form>
        )}
      </div>
    </RoleGate>
  );
}