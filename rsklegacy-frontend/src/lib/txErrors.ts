// PATH: rsklegacy-frontend/src/lib/txErrors.ts

/**
 * FIX (Issue #5): Shared transaction error parser.
 *
 * Wagmi/viem errors come in several shapes:
 *  - UserRejectedRequestError  — user clicked Reject in MetaMask
 *  - ContractFunctionRevertedError — contract reverted with a custom error
 *  - TransactionExecutionError — low-level node rejection
 *  - Generic Error
 *
 * This function extracts the most useful human-readable message and maps
 * known contract custom-error names to plain English strings.
 */

const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  NotOwner:               "Only the vault owner can do this.",
  NotBeneficiary:         "Only the beneficiary can do this.",
  ZeroAddress:            "Address cannot be zero.",
  SameAddress:            "That address is already set.",
  AlreadyInitialized:     "This vault has already been initialized.",
  NotInitialized:         "The vault has not been initialized yet.",
  ContractNotActive:      "The vault is no longer active.",
  ContractAlreadyPaused:  "The vault is already paused.",
  ContractNotPaused:      "The vault is not paused.",
  DeadlineNotReached:     "The inactivity deadline has not passed yet.",
  DeadlineAlreadyPassed:  "The inactivity deadline has already passed.",
  InsufficientDeposit:    "Deposit amount is below the minimum (1000 wei).",
  NothingToWithdraw:      "There are no funds in the vault.",
  TransferFailed:         "The fund transfer failed. Please try again.",
  Reentrancy:             "Reentrancy detected. Please try again.",
  BeneficiaryChangeLocked:"The 2-day timelock has not elapsed yet.",
  LockDurationTooShort:   "Lock duration must be at least 1 day.",
  LockDurationTooLong:    "Lock duration cannot exceed 10 years.",
  NoPendingOwner:         "There is no pending ownership transfer.",
  NotPendingOwner:        "Only the pending owner can accept this transfer.",
};

export function parseTxError(err: unknown): string {
  if (!err) return "";

  const message = (err as Error).message ?? String(err);

  // User rejected the transaction in their wallet
  if (
    message.includes("User rejected") ||
    message.includes("user rejected") ||
    message.includes("UserRejectedRequestError")
  ) {
    return "Transaction rejected in wallet.";
  }

  // Try to match a known contract custom error name
  for (const [errorName, friendlyMsg] of Object.entries(CONTRACT_ERROR_MESSAGES)) {
    if (message.includes(errorName)) return friendlyMsg;
  }

  // Insufficient funds
  if (message.includes("insufficient funds")) {
    return "Insufficient rBTC balance for this transaction.";
  }

  // Generic fallback — trim to a reasonable length
  const trimmed = message.replace(/\n/g, " ").slice(0, 120);
  return `Transaction failed: ${trimmed}`;
}