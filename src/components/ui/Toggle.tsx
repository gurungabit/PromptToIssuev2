import React from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: React.ReactNode;
  className?: string;
  size?: 'default' | 'sm' | 'lg';
  variant?: 'default' | 'outline';
}

const Toggle: React.FC<ToggleProps> = ({
  pressed,
  onPressedChange,
  children,
  className,
  size = 'default',
  variant = 'default',
}) => {
  const baseStyles =
    'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background';

  const variants = {
    default: pressed ? 'bg-accent text-accent-foreground' : 'bg-transparent',
    outline: pressed
      ? 'bg-accent text-accent-foreground border-accent'
      : 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
  };

  const sizes = {
    default: 'h-10 px-3',
    sm: 'h-9 px-2.5',
    lg: 'h-11 px-5',
  };

  return (
    <button
      type="button"
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      onClick={() => onPressedChange(!pressed)}
      aria-pressed={pressed}
    >
      {children}
    </button>
  );
};

export { Toggle };
