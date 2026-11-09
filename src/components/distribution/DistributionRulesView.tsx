import React, { useState, useMemo } from 'react';
import { useGovernance } from '../../context/GovernanceContext';
import { CopyButton } from '../common/CopyButton';
import {
  ShieldCheck,
  Users,
  Briefcase,
  Layers,
  ArrowRight,
  BookOpen,
  Info,
  CheckCircle2,
  Copy,
  ChevronRight,
  ExternalLink,
  Crown,
  UserCheck,
  Mail,
} from 'lucide-react';

export const DistributionRulesView: React.FC = () => {
  const {
    executivePairs,
    businessPartners,
    strategyLeads,
    governanceRules,
    coreDLs,
    contractors,
  } = useGovernance();

  const [activeTab, setActiveTab] = useState<'matrix' | 'rules' | 'lists'>('matrix');

  // Distinct EAs aggregated with the leaders they support
  const distinctEAs = useMemo(() => {
    const map = new Map<string, { eaName: string; eaEmail: string; leaders: string[] }>();
    executivePairs.forEach((pair) => {
      if (!pair.eaEmail) return;
      const key = pair.eaEmail.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          eaName: pair.eaName,
          eaEmail: pair.eaEmail,
          leaders: [pair.vpName],
        });
      } else {
        const item = map.get(key)!;
        if (!item.leaders.includes(pair.vpName)) {
          item.leaders.push(pair.vpName);
        }
      }
    });
    return Array.from(map.values());
  }, [executivePairs]);

  const eaEmailsOutlook = useMemo(
    () => distinctEAs.map((e) => e.eaEmail).join('; '),
    [distinctEAs]
  );
  const eaEmailsGmail = useMemo(
    () => distinctEAs.map((e) => e.eaEmail).join(', '),
    [distinctEAs]
  );

  const leaderEmailsOutlook = useMemo(
    () => executivePairs.map((p) => p.vpEmail).join('; '),
    [executivePairs]
  );
  const leaderEmailsGmail = useMemo(
    () => executivePairs.map((p) => p.vpEmail).join(', '),
    [executivePairs]
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Governance - Distribution Lists & Rules</span>
            <span aria-hidden="true">·</span>
            <span>Policy & Distribution Matrix</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Distribution Rules & Governance Matrix
          </h1>
        </div>

        {/* View Switcher Tabs (Zero-pill, clean segmented buttons) */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-[#4b286d] text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Leadership & EAs Roster
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-[#4b286d] text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Governance Rules (Legend)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lists')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'lists'
                ? 'bg-[#4b286d] text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Reference Distribution Lists
          </button>
        </div>
      </div>

      {/* Internal Program Context Banner */}
      <div className="bg-[#fbf9fd] border border-[#d8c8e8] rounded-lg p-3 text-xs text-slate-700 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#4b286d] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900">Governance Policy & Source of Truth: </span>
          Use your organization's internal program to pull actual distribution lists. This hub hosts the official governance rules, executive assistant pairings, and contractor eligibility criteria from <span className="font-semibold text-[#4b286d]">Governance - Distribution Lists & Rules</span> to configure the correct distribution.
        </div>
      </div>

      {/* Quick Governance DL Strip (Ready to copy for Outlook or Gmail) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Leadership (Leaders Only) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs hover:border-[#4b286d]/40 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div>
                <span className="text-[10px] font-bold text-[#4b286d] uppercase tracking-wider">
                  Leaders Only
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">Leadership</h3>
              </div>
              <span className="text-xs font-semibold text-[#4b286d] bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-sm tabular-nums">
                {executivePairs.length} leaders
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              James Rooke (SVP & CPO) and all Vice Presidents. Leaders only (EAs excluded).
            </p>
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 gap-2">
            <span className="text-[11px] text-slate-500 font-medium">Email Leaders</span>
            <CopyButton
              textToCopy={leaderEmailsOutlook}
              label="Copy for Outlook"
              variant="primary"
            />
          </div>
        </div>

        {/* Card 2: Executive Assistants (EAs Only) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs hover:border-[#4b286d]/40 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div>
                <span className="text-[10px] font-bold text-[#2B8000] uppercase tracking-wider">
                  Support Group
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">Executive Assistants</h3>
              </div>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-sm tabular-nums">
                {distinctEAs.length} EAs
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Email executive assistants as a dedicated group across Leadership.
            </p>
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 gap-2">
            <span className="text-[11px] text-slate-500 font-medium">Email EAs</span>
            <CopyButton
              textToCopy={eaEmailsOutlook}
              label="Copy for Outlook"
              variant="secondary"
            />
          </div>
        </div>

        {/* Card 3: LT (Leadership and EAs) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs hover:border-[#4b286d]/40 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Weekly LT
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">LT (Leaders & EAs)</h3>
              </div>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-sm tabular-nums">
                {coreDLs.lt.totalCount} recipients
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Combined leadership and EAs. Used for weekly governance & critical asks.
            </p>
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 gap-2">
            <span className="text-[11px] text-slate-500 font-medium">Contractors excluded</span>
            <CopyButton
              textToCopy={coreDLs.lt.outlookString}
              label="Copy for Outlook"
              variant="secondary"
            />
          </div>
        </div>

        {/* Card 4: Full Org */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs hover:border-[#4b286d]/40 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  All Comms
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">Full Org</h3>
              </div>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-sm tabular-nums">
                {coreDLs.fullOrg.totalCount} recipients
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              All team calls & comms. Includes LT, EAs, Strategy Primes, and contractors.
            </p>
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 gap-2">
            <span className="text-[11px] text-slate-500">{coreDLs.fullOrg.contractorCount} contractors</span>
            <CopyButton
              textToCopy={coreDLs.fullOrg.outlookString}
              label="Copy for Outlook"
              variant="primary"
            />
          </div>
        </div>
      </div>

      {/* Tab Content 1: Leadership Roster (Table from Sheet) */}
      {activeTab === 'matrix' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {/* Pillar 1: Leadership (Leaders ONLY) */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs flex flex-col">
            <div className="px-4 py-3 bg-purple-50/70 border-b border-purple-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Leadership</h3>
                <p className="text-[11px] text-slate-500">
                  {executivePairs.length} Leaders (Leaders Only)
                </p>
              </div>
              <CopyButton
                textToCopy={leaderEmailsOutlook}
                label="Copy"
                variant="compact"
              />
            </div>
            <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto flex-1">
              {executivePairs.map((pair) => {
                const isCpo = pair.vpName === 'James Rooke';
                return (
                  <div key={pair.id} className="p-3 text-xs hover:bg-[#fbf9fd] transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                          <span>{pair.vpName}</span>
                          {isCpo && (
                            <span className="text-[9px] font-bold text-white bg-[#4b286d] px-1.5 py-0.2 rounded-xs shrink-0">
                              CPO
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">{pair.vpEmail}</div>
                      </div>
                      <div className="text-right shrink-0">
                        {isCpo ? (
                          <span className="text-[10px] font-bold text-[#4b286d] bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-sm">
                            SVP and CPO
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                            Vice President
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Quick Email Group:</span>
              <div className="flex items-center gap-1.5">
                <CopyButton
                  textToCopy={leaderEmailsOutlook}
                  label="Outlook ;"
                  variant="compact"
                />
                <CopyButton
                  textToCopy={leaderEmailsGmail}
                  label="Gmail ,"
                  variant="compact"
                />
              </div>
            </div>
          </div>

          {/* Pillar 2: Executive Assistants (EAs Group) */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs flex flex-col">
            <div className="px-4 py-3 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Executive Assistants</h3>
                <p className="text-[11px] text-slate-500">
                  {distinctEAs.length} EAs (Dedicated Support Group)
                </p>
              </div>
              <CopyButton
                textToCopy={eaEmailsOutlook}
                label="Copy"
                variant="compact"
              />
            </div>
            <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto flex-1">
              {distinctEAs.map((ea) => (
                <div key={ea.eaEmail} className="p-3 text-xs hover:bg-[#fbf9fd] transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-semibold text-slate-900">{ea.eaName}</div>
                      <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-sm shrink-0">
                        EA Support
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">{ea.eaEmail}</div>
                    <div className="text-[10px] text-[#4b286d] bg-purple-50/80 rounded px-1.5 py-0.5 font-medium leading-tight mt-1">
                      Supporting: {ea.leaders.join(', ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Email All EAs:</span>
              <div className="flex items-center gap-1.5">
                <CopyButton
                  textToCopy={eaEmailsOutlook}
                  label="Outlook ;"
                  variant="compact"
                />
                <CopyButton
                  textToCopy={eaEmailsGmail}
                  label="Gmail ,"
                  variant="compact"
                />
              </div>
            </div>
          </div>

          {/* Pillar 3: Business Partner Primes */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs flex flex-col">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Business Partner Primes</h3>
                <p className="text-[11px] text-slate-500">P&C, Comms & Corporate</p>
              </div>
              <CopyButton
                textToCopy={businessPartners.map((bp) => bp.email).join('; ')}
                label="Copy"
                variant="compact"
              />
            </div>
            <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto flex-1">
              {businessPartners.map((bp) => (
                <div key={bp.id} className="p-3 text-xs hover:bg-[#fbf9fd] transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span>{bp.name}</span>
                        {bp.email.includes('sarah.gray') && (
                          <span className="text-[10px] text-[#4b286d] font-semibold bg-[#f4eff9] px-1.5 py-0.2 rounded-xs">
                            Current User
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">{bp.email}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                        {bp.functionGroup}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">{bp.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Email Primes:</span>
              <CopyButton
                textToCopy={businessPartners.map((bp) => bp.email).join('; ')}
                label="Copy All"
                variant="compact"
              />
            </div>
          </div>

          {/* Pillar 4: VP Strategy Enablement (COS) & JD */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs flex flex-col">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Strategy Enablement (COS)</h3>
                <p className="text-[11px] text-slate-500">Chiefs of Staff supporting Leaders</p>
              </div>
              <CopyButton
                textToCopy={strategyLeads.map((sl) => sl.email).join('; ')}
                label="Copy"
                variant="compact"
              />
            </div>
            <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto flex-1">
              {strategyLeads.map((lead) => (
                <div key={lead.id} className="p-3 text-xs hover:bg-[#fbf9fd] transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{lead.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">{lead.email}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-semibold text-[#4b286d]">
                        VP: {lead.supportedVp}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">Strategy / COS</div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="p-3 bg-slate-50/50 text-[11px] text-slate-500">
                <span>Aligned via dotted line to James Rooke</span>
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Email COS:</span>
              <CopyButton
                textToCopy={strategyLeads.map((sl) => sl.email).join('; ')}
                label="Copy All"
                variant="compact"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Explicit Governance Rules (LEGEND from Sheet) */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-2 text-[#4b286d]">
              <BookOpen className="w-4 h-4" />
              <h2 className="text-sm font-bold text-slate-900">
                Official Governance Distribution Rules (Sheet Legend)
              </h2>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              These official rules govern how distribution lists must be assembled and when leadership, executive assistants, primes, and contractors are included.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {governanceRules.map((rule, idx) => (
                <div
                  key={rule.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      Rule {idx + 1}: {rule.title}
                    </span>
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                      {rule.ruleCategory}
                    </span>
                  </div>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    "{rule.description}"
                  </p>
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <strong>Applies to:</strong> {rule.appliesTo}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: Pre-Computed Governance DLs Details */}
      {activeTab === 'lists' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Reference Governance Distribution Lists</h3>
              <p className="text-xs text-slate-500">
                Automatically synced with changes in the Master Contractor Living Document
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {/* Row 1: Leadership (Leaders Only) */}
              <div className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>Leadership (Leaders Only)</span>
                    <span className="text-[10px] font-bold text-[#4b286d] bg-purple-100 px-1.5 py-0.5 rounded">
                      CPO & VPs
                    </span>
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    James Rooke (SVP & CPO) and all Vice Presidents. Leaders only (EAs and contractors excluded).
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {executivePairs.length} Leaders · 0 EAs · 0 Contractors
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-slate-800 tabular-nums bg-slate-100 px-2 py-1 rounded-sm">
                    {executivePairs.length} emails
                  </span>
                  <CopyButton
                    textToCopy={leaderEmailsOutlook}
                    label="Copy (Outlook ;)"
                    variant="primary"
                  />
                  <CopyButton
                    textToCopy={leaderEmailsGmail}
                    label="Copy (Gmail ,)"
                    variant="secondary"
                  />
                </div>
              </div>

              {/* Row 2: Executive Assistants (EAs Only) */}
              <div className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>Executive Assistants (EAs Group)</span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                      Dedicated Group
                    </span>
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    Executive Assistants supporting Leadership Team. Use to email all EAs as a group.
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {distinctEAs.length} Executive Assistants (Sophie Elwood, Sandra Kovacs, Shelley O'Toole, Holly Mackay, Anna Ivanov)
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-slate-800 tabular-nums bg-slate-100 px-2 py-1 rounded-sm">
                    {distinctEAs.length} emails
                  </span>
                  <CopyButton
                    textToCopy={eaEmailsOutlook}
                    label="Copy (Outlook ;)"
                    variant="primary"
                  />
                  <CopyButton
                    textToCopy={eaEmailsGmail}
                    label="Copy (Gmail ,)"
                    variant="secondary"
                  />
                </div>
              </div>

              {/* Row 3: LT (Leadership and EAs) */}
              <div className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900 text-sm">LT (Leadership and EAs Combined)</div>
                  <div className="text-slate-600 mt-0.5">
                    Leadership and EAs. Use for weekly governance calls & critical asks with clear deadlines.
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {coreDLs.lt.leadershipCount} Leaders · {coreDLs.lt.eaCount} EAs · 0 Contractors
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-slate-800 tabular-nums bg-slate-100 px-2 py-1 rounded-sm">
                    {coreDLs.lt.totalCount} emails
                  </span>
                  <CopyButton
                    textToCopy={coreDLs.lt.outlookString}
                    label="Copy (Outlook ;)"
                    variant="primary"
                  />
                  <CopyButton
                    textToCopy={coreDLs.lt.gmailString}
                    label="Copy (Gmail ,)"
                    variant="secondary"
                  />
                </div>
              </div>

              {/* Row 4: EAS and Strategy Primes */}
              <div className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900 text-sm">EAS and Strategy Primes</div>
                  <div className="text-slate-600 mt-0.5">
                    Includes EAs, Chief of Staff. Use for critical asks with clear deadlines that need strategic input from strategy and enablement teams.
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {coreDLs.easAndStrategy.eaCount} EAs · {coreDLs.easAndStrategy.primesCount} Strategy Primes & COS · 0 Contractors
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-slate-800 tabular-nums bg-slate-100 px-2 py-1 rounded-sm">
                    {coreDLs.easAndStrategy.totalCount} emails
                  </span>
                  <CopyButton
                    textToCopy={coreDLs.easAndStrategy.outlookString}
                    label="Copy (Outlook ;)"
                    variant="primary"
                  />
                  <CopyButton
                    textToCopy={coreDLs.easAndStrategy.gmailString}
                    label="Copy (Gmail ,)"
                    variant="secondary"
                  />
                </div>
              </div>

              {/* Row 5: Full Org */}
              <div className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900 text-sm">Full Org DL</div>
                  <div className="text-slate-600 mt-0.5">
                    For all team calls, all team comms. Includes LT, EAs, Strategy Primes and all contractors. You still need to pull a full FTE team list from Looker
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {coreDLs.fullOrg.leadershipCount} Leaders · {coreDLs.fullOrg.eaCount} EAs · {coreDLs.fullOrg.primesCount} Primes & COS · {coreDLs.fullOrg.contractorCount} Contractors
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-slate-800 tabular-nums bg-slate-100 px-2 py-1 rounded-sm">
                    {coreDLs.fullOrg.totalCount} emails
                  </span>
                  <CopyButton
                    textToCopy={coreDLs.fullOrg.outlookString}
                    label="Copy (Outlook ;)"
                    variant="primary"
                  />
                  <CopyButton
                    textToCopy={coreDLs.fullOrg.gmailString}
                    label="Copy (Gmail ,)"
                    variant="secondary"
                  />
                </div>
              </div>

              {/* Row 6: Formal Communications */}
              <div className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900 text-sm">Formal Communications & All Hands</div>
                  <div className="text-slate-600 mt-0.5">
                    Includes all contractors with Formal Comms = Yes per master living document
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-slate-800 tabular-nums bg-slate-100 px-2 py-1 rounded-sm">
                    {coreDLs.formalComms.totalCount} emails
                  </span>
                  <CopyButton
                    textToCopy={coreDLs.formalComms.outlookString}
                    label="Copy (Outlook ;)"
                    variant="primary"
                  />
                  <CopyButton
                    textToCopy={coreDLs.formalComms.gmailString}
                    label="Copy (Gmail ,)"
                    variant="secondary"
                  />
                </div>
              </div>

              {/* Row 7: P&S Leadership Team Core */}
              <div className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900 text-sm">P&S Leadership Team Core</div>
                  <div className="text-slate-600 mt-0.5">
                    SVP & CPO, Vice Presidents, Strategy Enablement COS & Primes
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 tabular-nums bg-slate-100 px-2 py-1 rounded-sm">
                    {coreDLs.leadershipCore.totalCount} emails
                  </span>
                  <CopyButton
                    textToCopy={coreDLs.leadershipCore.outlookString}
                    label="Copy (Outlook ;)"
                    variant="primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
