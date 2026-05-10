import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Button({ className, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' }) {
  const variants = {
    primary: 'bg-amber-600 text-white hover:bg-amber-700',
    secondary: 'bg-slate-800 text-white hover:bg-slate-900',
    outline: 'border-2 border-amber-600 text-amber-600 hover:bg-amber-50',
  };

  return (
    <button
      className={cn(
        'px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string, error?: string }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
      <input
        className={cn(
          'px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all',
          error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
