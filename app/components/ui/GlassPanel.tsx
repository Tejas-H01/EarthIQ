import type { ElementType, HTMLAttributes } from "react";

interface GlassPanelProps extends HTMLAttributes<HTMLElement> {
  /** Use a deeper blur and stronger border */
  elevated?: boolean;
  /** Render as a different HTML element (e.g. "article", "section", "aside") */
  as?: ElementType;
}

/**
 * GlassPanel — the primary surface primitive.
 * Renders a glassmorphism card using the design system tokens.
 */
export function GlassPanel({
  elevated = false,
  as: Component = "div",
  className = "",
  children,
  ...props
}: GlassPanelProps) {
  const baseClass = elevated ? "glass-elevated" : "glass-panel";
  return (
    <Component className={`${baseClass} ${className}`} {...props}>
      {children}
    </Component>
  );
}
