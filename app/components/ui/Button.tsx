import { forwardRef } from "react";

type ButtonVariant = "primary" | "ghost" | "secondary";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  secondary: "secondary-button",
};

const sizeStyle: Record<ButtonSize, React.CSSProperties> = {
  sm: { minHeight: "36px", padding: "0 16px", fontSize: "0.8125rem" },
  md: {},
  lg: { minHeight: "52px", padding: "0 32px", fontSize: "1rem" },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", className = "", style, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={`${variantClass[variant]} ${className}`}
        style={{ ...sizeStyle[size], ...style }}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
