// PATH: rsklegacy-frontend/src/lib/wagmi.ts

import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

// RSK Testnet chain definition
export const rskTestnet = defineChain({
  id: 31,
  name: "RSK Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Test RSK Bitcoin",
    symbol: "tRBTC",
  },
  rpcUrls: {
    default: { http: ["https://public-node.testnet.rsk.co"] },
  },
  blockExplorers: {
    default: {
      name: "RSK Testnet Explorer",
      url: "https://explorer.testnet.rsk.co",
    },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [rskTestnet],
  connectors: [injected()],   // injected() works with MetaMask without React Native deps
  transports: {
    [rskTestnet.id]: http(),
  },
});

