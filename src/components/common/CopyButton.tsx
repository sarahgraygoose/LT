import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  textToCopy: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'compact';
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  textToCopy,
  label = 'Copy List',
  copiedLabel = 'Copied!',
  className = '',
  variant = 'secondary',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const baseStyle = 'inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer select-none whitespace-nowrap shrink-0 text-xs rounded-md font-sans';

  const variants = {
    primary: 'bg-[#4b286d] text-white hover:bg-[#3b1f56] px-3 py-1.5 shadow-xs',
    secondary: 'bg-white border border-slate-300 text-slate-700 hover:bg-[#f4eff9] hover:text-[#4b286d] hover:border-[#d8c8e8] px-2.5 py-1.5 shadow-xs',
    ghost: 'text-slate-600 hover:text-[#4b286d] hover:bg-[#f4eff9] px-2 py-1',
    compact: 'text-slate-500 hover:text-[#4b286d] p-1 rounded-sm hover:bg-[#f4eff9]',
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      title={label}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-[#4b286d]" />
          {variant !== 'compact' && <span className="text-[#4b286d] font-semibold">{copiedLabel}</span>}
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-slate-500" />
          {variant !== 'compact' && <span>{label}</span>}
        </>
      )}
    </button>
  );
};
