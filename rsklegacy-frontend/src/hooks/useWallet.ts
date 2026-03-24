// PATH: rsklegacy-frontend/src/hooks/useWallet.ts

"use client";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { rskTestnet } from "@/lib/wagmi";

export function useWallet() {
  const { address, isConnected, chain } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const isWrongNetwork = isConnected && chain?.id !== rskTestnet.id;

  function connectWallet() {
    connect({ connector: injected(), chainId: rskTestnet.id });
  }

  function switchToRSK() {
    switchChain({ chainId: rskTestnet.id });
  }

  return {
    address,
    isConnected,
    isConnecting,
    isWrongNetwork,
    connectWallet,
    switchToRSK,
    disconnect,
  };
}