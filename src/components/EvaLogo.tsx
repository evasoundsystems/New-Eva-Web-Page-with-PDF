interface EvaLogoProps {
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function EvaLogo({
  theme = 'dark',
  size = 'md',
  showText = false,
  className = '',
}: EvaLogoProps) {
  const iconDimensions =
    size === 'sm'
      ? 'w-8 h-8'
      : size === 'lg'
        ? 'w-14 h-14'
        : 'w-11 h-11';

  const isDark = theme === 'dark';

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconDimensions} shrink-0`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="evaBarGrad" x1="12" y1="48" x2="48" y2="12" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1B6CA8" />
            <stop offset="55%" stopColor="#2A9D8F" />
            <stop offset="100%" stopColor="#E0A446" />
          </linearGradient>
          <linearGradient id="evaArrowGrad" x1="40" y1="50" x2="48" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2A9D8F" />
            <stop offset="55%" stopColor="#C2842D" />
            <stop offset="100%" stopColor="#F2C166" />
          </linearGradient>
        </defs>

        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="14"
          fill={isDark ? '#0B1324' : '#0F172A'}
          stroke={isDark ? '#334155' : '#1E293B'}
          strokeWidth="2"
        />

        {/* Radiant acoustic burst around peak elevation arrow */}
        <path
          d="M46 8V12M38.5 10.5L41 13.5M53.5 10.5L51 13.5"
          stroke="#F2C166"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Ascending equalizer meter bars */}
        <rect x="13" y="34" width="5.5" height="14" rx="2.75" fill="url(#evaBarGrad)" />
        <rect x="21.5" y="29" width="5.5" height="19" rx="2.75" fill="url(#evaBarGrad)" />
        <rect x="30" y="23" width="5.5" height="25" rx="2.75" fill="url(#evaBarGrad)" />

        {/* Peak Elevation Arrow Bar */}
        <path
          d="M38.5 48V24H34.8L43.25 13.5L51.7 24H48V48H38.5Z"
          fill="url(#evaArrowGrad)"
        />

        {/* Sound horizon arc */}
        <path
          d="M11 53.5C23 50.2 41 50.2 53 53.5"
          stroke="#E0A446"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>

      {showText && (
        <span className="flex flex-col leading-none">
          <span
            className={`font-display font-bold tracking-tight ${
              size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-sm' : 'text-base'
            } ${isDark ? 'text-white' : 'text-[#141518]'}`}
          >
            E.V.A.{' '}
            <span className={isDark ? 'text-[#E0A446]' : 'text-[#9A6315]'}>
              Worship Engineer
            </span>
          </span>
          <span
            className={`text-[10px] font-medium tracking-wider uppercase mt-0.5 ${
              isDark ? 'text-stone-400' : 'text-stone-500'
            }`}
          >
            Elevation Voice Audio
          </span>
        </span>
      )}
    </span>
  );
}
