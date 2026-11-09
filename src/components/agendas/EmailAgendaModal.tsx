import React, { useState, useMemo, useEffect } from 'react';
import { GovernanceMeeting } from '../../types/governance';
import { useGovernance } from '../../context/GovernanceContext';
import {
  downloadAgendaPdf,
  getAgendaPdfBlob,
  getAgendaPdfDataUrl,
} from '../../utils/agendaPdfGenerator';
import { formatLinksForPlainText } from '../../utils/linkUtils';
import {
  Mail,
  Download,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Printer,
  Share2,
  X,
  Users,
  CalendarCheck,
  Clock,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface EmailAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: GovernanceMeeting;
  onShowToast: (msg: string) => void;
}

export const EmailAgendaModal: React.FC<EmailAgendaModalProps> = ({
  isOpen,
  onClose,
  meeting,
  onShowToast,
}) => {
  const { coreDLs, currentUserEmail } = useGovernance();
  const [activeTab, setActiveTab] = useState<'email' | 'preview'>('email');
  const [emailFormat, setEmailFormat] = useState<'outlook' | 'gmail'>('outlook');
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [isCopiedRecipients, setIsCopiedRecipients] = useState(false);
  const [isCopiedBody, setIsCopiedBody] = useState(false);
  const [isCopiedSubject, setIsCopiedSubject] = useState(false);
  const [showRecipientDetails, setShowRecipientDetails] = useState(false);

  const ltList = coreDLs.lt;

  // Pre-generate default email subject and body
  const defaultSubject = `[Agenda] Weekly LT Meeting — Monday, ${meeting.displayDate} | Products & Services`;

  const totalMinutes = useMemo(() => {
    return meeting.agendaItems.reduce(
      (sum, item) => sum + (Number(item.durationMinutes) || 0),
      0
    );
  }, [meeting]);

  const targetMinutes = meeting.targetDurationMinutes || 60;
  const remainingMinutes = targetMinutes - totalMinutes;

  const defaultBody = useMemo(() => {
    const topicList = meeting.agendaItems
      .map(
        (item, idx) =>
          `  ${idx + 1}. ${item.topic} (${item.durationMinutes} mins) — Lead: ${item.lead}${
            item.recurringCadence && item.recurringCadence !== 'none'
              ? ` [${item.recurringCadence.toUpperCase()}]`
              : ''
          }${item.deadline ? `\n     Deliverable: ${item.deadline}` : ''}${
            item.detail ? `\n     Notes / Links: ${formatLinksForPlainText(item.detail)}` : ''
          }`
      )
      .join('\n\n');

    return `Hello Leadership Team,

Please review the agenda for our upcoming Weekly LT session scheduled for Monday, ${meeting.displayDate}.

--------------------------------------------------
MEETING DETAILS
--------------------------------------------------
Date: Monday, ${meeting.displayDate}
Time Allocated: ${totalMinutes} minutes (${targetMinutes}m target${
      remainingMinutes >= 0 ? `, ${remainingMinutes}m buffer available` : `, ${Math.abs(remainingMinutes)}m overtime`
    })
Location: ${meeting.location || 'Executive Boardroom & Virtual (Hybrid)'}
Audience: Products & Services Leadership Team (VPs & EAs)

--------------------------------------------------
ORDER OF BUSINESS & DISCUSSION TOPICS (${meeting.agendaItems.length})
--------------------------------------------------
${topicList || '  (No topics scheduled)'}

--------------------------------------------------
ATTACHMENT
--------------------------------------------------
An executive formatted PDF document (Weekly_LT_Agenda_${meeting.date}.pdf) has been generated with complete details, timing allocations, and notes for your preparation.

Best regards,
Sarah Gray
VP Lead, Communications & Governance Prime
Products & Services Leadership Team
TELUS`;
  }, [meeting, totalMinutes, targetMinutes, remainingMinutes]);

  const [subject, setSubject] = useState(defaultSubject);
  const [bodyText, setBodyText] = useState(defaultBody);

  // Update subject and body if meeting changes
  useEffect(() => {
    setSubject(defaultSubject);
    setBodyText(defaultBody);
  }, [defaultSubject, defaultBody]);

  // Generate PDF object URL for crisp, instant preview
  useEffect(() => {
    if (isOpen) {
      try {
        const blob = getAgendaPdfBlob({
          meeting,
          ltDistribution: ltList,
          organizerEmail: currentUserEmail,
        });
        const url = URL.createObjectURL(blob);
        setPdfDataUrl(url);
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.error('Failed to generate PDF preview:', err);
      }
    } else {
      setPdfDataUrl(null);
    }
  }, [isOpen, meeting, ltList, currentUserEmail]);

  if (!isOpen) return null;

  const recipientsString =
    emailFormat === 'outlook' ? ltList.outlookString : ltList.gmailString;

  const handleDownloadPdf = () => {
    try {
      const fileName = downloadAgendaPdf({
        meeting,
        ltDistribution: ltList,
        organizerEmail: currentUserEmail,
      });
      onShowToast(`Downloaded ${fileName}. Ready to attach to your email.`);
    } catch (err) {
      console.error(err);
      onShowToast('Error generating PDF download. Please try again.');
    }
  };

  const handleCopyRecipients = () => {
    navigator.clipboard.writeText(recipientsString);
    setIsCopiedRecipients(true);
    onShowToast(`Copied ${ltList.totalCount} LT email addresses (${emailFormat.toUpperCase()} format).`);
    setTimeout(() => setIsCopiedRecipients(false), 2500);
  };

  const handleCopySubject = () => {
    navigator.clipboard.writeText(subject);
    setIsCopiedSubject(true);
    onShowToast('Subject line copied to clipboard.');
    setTimeout(() => setIsCopiedSubject(false), 2000);
  };

  const handleCopyBody = () => {
    navigator.clipboard.writeText(bodyText);
    setIsCopiedBody(true);
    onShowToast('Formatted email body copied to clipboard.');
    setTimeout(() => setIsCopiedBody(false), 2500);
  };

  const handleLaunchMailto = () => {
    // First trigger PDF download so the user has the file in their Downloads folder ready to attach
    handleDownloadPdf();

    // Launch email client
    const mailtoUrl = `mailto:${encodeURIComponent(ltList.gmailString)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(bodyText)}`;

    const link = document.createElement('a');
    link.href = mailtoUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast('Launched default mail client with LT recipients & agenda draft. Attach the downloaded PDF.');
  };

  const handleOpenGmailWeb = () => {
    handleDownloadPdf();

    const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      ltList.gmailString
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

    const link = document.createElement('a');
    link.href = gmailWebUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast('Opened Gmail Compose in new tab with LT recipients & agenda body.');
  };

  const handleShareDevice = async () => {
    try {
      const blob = getAgendaPdfBlob({
        meeting,
        ltDistribution: ltList,
        organizerEmail: currentUserEmail,
      });
      const file = new File([blob], `Weekly_LT_Agenda_${meeting.date}.pdf`, {
        type: 'application/pdf',
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: subject,
          text: `Please find attached the Weekly LT Agenda for Monday, ${meeting.displayDate}.`,
          files: [file],
        });
        onShowToast('Shared agenda PDF via system dialog.');
      } else {
        handleDownloadPdf();
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Device share failed:', err);
        handleDownloadPdf();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#4b286d] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Email Leadership Team Agenda (PDF)
                </h3>
                <span className="text-[10px] font-semibold text-[#4b286d] bg-[#f4eff9] border border-[#e5d8f2] px-2 py-0.2 rounded-xs">
                  Executive Distribution
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Monday, {meeting.displayDate} · {meeting.title} ({meeting.agendaItems.length} topics scheduled)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher: Email Compose vs Live PDF Preview */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('email')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                  activeTab === 'email'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-[#4b286d]" />
                <span>Email Draft</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-[#4b286d]" />
                <span>PDF Preview</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: EMAIL DRAFT & RECIPIENTS */}
          {activeTab === 'email' && (
            <div className="space-y-4 text-xs">
              {/* PDF Ready Download Callout Banner */}
              <div className="bg-[#fcfaff] border border-[#e5d8f2] rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#4b286d]/10 text-[#4b286d] flex items-center justify-center shrink-0 border border-[#d8c8e8]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">
                        Weekly_LT_Agenda_{meeting.date}.pdf
                      </span>
                      <span className="text-[10px] text-emerald-800 bg-emerald-100 font-semibold px-1.5 py-0.2 rounded-xs">
                        Executive PDF Ready
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Formatted with official TELUS brand styling, order of business table, presenter leads, and distribution notes.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-md text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#4b286d]" />
                    <span>View PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="px-3 py-1.5 bg-[#4b286d] hover:bg-[#3b1f56] text-white font-bold rounded-md text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              {/* Recipient Field */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#4b286d]" />
                      To (Leadership Team DL):
                    </span>
                    <span className="text-slate-500 font-medium">
                      {ltList.totalCount} verified recipients ({ltList.leadershipCount} VPs, {ltList.eaCount} EAs)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Format Toggle: Outlook semicolon vs Gmail comma */}
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-slate-400">Format:</span>
                      <button
                        type="button"
                        onClick={() => setEmailFormat('outlook')}
                        className={`px-2 py-0.5 rounded-xs font-semibold cursor-pointer ${
                          emailFormat === 'outlook'
                            ? 'bg-[#4b286d] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Outlook (;)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailFormat('gmail')}
                        className={`px-2 py-0.5 rounded-xs font-semibold cursor-pointer ${
                          emailFormat === 'gmail'
                            ? 'bg-[#4b286d] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Gmail (,)
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyRecipients}
                      className="px-2.5 py-1 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md font-medium text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copy recipient addresses to clipboard"
                    >
                      {isCopiedRecipients ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Copy DL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-2 bg-slate-50 border border-slate-200 rounded-md font-mono text-[11px] text-slate-700 break-all max-h-16 overflow-y-auto leading-relaxed select-all">
                  {recipientsString}
                </div>

                {/* Recipient Roster Drawer Toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRecipientDetails(!showRecipientDetails)}
                    className="text-[11px] text-[#4b286d] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    {showRecipientDetails ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        <span>Hide LT Roster Breakdown</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        <span>View LT Roster Breakdown ({ltList.totalCount} Leaders & EAs)</span>
                      </>
                    )}
                  </button>

                  {showRecipientDetails && (
                    <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-md grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                      {ltList.recipients.map((r, i) => (
                        <div key={i} className="p-1.5 bg-white border border-slate-100 rounded">
                          <span className="font-semibold text-slate-900 block truncate">
                            {r.name}
                          </span>
                          <span className="text-slate-400 block text-[10px] truncate">
                            {r.role} · {r.email}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Subject Line */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="email-subject-input" className="font-semibold text-slate-700">Subject Line:</label>
                  <button
                    type="button"
                    onClick={handleCopySubject}
                    className="text-[11px] text-[#4b286d] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {isCopiedSubject ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopiedSubject ? 'Copied' : 'Copy Subject'}</span>
                  </button>
                </div>
                <input
                  id="email-subject-input"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-900 text-xs focus:outline-[#4b286d] focus:border-[#4b286d]"
                />
              </div>

              {/* Email Body Area */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <label htmlFor="email-body-textarea" className="font-semibold text-slate-700">Email Message Body:</label>
                    <span className="text-slate-400 text-[11px]">
                      (Pre-formatted executive summary)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyBody}
                    className="text-[11px] text-[#4b286d] hover:underline inline-flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    {isCopiedBody ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopiedBody ? 'Copied Body' : 'Copy Message Body'}</span>
                  </button>
                </div>
                <textarea
                  id="email-body-textarea"
                  rows={10}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white font-mono text-[11px] text-slate-800 leading-relaxed focus:outline-[#4b286d] focus:border-[#4b286d]"
                />
              </div>
            </div>
          )}

          {/* TAB 2: LIVE PDF PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#4b286d]" />
                    High-Fidelity Document Preview
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">Letter size (8.5" x 11")</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="px-3 py-1.5 bg-[#4b286d] hover:bg-[#3b1f56] text-white rounded-md text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              {pdfDataUrl ? (
                <div className="border border-slate-300 rounded-lg overflow-hidden bg-slate-100 shadow-inner h-[500px]">
                  <iframe
                    src={pdfDataUrl}
                    title="Agenda PDF Preview"
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-slate-400 text-xs">
                  Generating PDF preview...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Clicking "Send via Email Client" or "Open in Gmail" auto-downloads the PDF ready to attach.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              title="Download PDF to computer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handleOpenGmailWeb}
              className="px-3 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              title="Open draft in Gmail in your web browser"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Gmail</span>
            </button>

            <button
              type="button"
              onClick={handleLaunchMailto}
              className="px-4 py-2 bg-[#4b286d] hover:bg-[#3b1f56] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Open Outlook or default desktop mail app with prefilled LT addresses and agenda"
            >
              <Mail className="w-4 h-4" />
              <span>Send via Email Client</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
