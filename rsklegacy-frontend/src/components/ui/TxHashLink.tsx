"use client";
import { useState } from "react";
import { rskTestnet } from "@/lib/wagmi";

interface Props {
  hash: string;
}

/**
 * FIX (Issue #14): Transaction hashes are now copyable and link to the
 * block explorer. Previously they were displayed as truncated, unclickable text.
 */
export default function TxHashLink({ hash }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const short = `${hash.slice(0, 10)}…${hash.slice(-6)}`;
  const explorerUrl = `${rskTestnet.blockExplorers.default.url}/tx/${hash}`;

  return (
    <div className="flex items-center justify-center gap-2 text-xs font-mono text-zinc-500">
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View transaction ${hash} on explorer`}
        className="hover:text-orange-400 transition-colors underline underline-offset-2"
      >
        {short}
      </a>
      <button
        onClick={handleCopy}
        aria-label="Copy transaction hash"
        className="hover:text-zinc-200 transition-colors"
      >
        {copied ? "✓" : "⎘"}
      </button>
    </div>
  );
}