// PATH: rsklegacy-frontend/src/app/activity/page.tsx

"use client";
import { useEffect, useState } from "react";
import { createPublicClient, http, parseAbiItem } from "viem";
import { CONTRACT_ADDRESS } from "@/lib/contract";
import { rskTestnet } from "@/lib/wagmi";
import { truncateAddress, tsToDate, formatRBTC } from "@/lib/utils";

// ── Event ABI items ───────────────────────────────────────────
const EVENT_ABIS = [
  parseAbiItem("event Initialized(address indexed owner, address indexed beneficiary, uint256 lockDuration, uint256 initialDeposit)"),
  parseAbiItem("event Deposited(address indexed from, uint256 amount, uint256 newBalance)"),
  parseAbiItem("event Pinged(address indexed owner, uint256 newDeadline)"),
  parseAbiItem("event Claimed(address indexed beneficiary, uint256 amount)"),
  parseAbiItem("event EmergencyCancelled(address indexed owner, uint256 amount)"),
  parseAbiItem("event BeneficiaryChanged(address indexed oldBeneficiary, address indexed newBeneficiary)"),
  parseAbiItem("event OwnershipTransferred(address indexed oldOwner, address indexed newOwner)"),
];

const EVENT_META: Record<string, { label: string; color: string; icon: string }> = {
  Initialized:          { label: "Vault Initialized",    color: "text-blue-400",    icon: "🏗" },
  Deposited:            { label: "Deposit",               color: "text-emerald-400", icon: "⬇" },
  Pinged:               { label: "Owner Pinged",          color: "text-orange-400",  icon: "🏓" },
  Claimed:              { label: "Inheritance Claimed",   color: "text-purple-400",  icon: "🏆" },
  EmergencyCancelled:   { label: "Emergency Cancelled",   color: "text-red-400",     icon: "🚨" },
  BeneficiaryChanged:   { label: "Beneficiary Changed",   color: "text-yellow-400",  icon: "👤" },
  OwnershipTransferred: { label: "Ownership Transferred", color: "text-cyan-400",    icon: "🔑" },
};

interface LogEntry {
  eventName: string;
  blockNumber: bigint;
  transactionHash: string;
  args: Record<string, unknown>;
}

export default function ActivityPage() {
  const [logs, setLogs]       = useState<LogEntry[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    async function fetchLogs() {
      try {
        const client = createPublicClient({
          chain: rskTestnet,
          transport: http(),
        });

        const allLogs: LogEntry[] = [];

        for (const abi of EVENT_ABIS) {
          const results = await client.getLogs({
            address: CONTRACT_ADDRESS,
            event: abi,
            fromBlock: BigInt(0),
            toBlock: "latest",
          });

          for (const log of results) {
            allLogs.push({
              eventName: (abi as { name: string }).name,
              blockNumber: log.blockNumber ?? BigInt(0),
              transactionHash: log.transactionHash ?? "",
              args: (log.args ?? {}) as Record<string, unknown>,
            });
          }
        }

        // Sort newest first
        allLogs.sort((a, b) => Number(b.blockNumber - a.blockNumber));
        setLogs(allLogs);
      } catch (e) {
        setError("Failed to fetch events. Check your RPC connection.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Activity Log</h1>
        <p className="text-zinc-400 text-sm mt-1">All on-chain events emitted by this vault.</p>
      </div>

      {isLoading && (
        <div className="text-center py-20 text-zinc-500 animate-pulse">Fetching events…</div>
      )}

      {error && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-4 text-red-400 text-sm">{error}</div>
      )}

      {!isLoading && !error && logs.length === 0 && (
        <div className="text-center py-20 text-zinc-600">No events found for this contract.</div>
      )}

      <div className="space-y-3">
        {logs.map((log, i) => {
          const meta = EVENT_META[log.eventName] ?? { label: log.eventName, color: "text-zinc-400", icon: "•" };

          return (
            <div
              key={`${log.transactionHash}-${i}`}
              className="border border-zinc-800 bg-zinc-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start gap-4"
            >
              {/* Icon + event type */}
              <div className="flex items-center gap-3 sm:w-52 shrink-0">
                <span className="text-xl">{meta.icon}</span>
                <div>
                  <p className={`text-sm font-semibold ${meta.color}`}>{meta.label}</p>
                  <p className="text-xs text-zinc-600 font-mono">Block {log.blockNumber.toString()}</p>
                </div>
              </div>

              {/* Args */}
              <div className="flex-1 space-y-1">
                {Object.entries(log.args).map(([key, val]) => (
                  <div key={key} className="flex gap-2 text-xs">
                    <span className="text-zinc-500 capitalize w-28 shrink-0">{key}</span>
                    <span className="text-zinc-300 font-mono break-all">{formatArg(key, val)}</span>
                  </div>
                ))}
              </div>

              {/* Explorer link */}
              {log.transactionHash && (
                <a
                  href={`${rskTestnet.blockExplorers.default.url}/tx/${log.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-500 hover:text-orange-400 font-mono shrink-0 self-start transition-colors"
                >
                  View ↗
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatArg(key: string, val: unknown): string {
  if (val === undefined || val === null) return "—";
  if (typeof val === "bigint") {
    if (/amount|balance|deposit/i.test(key)) return `${formatRBTC(val)} rBTC`;
    if (val > BigInt(1_000_000_000) && val < BigInt(9_999_999_999)) return tsToDate(Number(val));
    return val.toString();
  }
  if (typeof val === "string" && val.startsWith("0x") && val.length === 42) {
    return truncateAddress(val);
  }
  return String(val);
}