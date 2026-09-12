import React from 'react';

interface SrmApLogoProps {
  className?: string;
  height?: number;
}

/**
 * Official SRM University AP Logo
 * Used specifically for AP institutional designations, AP official/printable documents,
 * or campus-specific institutional references.
 *
 * CRITICAL BRANDING RULE:
 * This does NOT replace the common SRMIST branding (/logos/srm.png) which remains
 * visible for ALL students across the portal.
 */
export const SrmApLogo: React.FC<SrmApLogoProps> = ({ className = '', height = 36 }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/logos/srm-university-ap.png"
        alt="SRM University AP"
        style={{ height: `${height}px`, width: 'auto' }}
        className="object-contain max-w-full"
      />
    </div>
  );
};
