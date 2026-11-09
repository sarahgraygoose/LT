import React, { useState, useEffect, useMemo } from 'react';
import { useGovernance } from '../../context/GovernanceContext';
import { RecurringCadence } from '../../types/governance';
import {
  X,
  Calendar,
  Repeat,
  User,
  Clock,
  Check,
  CalendarCheck,
  CalendarDays,
  FileText,
  AlertCircle,
  Wand2,
  Link2,
} from 'lucide-react';
import { DocLinkInsertHelper } from '../../utils/linkUtils';

export interface RecurringSeriesData {
  seriesId: string;
  topic: string;
  lead: string;
  durationMinutes: number;
  cadence: RecurringCadence;
  detail: string;
  meetingDates: { id: string; displayDate: string; date: string }[];
}

interface EditRecurringTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  series: RecurringSeriesData | null;
  onSuccessToast?: (msg: string) => void;
}

export const EditRecurringTopicModal: React.FC<EditRecurringTopicModalProps> = ({
  isOpen,
  onClose,
  series,
  onSuccessToast,
}) => {
  const {
    meetings,
    updateRecurringSeries,
    executivePairs,
    businessPartners,
    strategyLeads,
  } = useGovernance();

  const [topic, setTopic] = useState('');
  const [lead, setLead] = useState('');
  const [cadence, setCadence] = useState<RecurringCadence>('weekly');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [detail, setDetail] = useState('');
  const [selectedMeetingIds, setSelectedMeetingIds] = useState<string[]>([]);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'q4-2026' | 'q1-2027'>('all');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync state when series opens
  useEffect(() => {
    if (series) {
      setTopic(series.topic);
      setLead(series.lead);
      setCadence(series.cadence);
      setDurationMinutes(series.durationMinutes || 15);
      setDetail(series.detail || '');
      setSelectedMeetingIds(series.meetingDates.map((m) => m.id));
      setHasUnsavedChanges(false);
    }
  }, [series, isOpen]);

  if (!isOpen || !series) return null;

  // Lead suggestions for quick selection
  const leadSuggestions = Array.from(
    new Set([
      ...executivePairs.map((ep) => ep.vpName),
      ...strategyLeads.map((sl) => sl.name),
      ...businessPartners.map((bp) => bp.name),
      'Sarah Gray',
      'Leadership',
      'Strategy & Enablement Team',
    ])
  );

  // Group meetings by Month Label
  const filteredMeetings = meetings.filter((m) => {
    if (timelineFilter === 'q4-2026') return m.date.startsWith('2026');
    if (timelineFilter === 'q1-2027') return m.date.startsWith('2027');
    return true;
  });

  const meetingsByMonth = filteredMeetings.reduce((acc, meeting) => {
    const key = meeting.monthLabel || 'Scheduled Sessions';
    if (!acc[key]) acc[key] = [];
    acc[key].push(meeting);
    return acc;
  }, {} as Record<string, typeof meetings>);

  const toggleMeeting = (meetingId: string) => {
    setSelectedMeetingIds((prev) => {
      const next = prev.includes(meetingId)
        ? prev.filter((id) => id !== meetingId)
        : [...prev, meetingId];
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedMeetingIds(meetings.map((m) => m.id));
    setHasUnsavedChanges(true);
  };

  const handleClearAll = () => {
    setSelectedMeetingIds([]);
    setHasUnsavedChanges(true);
  };

  // Auto-apply cadence pattern starting from the earliest meeting or current first selected
  const handleAutoApplyCadence = (targetCadence: RecurringCadence) => {
    const firstMeetingIndex = meetings.findIndex((m) =>
      selectedMeetingIds.length > 0 ? selectedMeetingIds.includes(m.id) : true
    );
    const startIdx = firstMeetingIndex >= 0 ? firstMeetingIndex : 0;

    const newSelected: string[] = [];
    const encounteredMonths = new Set<string>();
    const encounteredQuarters = new Set<string>();
    const encounteredYears = new Set<string>();

    meetings.forEach((m, idx) => {
      if (idx < startIdx) return;
      const offset = idx - startIdx;

      if (targetCadence === 'weekly') {
        newSelected.push(m.id);
      } else if (targetCadence === 'bi-weekly') {
        if (offset % 2 === 0) newSelected.push(m.id);
      } else if (targetCadence === 'monthly') {
        const monthKey = m.date.substring(0, 7);
        if (!encounteredMonths.has(monthKey)) {
          encounteredMonths.add(monthKey);
          newSelected.push(m.id);
        }
      } else if (targetCadence === 'quarterly') {
        const [yearStr, monthStr] = m.date.split('-');
        const quarter = Math.ceil(parseInt(monthStr, 10) / 3);
        const quarterKey = `${yearStr}-Q${quarter}`;
        if (!encounteredQuarters.has(quarterKey)) {
          encounteredQuarters.add(quarterKey);
          newSelected.push(m.id);
        }
      } else if (targetCadence === 'annually') {
        const yearKey = m.date.substring(0, 4);
        if (!encounteredYears.has(yearKey)) {
          encounteredYears.add(yearKey);
          newSelected.push(m.id);
        }
      }
    });

    setSelectedMeetingIds(newSelected);
    setCadence(targetCadence);
    setHasUnsavedChanges(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    updateRecurringSeries(series.seriesId, {
      topic: topic.trim(),
      lead: lead.trim() || 'Leadership',
      cadence,
      durationMinutes: Number(durationMinutes) || 15,
      detail: detail.trim(),
      meetingIds: selectedMeetingIds,
    });

    if (onSuccessToast) {
      onSuccessToast(
        `Updated returning topic "${topic.trim()}": Standing Lead set to "${lead.trim()}", Cadence set to ${cadence}, and schedule updated across ${selectedMeetingIds.length} meetings.`
      );
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#4b286d] text-white flex items-center justify-center shadow-xs">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Edit Returning Topic & Schedule
              </h2>
              <p className="text-xs text-slate-500">
                Update the dates, standing lead, cadence, and discussion notes across all Weekly LT meetings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form id="edit-returning-topic-form" onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Section 1: Topic Name & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-bold mb-1.5">
                Topic Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#4b286d]/20 focus:border-[#4b286d] outline-hidden font-medium"
                placeholder="e.g. Weekly Operations & Governance Review, Strategic Finance"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                Duration (Minutes)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="180"
                  step="5"
                  value={durationMinutes}
                  onChange={(e) => {
                    setDurationMinutes(Number(e.target.value) || 15);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#4b286d]/20 focus:border-[#4b286d] outline-hidden font-medium"
                />
                <span className="text-slate-500 font-medium">mins</span>
              </div>
            </div>
          </div>

          {/* Section 2: Standing Lead & Cadence (Key User Requirements) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#fbf9fd] border border-[#d8c8e8] rounded-lg">
            {/* Standing Lead */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-800 font-bold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#4b286d]" />
                  <span>Standing Lead</span>
                  <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-slate-500">Updated in all meetings</span>
              </div>
              <input
                type="text"
                required
                value={lead}
                onChange={(e) => {
                  setLead(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#4b286d]/20 focus:border-[#4b286d] bg-white outline-hidden font-semibold text-slate-900"
                placeholder="Name of Executive or Standing Lead"
              />
              {/* Quick Suggestion Chips */}
              <div className="mt-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Quick Select Lead:
                </span>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {leadSuggestions.slice(0, 8).map((suggested) => (
                    <button
                      key={suggested}
                      type="button"
                      onClick={() => {
                        setLead(suggested);
                        setHasUnsavedChanges(true);
                      }}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer ${
                        lead === suggested
                          ? 'bg-[#4b286d] text-white font-semibold'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {suggested}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cadence */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-800 font-bold flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-[#4b286d]" />
                  <span>Cadence</span>
                </label>
                <span className="text-[10px] text-slate-500">Regular frequency</span>
              </div>
              <select
                value={cadence}
                onChange={(e) => {
                  const newCadence = e.target.value as RecurringCadence;
                  setCadence(newCadence);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#4b286d]/20 focus:border-[#4b286d] bg-white outline-hidden font-semibold text-slate-900"
              >
                <option value="weekly">Weekly (Every Monday through Q1 2027)</option>
                <option value="bi-weekly">Bi-weekly (Every 2nd Monday through Q1 2027)</option>
                <option value="monthly">Monthly (Once per month through Q1 2027)</option>
                <option value="quarterly">Quarterly (Once per quarter through Q1 2027)</option>
                <option value="annually">Annually (Once per year through Q1 2027)</option>
              </select>

              {/* Cadence helper button */}
              <div className="mt-2.5 p-2 bg-white rounded-md border border-purple-100 flex flex-wrap items-center justify-between gap-1.5">
                <div className="text-[11px] text-slate-600 font-medium">
                  <span>Apply pattern:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleAutoApplyCadence('weekly')}
                    className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-[#4b286d] rounded-xs font-semibold text-[10px] transition-colors cursor-pointer"
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAutoApplyCadence('bi-weekly')}
                    className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-[#4b286d] rounded-xs font-semibold text-[10px] transition-colors cursor-pointer"
                  >
                    Bi-weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAutoApplyCadence('monthly')}
                    className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-[#4b286d] rounded-xs font-semibold text-[10px] transition-colors cursor-pointer"
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAutoApplyCadence('quarterly')}
                    className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-[#4b286d] rounded-xs font-semibold text-[10px] transition-colors cursor-pointer"
                  >
                    Quarterly
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAutoApplyCadence('annually')}
                    className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-[#4b286d] rounded-xs font-semibold text-[10px] transition-colors cursor-pointer"
                  >
                    Annually
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Topic Details & Source of Truth with Document Links */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-slate-700 font-bold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Discussion Notes, Description & Source of Truth</span>
              </label>
              <span className="text-[11px] text-slate-400">Supports paste URLs & document links</span>
            </div>
            <textarea
              rows={3}
              value={detail}
              onChange={(e) => {
                setDetail(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#4b286d]/20 focus:border-[#4b286d] outline-hidden leading-relaxed bg-white"
              placeholder="e.g. TCS MLT Capital Planning_Source of Truth_202610. Include operational context, deliverables, or attach doc links."
            />

            {/* Interactive Doc Link Inserter */}
            <DocLinkInsertHelper
              currentText={detail}
              onInsertLink={(newText) => {
                setDetail(newText);
                setHasUnsavedChanges(true);
              }}
            />
          </div>

          {/* Section 4: Interactive Meeting Dates Selector (Key User Requirement: edit dates and have it update in meetings) */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <CalendarCheck className="w-4 h-4 text-[#4b286d]" />
                    <span>Meeting Dates & Scheduled Mondays</span>
                  </h3>
                  <span className="bg-[#4b286d] text-white px-2 py-0.5 rounded-full font-bold text-[10px]">
                    {selectedMeetingIds.length} of {meetings.length} Mondays
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select which Monday meetings this returning topic appears on. Adding or removing dates will instantly update those meetings.
                </p>
              </div>

              {/* Quick Actions & Timeline Filter */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
                  <button
                    type="button"
                    onClick={() => setTimelineFilter('all')}
                    className={`px-2 py-0.5 rounded-xs font-medium text-[11px] cursor-pointer ${
                      timelineFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineFilter('q4-2026')}
                    className={`px-2 py-0.5 rounded-xs font-medium text-[11px] cursor-pointer ${
                      timelineFilter === 'q4-2026'
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Q4 2026
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineFilter('q1-2027')}
                    className={`px-2 py-0.5 rounded-xs font-medium text-[11px] cursor-pointer ${
                      timelineFilter === 'q1-2027'
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Q1 2027
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium text-[11px] cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium text-[11px] cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            {/* Checklist of All Mondays Grouped by Month */}
            <div className="space-y-3 max-h-72 overflow-y-auto p-3 bg-slate-50/70 border border-slate-200 rounded-lg">
              {Object.entries(meetingsByMonth).map(([month, monthMeetings]) => (
                <div key={month} className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                    <span>{month}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {monthMeetings.filter((m) => selectedMeetingIds.includes(m.id)).length} / {monthMeetings.length} Scheduled
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {monthMeetings.map((m) => {
                      const isSelected = selectedMeetingIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleMeeting(m.id)}
                          className={`p-2.5 rounded-md border text-left flex items-start justify-between gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-purple-50/80 border-[#4b286d] text-slate-900 shadow-2xs ring-1 ring-[#4b286d]/30'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs flex items-center gap-1">
                              <span>{m.displayDate}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {m.title}
                            </span>
                          </div>

                          <div
                            className={`w-4 h-4 rounded-xs shrink-0 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-[#4b286d] text-white'
                                : 'border border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {selectedMeetingIds.length === 0 ? (
              <span className="text-amber-700 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                No meetings selected. Saving will remove this topic from all meetings.
              </span>
            ) : (
              <span>
                Will appear on <strong className="text-slate-800">{selectedMeetingIds.length}</strong> Monday agendas
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-md hover:bg-slate-100 transition-colors text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-returning-topic-form"
              className="px-5 py-2 bg-[#4b286d] hover:bg-[#3b1f56] text-white font-bold rounded-md shadow-xs transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save & Update Meetings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
