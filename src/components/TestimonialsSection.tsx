import { useState } from 'react';
import { ArrowUp, ArrowDown, Pencil, Plus, Trash2 } from 'lucide-react';
import type { BrandConfig, Language, TestimonialCategory, TestimonialItem } from '../types/site';

interface TestimonialsSectionProps {
  testimonials: TestimonialItem[];
  brand: BrandConfig;
  lang: Language;
  onOpenQuote: (preselectedService?: string) => void;
  isAdmin: boolean;
  adminEditMode: boolean;
  onEditTestimonial: (item: TestimonialItem) => void;
  onAddTestimonial: () => void;
  onDeleteTestimonial: (id: string) => void;
  onMoveTestimonial: (index: number, direction: 'up' | 'down') => void;
}

const FILTER_TABS: Array<{ id: TestimonialCategory; labelEn: string; labelEs: string }> = [
  { id: 'all', labelEn: 'All Stories', labelEs: 'Todos' },
  { id: 'church', labelEn: 'Churches & Sanctuaries', labelEs: 'Iglesias y Santuarios' },
  { id: 'corporate', labelEn: 'Corporate Events', labelEs: 'Eventos Corporativos' },
  { id: 'ministry', labelEn: 'Special Ministries', labelEs: 'Retiros y Ministerios' },
];

export function TestimonialsSection({
  testimonials,
  brand,
  lang,
  onOpenQuote,
  isAdmin,
  adminEditMode,
  onEditTestimonial,
  onAddTestimonial,
  onDeleteTestimonial,
  onMoveTestimonial,
}: TestimonialsSectionProps) {
  const [filter, setFilter] = useState<TestimonialCategory>('all');

  const filtered =
    filter === 'all' ? testimonials : testimonials.filter((t) => t.category === filter);

  return (
    <section id="testimonials" className="py-12 lg:py-14 border-b border-stone-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9A6315] mb-2">
              {lang === 'en' ? 'Verified Client Outcomes' : 'Testimonios Verificados'}
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#141518]"
              style={{ textWrap: 'balance' }}
            >
              {lang === 'en'
                ? 'Trusted by Pastors, Worship Leaders & Event Directors'
                : 'La Confianza de Pastores, Ministerios y Directores de Eventos'}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && adminEditMode && (
              <button
                type="button"
                onClick={onAddTestimonial}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C2842D] hover:bg-[#B07523] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{lang === 'en' ? 'Add Review' : 'Agregar Testimonio'}</span>
              </button>
            )}

            <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 rounded-lg">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filter === tab.id
                      ? 'bg-white text-[#141518] shadow-xs'
                      : 'text-stone-600 hover:text-[#141518]'
                  }`}
                >
                  {lang === 'en' ? tab.labelEn : tab.labelEs}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-7">
          {filtered.map((item) => {
            const globalIdx = testimonials.findIndex((t) => t.id === item.id);
            return (
              <article
                key={item.id}
                className="p-6 rounded-xl border border-stone-200 bg-[#F8F8F6] flex flex-col justify-between gap-5"
              >
                <div>
                  <p className="font-mono text-xs font-semibold text-[#9A6315] mb-3">
                    {item.outcomeMetric}
                  </p>
                  <blockquote className="text-sm text-[#141518] leading-relaxed">
                    “{lang === 'en' ? item.quoteEn : item.quoteEs}”
                  </blockquote>
                </div>

                <div className="pt-4 border-t border-stone-200 space-y-2">
                  <div>
                    <p className="font-display text-sm font-bold text-[#141518]">{item.name}</p>
                    <p className="text-xs text-stone-600">
                      {lang === 'en' ? item.roleEn : item.roleEs} · {item.organization}
                    </p>
                    <p className="text-xs font-mono text-stone-500 mt-1">{item.gearContext}</p>
                  </div>

                  {isAdmin && adminEditMode && (
                    <div className="pt-2 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onMoveTestimonial(globalIdx, 'up')}
                        disabled={globalIdx <= 0}
                        aria-label={`Move ${item.name} review up`}
                        className="p-1.5 rounded border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 disabled:opacity-35 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveTestimonial(globalIdx, 'down')}
                        disabled={globalIdx === testimonials.length - 1}
                        aria-label={`Move ${item.name} review down`}
                        className="p-1.5 rounded border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 disabled:opacity-35 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditTestimonial(item)}
                        aria-label={`Edit ${item.name} review`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-stone-900 text-white text-xs font-medium hover:bg-stone-700 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>{lang === 'en' ? 'Edit' : 'Editar'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTestimonial(item.id)}
                        aria-label={`Delete ${item.name} review`}
                        className="p-1.5 rounded border border-red-200 bg-white text-red-700 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* Consultation CTA */}
        <div className="rounded-xl bg-[#141518] text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-xl sm:text-2xl font-bold mb-1">
              {lang === 'en'
                ? 'Ready for Clear, Feedback-Free Worship & Event Audio?'
                : '¿Listo para un Sonido Claro y Sin Feedback en su Iglesia o Evento?'}
            </h3>
            <p className="text-sm text-stone-300">
              {lang === 'en'
                ? `Speak directly with ${brand.leadEngineer} at ${brand.phoneDisplay} or request an estimate online.`
                : `Comuníquese directamente con ${brand.leadEngineer} al ${brand.phoneDisplay} o solicite su estimado en línea.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href={brand.phoneHref}
              className="px-4 py-2.5 rounded-lg border border-stone-700 hover:border-stone-500 text-sm font-mono font-semibold text-white whitespace-nowrap shrink-0"
            >
              {brand.phoneDisplay}
            </a>
            <button
              type="button"
              onClick={() => onOpenQuote()}
              className="px-5 py-2.5 rounded-lg bg-[#C2842D] hover:bg-[#D19238] text-white text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              {lang === 'en' ? 'Request a Free Estimate' : 'Solicitar Estimado Gratis'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
