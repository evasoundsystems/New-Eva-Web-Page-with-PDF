import { useEffect, useState } from 'react';
import { AlertCircle, Award, CheckCircle2, Mail, MessageSquare, Phone, X } from 'lucide-react';
import type { BrandConfig, CustomerAccount, Language, QuoteRecord } from '../types/site';
import { validateQuoteInput } from '../utils/siteLogic';
import { submitQuote, type QuoteSubmissionResult } from '../services/apiClient';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: BrandConfig;
  lang: Language;
  initialService?: string;
  customer?: CustomerAccount | null;
  customerDiscountPercent?: number;
  onQuoteSubmitted?: (quote: QuoteRecord) => void;
}

const SERVICE_OPTIONS = [
  'Priority Care Plan ($50/week)',
  'Full Mixer Re-EQ & Room Tuning',
  'Pro Audio Gear Quote (Beat Sweetwater/GC)',
  'Turnkey AV / Speaker Installation',
  'Live Sound Engineering (Worship / Corporate)',
  'Bilingual Volunteer Sound Training (EN/ES)',
  'Stage Lighting, Haze or Low Fog Package',
  'Emergency Tech Support Callout ($120/hr, 4-hr min)',
];

export function QuoteModal({
  isOpen,
  onClose,
  brand,
  lang,
  initialService,
  customer = null,
  customerDiscountPercent = 0,
  onQuoteSubmitted,
}: QuoteModalProps) {
  const [organization, setOrganization] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceRequested, setServiceRequested] = useState(
    initialService || SERVICE_OPTIONS[0]
  );
  const [soundboardModel, setSoundboardModel] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('');
  const [timeline, setTimeline] = useState('');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedQuote, setSubmittedQuote] = useState<QuoteSubmissionResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSubmittedQuote(null);
      setErrors({});
      if (initialService) {
        setServiceRequested(initialService);
      }
      if (customer) {
        setOrganization((prev) => prev || customer.organization || '');
        setContactName((prev) => prev || customer.fullName || '');
        setPhone((prev) => prev || customer.phone || '');
        setEmail((prev) => prev || customer.email || '');
      }
    }
  }, [isOpen, initialService, customer]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      organization,
      contactName,
      phone,
      email,
      serviceRequested,
      soundboardModel,
      roomCapacity,
      timeline,
      notes,
    };

    const validation = validateQuoteInput(payload);
    if (!validation.valid) {
      setErrors(validation.errors);
      const firstErrorFieldId = validation.errors.contactName
        ? 'quote-name'
        : validation.errors.phone
          ? 'quote-phone'
          : validation.errors.email
            ? 'quote-email'
            : validation.errors.serviceRequested
              ? 'quote-service'
              : null;
      if (firstErrorFieldId) {
        const el = document.getElementById(firstErrorFieldId);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus();
      }
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const record = await submitQuote(payload);
      setSubmittedQuote(record);
      onQuoteSubmitted?.(record);
    } catch (error) {
      console.error('Error saving quote:', error);
      setErrors({
        submit:
          lang === 'en'
            ? `Failed to submit quote. Please call ${brand.phoneDisplay} directly.`
            : `Error al enviar la cotización. Por favor llame al ${brand.phoneDisplay}.`,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function buildEmailHref(q: QuoteRecord): string {
    const subject = encodeURIComponent(
      `[${q.refCode}] Service / Gear Estimate Request — ${q.organization || q.contactName}`
    );
    const body = encodeURIComponent(
      [
        `Reference ID: ${q.refCode}`,
        `Church / Organization: ${q.organization || 'N/A'}`,
        `Contact Name: ${q.contactName}`,
        `Phone: ${q.phone}`,
        `Email: ${q.email || 'N/A'}`,
        `Service / Product Requested: ${q.serviceRequested}`,
        `Soundboard / Console: ${q.soundboardModel || 'N/A'}`,
        `Room Capacity: ${q.roomCapacity || 'N/A'}`,
        `Timeline: ${q.timeline || 'N/A'}`,
        `Notes: ${q.notes || 'None'}`,
      ].join('\n')
    );
    return `mailto:${brand.email}?subject=${subject}&body=${body}`;
  }

  function buildSmsHref(q: QuoteRecord): string {
    const text = encodeURIComponent(
      `Hi Luis, I submitted Quote ${q.refCode} on E.V.A Worship Engineer.\nName: ${q.contactName}\nOrg: ${
        q.organization || 'N/A'
      }\nService: ${q.serviceRequested}\nConsole: ${q.soundboardModel || 'N/A'}\nPhone: ${q.phone}`
    );
    return `sms:+14145544388?body=${text}`;
  }

  const serviceOptionsList =
    initialService && !SERVICE_OPTIONS.includes(initialService)
      ? [initialService, ...SERVICE_OPTIONS]
      : SERVICE_OPTIONS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-modal-title"
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-xl bg-white border border-stone-200 shadow-2xl">
        <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9A6315]">
              {brand.name}
            </p>
            <h2 id="quote-modal-title" className="font-display text-lg sm:text-xl font-bold text-[#141518]">
              {submittedQuote
                ? lang === 'en'
                  ? 'Estimate Request Recorded!'
                  : '¡Solicitud de Estimado Registrada!'
                : lang === 'en'
                  ? 'Request a Free Estimate or Gear Quote'
                  : 'Solicitar Estimado o Cotización de Equipo'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'en' ? 'Close quote dialog' : 'Cerrar ventana'}
            className="w-9 h-9 rounded-lg border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-100 shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {submittedQuote ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-mono text-xs font-bold text-emerald-800 mb-1">
                    REF: {submittedQuote.refCode}
                  </p>
                  <p className="text-sm font-semibold text-[#141518] mb-1">
                    {lang === 'en'
                      ? `Thank you, ${submittedQuote.contactName}! Your request is saved in Luis Martinez's lead tracker.`
                      : `¡Gracias, ${submittedQuote.contactName}! Su solicitud quedó guardada en el sistema de Luis Martinez.`}
                  </p>
                  <p className="text-xs text-stone-600">
                    {lang === 'en'
                      ? 'Send it directly to Luis right now via Email, Text/SMS, or Phone Call for fastest response:'
                      : 'Envíelo directamente a Luis ahora por Correo, Mensaje de Texto o Llamada:'}
                  </p>
                  {submittedQuote._savedToFirebase || submittedQuote._savedToServer ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" aria-hidden="true" />
                      <span>
                        {lang === 'en'
                          ? 'Delivered to E.V.A Sound Systems cloud portal'
                          : 'Entregado al portal en la nube de E.V.A Sound Systems'}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-900">
                      {lang === 'en'
                        ? 'Your network blocked cloud sync. Please tap Email Luis Now or Send Text / SMS below so Luis receives your request immediately.'
                        : 'Su red bloqueó la sincronización en la nube. Toque Enviar Correo o Enviar SMS abajo para enviárselo a Luis de inmediato.'}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a
                  href={buildEmailHref(submittedQuote)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#141518] hover:bg-[#272A30] text-white text-xs sm:text-sm font-semibold text-center transition-colors"
                >
                  <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{lang === 'en' ? 'Email Luis Now' : 'Enviar Correo'}</span>
                </a>

                <a
                  href={buildSmsHref(submittedQuote)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#C2842D] hover:bg-[#B07523] text-white text-xs sm:text-sm font-semibold text-center transition-colors"
                >
                  <MessageSquare className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{lang === 'en' ? 'Send Text / SMS' : 'Enviar SMS'}</span>
                </a>

                <a
                  href={brand.phoneHref}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-stone-300 hover:border-[#141518] text-[#141518] text-xs sm:text-sm font-semibold text-center transition-colors"
                >
                  <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{brand.phoneDisplay}</span>
                </a>
              </div>

              <div className="rounded-lg border border-stone-200 bg-[#F8F8F6] p-4 text-xs text-stone-700 space-y-1">
                <p>
                  <span className="font-semibold">Service / Gear:</span>{' '}
                  {submittedQuote.serviceRequested}
                </p>
                <p>
                  <span className="font-semibold">Organization:</span>{' '}
                  {submittedQuote.organization || '—'}
                </p>
                <p>
                  <span className="font-semibold">Phone:</span> {submittedQuote.phone}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-lg border border-stone-300 text-sm font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                {lang === 'en' ? 'Done / Close Window' : 'Listo / Cerrar'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {customer && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 flex items-center gap-2 text-xs text-emerald-900">
                  <Award className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>
                    {lang === 'en'
                      ? `Signed in as ${customer.fullName}${customerDiscountPercent > 0 ? ` (VIP -${customerDiscountPercent}% Eligible)` : ''}`
                      : `Conectado como ${customer.fullName}${customerDiscountPercent > 0 ? ` (VIP -${customerDiscountPercent}%)` : ''}`}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="quote-org" className="block text-xs font-semibold text-stone-700 mb-1">
                    {lang === 'en' ? 'Church / Company Name' : 'Iglesia / Empresa'}
                  </label>
                  <input
                    id="quote-org"
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder={lang === 'en' ? 'e.g. Hope City Church' : 'ej. Iglesia Comunidad de Fe'}
                    className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#9A6315]"
                  />
                </div>

                <div>
                  <label htmlFor="quote-name" className="block text-xs font-semibold text-stone-700 mb-1">
                    {lang === 'en' ? 'Your Full Name *' : 'Su Nombre Completo *'}
                  </label>
                  <input
                    id="quote-name"
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder={lang === 'en' ? 'Pastor / Event Director name' : 'Nombre del contacto'}
                    className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#9A6315]"
                  />
                  {errors.contactName && (
                    <p className="text-xs text-red-600 mt-1">{errors.contactName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="quote-phone" className="block text-xs font-semibold text-stone-700 mb-1">
                    {lang === 'en' ? 'Phone Number *' : 'Número de Teléfono *'}
                  </label>
                  <input
                    id="quote-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(414) 555-0199"
                    className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#9A6315]"
                  />
                  {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label htmlFor="quote-email" className="block text-xs font-semibold text-stone-700 mb-1">
                    {lang === 'en' ? 'Email Address' : 'Correo Electrónico'}
                  </label>
                  <input
                    id="quote-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@church.org"
                    className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#9A6315]"
                  />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="quote-service" className="block text-xs font-semibold text-stone-700 mb-1">
                  {lang === 'en' ? 'Service or Equipment Needed *' : 'Servicio o Equipo Necesario *'}
                </label>
                <select
                  id="quote-service"
                  value={serviceRequested}
                  onChange={(e) => setServiceRequested(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#9A6315]"
                >
                  {serviceOptionsList.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {errors.serviceRequested && (
                  <p className="text-xs text-red-600 mt-1">{errors.serviceRequested}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="quote-board" className="block text-xs font-semibold text-stone-700 mb-1">
                    {lang === 'en' ? 'Soundboard Model' : 'Consola / Mezcladora'}
                  </label>
                  <input
                    id="quote-board"
                    type="text"
                    value={soundboardModel}
                    onChange={(e) => setSoundboardModel(e.target.value)}
                    placeholder="X32, WING, SQ..."
                    className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#9A6315]"
                  />
                </div>

                <div>
                  <label htmlFor="quote-capacity" className="block text-xs font-semibold text-stone-700 mb-1">
                    {lang === 'en' ? 'Room Capacity' : 'Capacidad'}
                  </label>
                  <input
                    id="quote-capacity"
                    type="text"
                    value={roomCapacity}
                    onChange={(e) => setRoomCapacity(e.target.value)}
                    placeholder="e.g. 250 seats"
                    className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#9A6315]"
                  />
                </div>

                <div>
                  <label htmlFor="quote-timeline" className="block text-xs font-semibold text-stone-700 mb-1">
                    {lang === 'en' ? 'Date / Urgency' : 'Fecha / Urgencia'}
                  </label>
                  <input
                    id="quote-timeline"
                    type="text"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    placeholder={lang === 'en' ? 'This Sunday / Next month' : 'Este domingo / Próximo mes'}
                    className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#9A6315]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="quote-notes" className="block text-xs font-semibold text-stone-700 mb-1">
                  {lang === 'en' ? 'Audio Issues, Gear Models, or Project Notes' : 'Detalles del Proyecto o Problemas de Audio'}
                </label>
                <textarea
                  id="quote-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    lang === 'en'
                      ? 'Tell Luis about your sanctuary, event date, or gear links...'
                      : 'Cuéntele a Luis sobre su iglesia, fecha del evento o equipos...'
                  }
                  className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#9A6315]"
                />
              </div>

              {(errors.submit || Object.keys(errors).length > 0) && (
                <div
                  role="alert"
                  className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
                  <span>
                    {errors.submit ||
                      (lang === 'en'
                        ? `Please complete the required fields above: ${Object.values(errors).join(' ')}`
                        : `Por favor complete los campos requeridos arriba: ${Object.values(errors).join(' ')}`)}
                  </span>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-stone-500">
                  {lang === 'en'
                    ? `Direct line: ${brand.phoneDisplay} · ${brand.email}`
                    : `Línea directa: ${brand.phoneDisplay} · ${brand.email}`}
                </p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#C2842D] hover:bg-[#B07523] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  {submitting
                    ? lang === 'en'
                      ? 'Sending...'
                      : 'Enviando...'
                    : lang === 'en'
                      ? 'Submit Estimate Request'
                      : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}