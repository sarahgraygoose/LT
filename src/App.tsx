/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GovernanceProvider, useGovernance } from './context/GovernanceContext';
import { Header, NavTab } from './components/layout/Header';
import { AgendaPlannerView } from './components/agendas/AgendaPlannerView';
import { AddAgendaItemModal } from './components/agendas/AddAgendaItemModal';
import { DistributionRulesView } from './components/distribution/DistributionRulesView';
import { MasterContractorSheet } from './components/contractors/MasterContractorSheet';
import { ContractorModal } from './components/contractors/ContractorModal';
import { SyncIndicator } from './components/common/SyncIndicator';
import { SharedUpdateBanner } from './components/sync/SharedUpdateBanner';
import { TeamSyncModal } from './components/sync/TeamSyncModal';

const DashboardContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('agendas');
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAddContractorModalOpen, setIsAddContractorModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const { addContractor } = useGovernance();

  const handleOpenPrimaryAdd = () => {
    if (currentTab === 'contractors') {
      setIsAddContractorModalOpen(true);
    } else {
      setIsAddItemModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      {/* Top Banner when a colleague opened a direct share sync link */}
      <SharedUpdateBanner />

      {/* Top Bar strictly complying with Universal Frontend Design Constitution */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenAddModal={handleOpenPrimaryAdd}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'agendas' && (
          <AgendaPlannerView onOpenAddItemModal={() => setIsAddItemModalOpen(true)} />
        )}

        {currentTab === 'distribution' && <DistributionRulesView />}

        {currentTab === 'contractors' && <MasterContractorSheet />}
      </main>

      {/* Modals */}
      <AddAgendaItemModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
      />

      <ContractorModal
        isOpen={isAddContractorModalOpen}
        onClose={() => setIsAddContractorModalOpen(false)}
        onSave={(data) => addContractor(data)}
      />

      <TeamSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      {/* Executive Clean Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700">
              TELUS Products & Services Leadership Team
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Governance Operations Hub 2026</span>
          </div>

          <SyncIndicator />

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>Authenticated session: sarah.gray@telus.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <GovernanceProvider>
      <DashboardContent />
    </GovernanceProvider>
  );
}
