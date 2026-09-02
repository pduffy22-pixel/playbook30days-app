import { cn } from "@/lib/utils";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "quiet" | "danger" }) {
  const styles = {
    primary: "bg-foreground text-primary-fg hover:opacity-90 disabled:opacity-40",
    ghost:
      "bg-transparent text-foreground shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]",
    quiet: "bg-surface-2 text-foreground hover:bg-surface-2/80",
    danger: "bg-accent text-foreground hover:bg-accent/90",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-4 text-sm font-medium transition-opacity duration-150 active:scale-[0.98]",
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase", className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("field", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("field", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("field", className)} {...props} />;
}

export function Field({
  label,
  hint,
  children,
  className,
  required,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-accent"> *</span> : null}
      </Label>
      {children}
      {hint ? <p className="mt-1 text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

export function Chip({
  on,
  children,
  onClick,
}: {
  on?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-sm px-3 text-sm transition-colors duration-150",
        on ? "bg-foreground text-primary-fg" : "bg-surface-2 text-muted shadow-[var(--shadow-border)]",
      )}
    >
      {children}
    </button>
  );
}

export function Badge({
  tone = "muted",
  children,
}: {
  tone?: "keep" | "add" | "opt" | "muted" | "field" | "accent";
  children: ReactNode;
}) {
  const map = {
    keep: "text-keep",
    add: "text-add",
    opt: "text-sport",
    muted: "text-muted",
    field: "text-sport",
    accent: "text-accent",
  };
  return (
    <span className={cn("font-display text-xs font-semibold tracking-[0.14em] uppercase", map[tone])}>
      {children}
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]", className)}>{children}</div>
  );
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium tracking-wide text-muted uppercase">{label}</div>
      <div className="font-display mt-1 text-3xl font-semibold leading-none tabular-nums">{value}</div>
      {sub ? <div className="mt-1 text-sm text-muted">{sub}</div> : null}
    </div>
  );
}
