import { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Mail,
  MessageSquare,
  Minus,
  Phone,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { isStudioProductImage } from '../assets/assetMap';
import type { BrandConfig, CartItem, CustomerAccount, Language, QuoteRecord } from '../types/site';
import { submitQuote } from '../services/apiClient';
import {
  calculateCartMemberSummary,
  calculateMemberPrice,
  formatUsd,
  validateQuoteInput,
} from '../utils/siteLogic';
import { SafeImage } from './SafeImage';

interface QuoteCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  brand: BrandConfig;
  lang: Language;
  customer?: CustomerAccount | null;
  customerDiscountPercent?: number;
  onUpdateQty: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onQuoteSubmitted: (quote: QuoteRecord) => void;
}

const CALL_TIME_OPTIONS = [
  'Morning (8:00 AM – 12:00 PM)',
  'Afternoon (12:00 PM – 5:00 PM)',
  'Evening (5:00 PM – 8:00 PM)',
  'Anytime',
];

export function QuoteCartDrawer({
  isOpen,
  onClose,
  cart,
  brand,
  lang,
  customer = null,
  customerDiscountPercent = 0,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onQuoteSubmitted,
}: QuoteCartDrawerProps) {
  const [step, setStep] = useState<'cart' | 'form' | 'success'>('cart');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bestTime, setBestTime] = useState(CALL_TIME_OPTIONS[0]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedQuote, setSubmittedQuote] = useState<QuoteRecord | null>(null);

  useEffect(() => {
    if (!isOpen || !customer) return;
    setName((prev) => prev || customer.fullName || '');
    setCompany((prev) => prev || customer.organization || '');
    setPhone((prev) => prev || customer.phone || '');
    setEmail((prev) => prev || customer.email || '');
  }, [isOpen, customer]);

  if (!isOpen) {
    return null;
  }

  const hasMemberDiscount = Boolean(customer && customer.status === 'active' && customerDiscountPercent > 0);
  const summary = calculateCartMemberSummary(cart, hasMemberDiscount ? customerDiscountPercent : 0);

  function handleClose() {
    if (step === 'success') {
      setStep('cart');
      setSubmittedQuote(null);
    } else if (step === 'form' && cart.length > 0) {
      setStep('cart');
    }
    onClose();
  }

  function buildCartBreakdownText(): string {
    const lines = cart.map((item) => {
      const vipUnit = hasMemberDiscount
        ? calculateMemberPrice(item.mapPrice, customerDiscountPercent)
        : undefined;
      const unitStr =
        typeof item.mapPrice === 'number' && item.mapPrice > 0
          ? vipUnit !== undefined
            ? `${formatUsd(vipUnit)} VIP (-${customerDiscountPercent}% off ${formatUsd(item.mapPrice)} MAP)`
            : `${formatUsd(item.mapPrice)} MAP`
          : 'Quote on Request';
      return `- ${item.quantity}x ${item.itemNumber} (${item.brand}) @ ${unitStr}`;
    });
    const totalLine = hasMemberDiscount
      ? `Estimated VIP Member Total (-${customerDiscountPercent}%): ${formatUsd(summary.estimatedMemberTotal)} (MAP ${formatUsd(summary.estimatedMapTotal)}, Saves ${formatUsd(summary.totalSavings)})${
          summary.quoteOnlyCount > 0 ? ` + ${summary.quoteOnlyCount} quote-only item(s)` : ''
        }`
      : `Estimated Total (at MAP): ${formatUsd(summary.estimatedMapTotal)}${
          summary.quoteOnlyCount > 0 ? ` + ${summary.quoteOnlyCount} quote-only item(s)` : ''
        }`;
    const vipTag = customer
      ? `\nMember Account: ${customer.fullName} (${customer.pricingTier} · ${customer.email})`
      : '';
    const userNote = notes.trim() ? `\nEvent / Project Details: ${notes.trim()}` : '';
    return `Quote Cart Items (${summary.totalCount} total):\n${lines.join('\n')}\n${totalLine}${vipTag}${userNote}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const serviceRequested = hasMemberDiscount
      ? `VIP Quote Cart (${summary.totalCount} items · VIP Est. ${formatUsd(summary.estimatedMemberTotal)})`
      : `Quote Cart (${summary.totalCount} items · Est. MAP ${formatUsd(summary.estimatedMapTotal)})`;
    const payload = {
      organization: company,
      contactName: name,
      phone,
      email,
      serviceRequested,
      soundboardModel: '',
      roomCapacity: '',
      timeline: `Best time to call: ${bestTime}`,
      notes: buildCartBreakdownText(),
    };

    const validation = validateQuoteInput(payload, true);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const record = await submitQuote(payload);
      setSubmittedQuote(record);
      onQuoteSubmitted(record);
      onClearCart();
      setName('');
      setCompany('');
      setPhone('');
      setEmail('');
      setNotes('');
      setStep('success');
    } finally {
      setSubmitting(false);
    }
  }

  function buildEmailHref(q: QuoteRecord): string {
    const subject = encodeURIComponent(
      `[${q.refCode}] Official Dealer Quote Request — ${q.organization || q.contactName}`
    );
    const body = encodeURIComponent(
      [
        `Reference Number: ${q.refCode}`,
        `Name: ${q.contactName}`,
        `Company / Church: ${q.organization || 'N/A'}`,
        `Phone: ${q.phone}`,
        `Email: ${q.email}`,
        `${q.timeline}`,
        '',
        q.notes,
      ].join('\n')
    );
    return `mailto:${brand.email}?subject=${subject}&body=${body}`;
  }

  function buildSmsHref(q: QuoteRecord): string {
    const text = encodeURIComponent(
      `Hi Luis, I submitted Quote Cart ${q.refCode} on EVA Sound Systems.\nName: ${q.contactName}\nPhone: ${q.phone}\n${q.serviceRequested}`
    );
    return `sms:+14145544388?body=${text}`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-cart-title"
    >
      <div className="relative w-full max-w-md h-full bg-white text-[#141518] shadow-2xl flex flex-col border-l border-stone-200">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#1a73e8]" aria-hidden="true" />
            <div>
              <h2 id="quote-cart-title" className="font-display text-base font-bold text-[#141518]">
                {step === 'success'
                  ? lang === 'en'
                    ? 'Quote Request Submitted'
                    : 'Cotización Enviada'
                  : step === 'form'
                    ? lang === 'en'
                      ? 'Request Official Quote'
                      : 'Solicitar Cotización Oficial'
                    : lang === 'en'
                      ? `Your Quote Cart (${summary.totalCount})`
                      : `Carrito de Cotización (${summary.totalCount})`}
              </h2>
              <p className="text-[11px] text-stone-500">
                {brand.companyFull} · {brand.phoneDisplay}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close quote cart"
            className="w-9 h-9 rounded-lg border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 'success' && submittedQuote ? (
            <div className="space-y-5 py-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-mono text-xs font-bold text-emerald-800 mb-1">
                    REF: {submittedQuote.refCode}
                  </p>
                  <p className="text-sm font-bold text-[#141518] mb-1">
                    {lang === 'en'
                      ? 'Luis will call you within one business day.'
                      : 'Luis se comunicará con usted dentro de un día hábil.'}
                  </p>
                  <p className="text-xs text-stone-600">
                    {lang === 'en'
                      ? 'Your quote cart has been recorded with your official dealer reference number.'
                      : 'Su lista de equipos ha sido registrada con su número de referencia oficial.'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-4 text-xs text-stone-700 space-y-1.5 whitespace-pre-line">
                <p className="font-semibold text-[#141518]">{submittedQuote.contactName}</p>
                {submittedQuote.organization && <p>{submittedQuote.organization}</p>}
                <p>
                  {submittedQuote.phone} · {submittedQuote.email}
                </p>
                <p className="pt-2 border-t border-stone-200 font-mono text-[11px] text-stone-600">
                  {submittedQuote.notes}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <a
                  href={brand.phoneHref}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-bold transition-colors"
                >
                  <Phone className="w-4 h-4" aria-hidden="true" />
                  <span>Call {brand.phoneDisplay}</span>
                </a>
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={buildEmailHref(submittedQuote)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-xs font-semibold text-[#141518]"
                  >
                    <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Email Copy</span>
                  </a>
                  <a
                    href={buildSmsHref(submittedQuote)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-xs font-semibold text-[#141518]"
                  >
                    <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Text Luis</span>
                  </a>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 rounded-lg border border-stone-300 text-sm font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                {lang === 'en' ? 'Continue Browsing' : 'Seguir Viendo Equipos'}
              </button>
            </div>
          ) : step === 'form' ? (
            <form id="cart-quote-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
              <button
                type="button"
                onClick={() => setStep('cart')}
                className="text-xs font-semibold text-[#1a73e8] hover:underline cursor-pointer"
              >
                ← {lang === 'en' ? `Back to Quote Cart (${summary.totalCount} items)` : 'Volver al Carrito'}
              </button>

              <div className="rounded-lg border border-stone-200 bg-[#F8F8F6] p-3 text-xs text-stone-700 space-y-1">
                {hasMemberDiscount ? (
                  <p className="font-semibold text-emerald-800 flex items-center gap-1.5 flex-wrap">
                    <Award className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      {summary.totalCount} {summary.totalCount === 1 ? 'item' : 'items'} · VIP Member Total (-{customerDiscountPercent}%):{' '}
                      <span className="font-mono font-bold">
                        {formatUsd(summary.estimatedMemberTotal)}
                      </span>
                    </span>
                    <span className="font-mono text-[11px] line-through text-stone-400">
                      {formatUsd(summary.estimatedMapTotal)}
                    </span>
                  </p>
                ) : (
                  <p className="font-semibold text-[#141518]">
                    {summary.totalCount} {summary.totalCount === 1 ? 'item' : 'items'} selected · Estimated Total (at MAP):{' '}
                    <span className="font-mono font-bold text-[#141518]">
                      {formatUsd(summary.estimatedMapTotal)}
                    </span>
                  </p>
                )}
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Estimate only. Final dealer pricing, taxes, and shipping confirmed on your official quote.
                </p>
              </div>

              <div>
                <label htmlFor="cart-name" className="block text-xs font-semibold text-stone-700 mb-1">
                  Name *
                </label>
                <input
                  id="cart-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                />
                {errors.contactName && (
                  <p className="text-xs text-red-600 mt-1">{errors.contactName}</p>
                )}
              </div>

              <div>
                <label htmlFor="cart-company" className="block text-xs font-semibold text-stone-700 mb-1">
                  Company / Church
                </label>
                <input
                  id="cart-company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Optional organization name"
                  className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                />
              </div>

              <div>
                <label htmlFor="cart-phone" className="block text-xs font-semibold text-stone-700 mb-1">
                  Phone *
                </label>
                <input
                  id="cart-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(414) 555-0199"
                  className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                />
                {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label htmlFor="cart-email" className="block text-xs font-semibold text-stone-700 mb-1">
                  Email *
                </label>
                <input
                  id="cart-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@church.org"
                  className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="cart-best-time" className="block text-xs font-semibold text-stone-700 mb-1">
                  Best time to call
                </label>
                <select
                  id="cart-best-time"
                  value={bestTime}
                  onChange={(e) => setBestTime(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                >
                  {CALL_TIME_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="cart-notes" className="block text-xs font-semibold text-stone-700 mb-1">
                  Notes / event details
                </label>
                <textarea
                  id="cart-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Room size, event date, delivery ZIP, or installation questions..."
                  className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-60 text-white text-sm font-bold transition-colors cursor-pointer"
              >
                {submitting ? 'Submitting Quote Request...' : 'Submit Official Quote Request'}
              </button>
            </form>
          ) : cart.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-100 mx-auto flex items-center justify-center text-stone-400">
                <ShoppingBag className="w-6 h-6" aria-hidden="true" />
              </div>
              <p className="font-display text-base font-bold text-[#141518]">
                {lang === 'en' ? 'Your quote cart is empty' : 'Su carrito está vacío'}
              </p>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                {lang === 'en'
                  ? 'Browse speakers, wireless mics, mixers, lighting, or speaker mounts below and click "Add to Quote" to build your dealer quote.'
                  : 'Explore parlantes, micrófonos, consolas, iluminación o soportes y haga clic en "Agregar a Cotización".'}
              </p>
              <a
                href={`tel:+14145544388`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1a73e8] text-white text-xs font-bold hover:bg-[#1557b0]"
              >
                <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Call for Best Price: {brand.phoneDisplay}</span>
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="p-3 rounded-xl border border-stone-200 bg-white flex gap-3 items-start"
                >
                  <div
                    className={`w-16 h-14 rounded-lg overflow-hidden border border-stone-200 shrink-0 ${
                      isStudioProductImage(item.imageUrl) ? 'bg-white' : 'bg-stone-100'
                    }`}
                  >
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.itemNumber}
                      className={
                        isStudioProductImage(item.imageUrl)
                          ? 'w-full h-full object-contain p-1'
                          : 'w-full h-full object-cover'
                      }
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#1a73e8]">
                          {item.brand}
                        </p>
                        <p className="font-mono text-xs font-bold text-[#141518] truncate">
                          {item.itemNumber}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.productId)}
                        aria-label={`Remove ${item.itemNumber} from cart`}
                        className="p-1 text-stone-400 hover:text-red-600 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-stone-600 line-clamp-2 mt-0.5">{item.description}</p>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="font-mono text-xs font-semibold">
                        {typeof item.mapPrice === 'number' && item.mapPrice > 0 ? (
                          hasMemberDiscount ? (
                            <div className="flex flex-wrap items-baseline gap-1.5">
                              <span className="text-emerald-700 font-bold">
                                {formatUsd(
                                  calculateMemberPrice(item.mapPrice, customerDiscountPercent) ||
                                    item.mapPrice
                                )}{' '}
                                VIP
                              </span>
                              <span className="text-[11px] line-through text-stone-400">
                                {formatUsd(item.mapPrice)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#141518]">{formatUsd(item.mapPrice)} MAP</span>
                          )
                        ) : (
                          <span className="text-[#141518]">Quote on Request</span>
                        )}
                      </div>

                      <div className="inline-flex items-center border border-stone-300 rounded-md overflow-hidden">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.productId, -1)}
                          aria-label={`Decrease quantity for ${item.itemNumber}`}
                          className="w-7 h-7 flex items-center justify-center hover:bg-stone-100 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-mono text-xs font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.productId, 1)}
                          aria-label={`Increase quantity for ${item.itemNumber}`}
                          className="w-7 h-7 flex items-center justify-center hover:bg-stone-100 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sticky Cart Footer */}
        {step === 'cart' && cart.length > 0 && (
          <div className="p-5 border-t border-stone-200 bg-[#F8F8F6] space-y-3 shrink-0">
            <div className="space-y-1">
              {hasMemberDiscount ? (
                <>
                  <div className="flex items-baseline justify-between gap-2 text-xs text-stone-500">
                    <span>Public MAP Subtotal</span>
                    <span className="font-mono line-through tabular-nums">
                      {formatUsd(summary.estimatedMapTotal)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-emerald-800 inline-flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Exclusive VIP Total (-{customerDiscountPercent}%)</span>
                    </span>
                    <span className="font-mono text-lg font-bold text-emerald-700 tabular-nums">
                      {formatUsd(summary.estimatedMemberTotal)}
                    </span>
                  </div>
                  {summary.totalSavings > 0 && (
                    <p className="text-[11px] font-semibold text-emerald-700 text-right">
                      Member Savings: {formatUsd(summary.totalSavings)}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-stone-700">
                    Estimated Total (at MAP)
                  </span>
                  <span className="font-mono text-lg font-bold text-[#141518] tabular-nums">
                    {formatUsd(summary.estimatedMapTotal)}
                  </span>
                </div>
              )}
            </div>
            {summary.quoteOnlyCount > 0 && (
              <p className="text-[11px] text-stone-600">
                + {summary.quoteOnlyCount} custom quote item(s) priced on your official quote.
              </p>
            )}
            <p className="text-[11px] text-stone-500 leading-snug">
              Estimate only. Final pricing, taxes, and shipping confirmed on your official quote.
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="w-full py-3 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-bold transition-colors cursor-pointer"
              >
                Request Quote
              </button>
              <a
                href={brand.phoneHref}
                className="w-full py-2.5 rounded-lg border border-stone-300 bg-white hover:border-[#1a73e8] text-[#141518] text-xs font-bold text-center transition-colors"
              >
                Call for Best Price · {brand.phoneDisplay}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
