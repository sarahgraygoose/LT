import React from 'react';
import { Plus, RefreshCw, WifiOff, AlertCircle, Share2, Globe } from 'lucide-react';
import { useGovernance } from '../../context/GovernanceContext';

export type NavTab = 'agendas' | 'distribution' | 'contractors';

interface HeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAddModal: () => void;
  onOpenSyncModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddModal,
  onOpenSyncModal,
}) => {
  const { syncStatus, lastSyncedTimestamp, currentUserEmail } = useGovernance();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#4b286d] text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
              PS
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onSelectTab('agendas');
              }}
              className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-[#4b286d] transition-colors"
            >
              Products & Services LT Governance
            </a>
          </div>

          {/* Zone 2: 3 concise single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <button
              type="button"
              onClick={() => onSelectTab('agendas')}
              className={`whitespace-nowrap shrink-0 transition-colors pb-1 border-b-2 text-sm cursor-pointer ${
                currentTab === 'agendas'
                  ? 'border-[#4b286d] text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              LT Agendas (Active)
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('distribution')}
              className={`whitespace-nowrap shrink-0 transition-colors pb-1 border-b-2 text-sm cursor-pointer ${
                currentTab === 'distribution'
                  ? 'border-[#4b286d] text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Distribution Lists & Rules
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('contractors')}
              className={`whitespace-nowrap shrink-0 transition-colors pb-1 border-b-2 text-sm cursor-pointer ${
                currentTab === 'contractors'
                  ? 'border-[#4b286d] text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Master Contractor List
            </button>
          </nav>

          {/* Zone 3: Sync Status + User Info + Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Live Sync Status indicator (clickable to open sync modal) */}
            <button
              type="button"
              onClick={onOpenSyncModal}
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer hover:shadow-2xs ${
                syncStatus === 'saving'
                  ? 'bg-purple-50 border-purple-200 text-purple-800'
                  : syncStatus === 'offline'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : syncStatus === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Click to open Gizmos Deployment & Team Synchronization Hub"
            >
              {syncStatus === 'saving' && (
                <>
                  <RefreshCw className="w-3 h-3 text-[#4b286d] animate-spin" />
                  <span className="font-semibold text-[#4b286d]">Saving…</span>
                </>
              )}
              {syncStatus === 'synced' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-2xs" />
                  <span>Synced</span>
                </>
              )}
              {syncStatus === 'offline' && (
                <>
                  <WifiOff className="w-3 h-3 text-amber-600" />
                  <span className="font-semibold text-amber-700">Offline</span>
                </>
              )}
              {syncStatus === 'error' && (
                <>
                  <AlertCircle className="w-3 h-3 text-red-600 animate-pulse" />
                  <span className="font-semibold text-red-700">Not saved – retrying</span>
                </>
              )}
            </button>

            {/* Team Sync & Share Button */}
            <button
              type="button"
              onClick={onOpenSyncModal}
              className="px-2.5 py-1.5 text-xs font-bold text-[#4b286d] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Share live link with team or view Gizmos deployment guide"
            >
              <Share2 className="w-3.5 h-3.5 text-[#4b286d]" />
              <span className="hidden sm:inline">Share & Sync</span>
            </button>

            {/* Current User Badge */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 border-l border-slate-200 pl-2.5">
              <span className="truncate max-w-[150px] font-medium text-slate-600" title={currentUserEmail}>
                {currentUserEmail}
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenAddModal}
              className="px-3.5 py-2 text-xs font-medium text-white bg-[#4b286d] rounded-lg hover:bg-[#3b1f56] transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{currentTab === 'contractors' ? 'Add Personnel' : 'New Agenda Item'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-4 border-t border-slate-100 text-xs">
          <button
            type="button"
            onClick={() => onSelectTab('agendas')}
            className={`whitespace-nowrap px-2 py-1 ${
              currentTab === 'agendas' ? 'text-[#4b286d] font-semibold' : 'text-slate-500'
            }`}
          >
            LT Agendas
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('distribution')}
            className={`whitespace-nowrap px-2 py-1 ${
              currentTab === 'distribution' ? 'text-[#4b286d] font-semibold' : 'text-slate-500'
            }`}
          >
            Distribution Rules
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('contractors')}
            className={`whitespace-nowrap px-2 py-1 ${
              currentTab === 'contractors' ? 'text-[#4b286d] font-semibold' : 'text-slate-500'
            }`}
          >
            Master Contractors
          </button>
        </div>
      </div>
    </header>
  );
};
