import { useEffect, useState } from 'react';
import { Award, Building2, CheckCircle2, KeyRound, LogOut, Mail, Phone, ShieldCheck, User, X } from 'lucide-react';
import type {
  BrandConfig,
  CustomerAccount,
  CustomerPricingTier,
  Language,
  MemberPricingConfig,
} from '../types/site';
import {
  loginCustomerWithEmail,
  loginOrRegisterGoogleCustomer,
  registerCustomerWithEmail,
  signOutCustomer,
} from '../services/apiClient';
import { mergeMemberPricing } from '../utils/siteLogic';

interface CustomerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  brand: BrandConfig;
  customer: CustomerAccount | null;
  memberPricing?: MemberPricingConfig;
  customerDiscountPercent: number;
  onCustomerChanged: (customer: CustomerAccount | null) => void;
  onOpenQuote: (preselectedService?: string) => void;
}

const TIER_LABELS: Record<CustomerPricingTier, { en: string; es: string }> = {
  vip: { en: 'VIP Member', es: 'Miembro VIP' },
  church_partner: { en: 'Church Partner', es: 'Iglesia Asociada' },
  dealer_pro: { en: 'Dealer Pro', es: 'Distribuidor Pro' },
};

export function CustomerLoginModal({
  isOpen,
  onClose,
  lang,
  brand,
  customer,
  memberPricing: rawMemberPricing,
  customerDiscountPercent,
  onCustomerChanged,
  onOpenQuote,
}: CustomerLoginModalProps) {
  const memberPricing = mergeMemberPricing(rawMemberPricing);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const account =
        mode === 'register'
          ? await registerCustomerWithEmail({
              fullName,
              organization,
              phone,
              email,
              password,
            })
          : await loginCustomerWithEmail({ email, password });

      onCustomerChanged(account);
      setPassword('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : lang === 'en'
            ? 'Unable to sign in. Please check your details.'
            : 'No se pudo iniciar sesión. Verifique sus datos.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleCustomerSignIn() {
    setError('');
    setGoogleLoading(true);
    try {
      const account = await loginOrRegisterGoogleCustomer({
        organization: organization.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      onCustomerChanged(account);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : lang === 'en'
            ? 'Google sign-in was cancelled or blocked.'
            : 'El inicio de sesión con Google fue cancelado.'
      );
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSignOut() {
    await signOutCustomer();
    onCustomerChanged(null);
  }

  const tierLabel = customer
    ? lang === 'en'
      ? TIER_LABELS[customer.pricingTier]?.en || 'VIP Member'
      : TIER_LABELS[customer.pricingTier]?.es || 'Miembro VIP'
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-login-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white border border-stone-200 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#141518] text-white px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-[#E0A446] shrink-0" aria-hidden="true" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#E0A446]">
                {brand.name}
              </p>
              <h2 id="customer-login-modal-title" className="font-display text-lg font-bold">
                {customer
                  ? lang === 'en'
                    ? 'Customer VIP Member Account'
                    : 'Cuenta VIP de Cliente'
                  : lang === 'en'
                    ? 'Unlock Exclusive Member Pricing'
                    : 'Desbloquear Precios Exclusivos VIP'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'en' ? 'Close member dialog' : 'Cerrar ventana de miembro'}
            className="w-9 h-9 rounded-lg border border-stone-700 flex items-center justify-center text-stone-300 hover:text-white hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6">
          {customer ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-[#141518]">
                    {lang === 'en'
                      ? `${memberPricing.bannerUnlockedEn} (${customerDiscountPercent}% Off MAP)`
                      : `${memberPricing.bannerUnlockedEs} (${customerDiscountPercent}% bajo MAP)`}
                  </p>
                  <p className="text-xs text-stone-600 mt-0.5">
                    {customer.status === 'active'
                      ? lang === 'en'
                        ? 'Your exclusive member discounts are live across the entire gear catalog and quote cart.'
                        : 'Sus precios exclusivos ya están visibles en todo el catálogo y carrito.'
                      : lang === 'en'
                        ? 'Account status is currently paused/pending. Call Luis for immediate activation.'
                        : 'Su cuenta está pausada/pendiente. Llame a Luis para activarla.'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-stone-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-4 h-4 text-[#9A6315] shrink-0" aria-hidden="true" />
                    <span className="font-display font-bold text-[#141518] truncate">
                      {customer.fullName}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#141518] text-[#E0A446] text-[11px] font-bold uppercase tracking-wide shrink-0">
                    {tierLabel} · -{customerDiscountPercent}%
                  </span>
                </div>

                {customer.organization && (
                  <p className="flex items-center gap-2 text-xs text-stone-700">
                    <Building2 className="w-3.5 h-3.5 text-stone-500 shrink-0" aria-hidden="true" />
                    <span>{customer.organization}</span>
                  </p>
                )}

                <p className="flex items-center gap-2 text-xs text-stone-700">
                  <Mail className="w-3.5 h-3.5 text-stone-500 shrink-0" aria-hidden="true" />
                  <span>{customer.email}</span>
                </p>

                {customer.phone && (
                  <p className="flex items-center gap-2 text-xs text-stone-700 font-mono">
                    <Phone className="w-3.5 h-3.5 text-stone-500 shrink-0" aria-hidden="true" />
                    <span>{customer.phone}</span>
                  </p>
                )}

                <div className="pt-2 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
                  <span>
                    {lang === 'en' ? 'Sign-in method:' : 'Acceso:'}{' '}
                    <strong className="text-stone-700 uppercase">{customer.authProvider}</strong>
                  </span>
                  <span>
                    {lang === 'en' ? 'Visits:' : 'Visitas:'}{' '}
                    <strong className="font-mono text-stone-700">{customer.loginCount}</strong>
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenQuote(
                      `VIP Member Quote (${customer.pricingTier} - ${customerDiscountPercent}% Tier)`
                    );
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  {lang === 'en' ? 'Request VIP Bundle Quote' : 'Pedir Cotización VIP'}
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 text-sm font-semibold transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  <span>{lang === 'en' ? 'Sign Out' : 'Cerrar Sesión'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-[#C2842D]/40 bg-[#F8F8F6] p-3.5 text-xs text-stone-700">
                <p className="font-semibold text-[#141518] mb-0.5">
                  {lang === 'en'
                    ? 'Why Sign In? See Exclusive Dealer & Church Pricing Immediately'
                    : '¿Por qué iniciar sesión? Vea precios exclusivos al instante'}
                </p>
                <p className="text-stone-600">
                  {lang === 'en'
                    ? `Public visitors see manufacturer MAP rates. Registered VIP members immediately unlock ${memberPricing.defaultDiscountPercent}%–${memberPricing.dealerProDiscountPercent}% below MAP online.`
                    : `Los visitantes ven precios MAP de fábrica. Los clientes registrados desbloquean ${memberPricing.defaultDiscountPercent}%–${memberPricing.dealerProDiscountPercent}% bajo MAP en línea.`}
                </p>
              </div>

              {/* Quick Google Customer Sign In */}
              <button
                type="button"
                onClick={handleGoogleCustomerSignIn}
                disabled={googleLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#141518] hover:bg-[#272A30] disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#E0A446]" aria-hidden="true" />
                <span>
                  {googleLoading
                    ? lang === 'en'
                      ? 'Connecting Google Account...'
                      : 'Conectando Google...'
                    : lang === 'en'
                      ? 'Continue with Google (Instant VIP Access)'
                      : 'Continuar con Google (Acceso VIP Inmediato)'}
                </span>
              </button>

              <div className="relative flex items-center">
                <div className="flex-grow border-t border-stone-200" />
                <span className="shrink mx-3 text-xs text-stone-400 uppercase">
                  {lang === 'en' ? 'or with email' : 'o con correo'}
                </span>
                <div className="flex-grow border-t border-stone-200" />
              </div>

              {/* Mode Switch Tabs */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-[#141518] shadow-xs'
                      : 'text-stone-600 hover:text-[#141518]'
                  }`}
                >
                  {lang === 'en' ? 'Member Sign In' : 'Iniciar Sesión'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white text-[#141518] shadow-xs'
                      : 'text-stone-600 hover:text-[#141518]'
                  }`}
                >
                  {lang === 'en' ? 'Create VIP Account' : 'Crear Cuenta VIP'}
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-3.5" noValidate>
                {mode === 'register' && (
                  <>
                    <div>
                      <label htmlFor="cust-fullname" className="block text-xs font-semibold text-stone-700 mb-1">
                        {lang === 'en' ? 'Full Name *' : 'Nombre Completo *'}
                      </label>
                      <input
                        id="cust-fullname"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={lang === 'en' ? 'Pastor / Buyer Name' : 'Nombre del Pastor / Comprador'}
                        className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="cust-org" className="block text-xs font-semibold text-stone-700 mb-1">
                          {lang === 'en' ? 'Church / Organization' : 'Iglesia / Organización'}
                        </label>
                        <input
                          id="cust-org"
                          type="text"
                          value={organization}
                          onChange={(e) => setOrganization(e.target.value)}
                          placeholder={lang === 'en' ? 'e.g. Grace Fellowship' : 'ej. Iglesia Gracia'}
                          className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                        />
                      </div>

                      <div>
                        <label htmlFor="cust-phone" className="block text-xs font-semibold text-stone-700 mb-1">
                          {lang === 'en' ? 'Phone Number' : 'Teléfono'}
                        </label>
                        <input
                          id="cust-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(414) 555-0199"
                          className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="cust-email" className="block text-xs font-semibold text-stone-700 mb-1">
                    {lang === 'en' ? 'Email Address *' : 'Correo Electrónico *'}
                  </label>
                  <input
                    id="cust-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@church.org"
                    className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>

                <div>
                  <label htmlFor="cust-password" className="block text-xs font-semibold text-stone-700 mb-1">
                    {lang === 'en' ? 'Password * (min 4 chars)' : 'Contraseña * (mín 4 caracteres)'}
                  </label>
                  <div className="relative">
                    <KeyRound
                      className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="cust-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full pl-10 pr-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-lg bg-[#C2842D] hover:bg-[#B07523] disabled:opacity-50 text-white text-sm font-bold transition-colors cursor-pointer"
                >
                  {submitting
                    ? lang === 'en'
                      ? 'Please wait...'
                      : 'Procesando...'
                    : mode === 'register'
                      ? lang === 'en'
                        ? 'Create Account & Unlock VIP Pricing'
                        : 'Crear Cuenta y Ver Precios VIP'
                      : lang === 'en'
                        ? 'Sign In & Unlock VIP Pricing'
                        : 'Entrar y Ver Precios VIP'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
