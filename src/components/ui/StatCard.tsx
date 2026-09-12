import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: 'success' | 'warning' | 'error' | 'gold' | 'neutral' | 'navy';
  icon?: React.ReactNode;
  accentColor?: string;
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  badgeText,
  badgeVariant = 'neutral',
  icon,
  accentColor = '#D4AF37',
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`institutional-card p-5 relative overflow-hidden flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:border-[#CBD5E1]' : ''
      } ${className}`}
    >
      {/* Subtle top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
          {title}
        </span>
        {icon && (
          <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#0A192F]">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-2xl lg:text-3xl font-extrabold text-[#0A192F] tracking-tight">
          {value}
        </span>
        {badgeText && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
            badgeVariant === 'success' ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]' :
            badgeVariant === 'gold' ? 'bg-[#FEF9C3] text-[#854D0E] border-[#FDE047]' :
            badgeVariant === 'warning' ? 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]' :
            badgeVariant === 'error' ? 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3]' :
            'bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]'
          }`}>
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-[#64748B] mt-1 font-medium line-clamp-1">
          {subtitle}
        </p>
      )}
    </div>
  );
};
