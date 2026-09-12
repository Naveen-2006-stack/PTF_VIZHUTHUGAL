import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'gold' | 'neutral' | 'navy';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-semibold',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  const variantStyles = {
    success: 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]',
    warning: 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]',
    error: 'bg-[#FFF1F2] text-[#9F1239] border border-[#FECDD3]',
    gold: 'bg-[#FEF9C3] text-[#854D0E] border border-[#FDE047]',
    navy: 'bg-[#0A192F] text-white border border-[#0A192F]',
    neutral: 'bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0]',
  };

  const dotColors = {
    success: 'bg-[#10B981]',
    warning: 'bg-[#F59E0B]',
    error: 'bg-[#E11D48]',
    gold: 'bg-[#D4AF37]',
    navy: 'bg-[#D4AF37]',
    neutral: 'bg-[#94A3B8]',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
