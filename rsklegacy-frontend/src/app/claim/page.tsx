// PATH: rsklegacy-frontend/src/app/claim/page.tsx

"use client";
import { useVaultStatus } from "@/hooks/useVaultStatus";
import RoleGate from "@/components/layout/RoleGate";
import ClaimButton from "@/components/vault/ClaimButton";
import CountdownTimer from "@/components/ui/CountdownTimer";
import StatCard from "@/components/ui/StatCard";
import { formatRBTC, truncateAddress, tsToDate } from "@/lib/utils";

export default function ClaimPage() {
  const { status, isLoading, refetch } = useVaultStatus();

  return (
    <RoleGate allow={["beneficiary"]}>
      <div className="max-w-lg mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Claim Inheritance</h1>
          <p className="text-zinc-400 text-sm mt-1">
            You are the designated beneficiary of this vault.
          </p>
        </div>

        {isLoading && (
          <div className="text-center py-20 text-zinc-500 animate-pulse">Loading vault data…</div>
        )}

        {status && (
          <>
            {/* Vault stats */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Vault Balance"
                value={`${formatRBTC(status.balance, 6)} rBTC`}
                accent
              />
              <StatCard
                label="Owner"
                value={truncateAddress(status.owner)}
                sub={status.owner}
              />
            </div>

            {/* Countdown or claimable alert */}
            <CountdownTimer secondsLeft={Number(status.secondsLeft)} />

            {/* Deadline info */}
            <div className="border border-zinc-800 bg-zinc-900 rounded-xl p-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Last Owner Activity</span>
                <span className="text-white">{tsToDate(Number(status.lastSeen))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Claim Deadline</span>
                <span className="text-white">{tsToDate(Number(status.deadline))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Vault Active</span>
                <span className={status.active ? "text-emerald-400" : "text-red-400"}>
                  {status.active ? "Yes" : "No"}
                </span>
              </div>
            </div>

            {/* Claim section */}
            <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-6 space-y-4">
              {status.deadlinePassed ? (
                <>
                  <div className="text-center space-y-1">
                    <p className="text-emerald-400 font-bold text-lg">✓ Vault is Claimable</p>
                    <p className="text-zinc-400 text-sm">
                      The inactivity deadline has passed. You can now claim{" "}
                      <span className="text-white font-mono">{formatRBTC(status.balance, 6)} rBTC</span>.
                    </p>
                  </div>
                  <ClaimButton disabled={false} />
                </>
              ) : (
                <div className="text-center space-y-1">
                  <p className="text-zinc-400 font-semibold">Not Yet Claimable</p>
                  <p className="text-zinc-500 text-sm">
                    The vault becomes claimable once the owner misses their check-in deadline.
                  </p>
                  <ClaimButton disabled />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </RoleGate>
  );
}