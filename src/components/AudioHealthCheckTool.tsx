import { useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import type { Language, PageCopyConfig } from '../types/site';
import { mergePageCopy, runSanctuaryDiagnostic, type DiagnosticInput } from '../utils/siteLogic';

interface AudioHealthCheckToolProps {
  lang: Language;
  pageCopy?: PageCopyConfig;
  onOpenQuote: (preselectedService?: string) => void;
  isAdmin?: boolean;
  adminEditMode?: boolean;
  onEditSectionCopy?: () => void;
}

export function AudioHealthCheckTool({
  lang,
  pageCopy: rawPageCopy,
  onOpenQuote,
  isAdmin = false,
  adminEditMode = false,
  onEditSectionCopy,
}: AudioHealthCheckToolProps) {
  const copy = mergePageCopy(rawPageCopy);
  const [symptom, setSymptom] = useState<DiagnosticInput['symptom']>('feedback');
  const [roomSize, setRoomSize] = useState<DiagnosticInput['roomSize']>('medium');
  const [consoleType, setConsoleType] = useState<DiagnosticInput['consoleType']>('x32_m32');

  const result = runSanctuaryDiagnostic({ symptom, roomSize, consoleType });

  return (
    <section id="diagnostic" className="py-12 lg:py-14 border-b border-stone-200 bg-[#F8F8F6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9A6315] mb-2">
              {lang === 'en' ? copy.diagnosticEyebrowEn : copy.diagnosticEyebrowEs}
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#141518]"
              style={{ textWrap: 'balance' }}
            >
              {lang === 'en' ? copy.diagnosticHeadingEn : copy.diagnosticHeadingEs}
            </h2>
          </div>

          {isAdmin && adminEditMode && onEditSectionCopy && (
            <button
              type="button"
              onClick={onEditSectionCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-700 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{lang === 'en' ? 'Edit Section Text' : 'Editar Texto'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls */}
          <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xl p-6 space-y-5">
            <div>
              <label
                htmlFor="diag-symptom"
                className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2"
              >
                {lang === 'en' ? '1. Primary Sound Issue' : '1. Problema Principal'}
              </label>
              <select
                id="diag-symptom"
                value={symptom}
                onChange={(e) => setSymptom(e.target.value as DiagnosticInput['symptom'])}
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8F8F6] border border-stone-300 rounded-lg text-[#141518] focus:outline-none focus:border-[#9A6315]"
              >
                <option value="feedback">
                  {lang === 'en'
                    ? 'Mic Feedback Squeals (Pulpit / Handhelds)'
                    : 'Pitidos de Feedback (Púlpito / Micrófonos)'}
                </option>
                <option value="muddy">
                  {lang === 'en'
                    ? 'Muddy Sermons / Buried Worship Vocals'
                    : 'Voz Opaca / Sermón Poco Claro'}
                </option>
                <option value="stageVolume">
                  {lang === 'en'
                    ? 'Loud Stage / Monitor Wedge Wars'
                    : 'Tarima Muy Fuerte / Problemas de Monitores'}
                </option>
                <option value="volunteer">
                  {lang === 'en'
                    ? 'Volunteers Losing Scenes or Guessing Levels'
                    : 'Voluntarios Pierden Escenas o Niveles'}
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="diag-room"
                className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2"
              >
                {lang === 'en' ? '2. Sanctuary / Venue Size' : '2. Tamaño del Auditorio'}
              </label>
              <select
                id="diag-room"
                value={roomSize}
                onChange={(e) => setRoomSize(e.target.value as DiagnosticInput['roomSize'])}
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8F8F6] border border-stone-300 rounded-lg text-[#141518] focus:outline-none focus:border-[#9A6315]"
              >
                <option value="small">
                  {lang === 'en' ? 'Under 150 Seats' : 'Menos de 150 Personas'}
                </option>
                <option value="medium">
                  {lang === 'en' ? '150 – 450 Seats' : '150 – 450 Personas'}
                </option>
                <option value="large">
                  {lang === 'en' ? '450+ Seats / Balcony' : '450+ Personas / Balcón'}
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="diag-console"
                className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2"
              >
                {lang === 'en' ? '3. Current Mixing Console' : '3. Consola Actual'}
              </label>
              <select
                id="diag-console"
                value={consoleType}
                onChange={(e) => setConsoleType(e.target.value as DiagnosticInput['consoleType'])}
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8F8F6] border border-stone-300 rounded-lg text-[#141518] focus:outline-none focus:border-[#9A6315]"
              >
                <option value="x32_m32">Behringer X32 / Midas M32</option>
                <option value="wing_sq">Behringer WING / Allen &amp; Heath SQ</option>
                <option value="analog">
                  {lang === 'en' ? 'Analog Mixer' : 'Mezcladora Análoga'}
                </option>
                <option value="unknown">
                  {lang === 'en' ? 'Other / Need Recommendation' : 'Otra / Necesito Asesoría'}
                </option>
              </select>
            </div>
          </div>

          {/* Recommendation Output */}
          <div className="lg:col-span-7 bg-[#141518] text-stone-100 rounded-xl p-6 sm:p-8 border border-stone-800">
            <p className="text-xs font-medium uppercase tracking-wider text-[#E0A446] mb-2">
              {lang === 'en' ? copy.diagnosticResultBadgeEn : copy.diagnosticResultBadgeEs}
            </p>
            <h3 className="font-display text-2xl font-bold text-white mb-2">
              {lang === 'en' ? result.titleEn : result.titleEs}
            </h3>
            <p className="text-sm text-stone-300 leading-relaxed mb-6">
              {lang === 'en' ? result.summaryEn : result.summaryEs}
            </p>

            <ul className="space-y-3 mb-7">
              {(lang === 'en' ? result.stepsEn : result.stepsEs).map((step, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-stone-200">
                  <Check className="w-4 h-4 text-[#E0A446] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>

            <div className="pt-5 border-t border-stone-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-stone-400">
                  {lang === 'en' ? 'Suggested Service:' : 'Servicio Sugerido:'}
                </p>
                <p className="text-sm font-semibold text-white">{result.recommendedService}</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenQuote(result.recommendedService)}
                className="px-5 py-2.5 rounded-lg bg-[#C2842D] hover:bg-[#D19238] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {lang === 'en' ? copy.diagnosticCtaEn : copy.diagnosticCtaEs}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
