import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useGovernance } from '../../context/GovernanceContext';

export const SyncIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { lastUpdatedDate, contractors } = useGovernance();

  return (
    <div className={`flex items-center gap-2 text-xs text-slate-500 tabular-nums ${className}`}>
      <span className="inline-flex items-center gap-1 text-[#4b286d] font-semibold">
        <CheckCircle2 className="w-3.5 h-3.5 text-[#4b286d]" />
        Synced
      </span>
      <span aria-hidden="true" className="text-slate-300">·</span>
      <span>Living Document: {lastUpdatedDate}</span>
      <span aria-hidden="true" className="text-slate-300">·</span>
      <span>{contractors.length} Records</span>
    </div>
  );
};
