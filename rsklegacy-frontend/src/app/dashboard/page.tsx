// PATH: rsklegacy-frontend/src/app/dashboard/page.tsx

"use client";
import { useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useVaultStatus } from "@/hooks/useVaultStatus";
import RoleGate from "@/components/layout/RoleGate";
import StatCard from "@/components/ui/StatCard";
import VaultStatusBadge from "@/components/ui/VaultStatusBadge";
import CountdownTimer from "@/components/ui/CountdownTimer";
import PingButton from "@/components/vault/PingButton";
import DepositForm from "@/components/vault/DepositForm";
import EmergencyCancelButton from "@/components/vault/EmergencyCancelButton";
import { CONTRACT_ADDRESS, RSK_LEGACY_ABI } from "@/lib/contract";
import { formatRBTC, truncateAddress, tsToDate, formatDuration, durationToSeconds } from "@/lib/utils";
import { parseTxError } from "@/lib/txErrors";

// ── Inline sub-components ─────────────────────────────────────────────────────

function PauseToggle({ paused, active, onSuccess }: { paused: boolean; active: boolean; onSuccess: () => void }) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isSuccess, error: receiptError } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    const err = writeError || receiptError;
    if (err) setErrorMsg(parseTxError(err));
  }, [writeError, receiptError]);

  if (isSuccess) onSuccess();
  if (!active) return null;

  return (
    <section className="border border-zinc-800 bg-zinc-900 rounded-xl p-6 space-y-3">
      <h2 className="font-bold text-lg">{paused ? "Vault Paused" : "Pause Vault"}</h2>
      <p className="text-zinc-400 text-sm">
        {paused
          ? "New deposits are blocked. Pings still work."
          : "Temporarily block new deposits without touching funds."}
      </p>
      <button
        onClick={() => {
          setErrorMsg(null);
          writeContract({
            address: CONTRACT_ADDRESS,
            abi: RSK_LEGACY_ABI,
            functionName: paused ? "unpause" : "pause",
          });
        }}
        disabled={isPending}
        aria-label={paused ? "Unpause vault deposits" : "Pause vault deposits"}
        className="border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-sm font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {isPending ? "Confirm in Wallet…" : paused ? "Unpause Vault" : "Pause Vault"}
      </button>
      {errorMsg && (
        <p className="text-red-400 text-xs border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2" role="alert">
          {errorMsg}
        </p>
      )}
    </section>
  );
}

function SetLockDuration({ current, onSuccess }: { current: number; onSuccess: () => void }) {
  const [amt, setAmt]   = useState(365);
  const [unit, setUnit] = useState<"days" | "months" | "years">("days");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isSuccess, error: receiptError } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    const err = writeError || receiptError;
    if (err) setErrorMsg(parseTxError(err));
  }, [writeError, receiptError]);

  if (isSuccess) onSuccess();

  return (
    <section className="border border-zinc-800 bg-zinc-900 rounded-xl p-6 space-y-3">
      <h2 className="font-bold text-lg">Change Lock Duration</h2>
      <p className="text-zinc-400 text-sm">
        Current: <span className="text-white font-mono">{formatDuration(current)}</span>
      </p>
      <div className="flex gap-2 flex-wrap">
        <input
          type="number"
          min={1}
          value={amt}
          onChange={(e) => setAmt(Number(e.target.value))}
          aria-label="Lock duration amount"
          className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-sm outline-none focus:border-orange-500 transition-colors"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as "days" | "months" | "years")}
          aria-label="Lock duration unit"
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500 transition-colors"
        >
          <option value="days">Days</option>
          <option value="months">Months</option>
          <option value="years">Years</option>
        </select>
        <button
          onClick={() => {
            setErrorMsg(null);
            writeContract({
              address: CONTRACT_ADDRESS,
              abi: RSK_LEGACY_ABI,
              functionName: "setLockDuration",
              args: [BigInt(durationToSeconds(amt, unit))],
            });
          }}
          disabled={isPending}
          aria-label="Update lock duration"
          className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {isPending ? "Confirm…" : "Update"}
        </button>
      </div>
      {isSuccess && <p className="text-emerald-400 text-xs">Lock duration updated.</p>}
      {errorMsg && (
        <p className="text-red-400 text-xs border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2" role="alert">
          {errorMsg}
        </p>
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { status, isLoading, refetch } = useVaultStatus();

  return (
    <RoleGate allow={["owner"]}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Vault Dashboard</h1>
            <p className="text-zinc-400 text-sm mt-1">Monitor and manage your inheritance vault.</p>
          </div>
          {status && (
            <VaultStatusBadge
              active={status.active}
              paused={status.paused}
              deadlinePassed={status.deadlinePassed}
            />
          )}
        </div>

        {/* FIX (Issue #14): Show loading skeletons while data fetches */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Balance"     loading={isLoading} value={status ? `${formatRBTC(status.balance, 6)} rBTC` : undefined} accent />
          <StatCard label="Lock Duration" loading={isLoading} value={status ? formatDuration(Number(status.lockDuration)) : undefined} />
          <StatCard label="Last Ping"   loading={isLoading} value={status ? tsToDate(Number(status.lastSeen)) : undefined} />
          <StatCard label="Beneficiary" loading={isLoading} value={status ? truncateAddress(status.beneficiary) : undefined} sub={status?.beneficiary} />
        </div>

        {status && (
          <>
            {/* Countdown */}
            <CountdownTimer secondsLeft={Number(status.secondsLeft)} />

            {/* Ping */}
            <section className="border border-zinc-800 bg-zinc-900 rounded-xl p-6 space-y-3">
              <h2 className="font-bold text-lg">Check-in</h2>
              <p className="text-zinc-400 text-sm">
                Ping the vault to prove you're alive and reset the inactivity countdown.
              </p>
              <PingButton onSuccess={refetch} />
            </section>

            {/* Deposit */}
            {!status.paused && status.active && (
              <section className="border border-zinc-800 bg-zinc-900 rounded-xl p-6 space-y-3">
                <h2 className="font-bold text-lg">Deposit rBTC</h2>
                <DepositForm />
              </section>
            )}

            {/* Pause / Unpause */}
            <PauseToggle paused={status.paused} active={status.active} onSuccess={refetch} />

            {/* Set lock duration */}
            <SetLockDuration current={Number(status.lockDuration)} onSuccess={refetch} />

            {/* Danger zone */}
            <section className="border border-red-900/30 bg-red-950/10 rounded-xl p-6 space-y-3">
              <h2 className="font-bold text-lg text-red-400">Danger Zone</h2>
              <p className="text-zinc-400 text-sm">
                Emergency cancel withdraws all funds to your wallet and permanently deactivates the vault.
              </p>
              <EmergencyCancelButton />
            </section>
          </>
        )}
      </div>
    </RoleGate>
  );
}