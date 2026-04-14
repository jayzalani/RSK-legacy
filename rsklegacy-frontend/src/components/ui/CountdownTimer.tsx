// PATH: rsklegacy-frontend/src/components/ui/CountdownTimer.tsx

"use client";
import { useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/utils";

interface Props {
  secondsLeft: number;
}

/**
 * FIX (Issue #8): Stale closure bug.
 *
 * OLD behaviour: useEffect depended on `secondsLeft` state, so the interval
 * was torn down and re-created every single second. This caused:
 *   - A one-second flicker on every tick (clearInterval + new setInterval)
 *   - Potential drift when the JS event loop was busy
 *
 * NEW behaviour:
 *   1. When the `secondsLeft` prop changes (from a fresh contract read), we
 *      compute a stable `deadlineTs = Date.now() + secondsLeft * 1000` and
 *      store it in a ref. The ref never triggers a re-render.
 *   2. A single interval runs every 1 s. It reads the ref and computes the
 *      remaining seconds from the real clock — no closure over state.
 *   3. The interval is only created/destroyed when the prop changes, not on
 *      every tick.
 */
export default function CountdownTimer({ secondsLeft }: Props) {
  // Stable deadline derived from the prop (real clock ms).
  const deadlineRef = useRef<number>(Date.now() + secondsLeft * 1000);

  // Local display state — updated by the interval, not by the effect itself.
  const [secs, setSecs] = useState<number>(secondsLeft);

  useEffect(() => {
    // Recalibrate the deadline whenever the parent sends a fresh value.
    deadlineRef.current = Date.now() + secondsLeft * 1000;
    setSecs(secondsLeft);

    if (secondsLeft <= 0) return;

    const id = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.round((deadlineRef.current - Date.now()) / 1000)
      );
      setSecs(remaining);
      if (remaining <= 0) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
    // Only re-run when the prop changes — NOT on every `secs` tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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