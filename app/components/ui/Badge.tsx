type BadgeVariant = "signal" | "neutral" | "amber" | "rose";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClass: Record<BadgeVariant, string> = {
  signal: "badge badge-signal",
  neutral: "badge badge-neutral",
  amber: "badge badge-amber",
  rose: "badge badge-rose",
};

/**
 * Badge — small pill label for status, category, or response type.
 */
export function Badge({ variant = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span className={`${variantClass[variant]} ${className}`}>{children}</span>
  );
}

/**
 * SignalDot — a pulsing green indicator for live/active states.
 */
export function SignalDot({ className = "" }: { className?: string }) {
  return (
    <span
      className={`signal-dot ${className}`}
      role="presentation"
      aria-hidden="true"
    />
  );
}
