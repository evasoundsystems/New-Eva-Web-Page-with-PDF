import type { Language } from '../types/site';
import { SafeImage } from './SafeImage';

interface VolunteerTrainingSectionProps {
  lang: Language;
  onOpenQuote: (preselectedService?: string) => void;
}

export function VolunteerTrainingSection({ lang, onOpenQuote }: VolunteerTrainingSectionProps) {
  const modules =
    lang === 'en'
      ? [
          {
            title: 'Gain Staging & Headroom',
            desc: 'Set clean preamp gain across singers, pastors, and band instruments without clipping or hiss.',
          },
          {
            title: 'Vocal EQ & Feedback Control',
            desc: 'Identify ringing room frequencies and apply high-pass filters for natural, crisp speech.',
          },
          {
            title: 'Monitor & IEM Mixing',
            desc: 'Guide musicians on Behringer P16-M or wireless IEM packs so stage volume stays balanced.',
          },
          {
            title: 'Bilingual Console Cheat Sheets',
            desc: 'Laminated English & Spanish quick-reference guides customized to your exact soundboard.',
          },
        ]
      : [
          {
            title: 'Estructura de Ganancia',
            desc: 'Ajustar preamplificadores de voces, predicadores e instrumentos sin distorsión ni ruido.',
          },
          {
            title: 'EQ Vocal y Control de Feedback',
            desc: 'Detectar frecuencias problemáticas de sala y limpiar voces con filtros pasa-altos.',
          },
          {
            title: 'Mezcla de Monitores e In-Ears',
            desc: 'Capacitar a músicos en Behringer P16-M o sistemas IEM para mantener la tarima controlada.',
          },
          {
            title: 'Guías Bilingües en Consola',
            desc: 'Hojas rápidas plastificadas en español e inglés adaptadas exactamente a su mezcladora.',
          },
        ];

  return (
    <section id="training" className="py-12 lg:py-14 border-b border-stone-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10 items-stretch">
          <div className="lg:col-span-6 flex">
            <div className="w-full min-h-[260px] lg:h-full rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
              <SafeImage
                src="asset:training"
                alt={
                  lang === 'en'
                    ? 'Sound engineer coaching a church volunteer at a digital mixing console'
                    : 'Ingeniero de sonido capacitando a un voluntario en consola digital'
                }
                fallbackTitle="Bilingual Volunteer Sound Training"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9A6315] mb-2">
                {lang === 'en' ? 'Hands-On Church Team Coaching' : 'Capacitación Práctica para Iglesias'}
              </p>
              <h2
                className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#141518] mb-3"
                style={{ textWrap: 'balance' }}
              >
                {lang === 'en'
                  ? 'Bilingual Volunteer Sound Training (English & Español)'
                  : 'Entrenamiento Bilingüe para Voluntarios de Audio (EN / ES)'}
              </h2>
              <p className="text-sm sm:text-base text-stone-600 leading-relaxed mb-6">
                {lang === 'en'
                  ? 'Great equipment only sounds as confident as the volunteers running it. Luis trains your church media team directly on your console so every Sunday runs smoothly.'
                  : 'Un buen equipo rinde al máximo cuando sus voluntarios se sienten seguros. Luis entrena a su equipo directamente en su consola.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {modules.map((mod, idx) => (
                  <div key={idx} className="p-4 rounded-lg border border-stone-200 bg-[#F8F8F6]">
                    <h3 className="font-display text-sm font-semibold text-[#141518] mb-1">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed">{mod.desc}</p>
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
                {lang === 'en' ? 'Schedule a Team Training Session' : 'Agendar Capacitación para su Equipo'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
