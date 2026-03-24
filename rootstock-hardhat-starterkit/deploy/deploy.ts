// deploy/deploy.ts
// Deploys RSKLegacy (v2 — initialize pattern) to RSK Testnet
// Run: npx hardhat run deploy/deploy.ts --network rskTestnet
//
// WHAT CHANGED FROM v1:
//   v1 constructor required BENEFICIARY_ADDRESS + LOCK_DURATION_DAYS env vars.
//   v2 constructor is empty — the user calls initialize() from the frontend.
//   This script only deploys the contract shell. No env vars required.

import { ethers } from "hardhat";

async function main() {
  // ── Deployer info ──────────────────────────────────────────────────────────
  const [deployer] = await ethers.getSigners();
  const network    = await ethers.provider.getNetwork();
  const balance    = await ethers.provider.getBalance(deployer.address);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  RSKLegacy v2 — Deployment");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Network   : ${network.name} (chainId: ${network.chainId})`);
  console.log(`  Deployer  : ${deployer.address}`);
  console.log(`  Balance   : ${ethers.formatEther(balance)} RBTC`);
  console.log("─────────────────────────────────────────────────");

  // ── Guard: make sure the deployer has funds ────────────────────────────────
  if (balance === 0n) {
    throw new Error(
      "Deployer wallet has 0 RBTC. Fund it at https://faucet.rsk.co before deploying."
    );
  }

  // ── Deploy ─────────────────────────────────────────────────────────────────
  // The v2 constructor takes NO arguments.
  // All vault configuration (beneficiary, lockDuration, initial deposit)
  // is done by the user from the frontend via initialize().
  console.log("\n  Deploying RSKLegacy...");

  const Factory  = await ethers.getContractFactory("RSKLegacy");
  const contract = await Factory.deploy();          // ← no args
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();

  console.log("\n  ✅  Contract deployed successfully!");
  console.log("─────────────────────────────────────────────────");
  console.log(`  Contract address : ${address}`);
  console.log(`  Deploy tx hash   : ${deployTx?.hash ?? "unknown"}`);
  console.log(`  Block            : ${deployTx?.blockNumber ?? "pending"}`);
  console.log("─────────────────────────────────────────────────");

  // ── Verify state ──────────────────────────────────────────────────────────
  const initialized = await (contract as any).initialized();
  const active      = await contract.active();

  console.log("\n  Post-deploy state:");
  console.log(`    initialized : ${initialized}   ← user calls initialize() from frontend`);
  console.log(`    active      : ${active}         ← becomes true after initialize()`);

  // ── Explorer link ─────────────────────────────────────────────────────────
  const isTestnet = network.chainId === 31n;
  const explorer  = isTestnet
    ? `https://explorer.testnet.rsk.co/address/${address}`
    : `https://explorer.rsk.co/address/${address}`;

  console.log(`\n  Explorer : ${explorer}`);

  // ── Next steps ────────────────────────────────────────────────────────────
  console.log("\n  ── Next steps ───────────────────────────────────");
  console.log("  1. Copy the contract address above into your frontend .env:");
  console.log(`     NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
  console.log("  2. The user connects their wallet on the frontend.");
  console.log("  3. They call initialize(beneficiaryAddress, lockDurationSeconds)");
  console.log("     with an optional rBTC deposit — no env vars needed.");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((err) => {
  console.error("\n❌  Deployment FAILED:", err.message);
  process.exit(1);
});