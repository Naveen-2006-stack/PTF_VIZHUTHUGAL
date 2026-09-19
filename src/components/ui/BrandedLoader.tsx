import React from 'react';

interface BrandedLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
}

export const BrandedLoader: React.FC<BrandedLoaderProps> = ({ 
  size = 'md', 
  text, 
  fullScreen = false 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const loaderContent = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Outer spinning ring */}
        <div className="absolute inset-0 border-4 border-[#E2E8F0] rounded-full border-t-[#D4AF37] animate-spin"></div>
        {/* Inner static logo */}
        <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center p-1 shadow-inner">
          <img 
            src="/logos/icon.avif" 
            alt="Loading..." 
            className="w-full h-full object-contain animate-pulse"
          />
        </div>
      </div>
      {text && (
        <span className="text-sm font-bold text-[#0A192F] tracking-wide animate-pulse">
          {text}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {loaderContent}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full h-full min-h-[120px]">
      {loaderContent}
    </div>
  );
};
