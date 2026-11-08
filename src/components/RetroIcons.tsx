import React from 'react';

export const FloppyDiskIllustration: React.FC<{ isSpinning?: boolean }> = ({ isSpinning }) => (
  <svg
    width="84"
    height="84"
    viewBox="0 0 84 84"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={isSpinning ? 'animate-bounce' : ''}
    aria-hidden="true"
  >
    {/* Hard Offset Drop Shadow */}
    <path d="M12 12H66L76 22V76H12V12Z" fill="#181615" />
    {/* Floppy Body */}
    <path
      d="M8 8H62L72 18V72H8V8Z"
      fill="#3B5BDB"
      stroke="#181615"
      strokeWidth="2.5"
      strokeLinejoin="miter"
    />
    {/* Metal Top Shutter */}
    <rect
      x="22"
      y="8"
      width="32"
      height="22"
      fill="#E6DFD0"
      stroke="#181615"
      strokeWidth="2.5"
    />
    {/* Shutter Window Slot */}
    <rect x="41" y="12" width="8" height="14" fill="#181615" />
    {/* Paper Label Bottom */}
    <rect
      x="16"
      y="38"
      width="48"
      height="34"
      fill="#FBF8EF"
      stroke="#181615"
      strokeWidth="2.5"
    />
    {/* Kodak/Polaroid Retro Color Stripes on Label */}
    <rect x="17.5" y="39.5" width="45" height="6" fill="#DF4B2F" />
    <rect x="17.5" y="45.5" width="45" height="5" fill="#F4B942" />
    {/* Handwritten Label Lines */}
    <line x1="22" y1="57" x2="56" y2="57" stroke="#181615" strokeWidth="2" />
    <line x1="22" y1="63" x2="46" y2="63" stroke="#181615" strokeWidth="2" />
    {/* Write-protect Notch */}
    <rect x="12" y="13" width="4" height="4" fill="#FBF8EF" stroke="#181615" strokeWidth="1.5" />
  </svg>
);

export const RetroCameraLogo: React.FC = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="22" height="20" fill="#FBF8EF" stroke="#181615" strokeWidth="2" />
    {/* Classic Rainbow/Kodak Stripe */}
    <rect x="12" y="6" width="3" height="18" fill="#DF4B2F" />
    <rect x="15" y="6" width="3" height="18" fill="#F4B942" />
    <rect x="18" y="6" width="2" height="18" fill="#2D8A75" />
    {/* Lens */}
    <circle cx="14" cy="15" r="5.5" fill="#181615" stroke="#FBF8EF" strokeWidth="1.5" />
    <circle cx="14" cy="15" r="2.5" fill="#E6DFD0" />
    {/* Viewfinder */}
    <rect x="6" y="8" width="4" height="3" fill="#181615" />
  </svg>
);

interface WindowTitleBarProps {
  title: string;
  rightTag?: string;
  onClose?: () => void;
  variant?: 'pinstripe' | 'yellow' | 'red' | 'dark';
}

export const WindowTitleBar: React.FC<WindowTitleBarProps> = ({
  title,
  rightTag,
  onClose,
  variant = 'pinstripe',
}) => {
  const bgClass =
    variant === 'yellow'
      ? 'bg-[#F4B942] border-b-2 border-[#181615]'
      : variant === 'red'
      ? 'bg-[#DF4B2F] text-[#FBF8EF] border-b-2 border-[#181615]'
      : variant === 'dark'
      ? 'retro-titlebar-dark'
      : 'retro-titlebar';

  const plaqueClass =
    variant === 'pinstripe'
      ? 'bg-[#FBF8EF] text-[#181615] border-x-2 border-[#181615] px-3 py-0.5'
      : 'px-2 py-0.5';

  return (
    <div className={`${bgClass} h-9 px-2.5 flex items-center justify-between gap-2 select-none`}>
      <div className="flex items-center gap-1.5">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela"
            className="w-4 h-4 bg-[#DF4B2F] border-2 border-[#181615] flex items-center justify-center text-[10px] font-mono font-bold text-[#FBF8EF] hover:bg-[#ff5c3e] cursor-pointer"
          >
            ×
          </button>
        ) : (
          <>
            <span className="w-3.5 h-3.5 bg-[#FBF8EF] border-2 border-[#181615] inline-block" />
            <span className="w-3.5 h-3.5 bg-[#F4B942] border-2 border-[#181615] inline-block" />
          </>
        )}
      </div>

      <div className={`font-mono text-xs font-bold tracking-wider uppercase truncate ${plaqueClass}`}>
        {title}
      </div>

      <div className="flex items-center justify-end min-w-[32px]">
        {rightTag ? (
          <span
            className={`font-mono text-[10px] font-bold px-1.5 py-0.5 border border-[#181615] ${
              variant === 'dark' || variant === 'red'
                ? 'bg-[#FBF8EF] text-[#181615]'
                : 'bg-[#181615] text-[#FBF8EF]'
            }`}
          >
            {rightTag}
          </span>
        ) : (
          <span className="w-3.5 h-3.5 bg-[#E6DFD0] border-2 border-[#181615] inline-block" />
        )}
      </div>
    </div>
  );
};
