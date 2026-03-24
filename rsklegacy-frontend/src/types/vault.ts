export interface VaultStatus {
  initialized:    boolean;
  owner:          `0x${string}`;
  beneficiary:    `0x${string}`;
  balance:        bigint;
  lastSeen:       bigint;
  lockDuration:   bigint;
  deadline:       bigint;
  secondsLeft:    bigint;
  active:         boolean;
  paused:         boolean;
  deadlinePassed: boolean;
}

export type WalletRole = "owner" | "beneficiary" | "stranger" | "unknown";