'use client';

import { useEffect, type ReactNode } from 'react';
import { Minus, Plus, X } from 'lucide-react';

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ─────────────────────────────────────────────────────────────
// Bottom Sheet / Drawer
// ─────────────────────────────────────────────────────────────

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  tone = 'default',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  tone?: 'default' | 'emerald' | 'amber';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const headerTone =
    tone === 'emerald'
      ? 'bg-emerald-600 text-white'
      : tone === 'amber'
        ? 'bg-amber-400 text-amber-950'
        : 'bg-white text-slate-900';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        aria-label="Chiudi"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md max-h-[92dvh] flex flex-col rounded-t-3xl bg-slate-50 shadow-2xl animate-slide-up overflow-hidden">
        <div className={cn('px-5 pt-3 pb-4 shrink-0', headerTone)}>
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-current opacity-25" />
          <div className="flex items-start gap-3">
            {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold leading-tight">{title}</h2>
              {subtitle && <p className="mt-1 text-sm opacity-85 leading-snug">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 -mr-1 grid h-10 w-10 place-items-center rounded-full bg-black/10 active:scale-95 transition"
              aria-label="Chiudi"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bottoni
// ─────────────────────────────────────────────────────────────

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'amber' | 'dark' | 'outline' | 'whatsapp';

const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary: 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/20 hover:bg-emerald-700',
  secondary: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 ring-1 ring-emerald-200',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  amber: 'bg-amber-500 text-amber-950 hover:bg-amber-400 shadow-sm shadow-amber-900/20',
  dark: 'bg-emerald-950 text-white hover:bg-emerald-900',
  outline: 'bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50',
  whatsapp: 'bg-[#25D366] text-emerald-950 hover:brightness-95',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizes = {
    sm: 'min-h-10 px-3 text-sm rounded-xl gap-1.5',
    md: 'min-h-12 px-4 text-base rounded-2xl gap-2',
    lg: 'min-h-14 px-5 text-lg rounded-2xl gap-2',
    xl: 'min-h-20 px-6 text-xl rounded-3xl gap-3',
  };
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center font-bold transition active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none select-none',
        BTN_VARIANTS[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  variant = 'outline',
  className,
  href,
  size = 'md',
}: {
  children: ReactNode;
  variant?: BtnVariant;
  className?: string;
  href: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: 'min-h-10 px-3 text-sm rounded-xl gap-1.5',
    md: 'min-h-12 px-4 text-base rounded-2xl gap-2',
    lg: 'min-h-14 px-5 text-lg rounded-2xl gap-2',
  };
  const external = href.startsWith('http');
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={cn(
        'inline-flex items-center justify-center font-bold transition active:scale-[0.97] select-none',
        BTN_VARIANTS[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </a>
  );
}

// ─────────────────────────────────────────────────────────────
// Stepper − / +
// ─────────────────────────────────────────────────────────────

export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 99,
  format = (v) => String(v),
  quick,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
  quick?: number[];
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  return (
    <div>
      <div className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => set(value - step)}
          disabled={value <= min}
          className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-slate-200 text-slate-900 active:scale-95 transition disabled:opacity-40"
          aria-label={`Diminuisci ${label}`}
        >
          <Minus className="h-8 w-8" strokeWidth={3} />
        </button>
        <div className="flex-1 grid place-items-center rounded-2xl bg-white ring-2 ring-slate-200">
          <span key={value} className="text-4xl font-black tabular-nums text-slate-900 animate-pop">
            {format(value)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => set(value + step)}
          disabled={value >= max}
          className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white active:scale-95 transition disabled:opacity-40"
          aria-label={`Aumenta ${label}`}
        >
          <Plus className="h-8 w-8" strokeWidth={3} />
        </button>
      </div>
      {quick && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {quick.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => set(q)}
              className={cn(
                'min-h-10 min-w-12 shrink-0 rounded-xl px-3 text-sm font-bold transition active:scale-95',
                q === value ? 'bg-emerald-950 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200',
              )}
            >
              {format(q)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Toggle switch grande
// ─────────────────────────────────────────────────────────────

export function Toggle({
  checked,
  onChange,
  label,
  description,
  icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full min-h-14 items-center gap-3 text-left"
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="flex-1 min-w-0">
        <span className="block text-base font-bold text-slate-900">{label}</span>
        {description && <span className="block text-sm text-slate-500">{description}</span>}
      </span>
      <span
        className={cn(
          'relative h-9 w-16 shrink-0 rounded-full transition-colors',
          checked ? 'bg-emerald-600' : 'bg-slate-300',
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all',
            checked ? 'left-8' : 'left-1',
          )}
        />
        <span className="sr-only">{checked ? 'Sì' : 'No'}</span>
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Varie
// ─────────────────────────────────────────────────────────────

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80', className)}>{children}</div>;
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 mt-6 flex items-center justify-between gap-2', className)}>
      <h2 className="text-lg font-extrabold text-emerald-950">{children}</h2>
      {action}
    </div>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold leading-none', className)}>
      {children}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  dark,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  dark?: boolean;
}) {
  return (
    <div className={cn('flex gap-1 rounded-2xl p-1', dark ? 'bg-emerald-900/60' : 'bg-slate-200/70')}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 min-h-11 rounded-xl px-2 text-sm font-bold transition',
            value === o.value
              ? dark
                ? 'bg-white text-emerald-950 shadow'
                : 'bg-white text-emerald-900 shadow'
              : dark
                ? 'text-emerald-100'
                : 'text-slate-600',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full min-h-12 rounded-2xl bg-white px-4 text-base font-semibold text-slate-900 ring-2 ring-slate-200 outline-none focus:ring-emerald-500 placeholder:text-slate-400 placeholder:font-normal';

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text?: string }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-300 px-6 py-8 text-center">
      <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500">{icon}</div>
      <div className="font-bold text-slate-700">{title}</div>
      {text && <div className="mt-1 text-sm text-slate-500">{text}</div>}
    </div>
  );
}
