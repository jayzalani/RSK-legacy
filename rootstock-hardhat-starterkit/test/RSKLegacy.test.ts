// test/RSKLegacy.test.ts
// Hardhat + Ethers v6 + TypeScript test suite for RSKLegacy (v2 — initialize pattern)
// Run with: npx hardhat compile && npx hardhat test

import { expect }                         from "chai";
import { ethers }                         from "hardhat";
import { time }                           from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner }            from "@nomicfoundation/hardhat-ethers/signers";
import { RSKLegacy, RSKLegacy__factory }  from "../typechain-types";

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: After replacing RSKLegacy.sol with the v2 (initialize-pattern) version
//       you MUST run `npx hardhat compile` to regenerate typechain-types before
//       running tests. The helpers below use `as any` casts on the factory/deploy
//       call so the file compiles even with stale typechain output.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DAY     = 86_400n;
const YEAR    = 365n * DAY;
const MIN_DEP = 1_000n; // wei

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface InitOverrides {
  lockDuration?: bigint;
  initialValue?: bigint;
  beneficiary?:  string;
}

interface DeployResult {
  vault:       RSKLegacy;
  owner:       HardhatEthersSigner;
  beneficiary: HardhatEthersSigner;
  stranger:    HardhatEthersSigner;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: deploy a fresh (un-initialized) vault
// ─────────────────────────────────────────────────────────────────────────────

async function deployFresh(): Promise<DeployResult> {
  const [owner, beneficiary, stranger]: HardhatEthersSigner[] =
    await ethers.getSigners();

  const factory = await ethers.getContractFactory("RSKLegacy") as RSKLegacy__factory;

  // Cast to `any` on deploy() so TypeScript accepts zero args while typechain
  // is regenerated. After `npx hardhat compile` this cast can be removed.
  const vault = await (factory as any).deploy() as RSKLegacy;
  await vault.waitForDeployment();

  return { vault, owner, beneficiary, stranger };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: deploy + initialize in one call (most tests use this)
// ─────────────────────────────────────────────────────────────────────────────

async function deployVault(overrides: InitOverrides = {}): Promise<DeployResult> {
  const [owner, beneficiary, stranger]: HardhatEthersSigner[] =
    await ethers.getSigners();

  const lockDuration = overrides.lockDuration ?? YEAR;
  const initialValue = overrides.initialValue ?? ethers.parseEther("1");
  const benefAddr    = overrides.beneficiary  ?? beneficiary.address;

  const factory = await ethers.getContractFactory("RSKLegacy") as RSKLegacy__factory;

  const vault = await (factory as any).deploy() as RSKLegacy;
  await vault.waitForDeployment();

  // Cast to `any` for initialize() until typechain is regenerated
  await (vault as any).connect(owner).initialize(benefAddr, lockDuration, {
    value: initialValue,
  });

  return { vault, owner, beneficiary, stranger };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────

describe("RSKLegacy (v2 — initialize pattern)", function () {

  // ── 1. Deployment (pre-initialize) ─────────────────────────────────────────

  describe("1. Deployment (pre-initialize)", function () {

    it("deploys without reverting", async function () {
      const { vault } = await deployFresh();
      expect(await vault.getAddress()).to.be.properAddress;
    });

    it("starts un-initialized with active=false, paused=false", async function () {
      const { vault } = await deployFresh();
      expect(await (vault as any).initialized()).to.be.false;
      expect(await vault.active()).to.be.false;
      expect(await vault.paused()).to.be.false;
    });

    it("has zero balance before initialization", async function () {
      const { vault } = await deployFresh();
      expect(await vault.balance()).to.equal(0n);
    });

    it("blocks ping before initialization (NotInitialized)", async function () {
      const { vault, owner } = await deployFresh();
      await expect(vault.connect(owner).ping())
        .to.be.revertedWithCustomError(vault, "NotInitialized");
    });

    it("blocks claim before initialization (NotInitialized)", async function () {
      const { vault, beneficiary } = await deployFresh();
      await expect(vault.connect(beneficiary).claim())
        .to.be.revertedWithCustomError(vault, "NotInitialized");
    });

    it("blocks emergencyCancel before initialization (NotInitialized)", async function () {
      const { vault, owner } = await deployFresh();
      await expect(vault.connect(owner).emergencyCancel())
        .to.be.revertedWithCustomError(vault, "NotInitialized");
    });
  });

  // ── 2. initialize() ────────────────────────────────────────────────────────

  describe("2. initialize()", function () {

    it("sets owner to msg.sender, beneficiary and lockDuration correctly", async function () {
      const { vault, owner, beneficiary } = await deployVault();
      expect(await vault.owner()).to.equal(owner.address);
      expect(await vault.beneficiary()).to.equal(beneficiary.address);
      expect(await vault.lockDuration()).to.equal(YEAR);
    });

    it("marks initialized=true and active=true", async function () {
      const { vault } = await deployVault();
      expect(await (vault as any).initialized()).to.be.true;
      expect(await vault.active()).to.be.true;
      expect(await vault.paused()).to.be.false;
    });

    it("accepts an initial rBTC deposit and reflects it in balance()", async function () {
      const { vault } = await deployVault({ initialValue: ethers.parseEther("2") });
      expect(await vault.balance()).to.equal(ethers.parseEther("2"));
    });

    it("emits Initialized event with correct args", async function () {
      const { vault: freshVault, owner, beneficiary } = await deployFresh();
      const deposit = ethers.parseEther("0.5");
      await expect(
        (freshVault as any).connect(owner).initialize(beneficiary.address, YEAR, { value: deposit })
      )
        .to.emit(freshVault, "Initialized")
        .withArgs(owner.address, beneficiary.address, YEAR, deposit);
    });

    it("emits Deposited event when initial deposit > 0", async function () {
      const { vault: freshVault, owner, beneficiary } = await deployFresh();
      const deposit = ethers.parseEther("0.1");
      await expect(
        (freshVault as any).connect(owner).initialize(beneficiary.address, YEAR, { value: deposit })
      ).to.emit(freshVault, "Deposited");
    });

    it("does NOT emit Deposited when no initial deposit", async function () {
      const { vault: freshVault, owner, beneficiary } = await deployFresh();
      await expect(
        (freshVault as any).connect(owner).initialize(beneficiary.address, YEAR)
      ).not.to.emit(freshVault, "Deposited");
    });

    it("reverts when called a second time (AlreadyInitialized)", async function () {
      const { vault, owner, beneficiary } = await deployVault();
      await expect(
        (vault as any).connect(owner).initialize(beneficiary.address, YEAR)
      ).to.be.revertedWithCustomError(vault, "AlreadyInitialized");
    });

    it("reverts when beneficiary is zero address", async function () {
      const { vault: freshVault, owner } = await deployFresh();
      await expect(
        (freshVault as any).connect(owner).initialize(ethers.ZeroAddress, YEAR, { value: MIN_DEP })
      ).to.be.revertedWithCustomError(freshVault, "ZeroAddress");
    });

    it("reverts when beneficiary == owner", async function () {
      const { vault: freshVault, owner } = await deployFresh();
      await expect(
        (freshVault as any).connect(owner).initialize(owner.address, YEAR, { value: MIN_DEP })
      ).to.be.revertedWithCustomError(freshVault, "SameAddress");
    });

    it("reverts when lockDuration < MIN_LOCK_DURATION", async function () {
      const { vault: freshVault, owner, beneficiary } = await deployFresh();
      await expect(
        (freshVault as any).connect(owner).initialize(beneficiary.address, 3_600n, { value: MIN_DEP })
      ).to.be.revertedWithCustomError(freshVault, "LockDurationTooShort");
    });

    it("reverts when lockDuration > MAX_LOCK_DURATION", async function () {
      const { vault: freshVault, owner, beneficiary } = await deployFresh();
      await expect(
        (freshVault as any).connect(owner).initialize(beneficiary.address, 9_999n * DAY, { value: MIN_DEP })
      ).to.be.revertedWithCustomError(freshVault, "LockDurationTooLong");
    });

    it("reverts on initial deposit below MIN_DEPOSIT", async function () {
      const { vault: freshVault, owner, beneficiary } = await deployFresh();
      await expect(
        (freshVault as any).connect(owner).initialize(beneficiary.address, YEAR, { value: 1n })
      ).to.be.revertedWithCustomError(freshVault, "InsufficientDeposit");
    });

    it("allows a different caller to initialize — they become owner", async function () {
      const { vault: freshVault, stranger, beneficiary } = await deployFresh();
      await (freshVault as any).connect(stranger).initialize(beneficiary.address, YEAR);
      expect(await freshVault.owner()).to.equal(stranger.address);
    });

    it("accepts initialization with no initial deposit (msg.value == 0)", async function () {
      const { vault: freshVault, owner, beneficiary } = await deployFresh();
      await expect(
        (freshVault as any).connect(owner).initialize(beneficiary.address, YEAR)
      ).not.to.be.reverted;
      expect(await freshVault.balance()).to.equal(0n);
    });

    it("MIN_LOCK_DURATION boundary — exactly 1 day succeeds", async function () {
      const { vault: freshVault, owner, beneficiary } = await deployFresh();
      await expect(
        (freshVault as any).connect(owner).initialize(beneficiary.address, DAY)
      ).not.to.be.reverted;
    });

    it("MAX_LOCK_DURATION boundary — exactly 3650 days succeeds", async function () {
      const { vault: freshVault, owner, beneficiary } = await deployFresh();
      await expect(
        (freshVault as any).connect(owner).initialize(beneficiary.address, 3650n * DAY)
      ).not.to.be.reverted;
    });
  });

  // ── 3. Deposit ─────────────────────────────────────────────────────────────

  describe("3. Deposit", function () {

    it("accepts deposits via deposit()", async function () {
      const { vault, stranger } = await deployVault();
      const before = await vault.balance();
      await vault.connect(stranger).deposit({ value: ethers.parseEther("0.5") });
      expect(await vault.balance()).to.equal(before + ethers.parseEther("0.5"));
    });

    it("accepts plain rBTC via receive()", async function () {
      const { vault, stranger } = await deployVault();
      const before = await vault.balance();
      await stranger.sendTransaction({
        to:    await vault.getAddress(),
        value: ethers.parseEther("0.1"),
      });
      expect(await vault.balance()).to.equal(before + ethers.parseEther("0.1"));
    });

    it("emits Deposited event", async function () {
      const { vault, stranger } = await deployVault();
      await expect(
        vault.connect(stranger).deposit({ value: ethers.parseEther("0.5") })
      ).to.emit(vault, "Deposited");
    });

    it("reverts deposit below MIN_DEPOSIT", async function () {
      const { vault } = await deployVault();
      await expect(vault.deposit({ value: 500n }))
        .to.be.revertedWithCustomError(vault, "InsufficientDeposit");
    });

    it("reverts deposit when paused", async function () {
      const { vault } = await deployVault();
      await vault.pause();
      await expect(vault.deposit({ value: ethers.parseEther("1") }))
        .to.be.revertedWithCustomError(vault, "ContractAlreadyPaused");
    });

    it("reverts plain rBTC send when paused", async function () {
      const { vault, stranger } = await deployVault();
      await vault.pause();
      await expect(
        stranger.sendTransaction({
          to:    await vault.getAddress(),
          value: ethers.parseEther("0.1"),
        })
      ).to.be.reverted;
    });

    it("reverts deposit when vault is not active", async function () {
      const { vault } = await deployVault();
      await vault.emergencyCancel();
      await expect(vault.deposit({ value: MIN_DEP }))
        .to.be.revertedWithCustomError(vault, "ContractNotActive");
    });

    it("reverts fallback with unknown function selector", async function () {
      const { vault, stranger } = await deployVault();
      await expect(
        stranger.sendTransaction({
          to:    await vault.getAddress(),
          data:  "0xdeadbeef",
          value: 0n,
        })
      ).to.be.reverted;
    });
  });

  // ── 4. Ping ─────────────────────────────────────────────────────────────────

  describe("4. Ping", function () {

    it("owner can ping and resets lastSeen", async function () {
      const { vault, owner } = await deployVault();
      await time.increase(100n);
      await vault.connect(owner).ping();
      const last = await vault.lastSeen();
      const now  = BigInt(await time.latest());
      expect(last).to.be.closeTo(now, 2n);
    });

    it("emits Pinged event with new deadline", async function () {
      const { vault } = await deployVault();
      await expect(vault.ping()).to.emit(vault, "Pinged");
    });

    it("reverts if called by non-owner", async function () {
      const { vault, beneficiary } = await deployVault();
      await expect(vault.connect(beneficiary).ping())
        .to.be.revertedWithCustomError(vault, "NotOwner");
    });

    it("allows ping while paused — liveness signal always works", async function () {
      const { vault } = await deployVault();
      await vault.pause();
      await expect(vault.ping()).not.to.be.reverted;
    });

    it("ping resets deadline so beneficiary cannot claim immediately after", async function () {
      const { vault, owner, beneficiary } = await deployVault();
      await time.increase(YEAR - DAY);
      await vault.connect(owner).ping();
      await time.increase(DAY * 2n);
      await expect(vault.connect(beneficiary).claim())
        .to.be.revertedWithCustomError(vault, "DeadlineNotReached");
    });
  });

  // ── 5. emergencyCancel ──────────────────────────────────────────────────────

  describe("5. emergencyCancel", function () {

    it("owner reclaims entire balance and sets active=false", async function () {
      const { vault, owner } = await deployVault({ initialValue: ethers.parseEther("2") });
      const balBefore = await ethers.provider.getBalance(owner.address);

      const tx      = await vault.emergencyCancel();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * tx.gasPrice;

      const balAfter = await ethers.provider.getBalance(owner.address);
      expect(balAfter).to.be.closeTo(
        balBefore + ethers.parseEther("2") - gasUsed,
        ethers.parseEther("0.001")
      );
      expect(await vault.active()).to.be.false;
      expect(await vault.balance()).to.equal(0n);
    });

    it("emits EmergencyCancelled", async function () {
      const { vault } = await deployVault();
      await expect(vault.emergencyCancel()).to.emit(vault, "EmergencyCancelled");
    });

    it("reverts when called by non-owner", async function () {
      const { vault, beneficiary } = await deployVault();
      await expect(vault.connect(beneficiary).emergencyCancel())
        .to.be.revertedWithCustomError(vault, "NotOwner");
    });

    it("reverts on deactivated vault (ContractNotActive)", async function () {
      const { vault } = await deployVault();
      await vault.emergencyCancel();
      await expect(vault.emergencyCancel())
        .to.be.revertedWithCustomError(vault, "ContractNotActive");
    });

    it("reverts when vault balance is zero (NothingToWithdraw)", async function () {
      const { vault: freshVault, owner, beneficiary } = await deployFresh();
      await (freshVault as any).connect(owner).initialize(beneficiary.address, YEAR);
      await expect(freshVault.connect(owner).emergencyCancel())
        .to.be.revertedWithCustomError(freshVault, "NothingToWithdraw");
    });
  });

  // ── 6. claim ────────────────────────────────────────────────────────────────

  describe("6. claim", function () {

    it("beneficiary claims full balance after deadline", async function () {
      const { vault, beneficiary } = await deployVault({
        initialValue: ethers.parseEther("1"),
      });
      await time.increase(YEAR + 1n);

      const balBefore = await ethers.provider.getBalance(beneficiary.address);
      const tx        = await vault.connect(beneficiary).claim();
      const receipt   = await tx.wait();
      const gasUsed   = receipt!.gasUsed * tx.gasPrice;

      const balAfter = await ethers.provider.getBalance(beneficiary.address);
      expect(balAfter).to.be.closeTo(
        balBefore + ethers.parseEther("1") - gasUsed,
        ethers.parseEther("0.001")
      );
      expect(await vault.active()).to.be.false;
    });

    it("emits Claimed event", async function () {
      const { vault, beneficiary } = await deployVault();
      await time.increase(YEAR + 1n);
      await expect(vault.connect(beneficiary).claim()).to.emit(vault, "Claimed");
    });

    it("reverts if deadline has not yet passed", async function () {
      const { vault, beneficiary } = await deployVault();
      await time.increase(YEAR - DAY);
      await expect(vault.connect(beneficiary).claim())
        .to.be.revertedWithCustomError(vault, "DeadlineNotReached");
    });

    it("reverts if called by non-beneficiary", async function () {
      const { vault, stranger } = await deployVault();
      await time.increase(YEAR + 1n);
      await expect(vault.connect(stranger).claim())
        .to.be.revertedWithCustomError(vault, "NotBeneficiary");
    });

    it("prevents double-claim after vault deactivated (ContractNotActive)", async function () {
      const { vault, beneficiary } = await deployVault();
      await time.increase(YEAR + 1n);
      await vault.connect(beneficiary).claim();
      await expect(vault.connect(beneficiary).claim())
        .to.be.revertedWithCustomError(vault, "ContractNotActive");
    });
  });

  // ── 7. setLockDuration ──────────────────────────────────────────────────────

  describe("7. setLockDuration", function () {

    it("owner can update lock duration", async function () {
      const { vault } = await deployVault();
      await vault.setLockDuration(2n * YEAR);
      expect(await vault.lockDuration()).to.equal(2n * YEAR);
    });

    it("emits LockDurationChanged with old and new values", async function () {
      const { vault } = await deployVault();
      await expect(vault.setLockDuration(2n * YEAR))
        .to.emit(vault, "LockDurationChanged")
        .withArgs(YEAR, 2n * YEAR);
    });

    it("reverts below MIN_LOCK_DURATION", async function () {
      const { vault } = await deployVault();
      await expect(vault.setLockDuration(3_600n))
        .to.be.revertedWithCustomError(vault, "LockDurationTooShort");
    });

    it("reverts above MAX_LOCK_DURATION", async function () {
      const { vault } = await deployVault();
      await expect(vault.setLockDuration(9_999n * DAY))
        .to.be.revertedWithCustomError(vault, "LockDurationTooLong");
    });

    it("reverts if deadline has already passed", async function () {
      const { vault } = await deployVault();
      await time.increase(YEAR + 1n);
      await expect(vault.setLockDuration(2n * YEAR))
        .to.be.revertedWithCustomError(vault, "DeadlineAlreadyPassed");
    });

    it("reverts if called by non-owner", async function () {
      const { vault, stranger } = await deployVault();
      await expect(vault.connect(stranger).setLockDuration(2n * YEAR))
        .to.be.revertedWithCustomError(vault, "NotOwner");
    });
  });

  // ── 8. Pause / Unpause ──────────────────────────────────────────────────────

  describe("8. Pause / Unpause", function () {

    it("owner can pause and then unpause", async function () {
      const { vault } = await deployVault();
      await vault.pause();
      expect(await vault.paused()).to.be.true;
      await vault.unpause();
      expect(await vault.paused()).to.be.false;
    });

    it("emits Paused and Unpaused events", async function () {
      const { vault } = await deployVault();
      await expect(vault.pause()).to.emit(vault, "Paused");
      await expect(vault.unpause()).to.emit(vault, "Unpaused");
    });

    it("reverts on double-pause", async function () {
      const { vault } = await deployVault();
      await vault.pause();
      await expect(vault.pause())
        .to.be.revertedWithCustomError(vault, "ContractAlreadyPaused");
    });

    it("reverts unpause when not paused (ContractNotPaused)", async function () {
      const { vault } = await deployVault();
      await expect(vault.unpause())
        .to.be.revertedWithCustomError(vault, "ContractNotPaused");
    });

    it("reverts pause when called by non-owner", async function () {
      const { vault, stranger } = await deployVault();
      await expect(vault.connect(stranger).pause())
        .to.be.revertedWithCustomError(vault, "NotOwner");
    });
  });

  // ── 9. Beneficiary Change (time-locked, two-step) ───────────────────────────

  describe("9. Beneficiary Change (time-locked, two-step)", function () {

    it("full flow: request → wait 2 days → confirm", async function () {
      const { vault, stranger } = await deployVault();

      await vault.requestBeneficiaryChange(stranger.address);
      expect(await vault.pendingBeneficiary()).to.equal(stranger.address);

      await expect(vault.confirmBeneficiaryChange())
        .to.be.revertedWithCustomError(vault, "BeneficiaryChangeLocked");

      await time.increase(2n * DAY + 1n);
      await vault.confirmBeneficiaryChange();

      expect(await vault.beneficiary()).to.equal(stranger.address);
      expect(await vault.pendingBeneficiary()).to.equal(ethers.ZeroAddress);
    });

    it("emits BeneficiaryChangeRequested and BeneficiaryChanged", async function () {
      const { vault, stranger } = await deployVault();
      await expect(vault.requestBeneficiaryChange(stranger.address))
        .to.emit(vault, "BeneficiaryChangeRequested");
      await time.increase(2n * DAY + 1n);
      await expect(vault.confirmBeneficiaryChange())
        .to.emit(vault, "BeneficiaryChanged");
    });

    it("owner can cancel a pending change", async function () {
      const { vault, stranger } = await deployVault();
      await vault.requestBeneficiaryChange(stranger.address);
      await vault.cancelBeneficiaryChange();
      expect(await vault.pendingBeneficiary()).to.equal(ethers.ZeroAddress);
    });

    it("emits BeneficiaryChangeCancelled", async function () {
      const { vault, stranger } = await deployVault();
      await vault.requestBeneficiaryChange(stranger.address);
      await expect(vault.cancelBeneficiaryChange())
        .to.emit(vault, "BeneficiaryChangeCancelled");
    });

    it("reverts if proposed is zero address", async function () {
      const { vault } = await deployVault();
      await expect(vault.requestBeneficiaryChange(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(vault, "ZeroAddress");
    });

    it("reverts if proposed == owner", async function () {
      const { vault, owner } = await deployVault();
      await expect(vault.requestBeneficiaryChange(owner.address))
        .to.be.revertedWithCustomError(vault, "SameAddress");
    });

    it("reverts if proposed == current beneficiary", async function () {
      const { vault, beneficiary } = await deployVault();
      await expect(vault.requestBeneficiaryChange(beneficiary.address))
        .to.be.revertedWithCustomError(vault, "SameAddress");
    });

    it("reverts request after deadline has passed", async function () {
      const { vault, stranger } = await deployVault();
      await time.increase(YEAR + 1n);
      await expect(vault.requestBeneficiaryChange(stranger.address))
        .to.be.revertedWithCustomError(vault, "DeadlineAlreadyPassed");
    });

    it("any address can confirm after the delay", async function () {
      const { vault, stranger } = await deployVault();
      const signers = await ethers.getSigners();
      const fourth  = signers[4];
      await vault.requestBeneficiaryChange(stranger.address);
      await time.increase(2n * DAY + 1n);
      await expect(vault.connect(fourth).confirmBeneficiaryChange())
        .not.to.be.reverted;
    });
  });

  // ── 10. Two-step Ownership Transfer ─────────────────────────────────────────

  describe("10. Two-step Ownership Transfer", function () {

    it("owner initiates and new owner accepts", async function () {
      const { vault, owner, stranger } = await deployVault();
      await vault.connect(owner).transferOwnership(stranger.address);
      expect(await vault.pendingOwner()).to.equal(stranger.address);

      await vault.connect(stranger).acceptOwnership();
      expect(await vault.owner()).to.equal(stranger.address);
      expect(await vault.pendingOwner()).to.equal(ethers.ZeroAddress);
    });

    it("emits OwnershipTransferStarted and OwnershipTransferred", async function () {
      const { vault, stranger } = await deployVault();
      await expect(vault.transferOwnership(stranger.address))
        .to.emit(vault, "OwnershipTransferStarted");
      await expect(vault.connect(stranger).acceptOwnership())
        .to.emit(vault, "OwnershipTransferred");
    });

    it("resets lastSeen on ownership acceptance", async function () {
      const { vault, stranger } = await deployVault();
      await time.increase(100n * DAY);
      await vault.transferOwnership(stranger.address);
      await vault.connect(stranger).acceptOwnership();

      const lastSeen = await vault.lastSeen();
      const now      = BigInt(await time.latest());
      expect(lastSeen).to.be.closeTo(now, 2n);
    });

    it("reverts if wrong address calls acceptOwnership", async function () {
      const { vault, stranger } = await deployVault();
      const signers = await ethers.getSigners();
      const fourth  = signers[4];
      await vault.transferOwnership(stranger.address);
      await expect(vault.connect(fourth).acceptOwnership())
        .to.be.revertedWithCustomError(vault, "NotPendingOwner");
    });

    it("reverts transferOwnership to zero address", async function () {
      const { vault } = await deployVault();
      await expect(vault.transferOwnership(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(vault, "ZeroAddress");
    });

    it("reverts transferOwnership to self", async function () {
      const { vault, owner } = await deployVault();
      await expect(vault.transferOwnership(owner.address))
        .to.be.revertedWithCustomError(vault, "SameAddress");
    });

    it("reverts transferOwnership to current beneficiary", async function () {
      const { vault, beneficiary } = await deployVault();
      await expect(vault.transferOwnership(beneficiary.address))
        .to.be.revertedWithCustomError(vault, "SameAddress");
    });

    it("owner can cancel pending transfer", async function () {
      const { vault, stranger } = await deployVault();
      await vault.transferOwnership(stranger.address);
      await vault.cancelOwnershipTransfer();
      expect(await vault.pendingOwner()).to.equal(ethers.ZeroAddress);
    });

    it("reverts cancelOwnershipTransfer with no pending owner", async function () {
      const { vault } = await deployVault();
      await expect(vault.cancelOwnershipTransfer())
        .to.be.revertedWithCustomError(vault, "NoPendingOwner");
    });
  });

  // ── 11. View Helpers ─────────────────────────────────────────────────────────

  describe("11. View helpers", function () {

    it("isDeadlinePassed() returns false before deadline", async function () {
      const { vault } = await deployVault();
      expect(await vault.isDeadlinePassed()).to.be.false;
    });

    it("isDeadlinePassed() returns true after deadline", async function () {
      const { vault } = await deployVault();
      await time.increase(YEAR + 1n);
      expect(await vault.isDeadlinePassed()).to.be.true;
    });

    it("isDeadlinePassed() returns false on un-initialized vault", async function () {
      const { vault } = await deployFresh();
      expect(await vault.isDeadlinePassed()).to.be.false;
    });

    it("timeUntilClaim() is > 0 before deadline", async function () {
      const { vault } = await deployVault();
      expect(await vault.timeUntilClaim()).to.be.gt(0n);
    });

    it("timeUntilClaim() returns 0 after deadline", async function () {
      const { vault } = await deployVault();
      await time.increase(YEAR + 1n);
      expect(await vault.timeUntilClaim()).to.equal(0n);
    });

    it("timeUntilClaim() returns 0 on un-initialized vault", async function () {
      const { vault } = await deployFresh();
      expect(await vault.timeUntilClaim()).to.equal(0n);
    });

    it("claimDeadline() equals lastSeen + lockDuration", async function () {
      const { vault }    = await deployVault();
      const lastSeen     = await vault.lastSeen();
      const lockDuration = await vault.lockDuration();
      expect(await vault.claimDeadline()).to.equal(lastSeen + lockDuration);
    });

    it("balance() reflects vault balance", async function () {
      const { vault } = await deployVault({ initialValue: ethers.parseEther("3") });
      expect(await vault.balance()).to.equal(ethers.parseEther("3"));
    });

    it("vaultStatus() returns correct composite state", async function () {
      const { vault, owner, beneficiary } = await deployVault();
      const status = await vault.vaultStatus();
      expect(status._owner).to.equal(owner.address);
      expect(status._beneficiary).to.equal(beneficiary.address);
      expect(status._active).to.be.true;
      expect(status._paused).to.be.false;
      expect(status._deadlinePassed).to.be.false;
      expect(status._secondsLeft).to.be.gt(0n);
    });

    it("vaultStatus() shows correct balance", async function () {
      const { vault } = await deployVault({ initialValue: ethers.parseEther("2") });
      const status = await vault.vaultStatus();
      expect(status._balance).to.equal(ethers.parseEther("2"));
    });

    it("vaultStatus() shows deadlinePassed=true after deadline", async function () {
      const { vault } = await deployVault();
      await time.increase(YEAR + 1n);
      const status = await vault.vaultStatus();
      expect(status._deadlinePassed).to.be.true;
      expect(status._secondsLeft).to.equal(0n);
    });
  });

  // ── 12. Edge Cases & Integration ─────────────────────────────────────────────

  describe("12. Edge cases & integration", function () {

    it("deactivated vault rejects ping and deposit", async function () {
      const { vault } = await deployVault();
      await vault.emergencyCancel();
      await expect(vault.ping())
        .to.be.revertedWithCustomError(vault, "ContractNotActive");
      await expect(vault.deposit({ value: MIN_DEP }))
        .to.be.revertedWithCustomError(vault, "ContractNotActive");
    });

    it("full lifecycle: deposit → ping → silence → claim", async function () {
      const { vault, owner, beneficiary, stranger } = await deployVault({
        initialValue: ethers.parseEther("0.5"),
      });

      await vault.connect(stranger).deposit({ value: ethers.parseEther("0.5") });
      expect(await vault.balance()).to.equal(ethers.parseEther("1"));

      await time.increase(YEAR - DAY);
      await vault.connect(owner).ping();

      await expect(vault.connect(beneficiary).claim())
        .to.be.revertedWithCustomError(vault, "DeadlineNotReached");

      await time.increase(YEAR + 1n);

      await expect(vault.connect(beneficiary).claim())
        .to.emit(vault, "Claimed")
        .withArgs(beneficiary.address, ethers.parseEther("1"));

      expect(await vault.active()).to.be.false;
    });

    it("new owner inherits full control after two-step transfer", async function () {
      const { vault, owner, stranger } = await deployVault();
      await vault.connect(owner).transferOwnership(stranger.address);
      await vault.connect(stranger).acceptOwnership();

      await expect(vault.connect(stranger).ping()).not.to.be.reverted;
      await expect(vault.connect(owner).ping())
        .to.be.revertedWithCustomError(vault, "NotOwner");
    });

    it("ping multiple times keeps extending the deadline", async function () {
      const { vault, owner } = await deployVault();
      for (let i = 0; i < 3; i++) {
        await time.increase(DAY * 30n);
        await vault.connect(owner).ping();
      }
      expect(await vault.isDeadlinePassed()).to.be.false;
    });

    it("same vault cannot be initialized twice even by a different caller", async function () {
      const { vault, stranger, beneficiary } = await deployVault();
      await expect(
        (vault as any).connect(stranger).initialize(beneficiary.address, YEAR)
      ).to.be.revertedWithCustomError(vault, "AlreadyInitialized");
    });
  });
});