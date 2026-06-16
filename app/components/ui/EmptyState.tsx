import { SignalDot } from "./Badge";

interface EmptyStateProps {
  label: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * EmptyState — shown when a screen has no data yet.
 * Replaces the bare `<div className="glass-panel p-8 text-white/65">` pattern.
 */
export function EmptyState({ label, description, action }: EmptyStateProps) {
  return (
    <section className="py-16">
      <div className="glass-panel p-10 text-center">
        <div className="flex justify-center">
          <SignalDot />
        </div>
        <p className="mt-5 text-base font-medium text-white/70">{label}</p>
        {description && (
          <p className="mt-2 text-sm leading-6 text-white/40">{description}</p>
        )}
        {action && <div className="mt-6">{action}</div>}
      </div>
    </section>
  );
}
