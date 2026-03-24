// PATH: rsklegacy-frontend/src/components/ui/StatCard.tsx

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

export default function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-5 bg-zinc-900 ${accent ? "border-orange-500/40" : "border-zinc-800"}`}>
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono truncate ${accent ? "text-orange-400" : "text-white"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}