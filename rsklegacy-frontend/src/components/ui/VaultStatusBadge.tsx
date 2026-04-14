// PATH: rsklegacy-frontend/src/components/ui/VaultStatusBadge.tsx

/**
 * FIX (Issue #14 / Issue #9): Status badges previously used color alone to
 * convey meaning (green dot = active, red dot = inactive, etc.).
 * This fails WCAG 1.4.1 (Use of Color).
 *
 * Fix: Each badge now shows a text label AND a color dot. The dot is
 * aria-hidden since the text already conveys the meaning to screen readers.
 */

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
    <span
      role="status"
      aria-label={`Vault status: ${label}`}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${colors[color]}`}
    >
      {/* aria-hidden: color dot is decorative; the text label conveys the meaning */}
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}