import React, { useState, useMemo } from 'react';
import { useGovernance } from '../../context/GovernanceContext';
import {
  Archive,
  Search,
  Calendar,
  Clock,
  User,
  RotateCcw,
  ExternalLink,
  Copy,
  Check,
  FileText,
  CalendarCheck,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { CopyButton } from '../common/CopyButton';
import { renderDescriptionWithLinks } from '../../utils/linkUtils';

interface ArchivedAgendasViewProps {
  onOpenDetailedMeeting: (meetingId: string) => void;
  onNavigateToCalendar: () => void;
  onShowToast: (msg: string) => void;
}

export const ArchivedAgendasView: React.FC<ArchivedAgendasViewProps> = ({
  onOpenDetailedMeeting,
  onNavigateToCalendar,
  onShowToast,
}) => {
  const { meetings, reopenMeeting } = useGovernance();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [copiedMeetingId, setCopiedMeetingId] = useState<string | null>(null);

  // Filter for completed or archived meetings only
  const archivedMeetings = useMemo(() => {
    return meetings
      .filter((m) => m.status === 'completed' || m.status === 'archived')
      .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
  }, [meetings]);

  // Distinct months in archive
  const archiveMonths = useMemo(() => {
    return Array.from(new Set(archivedMeetings.map((m) => m.monthLabel || '')));
  }, [archivedMeetings]);

  // Filtered by search and month
  const filteredArchivedMeetings = useMemo(() => {
    return archivedMeetings.filter((meeting) => {
      const matchesMonth =
        selectedMonth === 'all' || meeting.monthLabel === selectedMonth;

      if (!matchesMonth) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const inTitle = meeting.title.toLowerCase().includes(q);
      const inDate = meeting.displayDate.toLowerCase().includes(q);
      const inItems = meeting.agendaItems.some(
        (i) =>
          i.topic.toLowerCase().includes(q) ||
          i.lead.toLowerCase().includes(q) ||
          (i.detail && i.detail.toLowerCase().includes(q))
      );

      return inTitle || inDate || inItems;
    });
  }, [archivedMeetings, selectedMonth, searchQuery]);

  // Overall archive stats
  const totalArchivedTopics = useMemo(() => {
    return archivedMeetings.reduce((sum, m) => sum + m.agendaItems.length, 0);
  }, [archivedMeetings]);

  const totalArchivedMinutes = useMemo(() => {
    return archivedMeetings.reduce(
      (sum, m) =>
        sum +
        m.agendaItems.reduce((iSum, i) => iSum + (Number(i.durationMinutes) || 0), 0),
      0
    );
  }, [archivedMeetings]);

  const handleCopyMeetingSummary = (meetingId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMeetingId(meetingId);
    onShowToast('Archived agenda summary copied to clipboard.');
    setTimeout(() => {
      setCopiedMeetingId((curr) => (curr === meetingId ? null : curr));
    }, 3000);
  };

  const handleRestoreMeeting = (meetingId: string, displayDate: string) => {
    reopenMeeting(meetingId);
    onShowToast(`Restored Mon, ${displayDate} back to the active Calendar View.`);
  };

  return (
    <div className="space-y-6">
      {/* Archive Header & Stat Banners */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Archived Agendas & Meeting History
                </h2>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Historical Records
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Repository of completed Weekly LT Monday sessions. Agendas are archived here and removed from the active calendar once finished.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs tabular-nums bg-slate-50 border border-slate-200/80 p-2.5 px-4 rounded-lg shrink-0">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Archived Sessions
              </span>
              <span className="text-base font-bold text-slate-900">
                {archivedMeetings.length}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-200" aria-hidden="true" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Topics Completed
              </span>
              <span className="text-base font-bold text-[#4b286d]">
                {totalArchivedTopics}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-200" aria-hidden="true" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Minutes Logged
              </span>
              <span className="text-base font-bold text-slate-800">
                {totalArchivedMinutes}m
              </span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-1 sm:flex-initial items-center gap-2 max-w-sm w-full">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search archived topics, leads, or dates..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-[#4b286d] focus:border-[#4b286d]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium text-[11px]">Filter Month:</span>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedMonth('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  selectedMonth === 'all'
                    ? 'bg-[#4b286d] text-white font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({archivedMeetings.length})
              </button>
              {archiveMonths.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMonth(m)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    selectedMonth === m
                      ? 'bg-[#4b286d] text-white font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main List of Archived Sessions */}
      {filteredArchivedMeetings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Archive className="w-6 h-6" />
          </div>
          {archivedMeetings.length === 0 ? (
            <div>
              <h3 className="text-base font-bold text-slate-800">
                No Completed Agendas in Archive
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4 leading-relaxed">
                When a Monday Weekly LT meeting finishes, click <strong>"Complete & Archive"</strong> on the Calendar View or Current Agenda view to archive it here and remove it from the calendar.
              </p>
              <button
                type="button"
                onClick={onNavigateToCalendar}
                className="px-4 py-2 bg-[#4b286d] hover:bg-[#3b1f56] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <span>Go to Active Calendar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                No Matching Archived Sessions
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                No archived agendas match your current search or month filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedMonth('all');
                }}
                className="text-xs text-[#4b286d] font-bold hover:underline"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredArchivedMeetings.map((meeting) => {
            const meetingDuration = meeting.agendaItems.reduce(
              (sum, item) => sum + (Number(item.durationMinutes) || 0),
              0
            );

            const summaryText = `--- ARCHIVED AGENDA: ${meeting.title} (${meeting.displayDate}) ---
Status: Completed & Archived
Total Duration: ${meetingDuration} minutes (${meeting.agendaItems.length} topics)
Location: ${meeting.location || 'Executive Meeting'}

TOPICS COVERED:
${meeting.agendaItems
  .map(
    (item, idx) =>
      `${idx + 1}. ${item.topic} (${item.durationMinutes}m) - Lead: ${item.lead}\n   ${item.detail || 'Completed standing governance topic.'}`
  )
  .join('\n\n')}`;

            return (
              <div
                key={meeting.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition-all"
              >
                {/* Meeting Header Bar */}
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <CalendarCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      Monday, {meeting.displayDate}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Archived
                    </span>
                    <span className="text-slate-400 font-mono">·</span>
                    <span className="text-slate-600 font-medium">
                      {meeting.title} ({meeting.monthLabel})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyMeetingSummary(meeting.id, summaryText)}
                      className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-md font-medium text-[11px] inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Copy archived agenda summary"
                    >
                      {copiedMeetingId === meeting.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Copy Summary</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenDetailedMeeting(meeting.id)}
                      className="px-2.5 py-1 bg-white border border-[#4b286d]/30 hover:bg-[#f4eff9] text-[#4b286d] rounded-md font-semibold text-[11px] inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Open full detailed view to email or export PDF"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>View & Email PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRestoreMeeting(meeting.id, meeting.displayDate)}
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-amber-50 hover:border-amber-300 text-slate-600 hover:text-amber-900 rounded-md font-medium text-[11px] inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                      title="Unarchive and restore this session back to the active calendar"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-500" />
                      <span>Restore to Calendar</span>
                    </button>
                  </div>
                </div>

                {/* Meeting Metadata Strip */}
                <div className="px-5 py-2.5 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Total Duration: <strong>{meetingDuration}m</strong> (Target: {meeting.targetDurationMinutes || 60}m)
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span>Location: {meeting.location || 'Executive Room & Virtual'}</span>
                  </div>

                  {meeting.archivedAt && (
                    <div className="text-slate-400 italic">
                      Archived on {new Date(meeting.archivedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  )}
                </div>

                {/* Topics Table */}
                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
                        <th className="py-1.5 px-3 w-8">#</th>
                        <th className="py-1.5 px-3">Completed Topic</th>
                        <th className="py-1.5 px-3 w-28">Standing Lead</th>
                        <th className="py-1.5 px-3 w-20 text-center">Duration</th>
                        <th className="py-1.5 px-3">Discussion Notes & Source of Truth</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {meeting.agendaItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400 italic text-xs">
                            No topics were scheduled in this archived session.
                          </td>
                        </tr>
                      ) : (
                        meeting.agendaItems.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              <span className="text-emerald-600 mr-1.5 font-bold">✓</span>
                              {item.topic}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 font-medium">
                              <span className="bg-slate-100 px-2 py-0.5 rounded-sm border border-slate-200/80 text-[11px]">
                                {item.lead}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] text-center tabular-nums">
                              {item.durationMinutes}m
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 leading-relaxed text-[11px]">
                              <div>
                                {renderDescriptionWithLinks(item.detail || 'Completed standing governance topic.')}
                              </div>
                              {item.deadline && (
                                <span className="ml-1 text-slate-400">
                                  (Deadline: {item.deadline})
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
