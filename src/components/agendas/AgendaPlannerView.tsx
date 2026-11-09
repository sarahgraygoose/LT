import React, { useState, useMemo } from 'react';
import { useGovernance, getTodayDateStr } from '../../context/GovernanceContext';
import { AgendaItem, GovernanceMeeting, RecurringCadence } from '../../types/governance';
import { CopyButton } from '../common/CopyButton';
import {
  Calendar,
  Clock,
  User,
  Plus,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  CalendarCheck,
  CalendarDays,
  FileText,
  Repeat,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ListOrdered,
  Radio,
  Check,
  X,
  Wand2,
  AlertCircle,
  CheckCircle2,
  Archive,
  RotateCcw,
  History,
  ArrowRight,
  Mail,
  Link2,
  ExternalLink,
  FileSpreadsheet,
  Presentation,
} from 'lucide-react';
import { EditRecurringTopicModal, RecurringSeriesData } from './EditRecurringTopicModal';
import { ArchivedAgendasView } from './ArchivedAgendasView';
import { EmailAgendaModal } from './EmailAgendaModal';
import {
  renderDescriptionWithLinks,
  extractDocLinks,
  addLinkToText,
  removeLinkFromText,
  DocLinkInsertHelper,
} from '../../utils/linkUtils';

interface AgendaPlannerViewProps {
  onOpenAddItemModal: () => void;
}

type PlannerViewMode = 'calendar' | 'detailed' | 'cadence' | 'archive';

export const AgendaPlannerView: React.FC<AgendaPlannerViewProps> = ({ onOpenAddItemModal }) => {
  const {
    meetings,
    activeMeetingId,
    activeMeeting,
    setActiveMeetingId,
    updateAgendaItem,
    deleteAgendaItem,
    reorderAgendaItems,
    deleteRecurringSeries,
    updateRecurringSeries,
    removeDateFromRecurringSeries,
    addDateToRecurringSeries,
    rescheduleRecurringSeries,
    completeAndArchiveMeeting,
    reopenMeeting,
    archivePastMeetings,
  } = useGovernance();

  const [viewMode, setViewMode] = useState<PlannerViewMode>('calendar');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AgendaItem>>({});

  // Archive / Complete Meeting Modal
  const [meetingToComplete, setMeetingToComplete] = useState<GovernanceMeeting | null>(null);

  // Email LT Agenda PDF Modal
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedMeetingForEmail, setSelectedMeetingForEmail] = useState<GovernanceMeeting | null>(null);

  // Recurring Series Editing & Interactions
  const [editingSeries, setEditingSeries] = useState<RecurringSeriesData | null>(null);
  const [isEditSeriesModalOpen, setIsEditSeriesModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [inlineEditingLeadSeriesId, setInlineEditingLeadSeriesId] = useState<string | null>(null);
  const [inlineLeadValue, setInlineLeadValue] = useState<string>('');
  const [openAddDateDropdownSeriesId, setOpenAddDateDropdownSeriesId] = useState<string | null>(null);
  const [editingDescriptionSeriesId, setEditingDescriptionSeriesId] = useState<string | null>(null);
  const [editDescriptionValue, setEditDescriptionValue] = useState<string>('');
  const [addingLinkSeriesId, setAddingLinkSeriesId] = useState<string | null>(null);
  const [newDocTitle, setNewDocTitle] = useState<string>('');
  const [newDocUrl, setNewDocUrl] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  // Dynamically find the Current Agenda meeting (in progress or upcoming, not archived)
  const currentActiveMeeting = useMemo(() => {
    // 1. If activeMeeting is explicit and not archived, use it
    if (activeMeeting && activeMeeting.status !== 'completed' && activeMeeting.status !== 'archived') {
      return activeMeeting;
    }
    // 2. Look for meeting with status === 'active'
    const explicitActive = meetings.find((m) => m.status === 'active');
    if (explicitActive) return explicitActive;
    // 3. Look for first upcoming non-completed meeting in timeline
    const firstUpcoming = meetings.find(
      (m) => m.status !== 'completed' && m.status !== 'archived'
    );
    if (firstUpcoming) return firstUpcoming;
    // 4. Fallback to activeMeeting or first meeting
    return activeMeeting || meetings[0];
  }, [meetings, activeMeeting]);

  const currentMeeting = activeMeeting || currentActiveMeeting;

  // Dedicated list of completed/archived meetings (removed from calendar view)
  const archivedMeetings = useMemo(() => {
    return meetings.filter((m) => m.status === 'completed' || m.status === 'archived');
  }, [meetings]);

  const passedUnarchivedMeetings = useMemo(() => {
    const today = getTodayDateStr();
    return meetings.filter(
      (m) => m.date < today && m.status !== 'completed' && m.status !== 'archived'
    );
  }, [meetings]);

  const handleConfirmComplete = () => {
    if (!meetingToComplete) return;
    const { archivedDate, nextDate } = completeAndArchiveMeeting(meetingToComplete.id);
    setMeetingToComplete(null);
    if (nextDate) {
      showToast(`Archived agenda for Mon, ${archivedDate} (moved to Archived Agendas). Current Agenda updated to next session: Mon, ${nextDate}.`);
    } else {
      showToast(`Archived agenda for Mon, ${archivedDate} (moved to Archived Agendas). All scheduled sessions completed.`);
    }
  };

  // Calendar View ONLY shows active & upcoming meetings (completed/archived are strictly removed)
  const calendarMeetings = useMemo(() => {
    const list = meetings.filter((m) => m.status !== 'completed' && m.status !== 'archived');
    if (selectedMonthFilter === 'all') return list;
    if (selectedMonthFilter === 'q4-2026') return list.filter((m) => m.date.startsWith('2026'));
    if (selectedMonthFilter === 'q1-2027') return list.filter((m) => m.date.startsWith('2027'));
    return list.filter((m) => m.monthLabel === selectedMonthFilter);
  }, [meetings, selectedMonthFilter]);

  // Distinct months across Q4 2026 and Q1 2027
  const monthLabels = useMemo(() => {
    return Array.from(new Set(meetings.map((m) => m.monthLabel || '')));
  }, [meetings]);

  // Aggregate recurring topic series across the year
  const recurringSeriesList = useMemo((): RecurringSeriesData[] => {
    const seriesMap = new Map<string, RecurringSeriesData>();

    meetings.forEach((m) => {
      m.agendaItems.forEach((item) => {
        if (item.seriesId && item.recurringCadence && item.recurringCadence !== 'none') {
          if (!seriesMap.has(item.seriesId)) {
            seriesMap.set(item.seriesId, {
              seriesId: item.seriesId,
              topic: item.topic,
              lead: item.lead,
              durationMinutes: item.durationMinutes,
              cadence: item.recurringCadence,
              detail: item.detail,
              meetingDates: [],
            });
          }
          const entry = seriesMap.get(item.seriesId)!;
          entry.meetingDates.push({ id: m.id, displayDate: m.displayDate, date: m.date });
        }
      });
    });

    const list = Array.from(seriesMap.values());
    list.forEach((s) => s.meetingDates.sort((a, b) => a.date.localeCompare(b.date)));
    return list;
  }, [meetings]);

  // Selected meeting stats
  const totalAllocatedMinutes = currentMeeting.agendaItems.reduce(
    (sum, item) => sum + (Number(item.durationMinutes) || 0),
    0
  );
  const targetDuration = currentMeeting.targetDurationMinutes || 60;
  const remainingMinutes = targetDuration - totalAllocatedMinutes;

  // Active meeting index for prev/next Monday stepper
  const currentMeetingIndex = meetings.findIndex((m) => m.id === currentMeeting.id);

  // Copy agenda format
  const agendaShareText = `--- ${currentMeeting.title} Current Agenda (${currentMeeting.displayDate}) ---
Time Target: ${targetDuration} mins (Allocated: ${totalAllocatedMinutes} mins)
Location: ${currentMeeting.location || 'Executive Meeting'}

TOPICS:
${currentMeeting.agendaItems
  .map(
    (item, idx) =>
      `${idx + 1}. ${item.topic} [${item.durationMinutes} mins] - Lead: ${item.lead}${
        item.recurringCadence && item.recurringCadence !== 'none'
          ? ` (${item.recurringCadence.toUpperCase()})`
          : ''
      }\n   Detail: ${item.detail}${item.deadline ? ` (Deadline: ${item.deadline})` : ''}`
  )
  .join('\n\n')}

Source: Product & Services LT Agendas - Active`;

  const handleStartEdit = (item: AgendaItem) => {
    setEditingItemId(item.id);
    setEditForm(item);
  };

  const handleSaveEdit = (itemId: string) => {
    if (editingItemId) {
      updateAgendaItem(currentMeeting.id, itemId, editForm);
      setEditingItemId(null);
      setEditForm({});
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Governance Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Product & Services LT Agendas - Active</span>
            <span aria-hidden="true">·</span>
            <span>Weekly LT Cadence Planner (Q4 2026 – Q1 2027)</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Weekly LT Calendar
          </h1>
        </div>

        {/* View Switcher: Calendar View vs Current Agenda vs Returning Topics */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                viewMode === 'calendar'
                  ? 'bg-[#4b286d] text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Calendar View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                viewMode === 'detailed'
                  ? 'bg-[#4b286d] text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Current Agenda</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cadence')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                viewMode === 'cadence'
                  ? 'bg-[#4b286d] text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Returning Topics</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('archive')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                viewMode === 'archive'
                  ? 'bg-[#4b286d] text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archived Agendas</span>
              {archivedMeetings.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    viewMode === 'archive'
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {archivedMeetings.length}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenAddItemModal}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#4b286d] rounded-md hover:bg-[#3b1f56] transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Topic</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: CALENDAR VIEW FOR ALL MONDAYS FOR THE REST OF THE YEAR & Q1 2027 */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          {/* Passed Meetings Notice */}
          {passedUnarchivedMeetings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-3 text-amber-900 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-amber-950">
                    Previous meeting session{passedUnarchivedMeetings.length > 1 ? 's have' : ' has'} completed
                  </p>
                  <p className="text-[11px] text-amber-800">
                    {passedUnarchivedMeetings.map((m) => `Mon, ${m.displayDate}`).join(', ')} passed. Click <strong>"Complete & Archive"</strong> to archive {passedUnarchivedMeetings.length > 1 ? 'them' : 'it'} and roll the <strong>Current Agenda</strong> forward to the next session.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const count = archivePastMeetings();
                    showToast(`Archived ${count} past meeting session${count > 1 ? 's' : ''}. Current Agenda updated to next session.`);
                  }}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-md font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Archive Passed Session{passedUnarchivedMeetings.length > 1 ? 's' : ''} Now</span>
                </button>
              </div>
            </div>
          )}

          {/* Calendar Header with Timeline Filter & Archive Access */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2.5 text-xs shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
              {/* Notice & Scope indicator */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#4b286d]" />
                  Active & Upcoming Mondays
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-500 font-medium">
                  <strong>{calendarMeetings.length}</strong> scheduled sessions
                </span>
              </div>

              {/* Stats Counters & Archive Shortcut */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-slate-600 tabular-nums">
                  <span className="text-[#4b286d] font-semibold flex items-center gap-1.5 bg-[#f4eff9] px-2.5 py-1 rounded-md border border-[#e5d8f2]">
                    <Radio className="w-3 h-3 text-[#4b286d] animate-pulse" />
                    Current Agenda: Mon, {currentActiveMeeting.displayDate}
                  </span>
                </div>

                {archivedMeetings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setViewMode('archive')}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200/80"
                    title="View completed and archived agendas removed from calendar view"
                  >
                    <Archive className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Archived Agendas ({archivedMeetings.length})</span>
                    <ArrowRight className="w-3 h-3 text-emerald-700" />
                  </button>
                )}
              </div>
            </div>

            {/* Timeline Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                Timeline:
              </span>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedMonthFilter('all')}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    selectedMonthFilter === 'all'
                      ? 'bg-[#4b286d] text-white font-semibold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All Months
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMonthFilter('q4-2026')}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    selectedMonthFilter === 'q4-2026'
                      ? 'bg-[#4b286d] text-white font-semibold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Q4 2026
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMonthFilter('q1-2027')}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    selectedMonthFilter === 'q1-2027'
                      ? 'bg-[#4b286d] text-white font-semibold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Q1 2027
                </button>
                {monthLabels.map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setSelectedMonthFilter(lbl)}
                    className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      selectedMonthFilter === lbl
                        ? 'bg-[#4b286d] text-white font-semibold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {lbl.replace(' 2026', " '26").replace(' 2027', " '27")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Monday Cards Calendar Matrix - ACTIVE & UPCOMING SESSIONS ONLY */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {calendarMeetings.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-200 rounded-xl p-10 text-center shadow-xs">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  No Upcoming Sessions in Selected Timeline
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4 leading-relaxed">
                  All sessions in this period have completed and have been moved to the <strong>Archived Agendas</strong> page.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMonthFilter('all')}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold cursor-pointer"
                  >
                    View All Upcoming Months
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('archive')}
                    className="px-3.5 py-1.5 bg-[#4b286d] hover:bg-[#3b1f56] text-white rounded-md text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Open Archived Agendas ({archivedMeetings.length})</span>
                  </button>
                </div>
              </div>
            ) : (
              calendarMeetings.map((meeting: GovernanceMeeting) => {
                const allocated = meeting.agendaItems.reduce(
                  (sum: number, i: AgendaItem) => sum + (Number(i.durationMinutes) || 0),
                  0
                );
                const target = meeting.targetDurationMinutes || 60;
                const isSelected = meeting.id === activeMeetingId;
                const isFull = allocated >= target;
                
                const isCurrentAgenda = meeting.id === currentActiveMeeting.id;
                const isDatePassed = meeting.date < getTodayDateStr();

                return (
                  <div
                    key={meeting.id}
                    onClick={() => {
                      setActiveMeetingId(meeting.id);
                    }}
                    className={`border rounded-lg p-3.5 transition-all shadow-xs flex flex-col justify-between cursor-pointer group hover:shadow-md ${
                      isCurrentAgenda
                        ? 'bg-[#f8f5fa] border-2 border-[#4b286d] ring-2 ring-[#4b286d]/30 shadow-md relative overflow-hidden'
                        : isDatePassed
                        ? 'bg-amber-50/40 border-amber-300'
                        : isSelected
                        ? 'bg-white border-2 border-[#4b286d]/60 ring-1 ring-[#4b286d]/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      {/* Top Status Banner */}
                      {isCurrentAgenda && (
                        <div className="mb-2.5 -mx-3.5 -mt-3.5 px-3 py-1.5 bg-[#4b286d] text-white flex items-center justify-between shadow-xs">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
                            <Radio className="w-3 h-3 text-[#e5d8f2] animate-pulse" />
                            Current Agenda
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMeetingToComplete(meeting);
                            }}
                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xs text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title="Complete meeting and move agenda to archive"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Complete & Archive</span>
                          </button>
                        </div>
                      )}

                      {isDatePassed && !isCurrentAgenda && (
                        <div className="mb-2.5 -mx-3.5 -mt-3.5 px-3 py-1 bg-amber-100/90 text-amber-900 border-b border-amber-200 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold">
                            <Clock className="w-3 h-3 text-amber-700" />
                            Session Passed
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMeetingToComplete(meeting);
                            }}
                            className="px-2 py-0.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xs text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="Complete and archive this passed meeting"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Complete & Archive</span>
                          </button>
                        </div>
                      )}

                      {/* Monday Date Lockup */}
                      <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-bold text-sm ${
                                isCurrentAgenda ? 'text-[#4b286d]' : 'text-slate-900'
                              }`}
                            >
                              Mon, {meeting.displayDate}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {meeting.title} · {meeting.monthLabel}
                          </div>
                        </div>

                        {/* Capacity badge */}
                        <div className="text-right tabular-nums">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-sm ${
                              isCurrentAgenda
                                ? 'bg-[#4b286d] text-white font-bold'
                                : allocated > target
                                ? 'bg-red-50 text-red-700'
                                : isFull
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {allocated}m / {target}m
                          </span>
                        </div>
                      </div>

                      {/* Agenda items list */}
                      <div className="space-y-1.5 my-2">
                        {meeting.agendaItems.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 text-xs italic">
                            No topics scheduled yet
                          </div>
                        ) : (
                          meeting.agendaItems.map((item: AgendaItem) => (
                            <div
                              key={item.id}
                              className={`p-1.5 rounded-md border text-xs transition-colors ${
                                isCurrentAgenda
                                  ? 'bg-white border-[#d8c8e8] hover:border-[#4b286d]'
                                  : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-medium line-clamp-1 text-slate-900">
                                  {item.topic}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono shrink-0 tabular-nums">
                                  {item.durationMinutes}m
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 mt-0.5">
                                <span className="truncate">{item.lead}</span>
                                {item.recurringCadence && item.recurringCadence !== 'none' && (
                                  <span className="text-[10px] text-[#4b286d] font-semibold inline-flex items-center gap-0.5 shrink-0 bg-[#f4eff9] px-1 py-0.2 rounded-xs">
                                    <Repeat className="w-2.5 h-2.5" />
                                    {item.recurringCadence}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Card Bottom: Quick Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs mt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMeetingId(meeting.id);
                          setViewMode('detailed');
                        }}
                        className="text-[#4b286d] hover:text-[#3b1f56] font-semibold cursor-pointer"
                      >
                        {isCurrentAgenda ? 'Open Current Agenda →' : 'View Agenda →'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMeetingForEmail(meeting);
                            setIsEmailModalOpen(true);
                          }}
                          className="px-2 py-0.5 text-[#4b286d] hover:bg-[#f4eff9] rounded-md font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="Email PDF of this agenda"
                        >
                          <Mail className="w-3 h-3 text-[#4b286d]" />
                          <span>PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMeetingToComplete(meeting);
                          }}
                          className="px-2 py-0.5 text-emerald-700 hover:bg-emerald-50 rounded-md font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="Complete meeting and archive agenda"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Complete</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMeetingId(meeting.id);
                            onOpenAddItemModal();
                          }}
                          className="text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer px-1.5 py-0.5"
                          title="Add topic to this meeting"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: CURRENT AGENDA VIEW (renamed from Monday Agenda) */}
      {viewMode === 'detailed' && (
        <div className="space-y-4">
          {/* Current Meeting Stepper */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentMeetingIndex <= 0}
                onClick={() => {
                  if (currentMeetingIndex > 0) {
                    setActiveMeetingId(meetings[currentMeetingIndex - 1].id);
                  }
                }}
                className="p-1 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Previous Monday"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={currentMeeting.id}
                onChange={(e) => setActiveMeetingId(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-md bg-white font-semibold text-slate-900 text-xs focus:outline-[#4b286d]"
              >
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    Monday, {m.displayDate} · {m.title} ({m.agendaItems.length} topics)
                    {m.id === currentActiveMeeting.id && m.status !== 'completed' && m.status !== 'archived'
                      ? ' [Current Agenda]'
                      : m.status === 'completed' || m.status === 'archived'
                      ? ' [Archived]'
                      : ''}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={currentMeetingIndex >= meetings.length - 1}
                onClick={() => {
                  if (currentMeetingIndex < meetings.length - 1) {
                    setActiveMeetingId(meetings[currentMeetingIndex + 1].id);
                  }
                }}
                className="p-1 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Next Monday"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 tabular-nums">
              <span className="inline-flex items-center gap-1 text-slate-600">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Allocated: <strong className="text-slate-900 font-semibold">{totalAllocatedMinutes}m</strong> / {targetDuration}m
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>
                {remainingMinutes >= 0 ? (
                  <span className="text-[#4b286d] font-semibold">{remainingMinutes}m available buffer</span>
                ) : (
                  <span className="text-red-600 font-semibold">{Math.abs(remainingMinutes)}m overtime</span>
                )}
              </span>

              {/* Complete & Archive Agenda Button */}
              {currentMeeting.status === 'completed' || currentMeeting.status === 'archived' ? (
                <button
                  type="button"
                  onClick={() => {
                    reopenMeeting(currentMeeting.id);
                    showToast(`Reopened agenda for Mon, ${currentMeeting.displayDate}.`);
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-md font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Reopen archived agenda"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reopen Agenda</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMeetingToComplete(currentMeeting)}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  title="Complete session and archive this agenda"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Complete & Archive Agenda</span>
                </button>
              )}

              <CopyButton
                textToCopy={agendaShareText}
                label="Copy Current Agenda"
                variant="secondary"
              />

              <button
                type="button"
                onClick={() => {
                  setSelectedMeetingForEmail(currentMeeting);
                  setIsEmailModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-[#4b286d] hover:bg-[#3b1f56] text-white rounded-md font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="Email Leadership Team a beautifully formatted PDF of this agenda"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email LT (PDF)</span>
              </button>
            </div>
          </div>

          {/* Current Agenda Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-[#4b286d]" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Current Agenda · Monday, {currentMeeting.displayDate} ({currentMeeting.title})
                </h2>
                {currentMeeting.status === 'completed' || currentMeeting.status === 'archived' ? (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-xs uppercase tracking-wider inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Archived Agenda
                  </span>
                ) : currentMeeting.id === currentActiveMeeting.id ? (
                  <span className="bg-[#4b286d] text-white text-[10px] font-bold px-2 py-0.5 rounded-xs uppercase tracking-wider inline-flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5 text-[#e5d8f2] animate-pulse" />
                    Current Agenda (In Progress)
                  </span>
                ) : (
                  <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-xs uppercase tracking-wider">
                    Scheduled Session
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 tabular-nums">
                {currentMeeting.agendaItems.length} Topics {currentMeeting.status === 'completed' ? 'Archived' : 'Planned'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/75 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3 w-10">#</th>
                    <th className="py-2.5 px-4 w-72">Topic (both ad-hoc and standing)</th>
                    <th className="py-2.5 px-3 w-24 text-center">Time</th>
                    <th className="py-2.5 px-4">Detail & Source of Truth</th>
                    <th className="py-2.5 px-4 w-44">Lead</th>
                    <th className="py-2.5 px-3 w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentMeeting.agendaItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No agenda items scheduled for this Monday. Click "Add Topic" to plan items.
                      </td>
                    </tr>
                  ) : (
                    currentMeeting.agendaItems.map((item, index) => {
                      const isEditing = editingItemId === item.id;

                      if (isEditing) {
                        return (
                          <tr key={item.id} className="bg-[#f8f5fc]">
                            <td className="py-2 px-3 text-slate-400 tabular-nums">{index + 1}</td>
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                value={editForm.topic || ''}
                                onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded-sm bg-white"
                                placeholder="Topic name"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={editForm.durationMinutes || ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, durationMinutes: Number(e.target.value) })
                                }
                                className="w-16 px-1.5 py-1 text-xs border border-slate-300 rounded-sm text-center bg-white tabular-nums mx-auto block"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <textarea
                                value={editForm.detail || ''}
                                onChange={(e) => setEditForm({ ...editForm, detail: e.target.value })}
                                rows={2}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded-sm bg-white"
                                placeholder="Detail & document links"
                              />
                              <DocLinkInsertHelper
                                currentText={editForm.detail || ''}
                                onInsertLink={(newText) => setEditForm({ ...editForm, detail: newText })}
                                className="mt-1"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                value={editForm.lead || ''}
                                onChange={(e) => setEditForm({ ...editForm, lead: e.target.value })}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded-sm bg-white"
                                placeholder="Lead presenter"
                              />
                            </td>
                            <td className="py-2 px-3 text-right space-x-1">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(item.id)}
                                className="px-2 py-1 text-xs font-medium text-white bg-[#4b286d] rounded-xs hover:bg-[#3b1f56]"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingItemId(null)}
                                className="px-1.5 py-1 text-xs text-slate-600 hover:text-slate-900"
                              >
                                Cancel
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="py-3 px-3 text-slate-400 tabular-nums align-top font-medium">
                            {index + 1}
                          </td>
                          <td className="py-3 px-4 align-top">
                            <div className="font-semibold text-slate-900 text-xs">
                              {item.topic}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                              <span>{item.type}</span>
                              {item.recurringCadence && item.recurringCadence !== 'none' && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-[#4b286d] font-semibold inline-flex items-center gap-0.5 bg-[#f4eff9] px-1 py-0.2 rounded-xs">
                                    <Repeat className="w-2.5 h-2.5" />
                                    {item.recurringCadence}
                                  </span>
                                </>
                              )}
                              {item.deadline && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-amber-800 font-medium">
                                    Deadline: {item.deadline}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center align-top tabular-nums">
                            <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-sm">
                              {item.durationMinutes}m
                            </span>
                          </td>
                          <td className="py-3 px-4 align-top text-slate-700 leading-relaxed">
                            <div className="whitespace-pre-line leading-relaxed">
                              {renderDescriptionWithLinks(item.detail)}
                            </div>
                          </td>
                          <td className="py-3 px-4 align-top text-slate-900 font-medium">
                            <div className="inline-flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{item.lead}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 align-top text-right">
                            <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(item)}
                                className="p-1 text-slate-400 hover:text-slate-800 transition-colors rounded-xs"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => reorderAgendaItems(currentMeeting.id, index, index - 1)}
                                  className="p-1 text-slate-400 hover:text-slate-800 transition-colors rounded-xs"
                                  title="Move Up"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {index < currentMeeting.agendaItems.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => reorderAgendaItems(currentMeeting.id, index, index + 1)}
                                  className="p-1 text-slate-400 hover:text-slate-800 transition-colors rounded-xs"
                                  title="Move Down"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteAgendaItem(currentMeeting.id, item.id)}
                                className="p-1 text-slate-400 hover:text-red-700 transition-colors rounded-xs"
                                title="Delete"
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
              <span>Sheet: Product & Services LT Agendas - 2026 - Active</span>
              <button
                type="button"
                onClick={onOpenAddItemModal}
                className="text-[#4b286d] hover:text-[#3b1f56] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Item to Current Agenda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: RETURNING TOPICS & REGULAR CADENCE PLANNER */}
      {viewMode === 'cadence' && (
        <div className="space-y-4">
          {/* Toast Notification Banner */}
          {toastMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs flex items-center justify-between gap-3 shadow-xs transition-all animate-fadeIn">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{toastMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded-sm hover:bg-emerald-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-[#4b286d]" />
                  <span>Returning Topics Planned Through Q1 2027</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standing executive agenda items appearing on a regular cadence across every Monday session through Q1 2027.
                  You can edit the dates, standing lead, and cadence directly below or open the full schedule editor.
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenAddItemModal}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#4b286d] rounded-md hover:bg-[#3b1f56] transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Returning Topic</span>
              </button>
            </div>

            {/* List of Recurring Topic Series */}
            <div className="divide-y divide-slate-100 mt-2">
              {recurringSeriesList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No recurring series configured. Click "Add Returning Topic" to establish a regular cadence.
                </div>
              ) : (
                recurringSeriesList.map((series) => {
                  const isInlineEditingLead = inlineEditingLeadSeriesId === series.seriesId;
                  const isAddDateDropdownOpen = openAddDateDropdownSeriesId === series.seriesId;
                  const isEditingDescription = editingDescriptionSeriesId === series.seriesId;
                  const isAddingLink = addingLinkSeriesId === series.seriesId;
                  const docLinks = extractDocLinks(series.detail);

                  // Available Mondays not yet scheduled for this topic
                  const scheduledMeetingIds = new Set(series.meetingDates.map((m) => m.id));
                  const availableMondays = meetings.filter((m) => !scheduledMeetingIds.has(m.id));

                  return (
                    <div key={series.seriesId} className="py-5 space-y-3.5 text-xs">
                      {/* Top Row: Title, Badges & Action Buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1 max-w-3xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-base">{series.topic}</h3>
                            <span className="text-[11px] font-semibold text-[#4b286d] bg-[#f4eff9] px-2.5 py-0.5 rounded-sm capitalize border border-purple-100">
                              {series.cadence} Cadence
                            </span>
                            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-sm tabular-nums text-[11px]">
                              {series.durationMinutes} mins / session
                            </span>
                          </div>

                          {/* Editable Description Section */}
                          {isEditingDescription ? (
                            <div className="p-3 bg-[#fbf9fd] border border-[#d8c8e8] rounded-lg space-y-2 mt-1 animate-fadeIn">
                              <label className="block text-[11px] font-bold text-slate-700">
                                Edit Topic Description / Operational Notes:
                              </label>
                              <textarea
                                value={editDescriptionValue}
                                onChange={(e) => setEditDescriptionValue(e.target.value)}
                                rows={3}
                                className="w-full p-2.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-[#4b286d] font-medium leading-relaxed"
                                placeholder="Topic description, operational notes, deliverables..."
                                autoFocus
                              />
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-500">
                                  Updates description across all {series.meetingDates.length} scheduled meetings.
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingDescriptionSeriesId(null)}
                                    className="px-2.5 py-1 text-slate-500 hover:text-slate-700 font-medium text-xs cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateRecurringSeries(series.seriesId, { detail: editDescriptionValue.trim() });
                                      showToast(`Description updated for "${series.topic}".`);
                                      setEditingDescriptionSeriesId(null);
                                    }}
                                    className="px-3 py-1 bg-[#4b286d] hover:bg-[#3b1f56] text-white rounded text-xs font-bold cursor-pointer shadow-xs"
                                  >
                                    Save Notes
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-slate-600 leading-relaxed text-xs">
                                {renderDescriptionWithLinks(
                                  series.detail || 'Standing agenda topic scheduled across regular Monday governance meetings.'
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDescriptionSeriesId(series.seriesId);
                                  setEditDescriptionValue(series.detail || '');
                                }}
                                className="text-[#4b286d] hover:underline text-[11px] font-bold shrink-0 cursor-pointer ml-2"
                                title="Edit topic description text"
                              >
                                Edit Notes
                              </button>
                            </div>
                          )}

                          {/* Document Links Manager: Clear place to add document links when wanted */}
                          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                <Link2 className="w-3.5 h-3.5 text-[#4b286d]" />
                                <span>Document Links:</span>
                              </span>

                              {docLinks.length === 0 ? (
                                <span className="text-slate-400 text-[11px] italic">
                                  None attached (click "+ Add Document Link" whenever you want to link a document)
                                </span>
                              ) : (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {docLinks.map((link, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-[11px] bg-[#f4eff9] text-[#4b286d] border border-[#d8c8e8] shadow-2xs group"
                                    >
                                      <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 hover:underline cursor-pointer"
                                        title={`Open link in new tab: ${link.url}`}
                                      >
                                        {link.type === 'sheet' ? (
                                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                        ) : link.type === 'slides' ? (
                                          <Presentation className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                        ) : (
                                          <FileText className="w-3.5 h-3.5 text-[#4b286d] shrink-0" />
                                        )}
                                        <span>{link.label}</span>
                                        <ExternalLink className="w-3 h-3 text-[#4b286d]/70 group-hover:text-[#4b286d] shrink-0" />
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = removeLinkFromText(series.detail, link.url);
                                          updateRecurringSeries(series.seriesId, { detail: updated });
                                          showToast(`Removed document link "${link.label}".`);
                                        }}
                                        className="text-slate-400 hover:text-red-700 cursor-pointer p-0.5 rounded hover:bg-red-50 ml-0.5 transition-colors"
                                        title="Remove this document link"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setAddingLinkSeriesId(isAddingLink ? null : series.seriesId);
                                setNewDocTitle('');
                                setNewDocUrl('');
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-purple-50 text-[#4b286d] font-bold border border-[#d8c8e8] rounded-md transition-colors inline-flex items-center gap-1 text-[11px] cursor-pointer shadow-2xs"
                            >
                              <Plus className="w-3 h-3 text-[#4b286d]" />
                              <span>{isAddingLink ? 'Close' : '+ Add Document Link'}</span>
                            </button>
                          </div>

                          {/* Inline Form to Add Document Link */}
                          {isAddingLink && (
                            <div className="p-3 bg-[#fbf9fd] border border-[#d8c8e8] rounded-lg space-y-2 mt-2 animate-fadeIn">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-[#4b286d]" />
                                  <span>Attach Document Link to "{series.topic}"</span>
                                </span>
                                <span className="text-[10px] text-slate-500">Google Docs, Sheets, Slides, or SharePoint</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                    Document Label (Optional)
                                  </label>
                                  <input
                                    type="text"
                                    value={newDocTitle}
                                    onChange={(e) => setNewDocTitle(e.target.value)}
                                    placeholder="e.g. Operations Tracker, Q4 Delivery Sheet"
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-[#4b286d]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                    Document URL <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={newDocUrl}
                                    onChange={(e) => setNewDocUrl(e.target.value)}
                                    placeholder="Paste URL (e.g. https://docs.google.com/...)"
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-[#4b286d]"
                                    autoFocus
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[10px] text-slate-500">
                                  Link will appear on all scheduled sessions of this returning topic.
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setAddingLinkSeriesId(null)}
                                    className="px-2.5 py-1 text-slate-500 hover:text-slate-700 text-xs font-medium cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!newDocUrl.trim()}
                                    onClick={() => {
                                      if (newDocUrl.trim()) {
                                        const updated = addLinkToText(series.detail, newDocUrl, newDocTitle);
                                        updateRecurringSeries(series.seriesId, { detail: updated });
                                        showToast(`Document link added to "${series.topic}".`);
                                        setAddingLinkSeriesId(null);
                                        setNewDocTitle('');
                                        setNewDocUrl('');
                                      }
                                    }}
                                    className="px-3 py-1 bg-[#4b286d] hover:bg-[#3b1f56] disabled:opacity-40 text-white rounded text-xs font-bold cursor-pointer shadow-xs transition-colors"
                                  >
                                    Attach Link
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSeries(series);
                              setIsEditSeriesModalOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-[#4b286d] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Edit topic title, standing lead, cadence, and planned dates"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit Topic & Schedule</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete the entire recurring series for "${series.topic}" across all Mondays?`)) {
                                deleteRecurringSeries(series.seriesId);
                                showToast(`Removed returning topic "${series.topic}" from all meetings.`);
                              }
                            }}
                            className="px-2.5 py-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors text-xs font-medium cursor-pointer"
                            title="Delete entire series"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Middle Strip: Standing Lead and Cadence Editors */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg">
                        {/* 1. Standing Lead (Editable directly here) */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <User className="w-3.5 h-3.5 text-[#4b286d]" />
                            <span className="font-bold text-slate-700">Standing Lead:</span>
                          </div>

                          {isInlineEditingLead ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={inlineLeadValue}
                                onChange={(e) => setInlineLeadValue(e.target.value)}
                                className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white focus:outline-[#4b286d] font-bold text-slate-900 w-44 shadow-2xs"
                                placeholder="Lead name"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (inlineLeadValue.trim()) {
                                    updateRecurringSeries(series.seriesId, { lead: inlineLeadValue.trim() });
                                    showToast(`Standing lead for "${series.topic}" updated to "${inlineLeadValue.trim()}" across all meetings.`);
                                  }
                                  setInlineEditingLeadSeriesId(null);
                                }}
                                className="px-2.5 py-1 bg-[#4b286d] hover:bg-[#3b1f56] text-white rounded-md text-[11px] font-bold cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setInlineEditingLeadSeriesId(null)}
                                className="px-2 py-1 bg-white border border-slate-300 text-slate-600 rounded-md text-[11px] hover:bg-slate-100 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-sm border border-slate-200 shadow-2xs text-xs">
                                {series.lead}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setInlineEditingLeadSeriesId(series.seriesId);
                                  setInlineLeadValue(series.lead);
                                }}
                                className="text-[#4b286d] hover:underline text-[11px] font-bold cursor-pointer"
                              >
                                Change Lead
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 2. Cadence (Editable directly here) */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Repeat className="w-3.5 h-3.5 text-[#4b286d]" />
                            <span className="font-bold text-slate-700">Cadence:</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1">
                            {(['weekly', 'bi-weekly', 'monthly', 'quarterly', 'annually'] as RecurringCadence[]).map((c) => {
                              const isActive = series.cadence === c;
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => {
                                    if (!isActive) {
                                      updateRecurringSeries(series.seriesId, { cadence: c });
                                      showToast(`Cadence for "${series.topic}" set to ${c}.`);
                                    }
                                  }}
                                  className={`px-2 py-1 rounded-md text-[11px] capitalize font-medium transition-colors cursor-pointer ${
                                    isActive
                                      ? 'bg-[#4b286d] text-white font-bold shadow-2xs'
                                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  {c}
                                </button>
                              );
                            })}

                            <button
                              type="button"
                              onClick={() => {
                                rescheduleRecurringSeries(series.seriesId, series.cadence);
                                showToast(`Auto-rescheduled "${series.topic}" dates to match ${series.cadence} cadence.`);
                              }}
                              className="ml-1 px-2 py-1 bg-white hover:bg-slate-100 text-[#4b286d] border border-slate-200 rounded-md font-semibold text-[10px] inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                              title={`Apply ${series.cadence} schedule pattern across timeline`}
                            >
                              <Wand2 className="w-3 h-3" />
                              <span>Apply Schedule</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 3. Meeting Dates Planned Section (Editable) */}
                      <div className="pt-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <CalendarCheck className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                              Planned On {series.meetingDates.length} Mondays (Q4 2026 – Q1 2027):
                            </span>
                          </div>

                          <div className="flex items-center gap-2 relative">
                            {/* Add Monday Quick Dropdown */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenAddDateDropdownSeriesId(
                                    isAddDateDropdownOpen ? null : series.seriesId
                                  )
                                }
                                className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-md font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <Plus className="w-3 h-3 text-[#4b286d]" />
                                <span>Add Monday</span>
                              </button>

                              {isAddDateDropdownOpen && (
                                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto p-1.5 text-xs">
                                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                                    <span>Select Monday to Add:</span>
                                    <button
                                      type="button"
                                      onClick={() => setOpenAddDateDropdownSeriesId(null)}
                                      className="text-slate-400 hover:text-slate-600"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {availableMondays.length === 0 ? (
                                    <div className="p-3 text-slate-400 text-center text-[11px]">
                                      All Mondays are already scheduled.
                                    </div>
                                  ) : (
                                    availableMondays.map((m) => (
                                      <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => {
                                          addDateToRecurringSeries(series.seriesId, m.id);
                                          showToast(`Added "${series.topic}" to ${m.displayDate} meeting agenda.`);
                                          setOpenAddDateDropdownSeriesId(null);
                                        }}
                                        className="w-full text-left px-2.5 py-1.5 hover:bg-purple-50 text-slate-800 rounded-md text-[11px] font-medium flex items-center justify-between cursor-pointer transition-colors"
                                      >
                                        <span className="font-semibold">{m.displayDate}</span>
                                        <span className="text-[10px] text-slate-400">{m.monthLabel}</span>
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Edit All Dates Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSeries(series);
                                setIsEditSeriesModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-[#4b286d]/10 hover:bg-[#4b286d]/20 text-[#4b286d] rounded-md font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <CalendarDays className="w-3.5 h-3.5" />
                              <span>Select / Edit All Dates</span>
                            </button>
                          </div>
                        </div>

                        {/* Interactive Date Pills with '×' Remove Button */}
                        {series.meetingDates.length === 0 ? (
                          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-md text-amber-800 text-xs flex items-center justify-between">
                            <span>
                              Not currently scheduled on any Monday meetings. Click <strong>"+ Add Monday"</strong> or <strong>"Select / Edit All Dates"</strong> to schedule.
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSeries(series);
                                setIsEditSeriesModalOpen(true);
                              }}
                              className="text-[#4b286d] underline font-bold text-xs"
                            >
                              Open Date Picker
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {series.meetingDates.map((m) => (
                              <div
                                key={m.id}
                                className="group inline-flex items-center bg-white border border-slate-200 rounded-md shadow-2xs hover:border-[#4b286d]/60 transition-colors text-[11px]"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMeetingId(m.id);
                                    setViewMode('detailed');
                                  }}
                                  className="px-2.5 py-1 font-semibold text-slate-800 hover:text-[#4b286d] cursor-pointer"
                                  title={`Click to view agenda for ${m.displayDate}`}
                                >
                                  {m.displayDate}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeDateFromRecurringSeries(series.seriesId, m.id);
                                    showToast(`Removed "${series.topic}" from ${m.displayDate} meeting.`);
                                  }}
                                  className="px-1.5 py-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-r-md transition-colors border-l border-slate-100 cursor-pointer"
                                  title={`Remove from ${m.displayDate} meeting`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: COMPLETED & ARCHIVED AGENDAS (REMOVED FROM CALENDAR VIEW) */}
      {viewMode === 'archive' && (
        <ArchivedAgendasView
          onOpenDetailedMeeting={(meetingId) => {
            setActiveMeetingId(meetingId);
            setViewMode('detailed');
          }}
          onNavigateToCalendar={() => setViewMode('calendar')}
          onShowToast={showToast}
        />
      )}

      {/* Edit Returning Topic Modal */}
      <EditRecurringTopicModal
        isOpen={isEditSeriesModalOpen}
        onClose={() => {
          setIsEditSeriesModalOpen(false);
          setEditingSeries(null);
        }}
        series={editingSeries}
        onSuccessToast={showToast}
      />

      {/* Complete & Archive Agenda Confirmation Modal */}
      {meetingToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Complete & Archive Agenda
                  </h3>
                  <p className="text-xs text-slate-500">
                    Monday, {meetingToComplete.displayDate} · {meetingToComplete.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMeetingToComplete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-600">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-900">
                <p className="font-semibold text-xs">
                  Mark this Monday's session as completed?
                </p>
                <p className="text-[11px] text-emerald-800 mt-1 leading-relaxed">
                  The agenda and all scheduled discussion topics will be archived in the governance history. The <strong>"Current Agenda"</strong> will automatically roll forward to the next scheduled Monday meeting.
                </p>
              </div>

              <div>
                <div className="font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Agenda Topics to Archive ({meetingToComplete.agendaItems.length}):</span>
                  <span className="font-mono text-slate-500">
                    {meetingToComplete.agendaItems.reduce((s, i) => s + (Number(i.durationMinutes) || 0), 0)} mins total
                  </span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50">
                  {meetingToComplete.agendaItems.length === 0 ? (
                    <p className="text-slate-400 italic text-center py-2">No topics scheduled in this session.</p>
                  ) : (
                    meetingToComplete.agendaItems.map((item, idx) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 p-1.5 bg-white border border-slate-100 rounded text-[11px]">
                        <span className="font-medium text-slate-800 truncate">
                          {idx + 1}. {item.topic}
                        </span>
                        <span className="text-slate-400 font-mono shrink-0">
                          {item.durationMinutes}m · {item.lead}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {(() => {
                const next = meetings.find(
                  (m) => m.id !== meetingToComplete.id && m.status !== 'completed' && m.status !== 'archived'
                );
                if (next) {
                  return (
                    <div className="p-2.5 bg-purple-50/70 border border-purple-200 rounded-md flex items-center gap-2 text-[11px] text-[#4b286d]">
                      <Radio className="w-3.5 h-3.5 shrink-0 text-[#4b286d]" />
                      <span>
                        Next Current Agenda: <strong>Monday, {next.displayDate}</strong> ({next.agendaItems.length} topics scheduled)
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMeetingToComplete(null)}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmComplete}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm & Archive Agenda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email LT Agenda PDF Modal */}
      {isEmailModalOpen && (
        <EmailAgendaModal
          isOpen={isEmailModalOpen}
          onClose={() => {
            setIsEmailModalOpen(false);
            setSelectedMeetingForEmail(null);
          }}
          meeting={selectedMeetingForEmail || currentMeeting}
          onShowToast={showToast}
        />
      )}
    </div>
  );
};
