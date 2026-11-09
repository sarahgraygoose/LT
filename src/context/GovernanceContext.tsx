import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import {
  Contractor,
  ExecutivePair,
  BusinessPartnerPrime,
  StrategyEnablementLead,
  GovernanceRule,
  GovernanceMeeting,
  AgendaItem,
  RecurringCadence,
  DLScenario,
} from '../types/governance';
import {
  INITIAL_CONTRACTORS,
  INITIAL_EXECUTIVE_PAIRS,
  INITIAL_BUSINESS_PARTNERS,
  INITIAL_STRATEGY_LEADS,
  INITIAL_GOVERNANCE_RULES,
  INITIAL_MEETINGS,
} from '../data/initialData';
import { sanitizePlaceholderDocUrls } from '../utils/linkUtils';

export interface Recipient {
  name: string;
  email: string;
  role: string;
  category: 'VP Leadership' | 'Executive Assistant' | 'Business Partner Prime' | 'Strategy COS' | 'Contractor / Personnel';
  notes?: string;
}

export interface ComputedDLResult {
  recipients: Recipient[];
  totalCount: number;
  outlookString: string; // semicolon separated
  gmailString: string; // comma separated
  leadershipCount: number;
  eaCount: number;
  primesCount: number;
  contractorCount: number;
}

export interface ContractorAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  summary: string;
}

export type SyncStatusType = 'synced' | 'saving' | 'offline' | 'error';

interface GovernanceContextType {
  contractors: Contractor[];
  executivePairs: ExecutivePair[];
  businessPartners: BusinessPartnerPrime[];
  strategyLeads: StrategyEnablementLead[];
  governanceRules: GovernanceRule[];
  meetings: GovernanceMeeting[];
  activeMeetingId: string;
  activeMeeting: GovernanceMeeting | undefined;
  lastUpdatedDate: string;
  
  // Real-Time Multi-Client / Multi-Tab Sync
  syncStatus: SyncStatusType;
  lastSyncedTimestamp: string | null;
  currentUserEmail: string;
  auditLog: ContractorAuditEntry[];
  refreshContractors: (silent?: boolean) => Promise<void>;
  refreshAuditLog: () => Promise<void>;

  // Contractor mutations (persists and broadcasts to all tabs & clients)
  addContractor: (contractor: Omit<Contractor, 'id'>) => Promise<void>;
  updateContractor: (id: string, updates: Partial<Contractor>) => Promise<void>;
  deleteContractor: (id: string) => Promise<void>;
  bulkToggleFlag: (ids: string[], flag: 'tcsAllTeamCall' | 'cpoAllTeamCall' | 'vpTeamCall' | 'formalComms', value: boolean) => Promise<void>;
  
  // Agenda & Meeting mutations (ALL save through unified resilient pipeline)
  setActiveMeetingId: (id: string) => void;
  addAgendaItem: (meetingId: string, item: Omit<AgendaItem, 'id'>) => void;
  addRecurringTopic: (params: {
    topic: string;
    durationMinutes: number;
    detail: string;
    lead: string;
    type: AgendaItem['type'];
    deadline?: string;
    cadence: RecurringCadence;
    startMeetingId: string;
  }) => void;
  deleteRecurringSeries: (seriesId: string) => void;
  updateRecurringSeries: (
    seriesId: string,
    updates: {
      topic?: string;
      lead?: string;
      cadence?: RecurringCadence;
      durationMinutes?: number;
      detail?: string;
      meetingIds?: string[];
    }
  ) => void;
  removeDateFromRecurringSeries: (seriesId: string, meetingId: string) => void;
  addDateToRecurringSeries: (seriesId: string, meetingId: string) => void;
  rescheduleRecurringSeries: (
    seriesId: string,
    cadence: RecurringCadence,
    startMeetingId?: string
  ) => void;
  updateAgendaItem: (meetingId: string, itemId: string, updates: Partial<AgendaItem>) => void;
  deleteAgendaItem: (meetingId: string, itemId: string) => void;
  reorderAgendaItems: (meetingId: string, startIndex: number, endIndex: number) => void;
  addMeeting: (meeting: Omit<GovernanceMeeting, 'id'>) => void;
  updateMeeting: (meetingId: string, updates: Partial<GovernanceMeeting>) => void;
  completeAndArchiveMeeting: (meetingId: string) => { archivedDate: string; nextDate?: string };
  reopenMeeting: (meetingId: string) => void;
  archivePastMeetings: () => number;
  
  // Dynamic DL Engine
  computeDistributionList: (scenario: DLScenario) => ComputedDLResult;
  coreDLs: {
    fullOrg: ComputedDLResult;
    tcsAllTeam: ComputedDLResult;
    lt: ComputedDLResult;
    ltAllTeam: ComputedDLResult;
    cpoAllTeam: ComputedDLResult;
    easAndStrategy: ComputedDLResult;
    orgChanges: ComputedDLResult;
    leadershipCore: ComputedDLResult;
    leadership: ComputedDLResult;
    eas: ComputedDLResult;
    formalComms: ComputedDLResult;
  };
  
  // Data Portability & Backup
  resetToDefaults: () => Promise<void>;
  exportBackup: () => void;
  importBackup: (jsonContent: string) => boolean;
  generateShareUrl: () => string;
  pendingSharedUpdate: SharedSyncPayload | null;
  applySharedUpdate: () => void;
  dismissSharedUpdate: () => void;
  currentDataVersion: string;
  exportSeedCode: () => { meetingsJson: string; contractorsJson: string };
}

export interface SharedSyncPayload {
  version: number;
  exportedAt: string;
  sender: string;
  meetings: GovernanceMeeting[];
  contractors: Contractor[];
}

export function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const CURRENT_DATA_VERSION = 'v8_20261109_leadership_ea';

const STORAGE_KEYS = {
  VERSION: 'telus_governance_version',
  CONTRACTORS: 'telus_governance_contractors_v8',
  MEETINGS: 'telus_governance_meetings_v8',
  LAST_UPDATED: 'telus_governance_last_updated_v8',
  AUDIT_LOG: 'telus_governance_audit_v8',
};

const SYNC_CHANNEL_NAME = 'telus_ps_governance_sync_channel_v8';

// Wipe obsolete storage keys to ensure other users never load stale previous deployments
function checkAndMigrateStorageVersion() {
  try {
    const storedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    if (storedVersion !== CURRENT_DATA_VERSION) {
      localStorage.removeItem('telus_governance_meetings_v7');
      localStorage.removeItem('telus_governance_contractors_v7');
      localStorage.removeItem('telus_governance_last_updated_v7');
      localStorage.removeItem('telus_governance_audit_v7');
      localStorage.removeItem('telus_governance_meetings_v6');
      localStorage.removeItem('telus_governance_contractors_v6');
      localStorage.removeItem('telus_governance_last_updated_v6');
      localStorage.removeItem('telus_governance_audit_v6');
      localStorage.removeItem('telus_governance_meetings_v5');
      localStorage.removeItem('telus_governance_contractors_v5');
      localStorage.removeItem('telus_governance_last_updated_v5');
      localStorage.removeItem('telus_governance_audit_v5');
      localStorage.removeItem('telus_governance_meetings_v4');
      localStorage.removeItem('telus_governance_contractors_v4');
      localStorage.removeItem('telus_governance_last_updated_v4');
      localStorage.removeItem('telus_governance_audit_v4');
      localStorage.removeItem('telus_governance_meetings_v3');
      localStorage.removeItem('telus_governance_contractors_v3');
      localStorage.removeItem('telus_governance_last_updated_v3');
      localStorage.removeItem('telus_governance_audit_v3');
      localStorage.removeItem('ps_gov_weekly_lt_calendar_q1_2027_v2');
      localStorage.removeItem('telus_governance_meetings_v2');
      localStorage.removeItem('ps_gov_contractors_v1');
      localStorage.setItem(STORAGE_KEYS.VERSION, CURRENT_DATA_VERSION);
    }
  } catch (err) {
    console.warn('Storage migration notice:', err);
  }
}

checkAndMigrateStorageVersion();

/**
 * Smart merge function that preserves topics from both tabs/browsers without wiping.
 */
function mergeMeetings(
  currentList: GovernanceMeeting[],
  incomingList: GovernanceMeeting[]
): GovernanceMeeting[] {
  const currentMap = new Map(currentList.map((m) => [m.id, m]));
  const incomingMap = new Map(incomingList.map((m) => [m.id, m]));
  const allIds = Array.from(new Set([...currentList.map((m) => m.id), ...incomingList.map((m) => m.id)]));

  const merged = allIds.map((id) => {
    const cur = currentMap.get(id);
    const inc = incomingMap.get(id);

    if (!cur) return inc!;
    if (!inc) return cur;

    // Both exist: merge agenda items by unique id
    const itemMap = new Map<string, AgendaItem>();
    inc.agendaItems.forEach((i) => itemMap.set(i.id, i));
    cur.agendaItems.forEach((i) => itemMap.set(i.id, i));

    // Status: if either is archived/completed, preserve completion
    const isCompleted =
      cur.status === 'completed' ||
      inc.status === 'completed' ||
      cur.status === 'archived' ||
      inc.status === 'archived';

    return {
      ...inc,
      ...cur,
      status: isCompleted ? ('completed' as const) : cur.status || inc.status,
      completedAt: cur.completedAt || inc.completedAt,
      archivedAt: cur.archivedAt || inc.archivedAt,
      agendaItems: Array.from(itemMap.values()),
    };
  });

  return merged.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Smart merge for contractors list.
 */
function mergeContractors(
  currentList: Contractor[],
  incomingList: Contractor[]
): Contractor[] {
  const currentMap = new Map(currentList.map((c) => [c.id, c]));
  const incomingMap = new Map(incomingList.map((c) => [c.id, c]));
  const allIds = Array.from(new Set([...currentList.map((c) => c.id), ...incomingList.map((c) => c.id)]));

  return allIds.map((id) => {
    const cur = currentMap.get(id);
    const inc = incomingMap.get(id);
    if (!cur) return inc!;
    if (!inc) return cur;
    return { ...inc, ...cur };
  });
}

function loadSavedMeetings(): GovernanceMeeting[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.MEETINGS);

    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Auto-archive any past sessions (< todayStr) that are still marked active/upcoming
        // and sanitize any legacy dummy URLs from details
        const todayStr = getTodayDateStr();
        const migrated = parsed.map((m: GovernanceMeeting) => {
          const cleanItems = (m.agendaItems || []).map((item) => ({
            ...item,
            detail: sanitizePlaceholderDocUrls(item.detail),
          }));

          if (m.date < todayStr && m.status !== 'completed' && m.status !== 'archived') {
            return {
              ...m,
              status: 'completed' as const,
              completedAt: m.completedAt || `${m.date}T17:00:00.000Z`,
              archivedAt: m.archivedAt || `${m.date}T17:00:00.000Z`,
              agendaItems: cleanItems.map((item) => ({ ...item, status: 'completed' as const })),
            };
          }
          if (m.date === todayStr && m.status !== 'completed' && m.status !== 'archived') {
            return {
              ...m,
              status: 'active' as const,
              agendaItems: cleanItems,
            };
          }
          return {
            ...m,
            agendaItems: cleanItems,
          };
        });
        return migrated;
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved meetings:', e);
  }
  return INITIAL_MEETINGS;
}

function loadSavedContractors(): Contractor[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CONTRACTORS);

    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved contractors:', e);
  }
  return INITIAL_CONTRACTORS;
}

function loadSavedAuditLog(): ContractorAuditEntry[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_LOG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

const GovernanceContext = createContext<GovernanceContextType | undefined>(undefined);

export const GovernanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Master Contractors state
  const [contractors, setContractors] = useState<Contractor[]>(loadSavedContractors);

  // Meetings schedule & agenda state
  const [meetings, setMeetings] = useState<GovernanceMeeting[]>(loadSavedMeetings);

  // Active meeting selection - prioritize current session based on today's date
  const [activeMeetingId, setActiveMeetingId] = useState<string>(() => {
    const initial = loadSavedMeetings();
    const todayStr = getTodayDateStr();
    const today = initial.find(
      (m) => m.date === todayStr && m.status !== 'completed' && m.status !== 'archived'
    );
    if (today) return today.id;
    const active = initial.find((m) => m.status === 'active');
    if (active) return active.id;
    const upcomingOnOrAfter = initial.find(
      (m) => m.date >= todayStr && m.status !== 'completed' && m.status !== 'archived'
    );
    if (upcomingOnOrAfter) return upcomingOnOrAfter.id;
    const firstUpcoming = initial.find((m) => m.status === 'upcoming');
    return firstUpcoming?.id || initial[0]?.id || 'lt-2026-11-09';
  });

  const [lastUpdatedDate, setLastUpdatedDate] = useState<string>(() => {
    return (
      localStorage.getItem(STORAGE_KEYS.LAST_UPDATED) ||
      new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date())
    );
  });

  // Real-Time Sync status & Broadcast Channel
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>('synced');
  const [lastSyncedTimestamp, setLastSyncedTimestamp] = useState<string | null>(() => new Date().toISOString());
  const [currentUserEmail] = useState<string>('sarah.gray@telus.com');
  const [auditLog, setAuditLog] = useState<ContractorAuditEntry[]>(loadSavedAuditLog);

  // Ref to BroadcastChannel for cross-tab communication
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Save audit log helper
  const appendAuditEntry = useCallback((entry: ContractorAuditEntry) => {
    setAuditLog((prev) => {
      const next = [entry, ...prev.slice(0, 99)];
      try {
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // --- UNIFIED RESILIENT COMMIT PIPELINES ---

  /**
   * Commits meetings changes atomically, updates localStorage, and broadcasts to all other tabs.
   */
  const commitMeetings = useCallback(
    (
      updater: (prev: GovernanceMeeting[]) => GovernanceMeeting[],
      actionSummary: string,
      actor = currentUserEmail
    ) => {
      setSyncStatus('saving');
      const nowIso = new Date().toISOString();
      const formattedDate = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date());

      setMeetings((prevMeetings) => {
        const nextMeetings = updater(prevMeetings);

        // 1. Atomic persist to localStorage
        try {
          localStorage.setItem(STORAGE_KEYS.MEETINGS, JSON.stringify(nextMeetings));
          localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, formattedDate);
        } catch (err) {
          console.error('LocalStorage write error for meetings:', err);
        }

        // 2. Broadcast to other open browser tabs/windows
        try {
          broadcastChannelRef.current?.postMessage({
            type: 'MEETINGS_UPDATED',
            meetings: nextMeetings,
            timestamp: nowIso,
            actor,
            summary: actionSummary,
          });
        } catch (err) {
          console.warn('BroadcastChannel error:', err);
        }

        // 3. Record audit entry
        appendAuditEntry({
          id: `audit-m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: nowIso,
          actor,
          action: 'agenda_edit',
          summary: actionSummary,
        });

        setLastSyncedTimestamp(nowIso);
        setLastUpdatedDate(formattedDate);
        setTimeout(() => setSyncStatus('synced'), 250);

        return nextMeetings;
      });
    },
    [currentUserEmail, appendAuditEntry]
  );

  /**
   * Commits contractors changes atomically, updates localStorage, and broadcasts to all other tabs.
   */
  const commitContractors = useCallback(
    (
      updater: (prev: Contractor[]) => Contractor[],
      actionSummary: string,
      actor = currentUserEmail
    ) => {
      setSyncStatus('saving');
      const nowIso = new Date().toISOString();
      const formattedDate = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date());

      setContractors((prevContractors) => {
        const nextContractors = updater(prevContractors);

        // 1. Atomic persist to localStorage
        try {
          localStorage.setItem(STORAGE_KEYS.CONTRACTORS, JSON.stringify(nextContractors));
          localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, formattedDate);
        } catch (err) {
          console.error('LocalStorage write error for contractors:', err);
        }

        // 2. Broadcast to other tabs
        try {
          broadcastChannelRef.current?.postMessage({
            type: 'CONTRACTORS_UPDATED',
            contractors: nextContractors,
            timestamp: nowIso,
            actor,
            summary: actionSummary,
          });
        } catch (err) {
          console.warn('BroadcastChannel error:', err);
        }

        // 3. Record audit entry
        appendAuditEntry({
          id: `audit-c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: nowIso,
          actor,
          action: 'contractor_edit',
          summary: actionSummary,
        });

        setLastSyncedTimestamp(nowIso);
        setLastUpdatedDate(formattedDate);
        setTimeout(() => setSyncStatus('synced'), 250);

        return nextContractors;
      });
    },
    [currentUserEmail, appendAuditEntry]
  );

  // --- CROSS-TAB SYNCHRONIZATION VIA BROADCASTCHANNEL & STORAGE EVENTS ---
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'MEETINGS_UPDATED' && Array.isArray(data.meetings)) {
          setMeetings((currentMeetings) => {
            const merged = mergeMeetings(currentMeetings, data.meetings);
            try {
              localStorage.setItem(STORAGE_KEYS.MEETINGS, JSON.stringify(merged));
            } catch {}
            return merged;
          });
          setSyncStatus('synced');
          setLastSyncedTimestamp(data.timestamp || new Date().toISOString());
        }

        if (data.type === 'CONTRACTORS_UPDATED' && Array.isArray(data.contractors)) {
          setContractors((currentContractors) => {
            const merged = mergeContractors(currentContractors, data.contractors);
            try {
              localStorage.setItem(STORAGE_KEYS.CONTRACTORS, JSON.stringify(merged));
            } catch {}
            return merged;
          });
          setSyncStatus('synced');
          setLastSyncedTimestamp(data.timestamp || new Date().toISOString());
        }

        if (data.type === 'FULL_RESET') {
          setMeetings(INITIAL_MEETINGS);
          setContractors(INITIAL_CONTRACTORS);
          setSyncStatus('synced');
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel unavailable, fallback to storage events', e);
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.MEETINGS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setMeetings((curr) => mergeMeetings(curr, parsed));
            setSyncStatus('synced');
          }
        } catch {}
      }

      if (e.key === STORAGE_KEYS.CONTRACTORS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setContractors((curr) => mergeContractors(curr, parsed));
            setSyncStatus('synced');
          }
        } catch {}
      }
    };

    const handleOnline = () => {
      setSyncStatus('synced');
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('offline');
    }

    return () => {
      channel?.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Contractor actions
  const addContractor = async (newContractor: Omit<Contractor, 'id'>) => {
    const created: Contractor = {
      ...newContractor,
      id: `c-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    commitContractors(
      (prev) => [created, ...prev],
      `Added contractor: ${created.firstName} ${created.lastName} (${created.email})`
    );
  };

  const updateContractor = async (id: string, updates: Partial<Contractor>) => {
    commitContractors(
      (prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      `Updated contractor: ${id}`
    );
  };

  const deleteContractor = async (id: string) => {
    commitContractors(
      (prev) => prev.filter((c) => c.id !== id),
      `Deleted contractor: ${id}`
    );
  };

  const bulkToggleFlag = async (
    ids: string[],
    flag: 'tcsAllTeamCall' | 'cpoAllTeamCall' | 'vpTeamCall' | 'formalComms',
    value: boolean
  ) => {
    const idSet = new Set(ids);
    commitContractors(
      (prev) => prev.map((c) => (idSet.has(c.id) ? { ...c, [flag]: value } : c)),
      `Bulk updated ${flag} to ${value} for ${ids.length} records`
    );
  };

  const refreshContractors = async () => {
    // Non-blocking sync check
    setSyncStatus('synced');
  };

  const refreshAuditLog = async () => {
    setAuditLog(loadSavedAuditLog());
  };

  // Agenda & Meeting actions
  const addAgendaItem = (meetingId: string, item: Omit<AgendaItem, 'id'>) => {
    const newItem: AgendaItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    commitMeetings(
      (prev) =>
        prev.map((m) =>
          m.id === meetingId ? { ...m, agendaItems: [...m.agendaItems, newItem] } : m
        ),
      `Added topic "${item.topic}" (${item.durationMinutes}m) - Lead: ${item.lead}`
    );
  };

  const addRecurringTopic = (params: {
    topic: string;
    durationMinutes: number;
    detail: string;
    lead: string;
    type: AgendaItem['type'];
    deadline?: string;
    cadence: RecurringCadence;
    startMeetingId: string;
  }) => {
    const seriesId = `series-${Date.now()}`;
    const startIndex = meetings.findIndex((m) => m.id === params.startMeetingId);
    const fromIndex = startIndex >= 0 ? startIndex : 0;
    const encounteredMonths = new Set<string>();
    const encounteredQuarters = new Set<string>();
    const encounteredYears = new Set<string>();

    commitMeetings(
      (prev) =>
        prev.map((meeting, index) => {
          if (index < fromIndex) return meeting;

          let shouldInclude = false;
          const offset = index - fromIndex;

          if (params.cadence === 'weekly') {
            shouldInclude = true;
          } else if (params.cadence === 'bi-weekly') {
            shouldInclude = offset % 2 === 0;
          } else if (params.cadence === 'monthly') {
            const monthKey = meeting.date.substring(0, 7);
            if (!encounteredMonths.has(monthKey)) {
              encounteredMonths.add(monthKey);
              shouldInclude = true;
            }
          } else if (params.cadence === 'quarterly') {
            const [yearStr, monthStr] = meeting.date.split('-');
            const quarter = Math.ceil(parseInt(monthStr, 10) / 3);
            const quarterKey = `${yearStr}-Q${quarter}`;
            if (!encounteredQuarters.has(quarterKey)) {
              encounteredQuarters.add(quarterKey);
              shouldInclude = true;
            }
          } else if (params.cadence === 'annually') {
            const yearKey = meeting.date.substring(0, 4);
            if (!encounteredYears.has(yearKey)) {
              encounteredYears.add(yearKey);
              shouldInclude = true;
            }
          } else {
            shouldInclude = index === fromIndex;
          }

          if (!shouldInclude) return meeting;

          const recurringItem: AgendaItem = {
            id: `item-${Date.now()}-${index}`,
            topic: params.topic,
            durationMinutes: params.durationMinutes,
            detail: params.detail,
            lead: params.lead,
            type: params.type,
            status: 'scheduled',
            deadline: params.deadline,
            recurringCadence: params.cadence,
            seriesId,
          };

          return {
            ...meeting,
            agendaItems: [...meeting.agendaItems, recurringItem],
          };
        }),
      `Added returning topic "${params.topic}" (${params.cadence}) - Lead: ${params.lead}`
    );
  };

  const deleteRecurringSeries = (seriesId: string) => {
    commitMeetings(
      (prev) =>
        prev.map((m) => ({
          ...m,
          agendaItems: m.agendaItems.filter((item) => item.seriesId !== seriesId),
        })),
      `Deleted recurring series ${seriesId}`
    );
  };

  const updateRecurringSeries = (
    seriesId: string,
    updates: {
      topic?: string;
      lead?: string;
      cadence?: RecurringCadence;
      durationMinutes?: number;
      detail?: string;
      meetingIds?: string[];
    }
  ) => {
    commitMeetings((prev) => {
      let currentMeetingDates: { id: string; item: AgendaItem }[] = [];
      prev.forEach((m) => {
        const found = m.agendaItems.find((i) => i.seriesId === seriesId);
        if (found) {
          currentMeetingDates.push({ id: m.id, item: found });
        }
      });

      const templateItem = currentMeetingDates[0]?.item || {
        id: `item-${Date.now()}`,
        topic: updates.topic || 'Recurring Topic',
        durationMinutes: updates.durationMinutes || 15,
        detail: updates.detail || '',
        lead: updates.lead || 'Executive Lead',
        type: 'standing' as const,
        status: 'scheduled' as const,
        recurringCadence: updates.cadence || 'weekly',
        seriesId,
      };

      const targetMeetingIds = updates.meetingIds
        ? new Set(updates.meetingIds)
        : new Set(currentMeetingDates.map((d) => d.id));

      return prev.map((m) => {
        const isTarget = targetMeetingIds.has(m.id);
        const existingIdx = m.agendaItems.findIndex((i) => i.seriesId === seriesId);

        if (isTarget) {
          if (existingIdx >= 0) {
            const updatedItems = [...m.agendaItems];
            updatedItems[existingIdx] = {
              ...updatedItems[existingIdx],
              ...(updates.topic !== undefined ? { topic: updates.topic } : {}),
              ...(updates.lead !== undefined ? { lead: updates.lead } : {}),
              ...(updates.durationMinutes !== undefined
                ? { durationMinutes: updates.durationMinutes }
                : {}),
              ...(updates.detail !== undefined ? { detail: updates.detail } : {}),
              ...(updates.cadence !== undefined ? { recurringCadence: updates.cadence } : {}),
            };
            return { ...m, agendaItems: updatedItems };
          } else {
            const newItem: AgendaItem = {
              ...templateItem,
              id: `item-${Date.now()}-${m.id}`,
              topic: updates.topic !== undefined ? updates.topic : templateItem.topic,
              lead: updates.lead !== undefined ? updates.lead : templateItem.lead,
              durationMinutes:
                updates.durationMinutes !== undefined
                  ? updates.durationMinutes
                  : templateItem.durationMinutes,
              detail: updates.detail !== undefined ? updates.detail : templateItem.detail,
              recurringCadence:
                updates.cadence !== undefined ? updates.cadence : templateItem.recurringCadence,
              seriesId,
            };
            return { ...m, agendaItems: [...m.agendaItems, newItem] };
          }
        } else {
          if (existingIdx >= 0) {
            return {
              ...m,
              agendaItems: m.agendaItems.filter((i) => i.seriesId !== seriesId),
            };
          }
          return m;
        }
      });
    }, `Updated returning series ${seriesId}`);
  };

  const removeDateFromRecurringSeries = (seriesId: string, meetingId: string) => {
    commitMeetings(
      (prev) =>
        prev.map((m) =>
          m.id === meetingId
            ? { ...m, agendaItems: m.agendaItems.filter((i) => i.seriesId !== seriesId) }
            : m
        ),
      `Removed date from recurring series`
    );
  };

  const addDateToRecurringSeries = (seriesId: string, meetingId: string) => {
    commitMeetings((prev) => {
      let template: AgendaItem | null = null;
      for (const m of prev) {
        const found = m.agendaItems.find((i) => i.seriesId === seriesId);
        if (found) {
          template = found;
          break;
        }
      }
      if (!template) return prev;

      return prev.map((m) => {
        if (m.id !== meetingId) return m;
        if (m.agendaItems.some((i) => i.seriesId === seriesId)) return m;
        const newItem: AgendaItem = {
          ...template,
          id: `item-${Date.now()}-${meetingId}`,
          seriesId,
        };
        return { ...m, agendaItems: [...m.agendaItems, newItem] };
      });
    }, `Added Monday date to recurring series`);
  };

  const rescheduleRecurringSeries = (
    seriesId: string,
    cadence: RecurringCadence,
    startMeetingId?: string
  ) => {
    commitMeetings((prevMeetings) => {
      let seriesItem: AgendaItem | undefined;
      for (const m of prevMeetings) {
        const item = m.agendaItems.find((i) => i.seriesId === seriesId);
        if (item) {
          seriesItem = item;
          break;
        }
      }
      if (!seriesItem) return prevMeetings;

      const firstMeetingIndex = startMeetingId
        ? prevMeetings.findIndex((m) => m.id === startMeetingId)
        : prevMeetings.findIndex((m) => m.agendaItems.some((i) => i.seriesId === seriesId));

      if (firstMeetingIndex === -1) return prevMeetings;

      const targetMeetingIds = new Set<string>();
      const encounteredMonths = new Set<string>();
      const encounteredQuarters = new Set<string>();
      const encounteredYears = new Set<string>();

      prevMeetings.forEach((meeting, idx) => {
        if (idx < firstMeetingIndex) return;
        const offset = idx - firstMeetingIndex;

        if (cadence === 'weekly') {
          targetMeetingIds.add(meeting.id);
        } else if (cadence === 'bi-weekly') {
          if (offset % 2 === 0) targetMeetingIds.add(meeting.id);
        } else if (cadence === 'monthly') {
          const monthKey = meeting.date.substring(0, 7);
          if (!encounteredMonths.has(monthKey)) {
            encounteredMonths.add(monthKey);
            targetMeetingIds.add(meeting.id);
          }
        } else if (cadence === 'quarterly') {
          const [yearStr, monthStr] = meeting.date.split('-');
          const quarter = Math.ceil(parseInt(monthStr, 10) / 3);
          const quarterKey = `${yearStr}-Q${quarter}`;
          if (!encounteredQuarters.has(quarterKey)) {
            encounteredQuarters.add(quarterKey);
            targetMeetingIds.add(meeting.id);
          }
        } else if (cadence === 'annually') {
          const yearKey = meeting.date.substring(0, 4);
          if (!encounteredYears.has(yearKey)) {
            encounteredYears.add(yearKey);
            targetMeetingIds.add(meeting.id);
          }
        }
      });

      return prevMeetings.map((m) => {
        const hasExisting = m.agendaItems.some((i) => i.seriesId === seriesId);
        const shouldHave = targetMeetingIds.has(m.id);

        if (shouldHave) {
          if (hasExisting) {
            return {
              ...m,
              agendaItems: m.agendaItems.map((i) =>
                i.seriesId === seriesId ? { ...i, recurringCadence: cadence } : i
              ),
            };
          } else {
            const newItem: AgendaItem = {
              ...seriesItem!,
              id: `item-${Date.now()}-${m.id}`,
              recurringCadence: cadence,
              seriesId,
            };
            return { ...m, agendaItems: [...m.agendaItems, newItem] };
          }
        } else {
          if (hasExisting) {
            return {
              ...m,
              agendaItems: m.agendaItems.filter((i) => i.seriesId !== seriesId),
            };
          }
          return m;
        }
      });
    }, `Rescheduled series cadence to ${cadence}`);
  };

  const updateAgendaItem = (meetingId: string, itemId: string, updates: Partial<AgendaItem>) => {
    commitMeetings(
      (prev) =>
        prev.map((m) =>
          m.id === meetingId
            ? {
                ...m,
                agendaItems: m.agendaItems.map((item) =>
                  item.id === itemId ? { ...item, ...updates } : item
                ),
              }
            : m
        ),
      `Updated agenda item ${itemId}`
    );
  };

  const deleteAgendaItem = (meetingId: string, itemId: string) => {
    commitMeetings(
      (prev) =>
        prev.map((m) =>
          m.id === meetingId
            ? { ...m, agendaItems: m.agendaItems.filter((item) => item.id !== itemId) }
            : m
        ),
      `Deleted agenda item ${itemId}`
    );
  };

  const reorderAgendaItems = (meetingId: string, startIndex: number, endIndex: number) => {
    commitMeetings((prev) =>
      prev.map((m) => {
        if (m.id !== meetingId) return m;
        const result = Array.from(m.agendaItems);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return { ...m, agendaItems: result };
      }),
      `Reordered agenda items in meeting ${meetingId}`
    );
  };

  const addMeeting = (meeting: Omit<GovernanceMeeting, 'id'>) => {
    const createdMeeting: GovernanceMeeting = {
      ...meeting,
      id: `meeting-${Date.now()}`,
    };
    commitMeetings((prev) => [...prev, createdMeeting], `Added meeting ${meeting.title} (${meeting.displayDate})`);
    setActiveMeetingId(createdMeeting.id);
  };

  const updateMeeting = (meetingId: string, updates: Partial<GovernanceMeeting>) => {
    commitMeetings(
      (prev) => prev.map((m) => (m.id === meetingId ? { ...m, ...updates } : m)),
      `Updated meeting details for ${meetingId}`
    );
  };

  const completeAndArchiveMeeting = (
    meetingId: string
  ): { archivedDate: string; nextDate?: string } => {
    let archivedDisplayDate = '';
    let nextMeetingDisplayDate: string | undefined;

    const nowIso = new Date().toISOString();

    commitMeetings((prevMeetings) => {
      const targetMeeting = prevMeetings.find((m) => m.id === meetingId);
      if (!targetMeeting) return prevMeetings;
      archivedDisplayDate = targetMeeting.displayDate;

      const upcomingMeetings = prevMeetings.filter(
        (m) => m.id !== meetingId && m.status !== 'completed' && m.status !== 'archived'
      );
      const nextActive = upcomingMeetings[0];
      if (nextActive) {
        nextMeetingDisplayDate = nextActive.displayDate;
      }

      const nextMeetings = prevMeetings.map((m) => {
        if (m.id === meetingId) {
          return {
            ...m,
            status: 'completed' as const,
            completedAt: nowIso,
            archivedAt: nowIso,
            agendaItems: m.agendaItems.map((item) => ({
              ...item,
              status: 'completed' as const,
            })),
          };
        }
        if (nextActive && m.id === nextActive.id) {
          return {
            ...m,
            status: 'active' as const,
          };
        }
        return m;
      });

      if (nextActive) {
        setActiveMeetingId(nextActive.id);
      }

      return nextMeetings;
    }, `Completed and archived agenda for Mon, ${archivedDisplayDate}`);

    return { archivedDate: archivedDisplayDate, nextDate: nextMeetingDisplayDate };
  };

  const reopenMeeting = (meetingId: string) => {
    commitMeetings(
      (prevMeetings) =>
        prevMeetings.map((m) =>
          m.id === meetingId
            ? {
                ...m,
                status: 'active' as const,
                archivedAt: undefined,
                completedAt: undefined,
              }
            : m
        ),
      `Reopened meeting agenda for ${meetingId}`
    );
    setActiveMeetingId(meetingId);
  };

  const archivePastMeetings = () => {
    const todayStr = getTodayDateStr();
    let count = 0;
    const nowIso = new Date().toISOString();

    commitMeetings((prevMeetings) => {
      let hasArchived = false;

      const nextMeetings = prevMeetings.map((m) => {
        if (m.date < todayStr && m.status !== 'completed' && m.status !== 'archived') {
          hasArchived = true;
          count++;
          return {
            ...m,
            status: 'completed' as const,
            completedAt: nowIso,
            archivedAt: nowIso,
            agendaItems: m.agendaItems.map((item) => ({ ...item, status: 'completed' as const })),
          };
        }
        return m;
      });

      if (hasArchived) {
        const firstUpcoming = nextMeetings.find(
          (m) => m.status !== 'completed' && m.status !== 'archived'
        );
        if (firstUpcoming) {
          setActiveMeetingId(firstUpcoming.id);
        }
      }

      return nextMeetings;
    }, `Archived ${count} past meeting sessions`);

    return count;
  };

  const resetToDefaults = async () => {
    setContractors(INITIAL_CONTRACTORS);
    setMeetings(INITIAL_MEETINGS);
    const todayStr = getTodayDateStr();
    const today = INITIAL_MEETINGS.find((m) => m.date === todayStr && m.status !== 'completed' && m.status !== 'archived') ||
                  INITIAL_MEETINGS.find((m) => m.status === 'active') ||
                  INITIAL_MEETINGS[0];
    setActiveMeetingId(today.id);
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date());
    setLastUpdatedDate(formattedDate);

    try {
      localStorage.setItem(STORAGE_KEYS.CONTRACTORS, JSON.stringify(INITIAL_CONTRACTORS));
      localStorage.setItem(STORAGE_KEYS.MEETINGS, JSON.stringify(INITIAL_MEETINGS));
      localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, formattedDate);
      broadcastChannelRef.current?.postMessage({ type: 'FULL_RESET' });
    } catch {}

    setSyncStatus('synced');
  };

  // URL Hash Sync for instant cross-device sharing without redeploying
  const [pendingSharedUpdate, setPendingSharedUpdate] = useState<SharedSyncPayload | null>(null);

  useEffect(() => {
    try {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#sync=')) {
        const raw = decodeURIComponent(hash.slice(6));
        const json = decodeURIComponent(escape(atob(raw)));
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed.meetings) && Array.isArray(parsed.contractors)) {
          setPendingSharedUpdate(parsed);
        }
      }
    } catch (err) {
      console.warn('Could not parse share hash:', err);
    }
  }, []);

  const applySharedUpdate = useCallback(() => {
    if (!pendingSharedUpdate) return;
    commitMeetings(
      () => pendingSharedUpdate.meetings,
      `Applied shared update from ${pendingSharedUpdate.sender || 'colleague'}`
    );
    commitContractors(
      () => pendingSharedUpdate.contractors,
      `Applied shared update from ${pendingSharedUpdate.sender || 'colleague'}`
    );
    setPendingSharedUpdate(null);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, [pendingSharedUpdate, commitMeetings, commitContractors]);

  const dismissSharedUpdate = useCallback(() => {
    setPendingSharedUpdate(null);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);

  const generateShareUrl = useCallback((): string => {
    const payload: SharedSyncPayload = {
      version: 7,
      exportedAt: new Date().toISOString(),
      sender: currentUserEmail,
      meetings,
      contractors,
    };
    const jsonStr = JSON.stringify(payload);
    const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(jsonStr))));
    const url = new URL(window.location.href);
    url.hash = `sync=${encoded}`;
    return url.toString();
  }, [meetings, contractors, currentUserEmail]);

  const exportSeedCode = useCallback(() => {
    return {
      meetingsJson: JSON.stringify(meetings, null, 2),
      contractorsJson: JSON.stringify(contractors, null, 2),
    };
  }, [meetings, contractors]);

  // Export full governance database as portable JSON backup file
  const exportBackup = useCallback(() => {
    const payload = {
      app: 'TELUS Products & Services LT Governance',
      version: '3.0',
      exportedAt: new Date().toISOString(),
      actor: currentUserEmail,
      meetings,
      contractors,
      auditLog,
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TELUS_Governance_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [meetings, contractors, auditLog, currentUserEmail]);

  // Import JSON backup file
  const importBackup = useCallback(
    (jsonContent: string): boolean => {
      try {
        const parsed = JSON.parse(jsonContent);
        if (Array.isArray(parsed.meetings) && Array.isArray(parsed.contractors)) {
          commitMeetings(() => parsed.meetings, 'Restored from JSON backup');
          commitContractors(() => parsed.contractors, 'Restored from JSON backup');
          if (Array.isArray(parsed.auditLog)) {
            setAuditLog(parsed.auditLog);
            localStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(parsed.auditLog));
          }
          return true;
        }
      } catch (err) {
        console.error('Import failed:', err);
      }
      return false;
    },
    [commitMeetings, commitContractors]
  );

  const activeMeeting = useMemo(() => {
    const found = meetings.find((m) => m.id === activeMeetingId);
    if (found) return found;
    const firstActive = meetings.find((m) => m.status !== 'completed' && m.status !== 'archived');
    return firstActive || meetings[0];
  }, [meetings, activeMeetingId]);

  // Distribution List Computation Engine
  const computeDistributionList = (scenario: DLScenario): ComputedDLResult => {
    const seenEmails = new Set<string>();
    const recipients: Recipient[] = [];

    const addRecipient = (name: string, email: string, role: string, category: Recipient['category'], notes?: string) => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || seenEmails.has(cleanEmail)) return;
      seenEmails.add(cleanEmail);
      recipients.push({
        name: name.trim(),
        email: cleanEmail,
        role: role.trim(),
        category,
        notes,
      });
    };

    let leadershipCount = 0;
    let eaCount = 0;
    let primesCount = 0;
    let contractorCount = 0;

    // 1. Leadership Team
    if (scenario.includeLT) {
      INITIAL_EXECUTIVE_PAIRS.forEach((pair) => {
        if (!scenario.targetVp || pair.vpName.toLowerCase().includes(scenario.targetVp.toLowerCase())) {
          addRecipient(pair.vpName, pair.vpEmail, pair.vpTitle, 'VP Leadership');
          leadershipCount++;
        }
      });
    }

    // 2. Executive Assistants
    if (scenario.includeEAs) {
      INITIAL_EXECUTIVE_PAIRS.forEach((pair) => {
        if (!scenario.targetVp || pair.vpName.toLowerCase().includes(scenario.targetVp.toLowerCase())) {
          if (pair.eaEmail) {
            addRecipient(pair.eaName, pair.eaEmail, `EA to ${pair.vpName}`, 'Executive Assistant');
            eaCount++;
          }
        }
      });
    }

    // 3. Business Partner Primes
    if (scenario.includePrimes) {
      INITIAL_BUSINESS_PARTNERS.forEach((bp) => {
        addRecipient(bp.name, bp.email, `${bp.functionGroup} - ${bp.role}`, 'Business Partner Prime');
        primesCount++;
      });
    }

    // 4. Strategy Enablement Chiefs of Staff
    if (scenario.includeCOS) {
      INITIAL_STRATEGY_LEADS.forEach((lead) => {
        if (!scenario.targetVp || lead.supportedVp.toLowerCase().includes(scenario.targetVp.toLowerCase())) {
          addRecipient(lead.name, lead.email, `${lead.role} (${lead.supportedVp})`, 'Strategy COS');
        }
      });
    }

    // 5. Living Contractor List based on flags and target VP
    if (scenario.contractorFilter !== 'none') {
      contractors.forEach((c) => {
        let matches = false;

        if (scenario.targetVp && !c.svpVp.toLowerCase().includes(scenario.targetVp.toLowerCase())) {
          return;
        }

        switch (scenario.contractorFilter) {
          case 'tcsAllTeam':
            matches = c.tcsAllTeamCall;
            break;
          case 'ltAllTeam':
          case 'cpoAllTeam':
            matches = c.cpoAllTeamCall;
            break;
          case 'vpTeam':
            matches = c.vpTeamCall;
            break;
          case 'formalComms':
            matches = c.formalComms;
            break;
          case 'all':
            matches = true;
            break;
        }

        if (matches) {
          const fullName = `${c.firstName} ${c.lastName}`.trim() || c.email;
          const roleDesc = `${c.type} · ${c.director ? `Dir: ${c.director}` : ''} ${c.svpVp ? `(VP: ${c.svpVp})` : ''}`.trim();
          addRecipient(fullName, c.email, roleDesc, 'Contractor / Personnel', c.notes);
          contractorCount++;
        }
      });
    }

    const emailList = recipients.map((r) => r.email);

    return {
      recipients,
      totalCount: recipients.length,
      outlookString: emailList.join('; '),
      gmailString: emailList.join(', '),
      leadershipCount,
      eaCount,
      primesCount,
      contractorCount,
    };
  };

  // Pre-computed Core DLs (reactive to contractors array changes)
  const coreDLs = useMemo(() => {
    const fullOrg = computeDistributionList({
      id: 'full-org',
      name: 'Full Org',
      description: 'For all team calls, all team comms. Includes LT, EAs, Strategy Primes and all contractors. You still need to pull a full FTE team list from Looker',
      includeLT: true,
      includeEAs: true,
      includePrimes: true,
      includeCOS: true,
      contractorFilter: 'tcsAllTeam',
    });

    const lt = computeDistributionList({
      id: 'lt',
      name: 'LT',
      description: 'Leadership and EAs. Use for critical asks with clear deadlines.',
      includeLT: true,
      includeEAs: true,
      includePrimes: false,
      includeCOS: false,
      contractorFilter: 'none',
    });

    const easAndStrategy = computeDistributionList({
      id: 'eas-and-strategy',
      name: 'EAS and Strategy Primes',
      description: 'Includes EAs, Chief of Staff. Use for critical asks with clear deadlines that need strategic input from strategy and enablement teams.',
      includeLT: false,
      includeEAs: true,
      includePrimes: true,
      includeCOS: true,
      contractorFilter: 'none',
    });

    const leadership = computeDistributionList({
      id: 'leadership',
      name: 'Leadership',
      description: 'SVP & CPO and Vice Presidents (Leaders only, no EAs)',
      includeLT: true,
      includeEAs: false,
      includePrimes: false,
      includeCOS: false,
      contractorFilter: 'none',
    });

    const eas = computeDistributionList({
      id: 'eas',
      name: 'Executive Assistants (EAs)',
      description: 'Executive Assistants supporting the Leadership Team',
      includeLT: false,
      includeEAs: true,
      includePrimes: false,
      includeCOS: false,
      contractorFilter: 'none',
    });

    const leadershipCore = computeDistributionList({
      id: 'leadership-core',
      name: 'P&S Leadership Team Core',
      description: 'SVP & CPO, Vice Presidents, Strategy Enablement COS',
      includeLT: true,
      includeEAs: true,
      includePrimes: true,
      includeCOS: true,
      contractorFilter: 'none',
    });

    const formalComms = computeDistributionList({
      id: 'formal-comms',
      name: 'Formal Comms & All Hands',
      description: 'Formal communications distribution list syncing live contractors tagged for Formal Comms',
      includeLT: true,
      includeEAs: true,
      includePrimes: true,
      includeCOS: true,
      contractorFilter: 'formalComms',
    });

    return {
      fullOrg,
      tcsAllTeam: fullOrg,
      lt,
      ltAllTeam: lt,
      cpoAllTeam: lt,
      easAndStrategy,
      orgChanges: easAndStrategy,
      leadershipCore,
      leadership,
      eas,
      formalComms,
    };
  }, [contractors]);

  return (
    <GovernanceContext.Provider
      value={{
        contractors,
        executivePairs: INITIAL_EXECUTIVE_PAIRS,
        businessPartners: INITIAL_BUSINESS_PARTNERS,
        strategyLeads: INITIAL_STRATEGY_LEADS,
        governanceRules: INITIAL_GOVERNANCE_RULES,
        meetings,
        activeMeetingId,
        activeMeeting,
        lastUpdatedDate,
        syncStatus,
        lastSyncedTimestamp,
        currentUserEmail,
        auditLog,
        refreshContractors,
        refreshAuditLog,
        addContractor,
        updateContractor,
        deleteContractor,
        bulkToggleFlag,
        setActiveMeetingId,
        addAgendaItem,
        addRecurringTopic,
        deleteRecurringSeries,
        updateRecurringSeries,
        removeDateFromRecurringSeries,
        addDateToRecurringSeries,
        rescheduleRecurringSeries,
        updateAgendaItem,
        deleteAgendaItem,
        reorderAgendaItems,
        addMeeting,
        updateMeeting,
        completeAndArchiveMeeting,
        reopenMeeting,
        archivePastMeetings,
        computeDistributionList,
        coreDLs,
        resetToDefaults,
        exportBackup,
        importBackup,
        generateShareUrl,
        pendingSharedUpdate,
        applySharedUpdate,
        dismissSharedUpdate,
        currentDataVersion: CURRENT_DATA_VERSION,
        exportSeedCode,
      }}
    >
      {children}
    </GovernanceContext.Provider>
  );
};

export const useGovernance = () => {
  const context = useContext(GovernanceContext);
  if (!context) {
    throw new Error('useGovernance must be used within a GovernanceProvider');
  }
  return context;
};
