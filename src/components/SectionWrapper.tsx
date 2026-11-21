import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, EyeOff, Pencil } from 'lucide-react';
import type { Language, SectionId } from '../types/site';

interface SectionWrapperProps {
  sectionId: SectionId;
  title: string;
  index: number;
  total: number;
  isAdmin: boolean;
  adminEditMode: boolean;
  onMoveSection: (index: number, direction: 'up' | 'down') => void;
  onHideSection: (id: SectionId) => void;
  onOpenSectionEditor: (id: SectionId) => void;
  lang: Language;
  children: ReactNode;
}

export function SectionWrapper({
  sectionId,
  title,
  index,
  total,
  isAdmin,
  adminEditMode,
  onMoveSection,
  onHideSection,
  onOpenSectionEditor,
  lang,
  children,
}: SectionWrapperProps) {
  return (
    <div className="relative">
      {isAdmin && adminEditMode && (
        <div className="bg-[#1F242D] text-stone-100 border-b border-stone-700 px-4 sm:px-6 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono font-semibold text-[#E0A446]">
              {lang === 'en' ? 'Section' : 'Sección'} {index + 1}/{total}: {title}
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onMoveSection(index, 'up')}
                disabled={index === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-35 cursor-pointer"
              >
                <ArrowUp className="w-3 h-3" />
                <span>{lang === 'en' ? 'Move Up' : 'Subir'}</span>
              </button>

              <button
                type="button"
                onClick={() => onMoveSection(index, 'down')}
                disabled={index === total - 1}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-35 cursor-pointer"
              >
                <ArrowDown className="w-3 h-3" />
                <span>{lang === 'en' ? 'Move Down' : 'Bajar'}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenSectionEditor(sectionId)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#C2842D] hover:bg-[#B07523] text-white font-semibold cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
                <span>{lang === 'en' ? 'Edit in Studio' : 'Editar'}</span>
              </button>

              <button
                type="button"
                onClick={() => onHideSection(sectionId)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-stone-600 text-stone-300 hover:bg-stone-800 cursor-pointer"
              >
                <EyeOff className="w-3 h-3" />
                <span>{lang === 'en' ? 'Hide' : 'Ocultar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
