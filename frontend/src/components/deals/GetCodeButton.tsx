'use client';

import { Scissors, Sparkles, ExternalLink } from 'lucide-react';

interface GetCodeButtonProps {
  code?: string;
  isCode?: boolean;
  highlight?: boolean;
  onOpenModal?: () => void;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export default function GetCodeButton({
  code,
  isCode = true,
  highlight = false,
  onOpenModal,
  onClick,
  className = '',
  size = 'md',
  fullWidth = false,
}: GetCodeButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) onClick();
    if (onOpenModal) onOpenModal();
  };

  const isDeal = !isCode || !code;
  const colorClasses = highlight
    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/25 ring-1 ring-emerald-400/40 hover:shadow-lg'
    : 'bg-brand-primary hover:bg-brand-primary-hover shadow-xs hover:shadow-sm';

  const sizeClasses =
    size === 'sm'
      ? 'py-2 px-3 text-xs'
      : size === 'lg'
        ? 'py-2.5 px-5 text-[13px] sm:min-w-[144px]'
        : 'py-2.5 px-4 text-xs sm:min-w-[136px]';

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group font-black tracking-wide text-white rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${colorClasses} ${sizeClasses} ${
        fullWidth ? 'w-full' : 'w-full sm:w-auto'
      } ${className}`}
    >
      {isDeal ? (
        <Sparkles size={size === 'lg' ? 16 : 14} className={highlight ? 'text-emerald-100' : 'text-white/90'} />
      ) : (
        <Scissors
          size={size === 'lg' ? 16 : 14}
          className="text-white/90 group-hover:rotate-12 transition-transform duration-200"
        />
      )}
      <span>{isDeal ? 'Activate Deal' : 'Get Code'}</span>
      <ExternalLink
        size={size === 'lg' ? 14 : 13}
        className="text-white/80 group-hover:translate-x-0.5 transition-transform"
      />
    </button>
  );
}
