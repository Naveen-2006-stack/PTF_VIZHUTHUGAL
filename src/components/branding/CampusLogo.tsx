import React from 'react';

interface CampusLogoProps {
  campusCode?: 'SRM_KTR' | 'SRM_BAB' | 'SRM_AP' | string;
  className?: string;
  height?: number;
  useApLogoExplicitly?: boolean;
}

export const CampusLogo: React.FC<CampusLogoProps> = ({ 
  campusCode = 'SRM_KTR', 
  className = '', 
  height = 40,
  useApLogoExplicitly = false,
}) => {
  // CRITICAL BRANDING RULE: The standard SRM logo must be visible for ALL students.
  // Do NOT make the SRM logo conditional on campus.
  // Do NOT replace the SRM logo with the SRM AP logo merely because a student belongs to SRM AP.
  // Only use srm-university-ap.png if explicitly requested (e.g. in campus admin card or AP-specific printable documents).
  const isApExplicit = useApLogoExplicitly && campusCode === 'SRM_AP';
  const logoSrc = isApExplicit ? '/logos/srm-university-ap.png' : '/logos/srm.png';
  const altText = isApExplicit ? 'SRM University AP' : 'SRM Institute of Science & Technology';

  return (
    <div className={`flex items-center ${className}`}>
      <img
        src={logoSrc}
        alt={altText}
        style={{ height: `${height}px`, width: 'auto' }}
        className="object-contain max-w-full"
      />
    </div>
  );
};
