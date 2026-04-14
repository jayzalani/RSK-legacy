// PATH: rsklegacy-frontend/src/lib/utils.ts

import { formatUnits } from "viem";

/** Format wei to human-readable rBTC string */
export function formatRBTC(wei: bigint, decimals = 6): string {
  return parseFloat(formatUnits(wei, 18)).toFixed(decimals);
}

/** Truncate an Ethereum address */
export function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Format seconds into a human readable duration */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 && d === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

/**
 * Convert a friendly duration choice to seconds.
 *
 * FIX (Issue #7): The previous implementation used `amount * 30 * 86400` for
 * months, which meant 12 months = 360 days instead of 365. This caused a
 * 5-day discrepancy between what the UI showed and what the contract enforced.
 *
 * Fix: months now use `Math.round((amount * 365 * 86400) / 12)` so that
 * 1 month ≈ 30.417 days and 12 months = 365 days exactly, matching the
 * contract's time-based deadline arithmetic.
 */
export function durationToSeconds(amount: number, unit: "days" | "months" | "years"): number {
  switch (unit) {
    case "days":
      return amount * 86400;
    case "months":
      // Use 365/12 days per month to avoid the 30-day assumption.
      // 12 months → 365 days (not 360).
      return Math.round((amount * 365 * 86400) / 12);
    case "years":
      return amount * 365 * 86400;
  }
}

/** Unix timestamp → locale date string */
export function tsToDate(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString();
}