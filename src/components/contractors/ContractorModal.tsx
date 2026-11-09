import React, { useState, useEffect } from 'react';
import { Contractor, PersonnelType } from '../../types/governance';
import { X } from 'lucide-react';

interface ContractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contractorData: Omit<Contractor, 'id'>) => void;
  contractorToEdit?: Contractor | null;
}

const VP_LIST = [
  'James Rooke',
  'Amit Nag',
  'Chris Engst',
  'Dwayne Benefield',
  'Aaron Harburn',
  'Amit Sharma',
  'Kim Nguyen',
  'Torey Konecsni',
];

const PERSONNEL_TYPES: PersonnelType[] = [
  'TD Contractor',
  'TD Employee',
  'Sow',
  'Term',
  'Intern',
  'Contractor',
];

export const ContractorModal: React.FC<ContractorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  contractorToEdit,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<PersonnelType>('TD Contractor');
  const [leader, setLeader] = useState('');
  const [director, setDirector] = useState('');
  const [svpVp, setSvpVp] = useState('James Rooke');
  const [tcsAllTeamCall, setTcsAllTeamCall] = useState(true);
  const [cpoAllTeamCall, setCpoAllTeamCall] = useState(true);
  const [vpTeamCall, setVpTeamCall] = useState(true);
  const [formalComms, setFormalComms] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (contractorToEdit) {
      setFirstName(contractorToEdit.firstName);
      setLastName(contractorToEdit.lastName);
      setEmail(contractorToEdit.email);
      setType(contractorToEdit.type);
      setLeader(contractorToEdit.leader || '');
      setDirector(contractorToEdit.director || '');
      setSvpVp(contractorToEdit.svpVp || 'James Rooke');
      setTcsAllTeamCall(contractorToEdit.tcsAllTeamCall);
      setCpoAllTeamCall(contractorToEdit.cpoAllTeamCall);
      setVpTeamCall(contractorToEdit.vpTeamCall);
      setFormalComms(contractorToEdit.formalComms);
      setNotes(contractorToEdit.notes || '');
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setType('TD Contractor');
      setLeader('');
      setDirector('');
      setSvpVp('James Rooke');
      setTcsAllTeamCall(true);
      setCpoAllTeamCall(true);
      setVpTeamCall(true);
      setFormalComms(true);
      setNotes('');
    }
  }, [contractorToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      type,
      leader: leader.trim(),
      director: director.trim(),
      svpVp: svpVp.trim(),
      tcsAllTeamCall,
      cpoAllTeamCall,
      vpTeamCall,
      formalComms,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {contractorToEdit ? 'Edit Personnel / Contractor' : 'Add New Personnel / Contractor'}
            </h3>
            <p className="text-xs text-slate-500">
              Products & Services - Master Contractor Distribution List - Living Document - 2026
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-[#4b286d]"
                placeholder="e.g. Abdul"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-[#4b286d]"
                placeholder="e.g. Mohammed"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-[#4b286d] font-mono"
                placeholder="first.last@telus.com"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PersonnelType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-[#4b286d]"
              >
                {PERSONNEL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Direct Leader</label>
              <input
                type="text"
                value={leader}
                onChange={(e) => setLeader(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-[#4b286d]"
                placeholder="e.g. Krithika Ravishankar"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Director</label>
              <input
                type="text"
                value={director}
                onChange={(e) => setDirector(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-[#4b286d]"
                placeholder="e.g. Ambles Kwok"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">SVP / VP</label>
              <select
                value={svpVp}
                onChange={(e) => setSvpVp(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-[#4b286d]"
              >
                {VP_LIST.map((vp) => (
                  <option key={vp} value={vp}>
                    {vp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Call Inclusion Flags */}
          <div className="p-3 bg-[#fbf9fd] border border-[#d8c8e8] rounded-md">
            <span className="block font-semibold text-[#4b286d] mb-2">
              Distribution & Call Eligibility (Auto-Syncs Across All Lists)
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={tcsAllTeamCall}
                  onChange={(e) => setTcsAllTeamCall(e.target.checked)}
                  className="rounded text-[#4b286d] focus:ring-[#4b286d]"
                />
                <span className="text-slate-800">TCS All Team Call</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cpoAllTeamCall}
                  onChange={(e) => setCpoAllTeamCall(e.target.checked)}
                  className="rounded text-[#4b286d] focus:ring-[#4b286d]"
                />
                <span className="text-slate-800">LT All Team Call</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={vpTeamCall}
                  onChange={(e) => setVpTeamCall(e.target.checked)}
                  className="rounded text-[#4b286d] focus:ring-[#4b286d]"
                />
                <span className="text-slate-800">VP Team Call</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formalComms}
                  onChange={(e) => setFormalComms(e.target.checked)}
                  className="rounded text-[#4b286d] focus:ring-[#4b286d]"
                />
                <span className="text-slate-800">Formal Comms</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Notes / Fieldglass Info</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-[#4b286d]"
              placeholder="e.g. via Fieldglass, contractor renewal date"
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
              {contractorToEdit ? 'Save Changes' : 'Add to Living Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
