'use client';

interface StoreLogoFrameProps {
  src?: string | null;
  name: string;
  /** Uniform fixed box dimensions so all store cards align cleanly without cropping */
  className?: string;
  paddingClassName?: string;
  fallbackTextClassName?: string;
  imgClassName?: string;
  loading?: 'lazy' | 'eager';
}

/**
 * Displays any store logo (square icon, horizontal wordmark, or product photo) inside a
 * uniform fixed-size frame with zero cropping (`object-contain`) and a subtle blurred
 * color-matched ambient backdrop so there are never awkward blank sidebars.
 */
export default function StoreLogoFrame({
  src,
  name,
  className = 'w-16 h-14 rounded-xl',
  paddingClassName = 'p-1.5',
  fallbackTextClassName = 'text-base',
  imgClassName = '',
  loading = 'lazy',
}: StoreLogoFrameProps) {
  const cleanSrc = typeof src === 'string' ? src.trim() : '';
  const initials = (name || 'ST').trim().substring(0, 2).toUpperCase();

  if (!cleanSrc) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center shrink-0 bg-slate-900 text-white border border-slate-200/80 shadow-xs ${className}`}
      >
        <span className={`font-black tracking-wider ${fallbackTextClassName}`}>
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center shrink-0 bg-white border border-slate-200/90 shadow-xs ${paddingClassName} ${className}`}
    >
      {/* Color-matched blurred ambient backdrop fills fixed frame smoothly */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cleanSrc}
        alt=""
        aria-hidden="true"
        loading={loading}
        className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-35 pointer-events-none select-none"
      />
      {/* Soft veil keeps both light & dark logos crisp and readable */}
      <div className="absolute inset-0 bg-white/35 pointer-events-none" />
      {/* Full uncropped logo centered */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cleanSrc}
        alt={name}
        loading={loading}
        className={`relative z-10 max-w-full max-h-full w-auto h-auto object-contain drop-shadow-2xs ${imgClassName}`}
      />
    </div>
  );
}
