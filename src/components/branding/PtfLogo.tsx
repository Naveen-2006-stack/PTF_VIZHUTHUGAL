import React from 'react';

interface PtfLogoProps {
  className?: string;
  variant?: 'full' | 'badge' | 'light';
  height?: number;
}

export const PtfLogo: React.FC<PtfLogoProps> = ({ className = '', height = 48 }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/logos/ptf-vizhuthugal.png"
        alt="Puthiya Thalaimurai Foundation - Vizhuthugal"
        style={{ height: `${height}px`, width: 'auto' }}
        className="object-contain max-w-full"
      />
    </div>
  );
};
