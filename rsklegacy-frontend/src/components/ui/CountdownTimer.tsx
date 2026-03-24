// PATH: rsklegacy-frontend/src/components/ui/CountdownTimer.tsx

"use client";
import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/utils";

interface Props {
  secondsLeft: number;
}

export default function CountdownTimer({ secondsLeft }: Props) {
  const [secs, setSecs] = useState(secondsLeft);

  useEffect(() => {
    setSecs(secondsLeft);
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  if (secs <= 0) {
    return (
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-center">
        <p className="text-yellow-400 font-bold text-lg">⚠ Deadline Passed</p>
        <p className="text-zinc-400 text-sm mt-1">Beneficiary can now claim the vault.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-center">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Time Until Claimable</p>
      <p className="text-3xl font-mono font-bold text-orange-400">{formatDuration(secs)}</p>
    </div>
  );
}