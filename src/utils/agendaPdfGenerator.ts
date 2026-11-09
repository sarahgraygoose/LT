import { jsPDF } from 'jspdf';
import { GovernanceMeeting, AgendaItem } from '../types/governance';
import { ComputedDLResult } from '../context/GovernanceContext';
import { formatLinksForPlainText } from './linkUtils';

export interface GeneratePdfOptions {
  meeting: GovernanceMeeting;
  ltDistribution?: ComputedDLResult;
  organizerEmail?: string;
  notes?: string;
}

/**
 * Generates an executive-grade, beautifully branded PDF for a Leadership Team Agenda.
 * Strictly adheres to corporate governance visual standards with Telus brand accents,
 * clear typography, structured agenda matrix, and distribution metadata.
 */
export function generateAgendaPdfDoc(options: GeneratePdfOptions): jsPDF {
  const { meeting, ltDistribution, organizerEmail = 'sarah.gray@telus.com' } = options;

  // Initialize portrait Letter document (8.5 x 11 inches = 215.9 x 279.4 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = 215.9;
  const pageHeight = 279.4;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Brand Palette
  const purplePrimary = [75, 40, 109]; // #4b286d (TELUS Purple)
  const purpleLight = [244, 239, 249]; // #f4eff9
  const textDark = [15, 23, 42]; // slate-900
  const textMuted = [100, 116, 139]; // slate-500
  const textBody = [51, 65, 85]; // slate-700
  const borderLight = [226, 232, 240]; // slate-200
  const bgRowAlt = [248, 250, 252]; // slate-50
  const emeraldAccent = [5, 150, 105]; // emerald-600

  let currentY = margin;

  // Helper: check page break
  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 18) {
      doc.addPage();
      currentY = margin + 5;
      drawHeaderBanner(false);
    }
  };

  const drawHeaderBanner = (isFirstPage: boolean) => {
    // Top Brand Accent Stripe
    doc.setFillColor(purplePrimary[0], purplePrimary[1], purplePrimary[2]);
    doc.rect(margin, currentY, contentWidth, 3, 'F');
    currentY += 6;

    if (!isFirstPage) {
      // Continuation Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(purplePrimary[0], purplePrimary[1], purplePrimary[2]);
      doc.text('TELUS PRODUCTS & SERVICES · WEEKLY LT AGENDA (CONTINUED)', margin, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(`Monday, ${meeting.displayDate} · ${meeting.title}`, pageWidth - margin, currentY, { align: 'right' });

      currentY += 4;
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.setLineWidth(0.3);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 6;
    }
  };

  // --- PAGE 1: HEADER & METADATA ---
  drawHeaderBanner(true);

  // Kicker and Main Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(purplePrimary[0], purplePrimary[1], purplePrimary[2]);
  doc.text('PRODUCTS & SERVICES LEADERSHIP TEAM · EXECUTIVE GOVERNANCE', margin, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`${meeting.title} — Agenda`, margin, currentY);
  currentY += 6;

  // Subtitle / Date Lockup
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(textBody[0], textBody[1], textBody[2]);
  doc.text(`Monday, ${meeting.displayDate} · 60-Minute Executive Session`, margin, currentY);
  currentY += 7;

  // --- LOGISTICS & EXECUTIVE METADATA BOX ---
  const metaBoxHeight = 22;
  doc.setFillColor(purpleLight[0], purpleLight[1], purpleLight[2]);
  doc.roundedRect(margin, currentY, contentWidth, metaBoxHeight, 2, 2, 'F');
  doc.setDrawColor(purplePrimary[0], purplePrimary[1], purplePrimary[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, metaBoxHeight, 2, 2, 'S');

  const col1X = margin + 4;
  const col2X = margin + 55;
  const col3X = margin + 115;
  const col4X = margin + 155;
  const metaY1 = currentY + 6;
  const metaY2 = currentY + 12;

  // Col 1: Date & Time
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(purplePrimary[0], purplePrimary[1], purplePrimary[2]);
  doc.text('MEETING DATE & TIME', col1X, metaY1);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Monday, ${meeting.displayDate}`, col1X, metaY2);
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Weekly Monday Cadence', col1X, metaY2 + 4.5);

  // Col 2: Duration & Capacity
  const totalAllocated = meeting.agendaItems.reduce(
    (sum, item) => sum + (Number(item.durationMinutes) || 0),
    0
  );
  const targetDuration = meeting.targetDurationMinutes || 60;
  const buffer = targetDuration - totalAllocated;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(purplePrimary[0], purplePrimary[1], purplePrimary[2]);
  doc.text('TIME ALLOCATION', col2X, metaY1);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`${totalAllocated} mins allocated / ${targetDuration} mins target`, col2X, metaY2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  if (buffer >= 0) {
    doc.setTextColor(emeraldAccent[0], emeraldAccent[1], emeraldAccent[2]);
    doc.text(`+${buffer}m open buffer available`, col2X, metaY2 + 4.5);
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text(`${Math.abs(buffer)}m overtime`, col2X, metaY2 + 4.5);
  }

  // Col 3: Location / Access
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(purplePrimary[0], purplePrimary[1], purplePrimary[2]);
  doc.text('LOCATION & ACCESS', col3X, metaY1);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(meeting.location || 'Exec Boardroom & Virtual', col3X, metaY2);
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Hybrid LT Access', col3X, metaY2 + 4.5);

  // Col 4: Distribution / Organizer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(purplePrimary[0], purplePrimary[1], purplePrimary[2]);
  doc.text('DISTRIBUTION & CHAIR', col4X, metaY1);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Products & Services LT', col4X, metaY2);
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Prime: ${organizerEmail}`, col4X, metaY2 + 4.5);

  currentY += metaBoxHeight + 7;

  // --- SECTION TITLE: ORDER OF BUSINESS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Scheduled Discussion Topics', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Total Topics: ${meeting.agendaItems.length}`, pageWidth - margin, currentY, { align: 'right' });
  currentY += 4.5;

  // --- AGENDA TABLE HEADER ---
  const colW = {
    num: 8,
    topic: 62,
    lead: 42,
    time: 20,
    cadence: 26,
    detail: contentWidth - (8 + 62 + 42 + 20 + 26),
  };

  doc.setFillColor(purplePrimary[0], purplePrimary[1], purplePrimary[2]);
  doc.rect(margin, currentY, contentWidth, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  let headerX = margin + 2;
  doc.text('#', headerX, currentY + 4.8);
  headerX += colW.num;
  doc.text('TOPIC', headerX, currentY + 4.8);
  headerX += colW.topic;
  doc.text('PRESENTER / LEAD', headerX, currentY + 4.8);
  headerX += colW.lead;
  doc.text('DURATION', headerX, currentY + 4.8);
  headerX += colW.time;
  doc.text('CADENCE / TYPE', headerX, currentY + 4.8);
  headerX += colW.cadence;
  doc.text('DETAILS & DELIVERABLES', headerX, currentY + 4.8);

  currentY += 7;

  // --- AGENDA TABLE ROWS ---
  if (meeting.agendaItems.length === 0) {
    ensureSpace(16);
    doc.setFillColor(bgRowAlt[0], bgRowAlt[1], bgRowAlt[2]);
    doc.rect(margin, currentY, contentWidth, 14, 'F');
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.rect(margin, currentY, contentWidth, 14, 'S');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('No topics currently scheduled for this Monday session.', margin + contentWidth / 2, currentY + 8, {
      align: 'center',
    });
    currentY += 16;
  } else {
    meeting.agendaItems.forEach((item: AgendaItem, index: number) => {
      // Pre-calculate line wrapping for text columns
      const topicLines = doc.splitTextToSize(item.topic, colW.topic - 3);
      const leadLines = doc.splitTextToSize(item.lead || 'Executive LT', colW.lead - 3);
      const rawDetail = item.detail
        ? item.deadline
          ? `${item.detail} (Deliverable: ${item.deadline})`
          : item.detail
        : item.deadline
        ? `Deliverable deadline: ${item.deadline}`
        : 'Standing governance topic item.';
      const detailText = formatLinksForPlainText(rawDetail);
      const detailLines = doc.splitTextToSize(detailText, colW.detail - 3);

      const maxLines = Math.max(topicLines.length, leadLines.length, detailLines.length, 1);
      const rowHeight = Math.max(10, maxLines * 4.2 + 5);

      ensureSpace(rowHeight);

      // Row Background (Alternating subtle shading)
      const isAlt = index % 2 === 1;
      if (isAlt) {
        doc.setFillColor(bgRowAlt[0], bgRowAlt[1], bgRowAlt[2]);
        doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
      }

      // Bottom Row Border
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.setLineWidth(0.2);
      doc.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);

      let cellX = margin + 2;
      const textBaseY = currentY + 4.8;

      // Col 1: #
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(purplePrimary[0], purplePrimary[1], purplePrimary[2]);
      doc.text(String(index + 1), cellX, textBaseY);
      cellX += colW.num;

      // Col 2: Topic
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(topicLines, cellX, textBaseY);
      cellX += colW.topic;

      // Col 3: Lead
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(textBody[0], textBody[1], textBody[2]);
      doc.text(leadLines, cellX, textBaseY);
      cellX += colW.lead;

      // Col 4: Duration
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(purplePrimary[0], purplePrimary[1], purplePrimary[2]);
      doc.text(`${item.durationMinutes} mins`, cellX, textBaseY);
      cellX += colW.time;

      // Col 5: Cadence / Type
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const cadenceText =
        item.recurringCadence && item.recurringCadence !== 'none'
          ? `${item.recurringCadence.toUpperCase()}`
          : item.type === 'standing'
          ? 'STANDING'
          : 'AD-HOC';
      doc.setTextColor(purplePrimary[0], purplePrimary[1], purplePrimary[2]);
      doc.text(cadenceText, cellX, textBaseY);
      cellX += colW.cadence;

      // Col 6: Detail
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(detailLines, cellX, textBaseY);

      currentY += rowHeight;
    });
  }

  // --- LEADERSHIP TEAM DISTRIBUTION ROSTER ---
  ensureSpace(32);
  currentY += 6;

  doc.setFillColor(bgRowAlt[0], bgRowAlt[1], bgRowAlt[2]);
  doc.roundedRect(margin, currentY, contentWidth, 24, 1.5, 1.5, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, 24, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(purplePrimary[0], purplePrimary[1], purplePrimary[2]);
  doc.text('OFFICIAL LEADERSHIP TEAM DISTRIBUTION (P&S LT)', margin + 3.5, currentY + 5.5);

  const rosterText = ltDistribution
    ? `Recipients (${ltDistribution.totalCount} attendees): ` +
      ltDistribution.recipients.map((r) => `${r.name} (${r.role})`).join(' · ')
    : 'James Rooke (SVP and CPO) · Amit Nag (VP) · Amit Sharma (VP) · Chris Engst (VP) · Aaron Harburn (VP) · Kim Nguyen (VP) · Torey Konecsni (VP) + Executive Support Assistants';

  const rosterLines = doc.splitTextToSize(rosterText, contentWidth - 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(rosterLines.slice(0, 3), margin + 3.5, currentY + 10.5);

  currentY += 28;

  // --- FOOTER ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(
      'TELUS Products & Services Leadership Governance · Confidential Internal Working Document',
      margin,
      pageHeight - 7.5
    );

    doc.text(
      `Generated ${new Date().toLocaleDateString('en-CA')} · Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7.5,
      { align: 'right' }
    );
  }

  return doc;
}

/**
 * Downloads the generated PDF directly to the user's computer.
 */
export function downloadAgendaPdf(options: GeneratePdfOptions): string {
  const doc = generateAgendaPdfDoc(options);
  const cleanDate = options.meeting.date || 'Agenda';
  const fileName = `Weekly_LT_Agenda_${cleanDate}.pdf`;
  doc.save(fileName);
  return fileName;
}

/**
 * Returns a Blob of the generated PDF document.
 */
export function getAgendaPdfBlob(options: GeneratePdfOptions): Blob {
  const doc = generateAgendaPdfDoc(options);
  return doc.output('blob');
}

/**
 * Returns a Data URL string for inline iframe previews.
 */
export function getAgendaPdfDataUrl(options: GeneratePdfOptions): string {
  const doc = generateAgendaPdfDoc(options);
  return doc.output('datauristring');
}
