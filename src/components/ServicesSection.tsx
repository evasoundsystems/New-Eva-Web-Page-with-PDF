import { ArrowUp, ArrowDown, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Language, PageCopyConfig, ServiceItem } from '../types/site';
import { mergePageCopy } from '../utils/siteLogic';
import { SafeImage } from './SafeImage';

interface ServicesSectionProps {
  services: ServiceItem[];
  pageCopy?: PageCopyConfig;
  lang: Language;
  onOpenQuote: (preselectedService?: string) => void;
  isAdmin: boolean;
  adminEditMode: boolean;
  onEditService: (service: ServiceItem) => void;
  onAddService: () => void;
  onDeleteService: (id: string) => void;
  onMoveService: (index: number, direction: 'up' | 'down') => void;
  onEditSectionCopy?: () => void;
}

export function ServicesSection({
  services,
  pageCopy: rawPageCopy,
  lang,
  onOpenQuote,
  isAdmin,
  adminEditMode,
  onEditService,
  onAddService,
  onDeleteService,
  onMoveService,
  onEditSectionCopy,
}: ServicesSectionProps) {
  const copy = mergePageCopy(rawPageCopy);
  return (
    <section id="services" className="py-12 lg:py-14 border-b border-stone-200 bg-[#F8F8F6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-7">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9A6315] mb-2">
              {lang === 'en' ? copy.servicesEyebrowEn : copy.servicesEyebrowEs}
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#141518]"
              style={{ textWrap: 'balance' }}
            >
              {lang === 'en' ? copy.servicesHeadingEn : copy.servicesHeadingEs}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isAdmin && adminEditMode && onEditSectionCopy && (
              <button
                type="button"
                onClick={onEditSectionCopy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-700 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{lang === 'en' ? 'Edit Section Text' : 'Editar Texto'}</span>
              </button>
            )}
            {isAdmin && adminEditMode && (
              <button
                type="button"
                onClick={onAddService}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#C2842D] hover:bg-[#B07523] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{lang === 'en' ? 'Add Service' : 'Agregar Servicio'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenQuote(lang === 'en' ? 'Custom AV Installation / Estimate' : 'Instalación AV / Estimado')}
              className="px-4 py-2.5 rounded-lg border border-stone-300 hover:border-[#141518] text-sm font-semibold text-[#141518] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {lang === 'en' ? copy.servicesWalkthroughCtaEn : copy.servicesWalkthroughCtaEs}
            </button>
          </div>
        </div>

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, idx) => {
            const isMarquee = idx === 0 && services.length >= 3;
            const title = lang === 'en' ? service.titleEn : service.titleEs;
            const desc = lang === 'en' ? service.descriptionEn : service.descriptionEs;
            const deliverable = lang === 'en' ? service.deliverableEn : service.deliverableEs;

            return (
              <article
                key={service.id}
                className={`group flex flex-col bg-white border border-stone-200 rounded-xl overflow-hidden transition-transform duration-150 hover:-translate-y-0.5 ${
                  isMarquee ? 'lg:col-span-2' : ''
                }`}
              >
                <div className={`relative overflow-hidden bg-stone-100 ${isMarquee ? 'h-56 sm:h-64' : 'h-48'}`}>
                  <SafeImage
                    src={service.imageUrl}
                    alt={title}
                    fallbackTitle={title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-stone-500 mb-2">
                      {deliverable}
                    </p>
                    <h3 className="font-display text-xl font-semibold text-[#141518] mb-2">
                      {title}
                    </h3>
                    <p className="text-sm text-stone-600 leading-relaxed">{desc}</p>
                  </div>

                  <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenQuote(title)}
                      className="text-sm font-semibold text-[#9A6315] hover:text-[#141518] transition-colors cursor-pointer"
                    >
                      {lang === 'en' ? 'Request Quote →' : 'Solicitar Cotización →'}
                    </button>

                    {isAdmin && adminEditMode && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onMoveService(idx, 'up')}
                          disabled={idx === 0}
                          aria-label={`Move ${title} earlier`}
                          className="p-1.5 rounded border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-35 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveService(idx, 'down')}
                          disabled={idx === services.length - 1}
                          aria-label={`Move ${title} later`}
                          className="p-1.5 rounded border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-35 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditService(service)}
                          aria-label={`Edit ${title}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-stone-900 text-white text-xs font-medium hover:bg-stone-700 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>{lang === 'en' ? 'Edit' : 'Editar'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteService(service.id)}
                          aria-label={`Delete ${title}`}
                          className="p-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
