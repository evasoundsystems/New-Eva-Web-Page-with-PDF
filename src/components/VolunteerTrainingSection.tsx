import { Pencil } from 'lucide-react';
import type { Language, PageCopyConfig } from '../types/site';
import { mergePageCopy } from '../utils/siteLogic';
import { SafeImage } from './SafeImage';

interface VolunteerTrainingSectionProps {
  lang: Language;
  pageCopy?: PageCopyConfig;
  onOpenQuote: (preselectedService?: string) => void;
  isAdmin?: boolean;
  adminEditMode?: boolean;
  onEditSectionCopy?: () => void;
}

export function VolunteerTrainingSection({
  lang,
  pageCopy: rawPageCopy,
  onOpenQuote,
  isAdmin = false,
  adminEditMode = false,
  onEditSectionCopy,
}: VolunteerTrainingSectionProps) {
  const copy = mergePageCopy(rawPageCopy);
  const modules = copy.trainingModules;

  return (
    <section id="training" className="py-12 lg:py-14 border-b border-stone-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10 items-stretch">
          <div className="lg:col-span-6 flex">
            <div className="w-full min-h-[260px] lg:h-full rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
              <SafeImage
                src={copy.trainingImageUrl || 'asset:training'}
                alt={
                  lang === 'en'
                    ? 'Sound engineer coaching a church volunteer at a digital mixing console'
                    : 'Ingeniero de sonido capacitando a un voluntario en consola digital'
                }
                fallbackTitle={lang === 'en' ? copy.trainingHeadingEn : copy.trainingHeadingEs}
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9A6315] mb-2">
                  {lang === 'en' ? copy.trainingEyebrowEn : copy.trainingEyebrowEs}
                </p>
                {isAdmin && adminEditMode && onEditSectionCopy && (
                  <button
                    type="button"
                    onClick={onEditSectionCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-700 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{lang === 'en' ? 'Edit Section Text' : 'Editar Texto'}</span>
                  </button>
                )}
              </div>

              <h2
                className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#141518] mb-3"
                style={{ textWrap: 'balance' }}
              >
                {lang === 'en' ? copy.trainingHeadingEn : copy.trainingHeadingEs}
              </h2>
              <p className="text-sm sm:text-base text-stone-600 leading-relaxed mb-6">
                {lang === 'en' ? copy.trainingSubtitleEn : copy.trainingSubtitleEs}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {modules.map((mod) => (
                  <div key={mod.id} className="p-4 rounded-lg border border-stone-200 bg-[#F8F8F6]">
                    <h3 className="font-display text-sm font-semibold text-[#141518] mb-1">
                      {lang === 'en' ? mod.titleEn : mod.titleEs}
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {lang === 'en' ? mod.descEn : mod.descEs}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() =>
                  onOpenQuote(
                    lang === 'en'
                      ? 'Volunteer Sound Training Workshop (EN/ES)'
                      : 'Taller de Capacitación para Voluntarios (EN/ES)'
                  )
                }
                className="px-5 py-3 rounded-lg bg-[#141518] hover:bg-[#272A30] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {lang === 'en' ? copy.trainingCtaEn : copy.trainingCtaEs}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
