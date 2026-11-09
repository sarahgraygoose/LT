/**
 * Types for P&S Governance, Agendas, Distribution Lists, and Master Contractor Document.
 */

export type PersonnelType = 'TD Contractor' | 'TD Employee' | 'Sow' | 'Term' | 'Intern' | 'Contractor';

export interface Contractor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  type: PersonnelType;
  leader: string;
  director: string;
  svpVp: string;
  tcsAllTeamCall: boolean;
  cpoAllTeamCall: boolean;
  vpTeamCall: boolean;
  formalComms: boolean;
  notes?: string;
}

export interface ExecutivePair {
  id: string;
  vpName: string;
  vpEmail: string;
  vpTitle: string;
  eaName: string;
  eaEmail: string;
}

export interface BusinessPartnerPrime {
  id: string;
  name: string;
  email: string;
  role: string;
  functionGroup: 'P&C' | 'Comms' | 'Corporate Comms' | 'Other';
}

export interface StrategyEnablementLead {
  id: string;
  name: string;
  email: string;
  role: string;
  supportedVp: string;
}

export interface GovernanceRule {
  id: string;
  title: string;
  description: string;
  ruleCategory: 'Full Org' | 'LT' | 'EAS and Strategy Primes' | 'General' | 'EAs' | 'Weekly LT' | 'Org Changes' | 'Contractors';
  appliesTo: string;
}

export type RecurringCadence = 'none' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'annually';

export interface AgendaItem {
  id: string;
  topic: string;
  durationMinutes: number;
  detail: string;
  lead: string;
  type: 'standing' | 'ad-hoc' | 'deep-dive';
  status: 'scheduled' | 'in-progress' | 'completed' | 'deferred';
  documentUrl?: string;
  deadline?: string;
  recurringCadence?: RecurringCadence;
  seriesId?: string; // Links recurring instances together
}

export interface GovernanceMeeting {
  id: string;
  title: string; // e.g. "Weekly LT"
  date: string; // ISO date format "YYYY-MM-DD" e.g. "2026-10-05"
  displayDate: string; // e.g. "5 Oct 2026"
  targetDurationMinutes: number;
  agendaItems: AgendaItem[];
  location?: string;
  notes?: string;
  status: 'upcoming' | 'active' | 'completed' | 'archived';
  monthLabel?: string; // "October 2026"
  completedAt?: string;
  archivedAt?: string;
}

export interface DLScenario {
  id: string;
  name: string;
  description: string;
  includeLT: boolean;
  includeEAs: boolean;
  includePrimes: boolean;
  includeCOS: boolean;
  contractorFilter: 'none' | 'tcsAllTeam' | 'ltAllTeam' | 'cpoAllTeam' | 'vpTeam' | 'formalComms' | 'all';
  targetVp?: string;
}
