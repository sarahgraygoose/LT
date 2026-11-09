import React, { useState } from 'react';
import { ExternalLink, FileText, Link2, Plus, Check, FileSpreadsheet, Presentation } from 'lucide-react';

export interface ExtractedDocLink {
  label: string;
  url: string;
  type: 'sheet' | 'doc' | 'slides' | 'sharepoint' | 'general';
}

/**
 * Detects type of document from URL for appropriate icon/styling.
 */
export function getDocTypeFromUrl(url: string, label?: string): ExtractedDocLink['type'] {
  const lower = (url + ' ' + (label || '')).toLowerCase();
  if (lower.includes('spreadsheets') || lower.includes('sheet') || lower.includes('.xlsx') || lower.includes('.csv')) {
    return 'sheet';
  }
  if (lower.includes('presentation') || lower.includes('slides') || lower.includes('.pptx')) {
    return 'slides';
  }
  if (lower.includes('sharepoint') || lower.includes('onedrive')) {
    return 'sharepoint';
  }
  if (lower.includes('document') || lower.includes('doc') || lower.includes('.docx') || lower.includes('.pdf')) {
    return 'doc';
  }
  return 'general';
}

/**
 * Extracts all document links (both [Label](url) and raw https?:// urls) from a string.
 */
export function extractDocLinks(text: string | undefined): ExtractedDocLink[] {
  if (!text) return [];
  const links: ExtractedDocLink[] = [];
  const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match[1] && match[2]) {
      const label = match[1].trim();
      const url = match[2].trim();
      links.push({
        label,
        url,
        type: getDocTypeFromUrl(url, label),
      });
    } else if (match[3]) {
      const url = match[3].trim().replace(/[.,;)]+$/, '');
      const label = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      links.push({
        label,
        url,
        type: getDocTypeFromUrl(url, label),
      });
    }
  }
  return links;
}

/**
 * Parses a description string and returns formatted React elements with interactive, styled document links.
 */
export function renderDescriptionWithLinks(text: string | undefined): React.ReactNode {
  if (!text) return <span className="text-slate-400">—</span>;

  // Regex that matches markdown links [Label](url) OR raw urls (http:// or https://)
  const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = regex.lastIndex;

    // Push preceding text
    if (matchStart > lastIndex) {
      elements.push(text.slice(lastIndex, matchStart));
    }

    if (match[1] && match[2]) {
      const label = match[1].trim();
      const url = match[2].trim();
      const docType = getDocTypeFromUrl(url, label);

      elements.push(
        <a
          key={`md-link-${matchStart}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 my-0.5 rounded-md font-semibold text-[11px] bg-[#f4eff9] text-[#4b286d] hover:bg-[#ebdff6] border border-[#d8c8e8] transition-colors cursor-pointer group shadow-2xs"
          title={`Open ${label} (${url})`}
        >
          {docType === 'sheet' ? (
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          ) : docType === 'slides' ? (
            <Presentation className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-[#4b286d] shrink-0" />
          )}
          <span className="underline underline-offset-2 decoration-[#4b286d]/40 group-hover:decoration-[#4b286d]">
            {label}
          </span>
          <ExternalLink className="w-3 h-3 text-[#4b286d]/70 shrink-0 group-hover:text-[#4b286d]" />
        </a>
      );
    } else if (match[3]) {
      const rawUrl = match[3].trim().replace(/[.,;)]+$/, '');
      const displayUrl = rawUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const docType = getDocTypeFromUrl(rawUrl, displayUrl);

      elements.push(
        <a
          key={`raw-link-${matchStart}`}
          href={rawUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 my-0.5 rounded-sm font-semibold text-[11px] text-[#4b286d] hover:text-[#3b1f56] bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer break-all"
          title={`Open link: ${rawUrl}`}
        >
          <ExternalLink className="w-3 h-3 text-[#4b286d] shrink-0" />
          <span className="underline underline-offset-2">
            {displayUrl.length > 40 ? `${displayUrl.slice(0, 37)}...` : displayUrl}
          </span>
        </a>
      );
    }

    lastIndex = matchEnd;
  }

  // Push remainder
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return <span>{elements}</span>;
}

/**
 * Removes a specific URL (or its markdown link) from text.
 */
export function removeLinkFromText(text: string | undefined, urlToRemove: string): string {
  if (!text) return '';
  const cleanUrl = urlToRemove.trim();
  const escapedUrl = cleanUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const markdownRegex = new RegExp(`\\[([^\\]]*)\\]\\(${escapedUrl}\\)`, 'gi');
  const rawRegex = new RegExp(escapedUrl, 'gi');

  let result = text.replace(markdownRegex, '').replace(rawRegex, '');
  // Clean up dangling empty brackets or extra spaces
  result = result.replace(/\[\s*\]\(\s*\)/g, '');
  result = result.replace(/\s{2,}/g, ' ').trim();
  return result;
}

/**
 * Appends a document link cleanly to text.
 */
export function addLinkToText(text: string | undefined, url: string, label?: string): string {
  let cleanUrl = (url || '').trim();
  if (!cleanUrl) return text || '';
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = `https://${cleanUrl}`;
  }
  const cleanLabel = (label || '').trim() || 'Source Document';
  const markdownLink = `[${cleanLabel}](${cleanUrl})`;
  const base = (text || '').trim();
  return base ? `${base} ${markdownLink}` : markdownLink;
}

/**
 * Cleans out any old dummy/placeholder URLs.
 */
export function sanitizePlaceholderDocUrls(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/\[([^\]]*)\]\(https:\/\/docs\.google\.com\/spreadsheets\/d\/1[a-z0-9-]+\/edit\)/gi, '')
    .replace(/https:\/\/docs\.google\.com\/spreadsheets\/d\/1[a-z0-9-]+\/edit/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Converts markdown links in plain text to readable email / report string.
 * e.g. [Capital Sheet](https://...) -> Capital Sheet (https://...)
 */
export function formatLinksForPlainText(text: string | undefined): string {
  if (!text) return '';
  return text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)');
}

interface DocLinkInsertHelperProps {
  currentText: string;
  onInsertLink: (newText: string) => void;
  className?: string;
  buttonLabel?: string;
}

/**
 * Interactive toolbar helper for inserting structured document links into descriptions.
 */
export const DocLinkInsertHelper: React.FC<DocLinkInsertHelperProps> = ({
  currentText,
  onInsertLink,
  className = '',
  buttonLabel = '+ Add Document Link',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const existingLinks = extractDocLinks(currentText);

  const handleInsert = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!docUrl.trim()) return;

    const updatedText = addLinkToText(currentText, docUrl, docTitle);
    onInsertLink(updatedText);
    setDocTitle('');
    setDocUrl('');
    setIsOpen(false);
    setNotice('Document link attached!');
    setTimeout(() => setNotice(null), 2500);
  };

  const handleRemove = (urlToRemove: string) => {
    const updatedText = removeLinkFromText(currentText, urlToRemove);
    onInsertLink(updatedText);
    setNotice('Document link removed.');
    setTimeout(() => setNotice(null), 2500);
  };

  return (
    <div className={`space-y-2 text-xs ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
          <Link2 className="w-3.5 h-3.5 text-[#4b286d]" />
          <span>Document Links:</span>
          {existingLinks.length > 0 ? (
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] border border-emerald-200">
              {existingLinks.length} linked
            </span>
          ) : (
            <span className="text-slate-400">None attached</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-2.5 py-1 bg-white hover:bg-purple-50 text-[#4b286d] font-bold border border-[#d8c8e8] rounded-md transition-colors inline-flex items-center gap-1 text-[11px] cursor-pointer shadow-2xs"
        >
          <Plus className="w-3 h-3 text-[#4b286d]" />
          <span>{isOpen ? 'Close' : buttonLabel}</span>
        </button>
      </div>

      {/* Popover form for inserting link */}
      {isOpen && (
        <div className="p-3 bg-[#fbf9fd] border border-[#d8c8e8] rounded-lg space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#4b286d]" />
              Attach Document / Source of Truth Link
            </span>
            <span className="text-[10px] text-slate-500">Google Docs, Sheets, Slides, or SharePoint</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-600 font-semibold text-[10px] mb-1">
                Document Title / Label (Optional)
              </label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. Operations Tracker, Q4 Delivery Sheet"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-[#4b286d] font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold text-[10px] mb-1">
                Document URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="Paste your URL (e.g. https://docs.google.com/...)"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-[#4b286d] font-medium"
                autoFocus
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-500">
              Paste any valid document link. Leave blank if none is needed.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1 text-slate-500 hover:text-slate-700 font-medium text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleInsert()}
                disabled={!docUrl.trim()}
                className="px-3 py-1 bg-[#4b286d] hover:bg-[#3b1f56] disabled:opacity-40 text-white font-bold rounded text-xs transition-colors cursor-pointer shadow-xs"
              >
                Attach Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live clickable preview of existing document links with remove button */}
      {existingLinks.length > 0 && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Attached Documents:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {existingLinks.map((link, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-[#d8c8e8] text-[#4b286d] text-xs font-semibold shadow-2xs group"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                  title={`Open: ${link.url}`}
                >
                  {link.type === 'sheet' ? (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  ) : link.type === 'slides' ? (
                    <Presentation className="w-3.5 h-3.5 text-amber-700" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-[#4b286d]" />
                  )}
                  <span>{link.label}</span>
                  <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </a>
                <button
                  type="button"
                  onClick={() => handleRemove(link.url)}
                  className="text-slate-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 cursor-pointer ml-0.5"
                  title="Remove this document link"
                >
                  <span className="text-xs font-bold leading-none">&times;</span>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {notice && (
        <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
          <Check className="w-3 h-3 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}
    </div>
  );
};

