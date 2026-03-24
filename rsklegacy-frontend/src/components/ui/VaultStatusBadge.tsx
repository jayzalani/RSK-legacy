// PATH: rsklegacy-frontend/src/components/ui/VaultStatusBadge.tsx

interface Props {
  active: boolean;
  paused: boolean;
  deadlinePassed: boolean;
}

export default function VaultStatusBadge({ active, paused, deadlinePassed }: Props) {
  if (!active)         return <Badge color="red"    label="Inactive"  />;
  if (deadlinePassed)  return <Badge color="yellow" label="Claimable" />;
  if (paused)          return <Badge color="blue"   label="Paused"    />;
  return                      <Badge color="green"  label="Active"    />;
}

function Badge({ color, label }: { color: string; label: string }) {
  const colors: Record<string, string> = {
    red:    "bg-red-500/10    text-red-400    border-red-500/30",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    blue:   "bg-blue-500/10   text-blue-400   border-blue-500/30",
    green:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${colors[color]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}