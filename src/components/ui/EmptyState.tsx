import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-white border border-[#E2E8F0] rounded-xl ${className}`}>
      <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full text-[#64748B] mb-3.5">
        {icon || <Inbox className="w-8 h-8 text-[#94A3B8]" />}
      </div>
      <h4 className="text-base font-bold text-[#0A192F] mb-1">{title}</h4>
      <p className="text-xs text-[#64748B] max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
