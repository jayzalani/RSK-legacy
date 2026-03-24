# RSKLegacy — Decentralized Inheritance Vault

> A dead-man's switch vault for rBTC on the Rootstock network.  
> If you stop checking in, your designated heir claims your funds automatically — no lawyers, no middlemen, just code.

---

## Live Deployment

| | |
|---|---|
| **Network** | RSK Testnet (chainId: 31) |
| **Contract Address** | [`0xdbF9cF6eA9d2B5810cD98E3d24b76CF994aC3bbE`](https://explorer.testnet.rsk.co/address/0xdbF9cF6eA9d2B5810cD98E3d24b76CF994aC3bbE) |
| **Deploy Tx** | [`0x17c44f5286246a5cd126e45130ea6831adaa4f4cf3a89bbb1910f2f7dc399025`](https://explorer.testnet.rsk.co/tx/0x17c44f5286246a5cd126e45130ea6831adaa4f4cf3a89bbb1910f2f7dc399025) |
| **Deployer** | `0x6990b8e46382D366b67854cb69060A29a1E8e6D8` |
| **Explorer** | [View on RSK Testnet Explorer](https://explorer.testnet.rsk.co/address/0xdbF9cF6eA9d2B5810cD98E3d24b76CF994aC3bbE) |

---

## What is RSKLegacy?

RSKLegacy is a **non-custodial inheritance vault** built on Rootstock (RSK) — a Bitcoin sidechain that supports EVM-compatible smart contracts with rBTC as the native currency.

The core mechanic is a **dead-man's switch**: the vault owner must periodically "ping" the contract to prove they are alive. If the owner stops checking in for a configurable inactivity window (e.g. 1 year), the designated beneficiary can claim the entire vault balance.

No third party ever holds the funds. The rules are encoded in the smart contract and cannot be changed unilaterally after initialization.

---

## Architecture

The project is split into two parts:

```
rsk-legacy/
├── rootstock-hardhat-starterkit/          ← Smart contract (Solidity)
│   └── RSKLegacy.sol
│
└── rsklegacy-frontend/ ← Next.js frontend (TypeScript)
    ├── src/
    │   ├── app/        ← Pages (App Router)
    │   ├── components/ ← UI components
    │   ├── hooks/      ← Wagmi/viem React hooks
    │   ├── lib/        ← ABI, chain config, utilities
    │   └── types/      ← TypeScript types
    └── ...config files
```

---

## Smart Contract Architecture

### File: `contracts/RSKLegacy.sol`

The contract is a single-file, dependency-free Solidity contract targeting `^0.8.24`.

#### Key Design Decisions

**Two-phase setup (Constructor + Initialize)**  
The constructor is intentionally empty. The user deploys the contract first, then calls `initialize()` from their connected wallet on the frontend. This makes `msg.sender` at `initialize()` time the vault owner, meaning the deployer and the owner can be different — and it's compatible with factory/clone patterns.

**Role Separation**
- `owner` — controls the vault, pings to stay alive, can deposit, pause, change beneficiary, transfer ownership
- `beneficiary` — can only claim after the deadline passes, cannot modify the vault
- Anyone else — can deposit (if vault is active and unpaused), nothing else

**Security Patterns**
- Manual reentrancy guard (`_locked` bool) on all external fund movements
- Checks-Effects-Interactions (CEI) strictly followed — state is updated before any `.call{value}`
- No unchecked arithmetic — Solidity 0.8+ reverts on overflow/underflow
- Pull payment pattern — funds are sent to `msg.sender`, never pushed to stored addresses
- Two-step ownership transfer — new owner must `acceptOwnership()` to prevent accidental transfers
- Time-locked beneficiary change — 2-day delay between `requestBeneficiaryChange()` and `confirmBeneficiaryChange()`

#### State Variables

| Variable | Type | Description |
|---|---|---|
| `initialized` | `bool` | True once `initialize()` has been called |
| `owner` | `address` | Current vault owner |
| `pendingOwner` | `address` | Candidate during two-step ownership transfer |
| `beneficiary` | `address` | Designated heir |
| `pendingBeneficiary` | `address` | Candidate during time-locked beneficiary change |
| `lockDuration` | `uint256` | Inactivity window in seconds |
| `lastSeen` | `uint256` | Timestamp of last owner ping or initialization |
| `active` | `bool` | False after `claim()` or `emergencyCancel()` |
| `paused` | `bool` | Blocks new deposits when true |

#### Constants

| Constant | Value | Description |
|---|---|---|
| `MIN_LOCK_DURATION` | 1 day | Shortest allowed inactivity window |
| `MAX_LOCK_DURATION` | 3650 days | Longest allowed inactivity window (10 years) |
| `BENEFICIARY_CHANGE_DELAY` | 2 days | Timelock before beneficiary change takes effect |
| `MIN_DEPOSIT` | 1000 wei | Prevents dust attacks |

#### Functions

**Setup**
- `initialize(address _beneficiary, uint256 _lockDuration) payable` — One-time vault setup. Caller becomes owner.

**Owner Actions**
- `ping()` — Resets the inactivity countdown. The core liveness proof.
- `deposit() payable` — Adds rBTC to the vault.
- `emergencyCancel()` — Withdraws all funds to owner and permanently deactivates vault.
- `setLockDuration(uint256)` — Changes the inactivity window.
- `pause()` / `unpause()` — Blocks/allows new deposits.

**Beneficiary Management (Time-locked)**
- `requestBeneficiaryChange(address)` — Proposes a new beneficiary. Starts 2-day delay.
- `confirmBeneficiaryChange()` — Applies the change after delay. Callable by anyone.
- `cancelBeneficiaryChange()` — Owner cancels a pending change.

**Ownership Transfer (Two-step)**
- `transferOwnership(address)` — Initiates transfer. New owner must accept.
- `acceptOwnership()` — New owner confirms and takes control.
- `cancelOwnershipTransfer()` — Owner cancels a pending transfer.

**Beneficiary Action**
- `claim()` — Claims all vault funds after deadline. Deactivates vault.

**View Helpers**
- `vaultStatus()` — Returns all vault state in a single call (used by frontend dashboard).
- `isDeadlinePassed()` — Returns true if owner has missed their check-in window.
- `timeUntilClaim()` — Seconds remaining until beneficiary can claim.
- `claimDeadline()` — Absolute UNIX timestamp of the claim deadline.
- `balance()` — Current vault balance in wei.

#### Events

| Event | Emitted When |
|---|---|
| `Initialized` | Vault is set up |
| `Deposited` | rBTC is deposited |
| `Pinged` | Owner checks in |
| `Claimed` | Beneficiary claims the vault |
| `EmergencyCancelled` | Owner emergency withdraws |
| `BeneficiaryChangeRequested` | New beneficiary proposed |
| `BeneficiaryChanged` | Beneficiary change confirmed |
| `BeneficiaryChangeCancelled` | Pending change cancelled |
| `OwnershipTransferStarted` | Transfer initiated |
| `OwnershipTransferred` | New owner accepted |
| `LockDurationChanged` | Inactivity window updated |
| `Paused` / `Unpaused` | Deposit blocking toggled |

---

## Frontend Architecture

### File Structure

```
rsklegacy-frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout with Providers + Navbar
│   │   ├── providers.tsx               # WagmiProvider + QueryClientProvider
│   │   ├── globals.css                 # Tailwind v4 + Google Fonts
│   │   ├── page.tsx                    # Landing page — connect wallet + auto-redirect
│   │   ├── initialize/
│   │   │   └── page.tsx                # Vault setup form → calls initialize()
│   │   ├── dashboard/
│   │   │   └── page.tsx                # Owner control panel
│   │   ├── beneficiary/
│   │   │   └── page.tsx                # Beneficiary management (time-locked)
│   │   ├── ownership/
│   │   │   └── page.tsx                # Two-step ownership transfer
│   │   ├── claim/
│   │   │   └── page.tsx                # Beneficiary claim interface
│   │   └── activity/
│   │       └── page.tsx                # On-chain event log
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx              # Sticky nav with wallet + role indicator
│   │   │   └── RoleGate.tsx            # Role-based access guard component
│   │   ├── ui/
│   │   │   ├── CountdownTimer.tsx      # Live countdown to claim deadline
│   │   │   ├── VaultStatusBadge.tsx    # Active / Paused / Claimable / Inactive badge
│   │   │   └── StatCard.tsx            # Dashboard stat display card
│   │   └── vault/
│   │       ├── PingButton.tsx          # Calls ping() with tx feedback
│   │       ├── DepositForm.tsx         # rBTC deposit input + submit
│   │       ├── EmergencyCancelButton.tsx  # Two-click emergency cancel
│   │       └── ClaimButton.tsx         # Calls claim() for beneficiary
│   │
│   ├── hooks/
│   │   ├── useWallet.ts                # Connect / disconnect / wrong network detection
│   │   ├── useVaultStatus.ts           # Reads vaultStatus() → typed VaultStatus object
│   │   └── useWalletRole.ts            # Derives owner / beneficiary / stranger from address
│   │
│   ├── lib/
│   │   ├── contract.ts                 # Full ABI + CONTRACT_ADDRESS from env
│   │   ├── wagmi.ts                    # RSK Testnet chain definition + wagmiConfig
│   │   └── utils.ts                    # formatRBTC, truncateAddress, formatDuration, etc.
│   │
│   └── types/
│       └── vault.ts                    # VaultStatus interface + WalletRole type
│
├── .env.local                          # NEXT_PUBLIC_CONTRACT_ADDRESS
├── next.config.js
├── postcss.config.mjs
└── package.json
```

### Pages & Role Access

| Page | Route | Accessible By |
|---|---|---|
| Landing | `/` | Everyone — auto-redirects based on role |
| Initialize | `/initialize` | Stranger (uninitialized vault) |
| Dashboard | `/dashboard` | Owner only |
| Beneficiary | `/beneficiary` | Owner only |
| Ownership | `/ownership` | Owner + Pending Owner |
| Claim | `/claim` | Beneficiary only |
| Activity | `/activity` | Everyone |

### Role Detection

The app detects the connected wallet's role on every page load by:
1. Reading `vaultStatus()` from the contract (single multicall)
2. Comparing `address.toLowerCase()` against `owner` and `beneficiary` fields
3. Returning `owner` | `beneficiary` | `stranger` | `unknown`

`RoleGate` wraps every protected page and shows an access-denied message if the wrong wallet is connected.

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Blockchain | Wagmi v2 + Viem |
| Wallet | MetaMask (injected connector) |
| Network | RSK Testnet (chainId: 31) |
| RPC | `https://public-node.testnet.rsk.co` |

---

## Getting Started

### Prerequisites

- Node.js 18+
- MetaMask browser extension
- RSK Testnet configured in MetaMask
- tRBTC from the [RSK Testnet Faucet](https://faucet.rsk.co)

### MetaMask RSK Testnet Config

| Field | Value |
|---|---|
| Network Name | RSK Testnet |
| RPC URL | `https://public-node.testnet.rsk.co` |
| Chain ID | `31` |
| Currency Symbol | `tRBTC` |
| Block Explorer | `https://explorer.testnet.rsk.co` |

### Installation

```bash
# Clone the repo
git clone https://github.com/yourname/rsk-legacy.git
cd rsk-legacy/rsklegacy-frontend

# Install dependencies
npm install

# Set your contract address
echo "NEXT_PUBLIC_CONTRACT_ADDRESS=0xdbF9cF6eA9d2B5810cD98E3d24b76CF994aC3bbE" > .env.local

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and connect MetaMask.

---

## User Flow

```
Connect Wallet
      │
      ├── Stranger (vault not initialized)
      │         └── /initialize → fill beneficiary + duration + deposit → Initialize Vault
      │                                │
      │                                ▼
      ├── Owner ──────────────── /dashboard
      │         │                  ├── Ping (reset countdown)
      │         │                  ├── Deposit rBTC
      │         │                  ├── Pause / Unpause
      │         │                  ├── Change Lock Duration
      │         │                  └── Emergency Cancel (deactivates vault)
      │         │
      │         ├── /beneficiary
      │         │     ├── Request new beneficiary (2-day timelock)
      │         │     ├── Confirm change (after delay)
      │         │     └── Cancel pending change
      │         │
      │         └── /ownership
      │               ├── Initiate transfer to new owner
      │               └── Cancel pending transfer
      │
      └── Beneficiary ──────── /claim
                    ├── View countdown timer
                    └── Claim Inheritance (only when deadline passed)
```

---

## Security Considerations

- **No admin keys** — once deployed, the contract cannot be upgraded or paused by any external party
- **Reentrancy protection** — manual lock on all functions that transfer ETH
- **CEI pattern** — state always updated before external calls
- **Two-step transfers** — both ownership and beneficiary changes require confirmation steps with delays
- **Deadline protection** — owner cannot change lock duration or beneficiary after the deadline has already passed
- **Dust protection** — minimum deposit of 1000 wei prevents griefing attacks

---

## License

MIT