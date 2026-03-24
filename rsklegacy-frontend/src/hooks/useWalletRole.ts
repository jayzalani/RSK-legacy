// PATH: rsklegacy-frontend/src/hooks/useWalletRole.ts

"use client";
import type { WalletRole } from "@/types/vault";
import { useVaultStatus } from "./useVaultStatus";
import { useWallet } from "./useWallet";

export function useWalletRole(): WalletRole {
  const { address, isConnected } = useWallet();
  const { status } = useVaultStatus();

  if (!isConnected || !address) return "unknown";
  if (!status?.initialized)    return "stranger";

  const addr = address.toLowerCase();
  if (addr === status.owner.toLowerCase())       return "owner";
  if (addr === status.beneficiary.toLowerCase()) return "beneficiary";
  return "stranger";
}