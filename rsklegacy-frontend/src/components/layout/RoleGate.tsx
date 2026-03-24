// PATH: rsklegacy-frontend/src/components/layout/RoleGate.tsx

"use client";
import { useWalletRole } from "@/hooks/useWalletRole";
import { useWallet } from "@/hooks/useWallet";
import type { WalletRole } from "@/types/vault";

interface RoleGateProps {
  allow: WalletRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RoleGate({ allow, children, fallback }: RoleGateProps) {
  const role = useWalletRole();
  const { isConnected } = useWallet();

  if (!isConnected) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <p className="text-lg">Connect your wallet to continue.</p>
      </div>
    );
  }

  if (!allow.includes(role)) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="text-center py-20 text-zinc-500">
        <p className="text-lg">Access restricted.</p>
        <p className="text-sm mt-2">
          This page requires the <span className="text-orange-400">{allow.join(" or ")}</span> role.
          Your current role is <span className="text-zinc-300">{role}</span>.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}