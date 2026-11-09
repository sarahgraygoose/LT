import React, { useState } from 'react';
import { useGovernance } from '../../context/GovernanceContext';
import { RecurringCadence } from '../../types/governance';
import { X, Calendar, Repeat, FileText, Link2 } from 'lucide-react';
import { DocLinkInsertHelper } from '../../utils/linkUtils';

interface AddAgendaItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddAgendaItemModal: React.FC<AddAgendaItemModalProps> = ({ isOpen, onClose }) => {
  const {
    activeMeeting,
    meetings,
    addAgendaItem,
    addRecurringTopic,
    businessPartners,
    executivePairs,
    strategyLeads,
  } = useGovernance();

  const [topic, setTopic] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [detail, setDetail] = useState('');
  const [lead, setLead] = useState('');
  const [type, setType] = useState<'standing' | 'ad-hoc' | 'deep-dive'>('standing');
  const [deadline, setDeadline] = useState('');
  const [cadence, setCadence] = useState<RecurringCadence>('none');
  const [selectedMeetingId, setSelectedMeetingId] = useState(activeMeeting?.id || '');

  React.useEffect(() => {
    if (activeMeeting) {
      setSelectedMeetingId(activeMeeting.id);
    }
  }, [activeMeeting, isOpen]);

  if (!isOpen) return null;

  const currentMeeting = meetings.find((m) => m.id === selectedMeetingId) || activeMeeting || meetings[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    if (cadence !== 'none') {
      addRecurringTopic({
        topic: topic.trim(),
        durationMinutes: Number(durationMinutes) || 15,
        detail: detail.trim(),
        lead: lead.trim() || 'Leadership',
        type,
        deadline: deadline ? deadline : undefined,
        cadence,
        startMeetingId: currentMeeting.id,
      });
    } else {
      addAgendaItem(currentMeeting.id, {
        topic: topic.trim(),
        durationMinutes: Number(durationMinutes) || 15,
        detail: detail.trim(),
        lead: lead.trim() || 'Leadership',
        type,
        status: 'scheduled',
        deadline: deadline ? deadline : undefined,
        recurringCadence: 'none',
      });
    }

    setTopic('');
    setDurationMinutes(15);
    setDetail('');
    setLead('');
    setDeadline('');
    setCadence('none');
    onClose();
  };

  const leadSuggestions = [
    ...businessPartners.map((bp) => bp.name),
    ...executivePairs.map((ep) => ep.vpName),
    ...strategyLeads.map((sl) => sl.name),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Add Agenda Topic</h3>
            <p className="text-xs text-slate-500">
              Schedule for Monday sessions through Q1 2027
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Target Monday Session */}
          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Select Starting Monday Session
            </label>
            <select
              value={selectedMeetingId}
              onChange={(e) => setSelectedMeetingId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-[#4b286d] font-medium"
            >
              {meetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayDate} · {m.title} ({m.agendaItems.length} items planned)
                  {m.status === 'active' ? ' [Current Agenda]' : m.status === 'completed' || m.status === 'archived' ? ' [Archived]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Topic Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-[#4b286d]"
              placeholder="e.g. Weekly Operations & Governance Review, Strategic Finance, Architecture Review"
            />
          </div>

          {/* Returning Cadence Planning */}
          <div className="p-3 bg-[#fbf9fd] border border-[#d8c8e8] rounded-md space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-[#4b286d]">
              <Repeat className="w-3.5 h-3.5" />
              <span>Recurring Cadence (Plan through Q1 2027)</span>
            </div>
            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value as RecurringCadence)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-[#4b286d] font-medium text-xs"
            >
              <option value="none">One-time Topic (This Monday only)</option>
              <option value="weekly">Weekly (Every Monday through Q1 2027)</option>
              <option value="bi-weekly">Bi-weekly (Every 2nd Monday through Q1 2027)</option>
              <option value="monthly">Monthly (First Monday of each month through Q1 2027)</option>
              <option value="quarterly">Quarterly (First Monday of each quarter through Q1 2027)</option>
              <option value="annually">Annually (Once per year through Q1 2027)</option>
            </select>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {cadence === 'none' && 'This topic will only appear on the selected Monday.'}
              {cadence === 'weekly' && 'Automatically adds this topic to every scheduled Monday Weekly LT session through Q1 2027.'}
              {cadence === 'bi-weekly' && 'Automatically plans this topic every two weeks on matching Mondays through Q1 2027.'}
              {cadence === 'monthly' && 'Automatically places this topic on the first Monday session of each month (Oct through Mar 2027).'}
              {cadence === 'quarterly' && 'Automatically places this topic on the first Monday session of each calendar quarter.'}
              {cadence === 'annually' && 'Automatically places this topic on one Monday session per year.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Duration (Minutes) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="5"
                max="180"
                step="5"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md tabular-nums focus:outline-[#4b286d]"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Classification</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-[#4b286d]"
              >
                <option value="standing">Standing Governance</option>
                <option value="ad-hoc">Ad-hoc Topic</option>
                <option value="deep-dive">Strategic Deep-Dive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Topic Lead / Presenter <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              list="leads-list"
              required
              value={lead}
              onChange={(e) => setLead(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-[#4b286d]"
              placeholder="e.g. Tika Jeyasingam, Amit Nag, Sarah Gray, James Rooke"
            />
            <datalist id="leads-list">
              {leadSuggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-slate-700 font-medium text-xs">
                Detail & Source of Truth Reference
              </label>
              <span className="text-[11px] text-slate-400">Supports paste URLs & doc links</span>
            </div>
            <textarea
              rows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-[#4b286d] text-xs"
              placeholder="e.g. Include operational context, deliverables, and attach document links."
            />
            <DocLinkInsertHelper
              currentText={detail}
              onInsertLink={(newText) => setDetail(newText)}
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Associated Deadline (Optional)
            </label>
            <input
              type="text"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-[#4b286d]"
              placeholder="e.g. October 9, 2026"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-slate-600 hover:text-slate-800 font-medium rounded-md cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#4b286d] text-white font-medium rounded-md hover:bg-[#3b1f56] transition-colors cursor-pointer shadow-xs"
            >
              {cadence !== 'none' ? 'Plan Cadence Series' : 'Add to Agenda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
