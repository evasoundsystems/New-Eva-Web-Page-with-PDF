import { Eye, EyeOff, LayoutDashboard, LogOut, Pencil } from 'lucide-react';
import type { Language } from '../types/site';

interface AdminFloatingBarProps {
  lang: Language;
  adminEditMode: boolean;
  onToggleEditMode: () => void;
  onOpenStudio: () => void;
  onLogout: () => void;
  saveNotice: string;
  saveError?: string;
}

export function AdminFloatingBar({
  lang,
  adminEditMode,
  onToggleEditMode,
  onOpenStudio,
  onLogout,
  saveNotice,
  saveError,
}: AdminFloatingBarProps) {
  return (
    <div
      className="fixed bottom-4 right-4 z-40 max-w-[calc(100vw-2rem)] bg-[#141518] text-white border border-stone-700 rounded-xl shadow-2xl px-3.5 py-2.5 flex flex-wrap items-center gap-2.5"
      role="region"
      aria-label="Admin Edit Controls"
    >
      <div className="flex items-center gap-2 pr-2 border-r border-stone-700">
        <Pencil className="w-3.5 h-3.5 text-[#E0A446]" aria-hidden="true" />
        <span
          className={`text-xs font-semibold whitespace-nowrap ${
            saveError ? 'text-red-400' : saveNotice ? 'text-emerald-400' : 'text-white'
          }`}
        >
          {saveError || saveNotice || (lang === 'en' ? 'Admin Mode' : 'Modo Admin')}
        </span>
      </div>

      <button
        type="button"
        onClick={onToggleEditMode}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
          adminEditMode
            ? 'bg-[#C2842D] text-white hover:bg-[#B07523]'
            : 'bg-stone-800 text-stone-200 hover:bg-stone-700'
        }`}
      >
        {adminEditMode ? (
          <>
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{lang === 'en' ? 'On-Page Edit: ON' : 'Edición en Vivo: ON'}</span>
          </>
        ) : (
          <>
            <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{lang === 'en' ? 'On-Page Edit: OFF' : 'Edición en Vivo: OFF'}</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onOpenStudio}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#141518] hover:bg-stone-200 text-xs font-semibold transition-colors cursor-pointer"
      >
        <LayoutDashboard className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{lang === 'en' ? 'Admin Studio' : 'Panel Admin'}</span>
      </button>

      <button
        type="button"
        onClick={onLogout}
        aria-label={lang === 'en' ? 'Log out of Admin mode' : 'Cerrar sesión admin'}
        className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
