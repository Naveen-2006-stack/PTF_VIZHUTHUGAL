'use client';

import React from 'react';

export interface InstitutionalLogosProps {
  variant?: 'horizontal' | 'compact' | 'banner';
  height?: number;
  className?: string;
  containerClassName?: string;
}

/**
 * Reusable Global Institutional Branding Component
 *
 * Renders all THREE official partner logos in authoritative order:
 * 1. Puthiya Thalaimurai Foundation / Vizhuthugal Logo (/logos/ptf-vizhuthugal.png)
 * 2. SRM Institute of Science & Technology (SRMIST) Logo (/logos/srmist.png)
 * 3. SRM University AP Logo (/logos/srm-university-ap.png)
 *
 * CRITICAL RULE:
 * ALWAYS renders ALL THREE logos unconditionally for EVERY user role and campus.
 * NO conditional rendering based on campus, role, or student parameters.
 */
export const InstitutionalLogos: React.FC<InstitutionalLogosProps> = ({
  variant = 'horizontal',
  height = 26,
  className = '',
  containerClassName = '',
}) => {
  const boxBaseStyle = 'bg-white px-2 py-1 rounded-md border border-[#CBD5E1]/80 shadow-2xs flex items-center justify-center';

  if (variant === 'banner') {
    // For dark headers or presentation banners (e.g. Abdul Kalam attendance, PDF slips, page banners)
    return (
      <div className={`flex flex-wrap items-center gap-2 sm:gap-2.5 ${className}`}>
        <div className={boxBaseStyle}>
          <img
            src="/logos/ptf-vizhuthugal.png"
            alt="Puthiya Thalaimurai Foundation - Vizhuthugal"
            style={{ height: `${height}px`, width: 'auto' }}
            className="object-contain max-w-full"
          />
        </div>
        <div className={boxBaseStyle}>
          <img
            src="/logos/srmist.png"
            alt="SRM Institute of Science & Technology (SRMIST)"
            style={{ height: `${height}px`, width: 'auto' }}
            className="object-contain max-w-full"
          />
        </div>
        <div className={boxBaseStyle}>
          <img
            src="/logos/srm-university-ap.png"
            alt="SRM University AP"
            style={{ height: `${height}px`, width: 'auto' }}
            className="object-contain max-w-full"
          />
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    // Tighter spacing for responsive navigation or table headers
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <div className="bg-white px-1.5 py-0.5 rounded border border-[#CBD5E1]/70 flex items-center justify-center">
          <img
            src="/logos/ptf-vizhuthugal.png"
            alt="Puthiya Thalaimurai Foundation - Vizhuthugal"
            style={{ height: `${height}px`, width: 'auto' }}
            className="object-contain max-w-full"
          />
        </div>
        <div className="bg-white px-1.5 py-0.5 rounded border border-[#CBD5E1]/70 flex items-center justify-center">
          <img
            src="/logos/srmist.png"
            alt="SRM Institute of Science & Technology (SRMIST)"
            style={{ height: `${height}px`, width: 'auto' }}
            className="object-contain max-w-full"
          />
        </div>
        <div className="bg-white px-1.5 py-0.5 rounded border border-[#CBD5E1]/70 flex items-center justify-center">
          <img
            src="/logos/srm-university-ap.png"
            alt="SRM University AP"
            style={{ height: `${height}px`, width: 'auto' }}
            className="object-contain max-w-full"
          />
        </div>
      </div>
    );
  }

  // Standard horizontal variant: [ PTF VIZHUTHUGAL ] [ SRMIST ] [ SRM UNIVERSITY AP ]
  return (
    <div className={`flex flex-wrap items-center gap-2 sm:gap-3 ${className}`}>
      <div className={`${boxBaseStyle} ${containerClassName}`}>
        <img
          src="/logos/ptf-vizhuthugal.png"
          alt="Puthiya Thalaimurai Foundation - Vizhuthugal"
          style={{ height: `${height}px`, width: 'auto' }}
          className="object-contain max-w-full"
        />
      </div>
      <div className={`${boxBaseStyle} ${containerClassName}`}>
        <img
          src="/logos/srmist.png"
          alt="SRM Institute of Science & Technology (SRMIST)"
          style={{ height: `${height}px`, width: 'auto' }}
          className="object-contain max-w-full"
        />
      </div>
      <div className={`${boxBaseStyle} ${containerClassName}`}>
        <img
          src="/logos/srm-university-ap.png"
          alt="SRM University AP"
          style={{ height: `${height}px`, width: 'auto' }}
          className="object-contain max-w-full"
        />
      </div>
    </div>
  );
};
