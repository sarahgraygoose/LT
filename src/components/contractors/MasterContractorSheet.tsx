import React, { useState, useMemo } from 'react';
import { useGovernance } from '../../context/GovernanceContext';
import { Contractor, PersonnelType } from '../../types/governance';
import { ContractorModal } from './ContractorModal';
import { CopyButton } from '../common/CopyButton';
import {
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  History,
  Globe,
  Users,
  ShieldCheck,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const MasterContractorSheet: React.FC = () => {
  const {
    contractors,
    addContractor,
    updateContractor,
    deleteContractor,
    bulkToggleFlag,
    lastUpdatedDate,
    resetToDefaults,
    syncStatus,
    lastSyncedTimestamp,
    currentUserEmail,
    auditLog,
    refreshContractors,
  } = useGovernance();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVp, setSelectedVp] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCallFilter, setSelectedCallFilter] = useState<string>('all');

  // Selection & Modal state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [contractorToEdit, setContractorToEdit] = useState<Contractor | null>(null);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  const showSyncToast = (msg: string) => {
    setSyncToastMessage(msg);
    setTimeout(() => {
      setSyncToastMessage(null);
    }, 2500);
  };

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    await refreshContractors(false);
    showSyncToast('Master contractor directory live synced with server');
    setIsManualSyncing(false);
  };

  // Distinct VP list from data
  const vpOptions = useMemo(() => {
    const set = new Set<string>();
    contractors.forEach((c) => {
      if (c.svpVp) set.add(c.svpVp);
    });
    return Array.from(set).sort();
  }, [contractors]);

  // Distinct Type list from data
  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    contractors.forEach((c) => {
      if (c.type) set.add(c.type);
    });
    return Array.from(set).sort();
  }, [contractors]);

  // Filtered Contractors
  const filteredContractors = useMemo(() => {
    return contractors.filter((c) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = `${c.firstName} ${c.lastName}`.toLowerCase().includes(q);
        const matchEmail = c.email.toLowerCase().includes(q);
        const matchLeader = (c.leader || '').toLowerCase().includes(q);
        const matchDirector = (c.director || '').toLowerCase().includes(q);
        const matchVp = (c.svpVp || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchLeader && !matchDirector && !matchVp) {
          return false;
        }
      }

      // VP filter
      if (selectedVp !== 'all' && c.svpVp !== selectedVp) {
        return false;
      }

      // Type filter
      if (selectedType !== 'all' && c.type !== selectedType) {
        return false;
      }

      // Call filter
      if (selectedCallFilter === 'tcs-yes' && !c.tcsAllTeamCall) return false;
      if (selectedCallFilter === 'cpo-yes' && !c.cpoAllTeamCall) return false;
      if (selectedCallFilter === 'vp-yes' && !c.vpTeamCall) return false;
      if (selectedCallFilter === 'formal-yes' && !c.formalComms) return false;

      return true;
    });
  }, [contractors, searchQuery, selectedVp, selectedType, selectedCallFilter]);

  // Toggle single cell flag
  const handleToggleCell = (
    c: Contractor,
    field: 'tcsAllTeamCall' | 'cpoAllTeamCall' | 'vpTeamCall' | 'formalComms'
  ) => {
    const nextVal = !c[field];
    updateContractor(c.id, { [field]: nextVal });
    showSyncToast(`Updated ${c.firstName || c.email} → Auto-synced to all connected distribution lists`);
  };

  // Toggle select all
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredContractors.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Bulk operations
  const handleBulkSetFlag = (
    flag: 'tcsAllTeamCall' | 'cpoAllTeamCall' | 'vpTeamCall' | 'formalComms',
    value: boolean
  ) => {
    if (selectedIds.size === 0) return;
    bulkToggleFlag(Array.from(selectedIds), flag, value);
    showSyncToast(`Updated ${selectedIds.size} records → Auto-synced across distribution lists`);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} records?`)) {
      selectedIds.forEach((id) => deleteContractor(id));
      setSelectedIds(new Set());
      showSyncToast(`Removed ${selectedIds.size} records from living document`);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'First Name',
      'Last name',
      'Email',
      'TYPE',
      'Leader',
      'Director',
      'SVP/VP',
      'TCS All Team Call',
      'LT All Team Call',
      'VP Team Call',
      'Formal Comms',
    ];

    const rows = filteredContractors.map((c) => [
      `"${c.firstName}"`,
      `"${c.lastName}"`,
      `"${c.email}"`,
      `"${c.type}"`,
      `"${c.leader || ''}"`,
      `"${c.director || ''}"`,
      `"${c.svpVp || ''}"`,
      c.tcsAllTeamCall ? 'Yes' : 'No',
      c.cpoAllTeamCall ? 'Yes' : 'No',
      c.vpTeamCall ? 'Yes' : 'No',
      c.formalComms ? 'Yes' : 'No',
    ]);

    const csvContent =
      'Please do not changer or lock filters\n' +
      `Last Update,"${lastUpdatedDate}"\n` +
      headers.join(',') +
      '\n' +
      rows.map((e) => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Products_Services_Master_Contractor_Distribution_List_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveModal = (data: Omit<Contractor, 'id'>) => {
    if (contractorToEdit) {
      updateContractor(contractorToEdit.id, data);
      showSyncToast(`Updated ${data.firstName} ${data.lastName} · Synced across lists`);
    } else {
      addContractor(data);
      showSyncToast(`Added ${data.firstName} ${data.lastName} to living document · Synced across lists`);
    }
  };

  const filteredEmailString = filteredContractors.map((c) => c.email).join('; ');

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {syncToastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <RefreshCw className="w-3.5 h-3.5 text-[#d8c8e8] animate-spin" />
          <span>{syncToastMessage}</span>
        </div>
      )}

      {/* Sheet Banner (Preserving Sheet Title & Caution Note) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">
              Products & Services - Master Contractor Distribution List - Living Document - 2026
            </span>
            <span aria-hidden="true">·</span>
            <span>Last Update: {lastUpdatedDate}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Master Contractor & Living Directory
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Real-time Central Sync Button */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isManualSyncing}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Fetch latest updates made by other team members"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#4b286d] ${isManualSyncing || syncStatus === 'saving' ? 'animate-spin' : ''}`} />
            <span>{isManualSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>

          {/* Activity / Audit History */}
          <button
            type="button"
            onClick={() => setIsAuditModalOpen(true)}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="View changelog and edits made by team members"
          >
            <History className="w-3.5 h-3.5 text-[#4b286d]" />
            <span>Activity Log ({auditLog.length})</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <CopyButton
            textToCopy={filteredEmailString}
            label={`Copy ${filteredContractors.length} Emails`}
            variant="secondary"
          />
          <button
            type="button"
            onClick={() => {
              setContractorToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-3 py-1.5 text-xs font-medium text-white bg-[#4b286d] rounded-md hover:bg-[#3b1f56] transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Personnel</span>
          </button>
        </div>
      </div>

      {/* Central Multi-User Shared Master Banner */}
      <div className="bg-[#fbf9fd] border border-[#d8c8e8] rounded-lg p-3.5 text-xs text-slate-800 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                syncStatus === 'synced' ? 'bg-emerald-400' : syncStatus === 'saving' ? 'bg-[#4b286d]' : 'bg-amber-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                syncStatus === 'synced' ? 'bg-emerald-600' : syncStatus === 'saving' ? 'bg-[#4b286d]' : 'bg-amber-600'
              }`} />
            </span>
            <span className="font-bold text-[#4b286d]">
              Central Shared Master Directory (Live Multi-User Sync)
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-[11px] text-slate-600">
              Only place tracking contractors across Products & Services
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <span>
              Active Prime: <strong className="text-slate-900">{currentUserEmail}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset living document to original master records?')) {
                  resetToDefaults();
                  showSyncToast('Reset to original master document');
                }
              }}
              className="text-[#4b286d] hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Baseline
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2 pt-1.5 border-t border-[#d8c8e8]/60 text-[11px] text-slate-600">
          <AlertCircle className="w-3.5 h-3.5 text-[#4b286d] shrink-0 mt-0.5" />
          <span>
            <strong>Collaborative Source of Truth:</strong> Any edits, new personnel, or call eligibility toggles made here are stored centrally on the server and synchronized automatically for anyone using this application.
          </span>
        </div>
      </div>

      {/* Quick Quantitative Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-slate-500 font-medium">TCS All Team Call</div>
          <div className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">
            {contractors.filter((c) => c.tcsAllTeamCall).length}
            <span className="text-xs font-normal text-slate-500 ml-1">eligible</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-slate-500 font-medium">LT All Team Call</div>
          <div className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">
            {contractors.filter((c) => c.cpoAllTeamCall).length}
            <span className="text-xs font-normal text-slate-500 ml-1">eligible</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-slate-500 font-medium">VP Team Call</div>
          <div className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">
            {contractors.filter((c) => c.vpTeamCall).length}
            <span className="text-xs font-normal text-slate-500 ml-1">eligible</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-slate-500 font-medium">Formal Comms (Rule 5)</div>
          <div className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">
            {contractors.filter((c) => c.formalComms).length}
            <span className="text-xs font-normal text-slate-500 ml-1">eligible</span>
          </div>
        </div>
      </div>

      {/* Search & Filters Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {/* Search Box */}
          <div className="sm:col-span-1 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, leader..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-md focus:outline-[#4b286d] bg-slate-50/50"
            />
          </div>

          {/* Filter by VP */}
          <div>
            <select
              value={selectedVp}
              onChange={(e) => setSelectedVp(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-[#4b286d]"
            >
              <option value="all">Filter by VP: All Portfolios</option>
              {vpOptions.map((vp) => (
                <option key={vp} value={vp}>
                  {vp}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Type */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-emerald-600"
            >
              <option value="all">Filter by Type: All Types</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Call Eligibility */}
          <div>
            <select
              value={selectedCallFilter}
              onChange={(e) => setSelectedCallFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-emerald-600"
            >
              <option value="all">All Distribution Statuses</option>
              <option value="tcs-yes">TCS All Team Call = Yes</option>
              <option value="cpo-yes">LT All Team Call = Yes</option>
              <option value="vp-yes">VP Team Call = Yes</option>
              <option value="formal-yes">Formal Comms = Yes</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar (When rows selected) */}
        {selectedIds.size > 0 && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 p-2 rounded-md">
            <span className="font-semibold text-slate-900 tabular-nums">
              {selectedIds.size} personnel selected
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleBulkSetFlag('tcsAllTeamCall', true)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-sm hover:bg-slate-100 cursor-pointer"
              >
                Set TCS All Team: Yes
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetFlag('cpoAllTeamCall', true)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-sm hover:bg-slate-100 cursor-pointer"
              >
                Set LT All Team: Yes
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetFlag('formalComms', true)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-sm hover:bg-slate-100 cursor-pointer"
              >
                Set Formal Comms: Yes
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetFlag('tcsAllTeamCall', false)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-sm hover:bg-slate-100 cursor-pointer"
              >
                Set TCS All Team: No
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-2 py-1 text-red-700 bg-red-50 border border-red-200 rounded-sm hover:bg-red-100 cursor-pointer"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Master Data Grid (Exact Sheet Columns) */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/90 text-slate-700 font-semibold sticky top-0 z-20 shadow-xs">
              <tr className="border-b border-slate-200">
                <th className="py-2.5 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredContractors.length > 0 &&
                      selectedIds.size === filteredContractors.length
                    }
                    onChange={handleSelectAll}
                    className="rounded text-emerald-800"
                  />
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">First Name</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Last Name</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Email</th>
                <th className="py-2.5 px-3 whitespace-nowrap">TYPE</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Leader</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Director</th>
                <th className="py-2.5 px-3 whitespace-nowrap">SVP/VP</th>
                <th className="py-2.5 px-2.5 text-center whitespace-nowrap">TCS All Team Call</th>
                <th className="py-2.5 px-2.5 text-center whitespace-nowrap">LT All Team Call</th>
                <th className="py-2.5 px-2.5 text-center whitespace-nowrap">VP Team Call</th>
                <th className="py-2.5 px-2.5 text-center whitespace-nowrap">Formal Comms</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContractors.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-400">
                    No personnel match your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredContractors.map((c) => {
                  const isSelected = selectedIds.has(c.id);

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        isSelected ? 'bg-[#f4eff9]' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(c.id)}
                          className="rounded text-[#4b286d] focus:ring-[#4b286d]"
                        />
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900 whitespace-nowrap">
                        {c.firstName}
                      </td>
                      <td className="py-2 px-3 text-slate-900 whitespace-nowrap">
                        {c.lastName}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {c.email}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-xs">
                          {c.type}
                        </span>
                        {c.notes && (
                          <span className="text-[10px] text-slate-400 ml-1">({c.notes})</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {c.leader || '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {c.director || '—'}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800 whitespace-nowrap">
                        {c.svpVp || '—'}
                      </td>

                      {/* TCS All Team Call Toggle */}
                      <td className="py-2 px-2 text-center align-middle whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleCell(c, 'tcsAllTeamCall')}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-sm transition-colors cursor-pointer ${
                            c.tcsAllTeamCall
                              ? 'bg-[#ede5f6] text-[#4b286d] hover:bg-[#d8c8e8]'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                          }`}
                          title="Click to toggle TCS All Team Call eligibility"
                        >
                          {c.tcsAllTeamCall ? 'Yes' : 'No'}
                        </button>
                      </td>

                      {/* LT All Team Call Toggle */}
                      <td className="py-2 px-2 text-center align-middle whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleCell(c, 'cpoAllTeamCall')}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-sm transition-colors cursor-pointer ${
                            c.cpoAllTeamCall
                              ? 'bg-[#ede5f6] text-[#4b286d] hover:bg-[#d8c8e8]'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                          }`}
                          title="Click to toggle LT All Team Call eligibility"
                        >
                          {c.cpoAllTeamCall ? 'Yes' : 'No'}
                        </button>
                      </td>

                      {/* VP Team Call Toggle */}
                      <td className="py-2 px-2 text-center align-middle whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleCell(c, 'vpTeamCall')}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-sm transition-colors cursor-pointer ${
                            c.vpTeamCall
                              ? 'bg-[#ede5f6] text-[#4b286d] hover:bg-[#d8c8e8]'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                          }`}
                          title="Click to toggle VP Team Call eligibility"
                        >
                          {c.vpTeamCall ? 'Yes' : 'No'}
                        </button>
                      </td>

                      {/* Formal Comms Toggle */}
                      <td className="py-2 px-2 text-center align-middle whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleCell(c, 'formalComms')}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-sm transition-colors cursor-pointer ${
                            c.formalComms
                              ? 'bg-[#ede5f6] text-[#4b286d] hover:bg-[#d8c8e8]'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                          }`}
                          title="Click to toggle Formal Comms eligibility"
                        >
                          {c.formalComms ? 'Yes' : 'No'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-right align-middle whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => {
                              setContractorToEdit(c);
                              setIsModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete ${c.firstName} ${c.lastName}?`)) {
                                deleteContractor(c.id);
                                showSyncToast(`Removed ${c.firstName || c.email}`);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-700 transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-900 font-semibold">{filteredContractors.length}</strong> of{' '}
            {contractors.length} living records
          </span>
          <span className="text-[11px]">
            Tip: Click any <strong>Yes/No</strong> button to instantly toggle and sync across governance lists
          </span>
        </div>
      </div>

      {/* Add / Edit Contractor Modal */}
      <ContractorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setContractorToEdit(null);
        }}
        onSave={handleSaveModal}
        contractorToEdit={contractorToEdit}
      />

      {/* Multi-User Activity & Changelog Modal */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#f4eff9] flex items-center justify-center text-[#4b286d]">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Master Directory Activity & Change Log
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live audit trail of personnel edits across all team members
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 overflow-y-auto flex-1 divide-y divide-slate-100 text-xs">
              {auditLog.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No audit log entries recorded yet. Recent edits will appear here.
                </div>
              ) : (
                auditLog.map((entry) => (
                  <div key={entry.id} className="py-2.5 px-2 hover:bg-slate-50 flex items-start justify-between gap-3 rounded-md">
                    <div>
                      <div className="font-semibold text-slate-900">{entry.summary}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>Editor: <strong className="text-slate-700">{entry.actor}</strong></span>
                        <span>·</span>
                        <span className="font-mono text-slate-400">{entry.action}</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span>{auditLog.length} recent activity entries stored centrally on server</span>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-1.5 bg-[#4b286d] hover:bg-[#3b1f56] text-white font-medium rounded-md cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
