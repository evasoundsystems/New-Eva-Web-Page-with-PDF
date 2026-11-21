import { useEffect, useState } from 'react';
import { Sliders } from 'lucide-react';
import { resolveImageUrl } from '../assets/assetMap';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  loading?: 'lazy' | 'eager';
}

export function SafeImage({
  src,
  alt,
  className = '',
  fallbackTitle,
  loading = 'lazy',
}: SafeImageProps) {
  const resolved = resolveImageUrl(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  if (failed || !resolved) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#1B1E24] via-[#252A34] to-[#14161A] text-stone-300 p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Sliders className="w-8 h-8 text-[#E0A446] mb-2 opacity-80" aria-hidden="true" />
        <span className="text-xs font-medium tracking-wide text-stone-300 line-clamp-2 max-w-[220px]">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      key={resolved}
      src={resolved}
      alt={alt}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
