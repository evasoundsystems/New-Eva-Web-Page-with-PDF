import { useState } from 'react';
import { CheckCircle2, Trash2, Upload } from 'lucide-react';
import { BUNDLED_ASSETS } from '../assets/assetMap';
import { compressImageFileToDataUrl } from '../services/apiClient';
import { estimateDataUrlKilobytes } from '../utils/siteLogic';
import { SafeImage } from './SafeImage';

interface AdminImagePickerProps {
  value: string;
  onChange: (nextUrl: string) => void;
  label?: string;
}

export function AdminImagePicker({
  value,
  onChange,
  label = 'Photo',
}: AdminImagePickerProps) {
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isUploadedDataUrl = value.startsWith('data:image/');
  const uploadedKb = isUploadedDataUrl ? estimateDataUrlKilobytes(value) : 0;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset input so choosing the same filename again still triggers onChange
    e.target.value = '';
    if (!file) return;
    setErrorMsg('');
    setUploading(true);
    try {
      const compressed = await compressImageFileToDataUrl(file, 1000);
      onChange(compressed);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to process image.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3 p-3.5 rounded-lg border border-stone-200 bg-[#F8F8F6]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-stone-700">{label}</span>
        <div className="flex items-center gap-2">
          {isUploadedDataUrl && (
            <button
              type="button"
              onClick={() => onChange('asset:console')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Remove Photo</span>
            </button>
          )}
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#141518] hover:bg-[#272A30] text-white text-xs font-semibold cursor-pointer">
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {uploading
                ? 'Optimizing Photo...'
                : isUploadedDataUrl
                  ? 'Replace Photo'
                  : 'Upload Photo'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-3">
        <div className="w-28 h-24 rounded-lg overflow-hidden border border-stone-300 bg-white shrink-0 flex items-center justify-center">
          <SafeImage
            src={value}
            alt={label}
            className={`w-full h-full ${isUploadedDataUrl ? 'object-contain p-1' : 'object-cover'}`}
          />
        </div>

        <div className="flex-1 w-full space-y-2">
          {isUploadedDataUrl && (
            <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
              <span>
                Photo uploaded &amp; cloud-optimized ({uploadedKb} KB) — click &ldquo;Save Product&rdquo; below to store it for customers.
              </span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-stone-600 mb-1">
              {isUploadedDataUrl
                ? 'Or paste an https:// Image URL to replace uploaded photo'
                : 'Image URL or Studio Preset'}
            </label>
            <input
              type="text"
              value={isUploadedDataUrl ? '' : value}
              onChange={(e) => {
                const next = e.target.value;
                if (isUploadedDataUrl && !next.trim()) return;
                onChange(next);
              }}
              placeholder={
                isUploadedDataUrl
                  ? 'Paste https://... URL only if you want to replace your uploaded photo'
                  : 'Paste https:// image URL or pick a preset below'
              }
              className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:border-[#9A6315]"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {Object.entries(BUNDLED_ASSETS).map(([key, asset]) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange(key)}
                className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                  value === key
                    ? 'bg-[#C2842D] text-white border-[#C2842D]'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                {asset.label.split(' ')[0]} {asset.label.split(' ')[1] || ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMsg && <p className="text-xs font-medium text-red-600">{errorMsg}</p>}
    </div>
  );
}
