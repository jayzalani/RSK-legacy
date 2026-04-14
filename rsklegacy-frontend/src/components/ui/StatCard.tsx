// PATH: rsklegacy-frontend/src/components/ui/StatCard.tsx

/**
 * FIX (Issue #14): Added a `loading` prop that renders an animated skeleton
 * placeholder instead of blank/undefined values while vault data is fetching.
 * Pass `loading={true}` from the dashboard while `isLoading` is true.
 */

interface StatCardProps {
  label: string;
  value?: string;
  sub?: string;
  accent?: boolean;
  loading?: boolean;
}

export default function StatCard({ label, value, sub, accent, loading }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-5 bg-zinc-900 ${accent ? "border-orange-500/40" : "border-zinc-800"}`}>
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      {loading ? (
        // Loading skeleton
        <div className="space-y-2 animate-pulse">
          <div className="h-7 bg-zinc-700 rounded w-3/4" aria-hidden="true" />
          {sub !== undefined && <div className="h-3 bg-zinc-800 rounded w-1/2" aria-hidden="true" />}
        </div>
      ) : (
        <>
          <p className={`text-2xl font-bold font-mono truncate ${accent ? "text-orange-400" : "text-white"}`}>
            {value ?? "—"}
          </p>
          {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
        </>
      )}
    </div>
  );
}