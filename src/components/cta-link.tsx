import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type { ComponentProps } from 'react';

type Variant = 'primary' | 'outline' | 'ghost';
type Size = 'md' | 'lg';

type Props = Omit<ComponentProps<typeof Link>, 'className'> & {
  variant?: Variant;
  size?: Size;
  className?: string;
  withArrow?: boolean;
};

const variantClasses: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink-soft',
  outline: 'bg-transparent text-ink border border-ink hover:bg-ink hover:text-paper',
  ghost: 'bg-transparent text-ink hover:bg-paper-soft',
};

const sizeClasses: Record<Size, string> = {
  md: 'h-10 px-5 text-[14px]',
  lg: 'h-12 px-6 text-[15px]',
};

export function CTALink({
  variant = 'primary',
  size = 'md',
  className = '',
  withArrow = true,
  children,
  ...rest
}: Props) {
  return (
    <Link
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
      {withArrow && <ArrowRight className="h-4 w-4" />}
    </Link>
  );
}
