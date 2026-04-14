// deploy/deploy.ts
// Deploys RSKLegacy (v2 — initialize pattern) to RSK Testnet
// Run: npx hardhat run deploy/deploy.ts --network rskTestnet
//
// WHAT CHANGED FROM v1:
//   v1 constructor required BENEFICIARY_ADDRESS + LOCK_DURATION_DAYS env vars.
//   v2 constructor is empty — the user calls initialize() from the frontend.
//   This script only deploys the contract shell. No env vars required.
//
// FIX (Issue #13): Extracted all magic numbers into named constants.
//   Removed excessive console.log statements; kept only essential output.

import { ethers } from "hardhat";

// ── Named constants (FIX Issue #13 — no more magic numbers) ──────────────────

/** RSK Testnet chain ID */
const RSK_TESTNET_CHAIN_ID = 31n;

/** RSK Mainnet block explorer base URL */
const MAINNET_EXPLORER = "https://explorer.rsk.co";

/** RSK Testnet block explorer base URL */
const TESTNET_EXPLORER = "https://explorer.testnet.rsk.co";

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await ethers.getSigners();
  const network    = await ethers.provider.getNetwork();
  const balance    = await ethers.provider.getBalance(deployer.address);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  RSKLegacy v2 — Deployment");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Network  : ${network.name} (chainId: ${network.chainId})`);
  console.log(`  Deployer : ${deployer.address}`);
  console.log(`  Balance  : ${ethers.formatEther(balance)} RBTC`);

  if (balance === 0n) {
    throw new Error(
      "Deployer wallet has 0 RBTC. Fund it at https://faucet.rsk.co before deploying."
    );
  }

  const Factory  = await ethers.getContractFactory("RSKLegacy");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address  = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();

  console.log("\n  ✅  Contract deployed!");
  console.log(`  Address  : ${address}`);
  console.log(`  Tx hash  : ${deployTx?.hash ?? "unknown"}`);

  const explorer = network.chainId === RSK_TESTNET_CHAIN_ID ? TESTNET_EXPLORER : MAINNET_EXPLORER;
  console.log(`  Explorer : ${explorer}/address/${address}`);

  console.log("\n  Next steps:");
  console.log(`    1. Set NEXT_PUBLIC_CONTRACT_ADDRESS=${address} in rsklegacy-frontend/.env.local`);
  console.log("    2. User connects wallet and calls initialize() from the frontend.");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((err) => {
  console.error("\n❌  Deployment FAILED:", err.message);
  process.exit(1);
});