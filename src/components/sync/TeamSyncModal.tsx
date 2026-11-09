import React, { useState } from 'react';
import { useGovernance } from '../../context/GovernanceContext';
import {
  X,
  Share2,
  Download,
  Upload,
  RefreshCw,
  Copy,
  Check,
  Globe,
  Database,
  HelpCircle,
  FileCode,
  AlertTriangle,
  ArrowRight,
  Send,
  RotateCcw,
} from 'lucide-react';

interface TeamSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamSyncModal: React.FC<TeamSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    meetings,
    contractors,
    currentDataVersion,
    lastUpdatedDate,
    generateShareUrl,
    resetToDefaults,
    exportBackup,
    importBackup,
  } = useGovernance();

  const [activeTab, setActiveTab] = useState<'link' | 'deploy' | 'cache' | 'backup'>('link');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const shareUrl = generateShareUrl();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyMessage = () => {
    const msg = `Hi team, here is the updated TELUS Products & Services LT Governance schedule and agenda dashboard for this week: ${shareUrl}`;
    navigator.clipboard.writeText(msg);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  const handleResetToBaseline = async () => {
    if (window.confirm('Reset your local view to the official deployment baseline? Any unsaved local edits will be replaced with the deployed seed.')) {
      setIsResetting(true);
      await resetToDefaults();
      setIsResetting(false);
      setResetDone(true);
      setTimeout(() => setResetDone(false), 3000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackup(content);
      if (success) {
        setImportStatus('Backup restored successfully!');
        setTimeout(() => setImportStatus(null), 3500);
      } else {
        setImportStatus('Failed to import backup file. Invalid format.');
        setTimeout(() => setImportStatus(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#4b286d] text-white flex items-center justify-center font-bold">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Gizmos Deployment & Team Synchronization
              </h2>
              <p className="text-[11px] text-slate-500">
                How to share live updates, sync with colleagues, and deploy changes to Gizmos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Explanation Banner */}
        <div className="p-3.5 px-6 bg-[#fbf9fd] border-b border-[#e5d8f2] text-slate-700 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[#4b286d] text-[11px]">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Why doesn't the dashboard update for others on Gizmos automatically?</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600">
            Gizmos hosts this dashboard as a <strong>static Single-Page Application (SPA)</strong> without a shared database.
            Edits made in your browser are saved to your private local cache (<code className="bg-purple-100 text-purple-900 px-1 py-0.5 rounded text-[10px]">localStorage</code>).
            To make sure colleagues see your exact changes, use one of the solutions below:
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`py-2.5 font-bold text-xs border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'link'
                ? 'border-[#4b286d] text-[#4b286d]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Instant Share Link</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deploy')}
            className={`py-2.5 font-bold text-xs border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'deploy'
                ? 'border-[#4b286d] text-[#4b286d]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Deploy to Gizmos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cache')}
            className={`py-2.5 font-bold text-xs border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'cache'
                ? 'border-[#4b286d] text-[#4b286d]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Colleague Cache Fix</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`py-2.5 font-bold text-xs border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'border-[#4b286d] text-[#4b286d]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Backup & Restore</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: INSTANT SHARE LINK */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-1">
                <span className="font-bold text-[#4b286d] text-xs block">
                  Best for: Sending live schedule updates right now without redeploying
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  This generates a secure direct link containing all 26 Monday sessions, presenter leads, returning topics, document links, and contractor records. When a colleague opens the link, a banner offers to load your exact updates with 1 click.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-700 font-bold text-[11px]">
                  Your Shareable Synchronization URL:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-md font-mono text-[10px] text-slate-600 truncate focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 bg-[#4b286d] hover:bg-[#3b1f56] text-white font-bold rounded-md inline-flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5 text-[#4b286d]" />
                  <span>{copiedMsg ? 'Copied Message!' : 'Copy Webex / Slack Message'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DEPLOY TO GIZMOS */}
          {activeTab === 'deploy' && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
                <span className="font-bold text-emerald-900 text-xs block">
                  Automatic Default View for All Visitors
                </span>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  All 26 Monday sessions (including the active Nov 9, 2026 meeting, all 3 returning topics led by James Rooke, Rutvi Patel, and Jenny Young, and document links) are <strong>already saved directly in your project code</strong> (<code className="bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded font-mono text-[10px]">src/data/initialData.ts</code>).
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <span className="font-bold text-slate-800 block text-xs">How to Deploy to Gizmos:</span>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 pl-1 leading-relaxed">
                  <li>
                    <strong className="text-slate-800">No manual copying required:</strong> You do <em>not</em> need to download or copy any JSON file into Gizmos. The latest meetings are already built into the app.
                  </li>
                  <li>
                    <strong className="text-slate-800">Deploy your app:</strong> Click <strong>Deploy</strong> in the AI Studio header (or push/upload your project build to Gizmos).
                  </li>
                  <li>
                    <strong className="text-slate-800">Colleagues see updates immediately:</strong> When anyone visits your Gizmos URL, they automatically see the updated November 9 active meeting and returning topics.
                  </li>
                </ol>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-md text-[11px] text-[#4b286d] space-y-1">
                <span className="font-bold block">Need an offline archive?</span>
                <p className="text-slate-600">
                  If you ever want an offline backup of your data for your personal records, you can export a full JSON snapshot anytime in the <strong>Backup & Restore</strong> tab.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: COLLEAGUE CACHE FIX */}
          {activeTab === 'cache' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                <span className="font-bold text-amber-900 text-xs block flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Why colleagues might still see an old deployment
                </span>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  If a colleague opened the dashboard during a previous deployment, their browser may have stored an older version in its local cache.
                  Active deployment version is <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-mono font-bold text-[10px]">{currentDataVersion}</code>.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Reset to Deployed Baseline</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Wipes this browser's local cache and reloads the fresh official baseline from the current deployment (Nov 9, 2026).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetToBaseline}
                  disabled={isResetting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-md inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                  <span>{resetDone ? 'Reset Successful!' : 'Reset My Dashboard to Deployed Baseline'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="font-bold text-slate-800 text-xs block">
                  Full Governance Database Backup (JSON)
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Export or import a complete JSON snapshot containing all meetings, items, contractor records, and audit logs.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <span className="font-bold text-slate-800 block text-xs">Export Backup</span>
                  <p className="text-[11px] text-slate-500">
                    Download full portable JSON file to save to your local drive.
                  </p>
                  <button
                    type="button"
                    onClick={exportBackup}
                    className="w-full px-3 py-2 bg-[#4b286d] hover:bg-[#3b1f56] text-white rounded-md font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Backup File</span>
                  </button>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <span className="font-bold text-slate-800 block text-xs">Import Backup</span>
                  <p className="text-[11px] text-slate-500">
                    Select a previously exported JSON backup file to restore.
                  </p>
                  <label className="w-full px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-md font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-[#4b286d]" />
                    <span>Select Backup JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {importStatus && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md font-semibold text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{importStatus}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Deployment Version:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-800">
              {currentDataVersion}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-md cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
