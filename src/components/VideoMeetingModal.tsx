import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Phone,
  Video,
  X,
} from 'lucide-react';
import { submitQuote, type QuoteSubmissionResult } from '../services/apiClient';
import {
  clearCachedMeetAccessToken,
  formatFirebaseAuthError,
  getCachedMeetAccessToken,
  signInWithGoogleForMeet,
} from '../services/firebase';
import { createGoogleMeetSpace } from '../services/googleMeet';
import type {
  BrandConfig,
  CustomerAccount,
  Language,
  QuoteRecord,
  VideoMeetingConfig,
} from '../types/site';
import {
  buildVideoMeetingRequestInput,
  extractGoogleMeetCode,
  mergeVideoMeetingConfig,
  normalizeGoogleMeetUrl,
  validateQuoteInput,
} from '../utils/siteLogic';

interface VideoMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: BrandConfig;
  videoMeeting?: VideoMeetingConfig;
  lang: Language;
  customer?: CustomerAccount | null;
  onMeetingRequested?: (record: QuoteRecord) => void;
}

const TOPICS_EN = [
  'Sanctuary Sound Check & Feedback Walkthrough',
  'Speaker, Line Array & Mixer Quote Comparison',
  'Volunteer Soundboard Training Demo',
  'Stage Lighting & Rigging Consultation',
  'Urgent Audio / Mixer Tech Support',
];

const TOPICS_ES = [
  'Revisión de Sonido y Feedback del Santuario',
  'Cotización de Parlantes, Line Array y Consolas',
  'Demostración de Capacitación para Voluntarios',
  'Consulta de Iluminación y Montaje (Truss)',
  'Soporte Técnico Urgente de Consola / Audio',
];

const TIME_WINDOWS = [
  'Morning (9:00 AM – 12:00 PM CST)',
  'Afternoon (12:00 PM – 4:00 PM CST)',
  'Evening (4:00 PM – 7:00 PM CST)',
  'ASAP / Next Available',
];

export function VideoMeetingModal({
  isOpen,
  onClose,
  brand,
  videoMeeting: rawConfig,
  lang,
  customer = null,
  onMeetingRequested,
}: VideoMeetingModalProps) {
  const config = mergeVideoMeetingConfig(rawConfig);
  const [activeTab, setActiveTab] = useState<'book' | 'instant'>('book');
  const [copiedKey, setCopiedKey] = useState('');

  // Booking form state
  const [contactName, setContactName] = useState('');
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState(TOPICS_EN[0]);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState(TIME_WINDOWS[0]);
  const [notes, setNotes] = useState('');
  const [attachedMeetLink, setAttachedMeetLink] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<QuoteSubmissionResult | null>(null);

  // Instant Google Meet API state
  const [meetToken, setMeetToken] = useState<string | null>(() => getCachedMeetAccessToken());
  const [meetUserEmail, setMeetUserEmail] = useState<string>('');
  const [signingInGoogle, setSigningInGoogle] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [meetError, setMeetError] = useState('');
  const [instantRoom, setInstantRoom] = useState<{
    meetingUri: string;
    meetingCode: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMeetToken(getCachedMeetAccessToken());
    setSubmittedRecord(null);
    setFormErrors({});
    setMeetError('');
    if (customer) {
      setContactName((prev) => prev || customer.fullName || '');
      setOrganization((prev) => prev || customer.organization || '');
      setPhone((prev) => prev || customer.phone || '');
      setEmail((prev) => prev || customer.email || '');
    }
  }, [isOpen, customer]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeUri = normalizeGoogleMeetUrl(config.activeMeetingUri || '');
  const activeCode = config.activeMeetingCode || (activeUri ? extractGoogleMeetCode(activeUri) : '');

  async function copyText(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2200);
    } catch {
      // Ignore clipboard permission errors
    }
  }

  async function handleConnectGoogleMeet() {
    setMeetError('');
    setSigningInGoogle(true);
    try {
      const { user, accessToken } = await signInWithGoogleForMeet();
      setMeetToken(accessToken);
      setMeetUserEmail(user.email || '');
    } catch (err) {
      setMeetError(formatFirebaseAuthError(err));
    } finally {
      setSigningInGoogle(false);
    }
  }

  async function handleCreateInstantMeet() {
    setMeetError('');
    let token = meetToken || getCachedMeetAccessToken();
    if (!token) {
      setSigningInGoogle(true);
      try {
        const res = await signInWithGoogleForMeet();
        token = res.accessToken;
        setMeetToken(res.accessToken);
        setMeetUserEmail(res.user.email || '');
      } catch (err) {
        setMeetError(formatFirebaseAuthError(err));
        setSigningInGoogle(false);
        return;
      } finally {
        setSigningInGoogle(false);
      }
    }

    setCreatingRoom(true);
    try {
      const space = await createGoogleMeetSpace(token, 'OPEN');
      const code = space.meetingCode || extractGoogleMeetCode(space.meetingUri);
      setInstantRoom({
        meetingUri: space.meetingUri,
        meetingCode: code,
      });
      setAttachedMeetLink(space.meetingUri);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create Google Meet room.';
      if (message.toLowerCase().includes('expired')) {
        clearCachedMeetAccessToken();
        setMeetToken(null);
      }
      setMeetError(message);
    } finally {
      setCreatingRoom(false);
    }
  }

  async function handleSubmitMeetingRequest(e: FormEvent) {
    e.preventDefault();
    const payload = buildVideoMeetingRequestInput({
      contactName,
      organization,
      phone,
      email,
      topic,
      preferredDate,
      preferredTime,
      notes,
      meetingLink: attachedMeetLink,
    });
    const validation = validateQuoteInput(payload, true);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      const firstErrorFieldId = validation.errors.contactName
        ? 'vm-contact-name'
        : validation.errors.phone
          ? 'vm-phone'
          : validation.errors.email
            ? 'vm-email'
            : null;
      if (firstErrorFieldId) {
        const el = document.getElementById(firstErrorFieldId);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus();
      }
      return;
    }

    setFormErrors({});
    setSubmitting(true);
    try {
      const saved = await submitQuote(payload);
      setSubmittedRecord(saved);
      onMeetingRequested?.(saved);
    } catch (error) {
      console.error('Error submitting Google Meet request:', error);
      setFormErrors({
        submit:
          lang === 'en'
            ? `Could not submit your video meeting request right now. Please try again or call ${brand.phoneDisplay}.`
            : `No se pudo enviar su solicitud de videollamada. Intente de nuevo o llame al ${brand.phoneDisplay}.`,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-meet-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#14171D] text-white px-5 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <Video className="w-5 h-5 text-emerald-300" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="video-meet-modal-title"
                  className="font-display text-base sm:text-lg font-bold tracking-tight"
                >
                  {lang === 'en'
                    ? 'Free Google Meet Video Consultation'
                    : 'Videollamada Gratis por Google Meet'}
                </h2>
                {config.isLiveNow && activeUri && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {lang === 'en' ? 'Live Now' : 'En Vivo'}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-300 truncate">
                {lang === 'en' ? config.availabilityHoursEn : config.availabilityHoursEs}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'en' ? 'Close video meeting window' : 'Cerrar videollamada'}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-stone-200 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Active Published Room Banner (when Luis has published a live Google Meet room) */}
          {activeUri && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    {config.isLiveNow
                      ? lang === 'en'
                        ? 'Luis Is Live in Google Meet — Join Directly'
                        : 'Luis Está en Vivo en Google Meet — Únase Ahora'
                      : lang === 'en'
                        ? 'Direct E.V.A Google Meet Consultation Room'
                        : 'Sala Directa de Google Meet de E.V.A'}
                  </p>
                  <p className="text-sm font-bold text-[#141518] mt-0.5">
                    {lang === 'en' ? config.activeRoomTitleEn : config.activeRoomTitleEs}
                  </p>
                  {activeCode && (
                    <p className="text-xs text-stone-600 font-mono mt-0.5">
                      {lang === 'en' ? 'Meeting Code:' : 'Código:'} {activeCode}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyText('active-uri', activeUri)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 text-xs font-semibold text-emerald-900 cursor-pointer"
                  >
                    {copiedKey === 'active-uri' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedKey === 'active-uri'
                        ? lang === 'en'
                          ? 'Copied'
                          : 'Copiado'
                        : lang === 'en'
                          ? 'Copy Link'
                          : 'Copiar Enlace'}
                    </span>
                  </button>
                  <a
                    href={activeUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <Video className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{lang === 'en' ? 'Join Google Meet' : 'Entrar a Google Meet'}</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Welcome Note */}
          <p className="text-sm text-stone-600 leading-relaxed">
            {lang === 'en' ? config.welcomeNoteEn : config.welcomeNoteEs}
          </p>

          {/* Mode Tabs */}
          <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('book')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'book'
                  ? 'bg-[#141518] text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {lang === 'en'
                  ? 'Schedule Free Video Walkthrough'
                  : 'Agendar Videollamada Gratis'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('instant')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'instant'
                  ? 'bg-[#141518] text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Video className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {lang === 'en' ? 'Start Instant Google Meet' : 'Crear Google Meet al Instante'}
              </span>
            </button>
          </div>

          {activeTab === 'book' ? (
            submittedRecord ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-3 text-center">
                <div className="w-11 h-11 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#141518]">
                  {lang === 'en'
                    ? 'Google Meet Consultation Requested!'
                    : '¡Solicitud de Videollamada Enviada!'}
                </h3>
                <p className="text-sm text-stone-700">
                  {lang === 'en'
                    ? `Reference ${submittedRecord.refCode} is saved in Luis's portal. Luis will text or email your Google Meet invite link shortly.`
                    : `Su referencia ${submittedRecord.refCode} quedó guardada. Luis le enviará su enlace de Google Meet muy pronto.`}
                </p>
                {submittedRecord._savedToFirebase || submittedRecord._savedToServer ? (
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" aria-hidden="true" />
                    <span>
                      {lang === 'en'
                        ? 'Delivered to E.V.A Sound Systems cloud portal'
                        : 'Entregado al portal en la nube de E.V.A Sound Systems'}
                    </span>
                  </p>
                ) : (
                  <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-900">
                    {lang === 'en'
                      ? `Your network blocked cloud sync. Please call or text ${brand.phoneDisplay} with reference ${submittedRecord.refCode}.`
                      : `Su red bloqueó la sincronización en la nube. Llame o envíe texto al ${brand.phoneDisplay} con la referencia ${submittedRecord.refCode}.`}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <a
                    href={brand.phoneHref}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#141518] text-white text-xs font-bold"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#E0A446]" />
                    <span>
                      {lang === 'en' ? 'Need It Now? Call' : '¿Urgente? Llame'} {brand.phoneDisplay}
                    </span>
                  </a>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                  >
                    {lang === 'en' ? 'Done' : 'Cerrar'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitMeetingRequest} className="space-y-4" noValidate>
                {attachedMeetLink && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs text-blue-900">
                    <span className="truncate">
                      <strong>{lang === 'en' ? 'Attached Google Meet:' : 'Enlace Google Meet:'}</strong>{' '}
                      <span className="font-mono">{attachedMeetLink}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachedMeetLink('')}
                      className="text-blue-700 hover:text-blue-950 font-semibold shrink-0 cursor-pointer"
                    >
                      {lang === 'en' ? 'Remove' : 'Quitar'}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="vm-contact-name"
                      className="block text-xs font-semibold text-stone-700 mb-1"
                    >
                      {lang === 'en' ? 'Your Name *' : 'Su Nombre *'}
                    </label>
                    <input
                      id="vm-contact-name"
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder={lang === 'en' ? 'Pastor / Tech Director' : 'Pastor / Director'}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                    />
                    {formErrors.contactName && (
                      <p className="text-xs text-red-600 mt-1">{formErrors.contactName}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="vm-org"
                      className="block text-xs font-semibold text-stone-700 mb-1"
                    >
                      {lang === 'en' ? 'Church / Organization' : 'Iglesia / Organización'}
                    </label>
                    <input
                      id="vm-org"
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder={lang === 'en' ? 'Church or Venue Name' : 'Nombre de su Iglesia'}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="vm-phone"
                      className="block text-xs font-semibold text-stone-700 mb-1"
                    >
                      {lang === 'en' ? 'Phone / Text *' : 'Teléfono / Texto *'}
                    </label>
                    <input
                      id="vm-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(414) 555-0199"
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                    />
                    {formErrors.phone && (
                      <p className="text-xs text-red-600 mt-1">{formErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="vm-email"
                      className="block text-xs font-semibold text-stone-700 mb-1"
                    >
                      {lang === 'en' ? 'Email (for Meet Invite) *' : 'Correo (para Invitación Meet) *'}
                    </label>
                    <input
                      id="vm-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="pastor@church.org"
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                    />
                    {formErrors.email && (
                      <p className="text-xs text-red-600 mt-1">{formErrors.email}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-1">
                    <label
                      htmlFor="vm-date"
                      className="block text-xs font-semibold text-stone-700 mb-1"
                    >
                      {lang === 'en' ? 'Preferred Date' : 'Fecha Preferida'}
                    </label>
                    <input
                      id="vm-date"
                      type="date"
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="vm-time"
                      className="block text-xs font-semibold text-stone-700 mb-1"
                    >
                      {lang === 'en' ? 'Preferred Time Window' : 'Horario Preferido'}
                    </label>
                    <select
                      id="vm-time"
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white focus:outline-none focus:border-[#1a73e8]"
                    >
                      {TIME_WINDOWS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="vm-topic"
                    className="block text-xs font-semibold text-stone-700 mb-1"
                  >
                    {lang === 'en' ? 'Video Consultation Topic' : 'Tema de la Videollamada'}
                  </label>
                  <select
                    id="vm-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white focus:outline-none focus:border-[#1a73e8]"
                  >
                    {(lang === 'en' ? TOPICS_EN : TOPICS_ES).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="vm-notes"
                    className="block text-xs font-semibold text-stone-700 mb-1"
                  >
                    {lang === 'en'
                      ? 'What would you like to show Luis on video?'
                      : '¿Qué desea mostrarle a Luis en la videollamada?'}
                  </label>
                  <textarea
                    id="vm-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      lang === 'en'
                        ? 'e.g. Behringer X32 feedback issue, sanctuary speaker placement, or quote items...'
                        : 'Ej. Problemas de feedback en X32, ubicación de bocinas o equipos a cotizar...'
                    }
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>

                {(formErrors.submit || Object.keys(formErrors).length > 0) && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 flex items-start gap-2 text-xs font-medium text-red-700"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
                    <span>
                      {formErrors.submit ||
                        (lang === 'en'
                          ? `Please complete the required fields above: ${Object.values(formErrors).join(' ')}`
                          : `Por favor complete los campos requeridos arriba: ${Object.values(formErrors).join(' ')}`)}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200">
                  <div className="inline-flex items-center gap-1.5 text-xs text-stone-500">
                    <Clock className="w-3.5 h-3.5 text-[#C2842D]" aria-hidden="true" />
                    <span>
                      {lang === 'en'
                        ? '100% Free · No Zoom download needed'
                        : '100% Gratis · Funciona desde cualquier navegador'}
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-lg bg-[#C2842D] hover:bg-[#AD7322] disabled:opacity-50 text-white text-sm font-bold transition-colors cursor-pointer"
                  >
                    {submitting
                      ? lang === 'en'
                        ? 'Saving Request...'
                        : 'Enviando...'
                      : lang === 'en'
                        ? 'Request Free Google Meet'
                        : 'Solicitar Google Meet Gratis'}
                  </button>
                </div>
              </form>
            )
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-4 space-y-3">
                <p className="text-sm font-semibold text-[#141518]">
                  {lang === 'en'
                    ? 'Generate a Real Google Meet Video Room Instantly (Free Gmail Compatible)'
                    : 'Cree una Sala de Google Meet Real al Instante (Gratis con Gmail)'}
                </p>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {lang === 'en'
                    ? 'Sign in with your Google account to create a private Google Meet link right here. You can join immediately or attach the link to your consultation request for Luis.'
                    : 'Inicie sesión con su cuenta de Google para crear un enlace privado de Google Meet al instante y compartirlo directamente con Luis.'}
                </p>

                {!meetToken ? (
                  <button
                    type="button"
                    onClick={handleConnectGoogleMeet}
                    disabled={signingInGoogle}
                    className="gsi-material-button inline-flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg bg-white border border-stone-300 hover:bg-stone-50 shadow-xs text-sm font-semibold text-[#1f1f1f] transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      className="w-5 h-5 shrink-0"
                      aria-hidden="true"
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                    <span>
                      {signingInGoogle
                        ? lang === 'en'
                          ? 'Signing in with Google...'
                          : 'Conectando con Google...'
                        : lang === 'en'
                          ? 'Sign in with Google'
                          : 'Iniciar sesión con Google'}
                    </span>
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCreateInstantMeet}
                      disabled={creatingRoom}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-60 text-white text-sm font-bold cursor-pointer"
                    >
                      <Video className="w-4 h-4" aria-hidden="true" />
                      <span>
                        {creatingRoom
                          ? lang === 'en'
                            ? 'Creating Google Meet Room...'
                            : 'Creando Sala...'
                          : lang === 'en'
                            ? 'Create Instant Google Meet Link'
                            : 'Crear Enlace de Google Meet Ahora'}
                      </span>
                    </button>
                    {meetUserEmail && (
                      <span className="text-xs text-stone-600 font-mono">
                        {lang === 'en' ? 'Connected:' : 'Conectado:'} {meetUserEmail}
                      </span>
                    )}
                  </div>
                )}

                {meetError && (
                  <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {meetError}
                  </p>
                )}
              </div>

              {instantRoom && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        {lang === 'en' ? 'Google Meet Room Ready' : 'Sala Google Meet Lista'}
                      </p>
                      <p className="text-sm font-mono font-bold text-[#141518] break-all mt-0.5">
                        {instantRoom.meetingUri}
                      </p>
                      {instantRoom.meetingCode && (
                        <p className="text-xs text-stone-600 mt-0.5">
                          {lang === 'en' ? 'Room Code:' : 'Código:'}{' '}
                          <span className="font-mono font-semibold">{instantRoom.meetingCode}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={instantRoom.meetingUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Open Google Meet' : 'Abrir Google Meet'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => copyText('instant-uri', instantRoom.meetingUri)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-800 cursor-pointer"
                    >
                      {copiedKey === 'instant-uri' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'instant-uri' ? 'Copied' : 'Copy Link'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedMeetLink(instantRoom.meetingUri);
                        setActiveTab('book');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#141518] hover:bg-[#272A30] text-white text-xs font-semibold cursor-pointer"
                    >
                      <span>
                        {lang === 'en'
                          ? 'Send This Room Link to Luis →'
                          : 'Enviar Este Enlace a Luis →'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
