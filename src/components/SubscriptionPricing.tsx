import { useState } from 'react';
import { Check, Minus, Pencil, Plus } from 'lucide-react';
import type { Language, PageCopyConfig, PricingConfig } from '../types/site';
import { calculateCarePlanSavings, mergePageCopy } from '../utils/siteLogic';

interface SubscriptionPricingProps {
  pricing: PricingConfig;
  pageCopy?: PageCopyConfig;
  lang: Language;
  onOpenQuote: (preselectedService?: string) => void;
  isAdmin: boolean;
  adminEditMode: boolean;
  onEditPricing: () => void;
}

export function SubscriptionPricing({
  pricing,
  pageCopy: rawPageCopy,
  lang,
  onOpenQuote,
  isAdmin,
  adminEditMode,
  onEditPricing,
}: SubscriptionPricingProps) {
  const copy = mergePageCopy(rawPageCopy);
  const [emergencyCalls, setEmergencyCalls] = useState(2);
  const [reEqVisits, setReEqVisits] = useState(4);

  const savings = calculateCarePlanSavings(
    emergencyCalls,
    reEqVisits,
    pricing.weeklyRate,
    pricing.standaloneHourlyRate,
    pricing.standaloneMinHours
  );

  const inclusions = lang === 'en' ? pricing.inclusionsEn : pricing.inclusionsEs;
  const standaloneNotes = lang === 'en' ? pricing.standaloneNotesEn : pricing.standaloneNotesEs;

  return (
    <section id="pricing" className="py-12 lg:py-14 border-b border-stone-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-7">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9A6315] mb-2">
              {lang === 'en' ? copy.pricingEyebrowEn : copy.pricingEyebrowEs}
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#141518]"
              style={{ textWrap: 'balance' }}
            >
              {lang === 'en' ? copy.pricingHeadingEn : copy.pricingHeadingEs}
            </h2>
          </div>

          {isAdmin && adminEditMode && (
            <button
              type="button"
              onClick={onEditPricing}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#C2842D] hover:bg-[#B07523] text-white text-sm font-semibold transition-colors cursor-pointer shrink-0"
            >
              <Pencil className="w-4 h-4" aria-hidden="true" />
              <span>{lang === 'en' ? 'Edit Pricing, Bullets & Text' : 'Editar Precios y Texto'}</span>
            </button>
          )}
        </div>

        {/* Two-Column Clear Pricing Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch mb-7">
          {/* Care Plan Card */}
          <div className="lg:col-span-7 bg-[#141518] text-stone-100 rounded-xl p-6 sm:p-8 flex flex-col justify-between border border-stone-800">
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-4 pb-6 border-b border-stone-800">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#E0A446] mb-1">
                    {lang === 'en' ? copy.pricingCardBadgeEn : copy.pricingCardBadgeEs}
                  </p>
                  <h3 className="font-display text-2xl font-bold text-white">
                    {lang === 'en' ? pricing.planNameEn : pricing.planNameEs}
                  </h3>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-mono text-3xl sm:text-4xl font-bold text-white tabular-nums">
                    ${pricing.weeklyRate}
                    <span className="text-sm font-normal text-stone-400">
                      {lang === 'en' ? ' / week' : ' / semana'}
                    </span>
                  </p>
                  <p className="text-xs text-stone-400 font-mono tabular-nums mt-0.5">
                    (${pricing.monthlyEquivalent}
                    {lang === 'en' ? '/mo equivalent' : '/mes equivalente'})
                  </p>
                </div>
              </div>

              <ul className="mt-6 space-y-3.5">
                {inclusions.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm sm:text-base text-stone-200">
                    <Check className="w-5 h-5 text-[#E0A446] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-stone-800 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-stone-400 max-w-sm">
                {lang === 'en'
                  ? `Includes 1 full mixer re-EQ every ${pricing.reEqIntervalMonths} months + ${pricing.freeFollowUpEqPerYear} free follow-up EQ within the year if needed outside intervals.`
                  : `Incluye 1 re-ecualización completa cada ${pricing.reEqIntervalMonths} meses + ${pricing.freeFollowUpEqPerYear} EQ adicional gratis en el año fuera de intervalo.`}
              </p>
              <button
                type="button"
                onClick={() =>
                  onOpenQuote(
                    `${pricing.planNameEn} ($${pricing.weeklyRate}/week)`
                  )
                }
                className="px-5 py-3 rounded-lg bg-[#C2842D] hover:bg-[#D19238] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {lang === 'en' ? copy.pricingCardCtaEn : copy.pricingCardCtaEs}
              </button>
            </div>
          </div>

          {/* Standalone On-Call Rate Card */}
          <div className="lg:col-span-5 bg-[#F8F8F6] rounded-xl p-6 sm:p-8 border border-stone-200 flex flex-col justify-between">
            <div>
              <div className="pb-6 border-b border-stone-200">
                <p className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
                  {lang === 'en' ? copy.pricingStandaloneBadgeEn : copy.pricingStandaloneBadgeEs}
                </p>
                <h3 className="font-display text-2xl font-bold text-[#141518]">
                  {lang === 'en' ? copy.pricingStandaloneTitleEn : copy.pricingStandaloneTitleEs}
                </h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold text-[#141518] tabular-nums">
                    ${pricing.standaloneHourlyRate}/hr
                  </span>
                  <span className="text-sm font-medium text-stone-600 font-mono tabular-nums">
                    ({pricing.standaloneMinHours}-{lang === 'en' ? 'hr min' : 'hrs mín'} = $
                    {savings.standalonePerVisit})
                  </span>
                </div>
              </div>

              <ul className="mt-6 space-y-3.5">
                {standaloneNotes.map((note, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-stone-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0 mt-2" aria-hidden="true" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-stone-200">
              <button
                type="button"
                onClick={() =>
                  onOpenQuote(
                    `Standalone Service Call ($${pricing.standaloneHourlyRate}/hr, ${pricing.standaloneMinHours}-hr min)`
                  )
                }
                className="w-full px-5 py-3 rounded-lg border border-stone-300 bg-white hover:border-[#141518] text-[#141518] text-sm font-semibold transition-colors cursor-pointer"
              >
                {lang === 'en' ? copy.pricingStandaloneCtaEn : copy.pricingStandaloneCtaEs}
              </button>
            </div>
          </div>
        </div>

        {/* Official Re-EQ Terms Banner (Hairline border, no thick left bar) */}
        <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-4 sm:p-5 mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9A6315] mb-1.5">
            {lang === 'en' ? copy.pricingPolicyTitleEn : copy.pricingPolicyTitleEs}
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            {lang === 'en'
              ? `Every $${pricing.weeklyRate}/week subscription includes one full re-EQing of your mixer or soundboard every ${pricing.reEqIntervalMonths} months, plus ${pricing.freeFollowUpEqPerYear} free follow-up EQ within the year if an adjustment is needed outside those 3-month intervals. Additional visits or non-subscriber re-EQing are billed at $${pricing.standaloneHourlyRate}/hour with a ${pricing.standaloneMinHours}-hour minimum ($${savings.standalonePerVisit} minimum), alongside recurring on-site diagnostic checkups for subscribers.`
              : `Cada suscripción de $${pricing.weeklyRate}/semana incluye una re-ecualización completa de su consola cada ${pricing.reEqIntervalMonths} meses, más ${pricing.freeFollowUpEqPerYear} ecualización de seguimiento gratis al año si se requiere fuera de ese intervalo. Cualquier servicio adicional o fuera de plan se factura a $${pricing.standaloneHourlyRate}/hora con un mínimo de ${pricing.standaloneMinHours} horas ($${savings.standalonePerVisit} mínimo).`}
          </p>
        </div>

        {/* Value Proposition + Interactive Annual Savings Calculator */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {pricing.valueProps.map((vp) => (
              <div key={vp.id} className="p-5 rounded-xl border border-stone-200 bg-white">
                <h4 className="font-display text-base font-semibold text-[#141518] mb-1.5">
                  {lang === 'en' ? vp.titleEn : vp.titleEs}
                </h4>
                <p className="text-sm text-stone-600 leading-relaxed">
                  {lang === 'en' ? vp.bodyEn : vp.bodyEs}
                </p>
              </div>
            ))}
          </div>

          {/* Interactive Annual Savings Calculator */}
          <div className="lg:col-span-5 rounded-xl border border-stone-200 bg-[#F8F8F6] p-6">
            <h3 className="font-display text-lg font-bold text-[#141518] mb-1">
              {lang === 'en' ? copy.pricingCalcTitleEn : copy.pricingCalcTitleEs}
            </h3>
            <p className="text-xs text-stone-600 mb-5">
              {lang === 'en'
                ? `Compare your $${pricing.weeklyRate}/week subscription against $${pricing.standaloneHourlyRate}/hr (${pricing.standaloneMinHours}-hr min = $${savings.standalonePerVisit}/visit).`
                : `Compare su plan de $${pricing.weeklyRate}/sem contra visitas de $${pricing.standaloneHourlyRate}/hr (mínimo ${pricing.standaloneMinHours} hrs = $${savings.standalonePerVisit}).`}
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 bg-white p-3.5 rounded-lg border border-stone-200">
                <div>
                  <p className="text-sm font-medium text-[#141518]">
                    {lang === 'en' ? 'Emergency / Tech Calls / Yr' : 'Llamadas de Emergencia / Año'}
                  </p>
                  <p className="text-xs text-stone-500">
                    {lang === 'en' ? 'Sunday or event troubleshooting' : 'Soporte urgente en vivo'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Decrease emergency calls per year"
                    onClick={() => setEmergencyCalls((v) => Math.max(0, v - 1))}
                    className="w-8 h-8 rounded border border-stone-300 flex items-center justify-center hover:bg-stone-100 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono w-6 text-center font-semibold tabular-nums">
                    {emergencyCalls}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase emergency calls per year"
                    onClick={() => setEmergencyCalls((v) => Math.min(12, v + 1))}
                    className="w-8 h-8 rounded border border-stone-300 flex items-center justify-center hover:bg-stone-100 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 bg-white p-3.5 rounded-lg border border-stone-200">
                <div>
                  <p className="text-sm font-medium text-[#141518]">
                    {lang === 'en' ? 'Mixer Re-EQ Tunings / Yr' : 'Re-Ecualizaciones / Año'}
                  </p>
                  <p className="text-xs text-stone-500">
                    {lang === 'en' ? 'Recommended: 4 quarterly tunings' : 'Recomendado: 4 al año'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Decrease re-EQ visits per year"
                    onClick={() => setReEqVisits((v) => Math.max(0, v - 1))}
                    className="w-8 h-8 rounded border border-stone-300 flex items-center justify-center hover:bg-stone-100 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono w-6 text-center font-semibold tabular-nums">
                    {reEqVisits}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase re-EQ visits per year"
                    onClick={() => setReEqVisits((v) => Math.min(8, v + 1))}
                    className="w-8 h-8 rounded border border-stone-300 flex items-center justify-center hover:bg-stone-100 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-stone-200 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-600">
                  {lang === 'en' ? 'Standalone Cost / Year:' : 'Costo Individual / Año:'}
                </span>
                <span className="font-mono font-semibold text-[#141518] tabular-nums">
                  ${savings.standaloneAnnualCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">
                  {lang === 'en' ? `$${pricing.weeklyRate}/wk Care Plan / Year:` : `Plan $${pricing.weeklyRate}/sem / Año:`}
                </span>
                <span className="font-mono font-semibold text-[#141518] tabular-nums">
                  ${savings.carePlanAnnualCost.toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline">
                <span className="font-semibold text-[#141518]">
                  {savings.savesMoney
                    ? lang === 'en'
                      ? 'Estimated Annual Savings:'
                      : 'Ahorro Anual Estimado:'
                    : lang === 'en'
                      ? 'Difference (Includes Standby):'
                      : 'Diferencia (Incluye Guardia):'}
                </span>
                <span
                  className={`font-mono text-xl font-bold tabular-nums ${
                    savings.savesMoney ? 'text-emerald-700' : 'text-[#9A6315]'
                  }`}
                >
                  {savings.savesMoney
                    ? `$${savings.annualSavings.toLocaleString()}`
                    : `$${Math.abs(savings.annualSavings).toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
