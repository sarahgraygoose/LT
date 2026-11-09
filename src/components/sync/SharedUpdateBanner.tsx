import React from 'react';
import { useGovernance } from '../../context/GovernanceContext';
import { Share2, Check, X, Calendar, Users, AlertCircle } from 'lucide-react';

export const SharedUpdateBanner: React.FC = () => {
  const { pendingSharedUpdate, applySharedUpdate, dismissSharedUpdate } = useGovernance();

  if (!pendingSharedUpdate) return null;

  const exportDate = pendingSharedUpdate.exportedAt
    ? new Date(pendingSharedUpdate.exportedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent';

  return (
    <div className="bg-[#4b286d] text-white border-b border-purple-900 shadow-md animate-fadeIn">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start md:items-center gap-3">
          <div className="p-1.5 bg-white/10 rounded-lg shrink-0 mt-0.5 md:mt-0">
            <Share2 className="w-4 h-4 text-purple-200" />
          </div>
          <div>
            <div className="font-bold text-sm text-white flex items-center gap-2 flex-wrap">
              <span>Shared Schedule Update Received</span>
              <span className="bg-purple-800 text-purple-200 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                From {pendingSharedUpdate.sender || 'Sarah Gray'}
              </span>
            </div>
            <p className="text-purple-200 mt-0.5 text-[11px] flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-purple-300" />
                {pendingSharedUpdate.meetings?.length || 26} Monday Sessions (Dated {exportDate})
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-purple-300" />
                {pendingSharedUpdate.contractors?.length || 0} Contractor Records
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <button
            type="button"
            onClick={dismissSharedUpdate}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-md font-medium text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Keep My Current View</span>
          </button>
          <button
            type="button"
            onClick={applySharedUpdate}
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Updates to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
