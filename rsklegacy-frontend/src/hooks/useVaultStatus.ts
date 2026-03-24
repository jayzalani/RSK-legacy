// PATH: rsklegacy-frontend/src/hooks/useVaultStatus.ts

"use client";
import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, RSK_LEGACY_ABI } from "@/lib/contract";
import type { VaultStatus } from "@/types/vault";

export function useVaultStatus() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RSK_LEGACY_ABI,
    functionName: "vaultStatus",
  });

  let status: VaultStatus | null = null;

  if (data) {
    const [
      initialized, owner, beneficiary, balance,
      lastSeen, lockDuration, deadline,
      secondsLeft, active, paused, deadlinePassed,
    ] = data as [boolean, `0x${string}`, `0x${string}`, bigint, bigint, bigint, bigint, bigint, boolean, boolean, boolean];

    status = {
      initialized, owner, beneficiary, balance,
      lastSeen, lockDuration, deadline,
      secondsLeft, active, paused, deadlinePassed,
    };
  }

  return { status, isLoading, error, refetch };
}