import { useState } from 'react';
import { Award, Globe, Lock, Menu, Pencil, ShoppingBag, User, X } from 'lucide-react';
import type {
  BrandConfig,
  CustomerAccount,
  Language,
  MemberPricingConfig,
  PageCopyConfig,
  SectionId,
} from '../types/site';
import { mergeMemberPricing, mergePageCopy } from '../utils/siteLogic';
import { EvaLogo } from './EvaLogo';

interface NavbarProps {
  brand: BrandConfig;
  pageCopy?: PageCopyConfig;
  lang: Language;
  onToggleLang: () => void;
  onOpenQuote: (preselectedService?: string) => void;
  onOpenPortal: () => void;
  isAdmin: boolean;
  adminEditMode?: boolean;
  onEditHeader?: () => void;
  hiddenSections: SectionId[];
  cartCount: number;
  onOpenCart: () => void;
  customer?: CustomerAccount | null;
  memberPricing?: MemberPricingConfig;
  customerDiscountPercent?: number;
  onOpenCustomerLogin: () => void;
}

export function Navbar({
  brand,
  pageCopy: rawPageCopy,
  lang,
  onToggleLang,
  onOpenQuote,
  onOpenPortal,
  isAdmin,
  adminEditMode = false,
  onEditHeader,
  hiddenSections,
  cartCount,
  onOpenCart,
  customer = null,
  memberPricing: rawMemberPricing,
  customerDiscountPercent = 0,
  onOpenCustomerLogin,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const copy = mergePageCopy(rawPageCopy);
  const memberPricing = mergeMemberPricing(rawMemberPricing);

  const firstName = customer?.fullName?.trim().split(/\s+/)[0] || '';
  const customerBtnText = customer
    ? `${firstName || 'VIP'} · ${customerDiscountPercent > 0 ? `VIP (-${customerDiscountPercent}%)` : 'VIP'}`
    : lang === 'en'
      ? memberPricing.loginPromptEn
      : memberPricing.loginPromptEs;

  const allNavItems: Array<{ id: SectionId; href: string; labelEn: string; labelEs: string }> = [
    { id: 'gear', href: '#gear', labelEn: copy.navGearEn, labelEs: copy.navGearEs },
    { id: 'services', href: '#services', labelEn: copy.navServicesEn, labelEs: copy.navServicesEs },
    { id: 'pricing', href: '#pricing', labelEn: copy.navPricingEn, labelEs: copy.navPricingEs },
    { id: 'training', href: '#training', labelEn: copy.navTrainingEn, labelEs: copy.navTrainingEs },
    { id: 'testimonials', href: '#testimonials', labelEn: copy.navReviewsEn, labelEs: copy.navReviewsEs },
  ];
  const navItems = allNavItems.filter((item) => !hiddenSections.includes(item.id));

  return (
    <header className="sticky top-0 z-40 w-full shadow-xs">
      {/* Row 1: Primary Sticky Navigation Bar */}
      <div className="bg-[#F8F8F6]/95 backdrop-blur-md border-b border-stone-200/90">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
          {/* Zone 1: Brand Emblem + Wordmark */}
          <a
            href="#top"
            className="inline-flex items-center gap-2 min-w-0 font-display text-sm sm:text-lg font-bold tracking-tight text-[#141518] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9A6315]"
          >
            <EvaLogo size="sm" theme="light" />
            <span className="truncate">{brand.name}</span>
          </a>

          {/* Zone 2: Clean single-line text nav links */}
          <nav
            aria-label={lang === 'en' ? 'Primary navigation' : 'Navegación principal'}
            className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium text-stone-600"
          >
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className="hover:text-[#141518] transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-[#C2842D]"
              >
                {lang === 'en' ? item.labelEn : item.labelEs}
              </a>
            ))}
          </nav>

          {/* Zone 3: Quote Cart Badge + Primary CTA + Mobile drawer button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={lang === 'en' ? `Open quote cart (${cartCount} items)` : `Abrir carrito (${cartCount})`}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-stone-300 bg-white hover:border-[#1a73e8] text-xs sm:text-sm font-semibold text-[#141518] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1a73e8]" aria-hidden="true" />
              <span className="hidden sm:inline">{lang === 'en' ? 'Cart' : 'Lista'}</span>
              <span
                data-testid="header-cart-count"
                className={`inline-flex items-center justify-center min-w-[18px] sm:min-w-[20px] h-4.5 sm:h-5 px-1 sm:px-1.5 rounded-full text-[11px] font-mono font-bold tabular-nums ${
                  cartCount > 0 ? 'bg-[#1a73e8] text-white' : 'bg-stone-200 text-stone-700'
                }`}
              >
                {cartCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenQuote()}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-[#141518] hover:bg-[#272A30] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2842D]"
            >
              <span className="sm:hidden">{lang === 'en' ? 'Quote' : 'Cotizar'}</span>
              <span className="hidden sm:inline">
                {lang === 'en' ? copy.navQuoteCtaEn : copy.navQuoteCtaEs}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-stone-200 text-[#141518] hover:bg-stone-100 transition-colors shrink-0 cursor-pointer"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Locked Utility, Scripture & Studio Bar */}
      <div className="bg-[#14171D] text-stone-300 border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2 flex items-center justify-between gap-3 text-[11px] sm:text-xs">
          <div className="flex items-center gap-x-2.5 min-w-0">
            <span className="font-medium text-stone-100 truncate">{brand.companyFull}</span>
            <span aria-hidden="true" className="text-stone-600 shrink-0">·</span>
            <span className="truncate">{brand.leadEngineer}</span>
            <span aria-hidden="true" className="hidden md:inline text-stone-600 shrink-0">·</span>
            <span className="hidden md:inline italic text-stone-400 truncate">
              “{lang === 'en' ? brand.scriptureEn : brand.scriptureEs}” — {brand.scriptureRef}
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {memberPricing.enabled && (
              <button
                type="button"
                onClick={onOpenCustomerLogin}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  customer
                    ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-900'
                    : 'bg-[#C2842D]/20 text-[#E0A446] border border-[#C2842D]/40 hover:bg-[#C2842D]/35'
                }`}
              >
                {customer ? (
                  <Award className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                ) : (
                  <User className="w-3.5 h-3.5 text-[#E0A446]" aria-hidden="true" />
                )}
                <span>{customerBtnText}</span>
              </button>
            )}

            {isAdmin && adminEditMode && onEditHeader && (
              <button
                type="button"
                onClick={onEditHeader}
                className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-[#E0A446] hover:text-white cursor-pointer"
              >
                <Pencil className="w-3 h-3" aria-hidden="true" />
                <span>Edit Header</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleLang}
              className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium text-stone-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              aria-label="Toggle English or Spanish language"
            >
              <Globe className="w-3.5 h-3.5 text-[#E0A446]" aria-hidden="true" />
              <span>{lang === 'en' ? 'Español' : 'English'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenPortal}
              className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium text-stone-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-[#E0A446]" aria-hidden="true" />
              <span>
                {isAdmin
                  ? lang === 'en'
                    ? 'Admin Studio'
                    : 'Panel Admin'
                  : lang === 'en'
                    ? 'Engineer Login'
                    : 'Acceso Admin'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-b border-stone-200 bg-[#F8F8F6] px-4 py-4 space-y-3 shadow-lg">
          <p className="text-xs italic text-stone-600 px-3">
            “{lang === 'en' ? brand.scriptureEn : brand.scriptureEs}” — {brand.scriptureRef}
          </p>
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors"
              >
                {lang === 'en' ? item.labelEn : item.labelEs}
              </a>
            ))}
          </nav>

          <div className="pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
            {memberPricing.enabled && (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenCustomerLogin();
                }}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg bg-[#141518] text-[#E0A446] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Award className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{customerBtnText}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onToggleLang();
                setMobileOpen(false);
              }}
              className="px-3 py-2 text-xs font-semibold border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-100 cursor-pointer"
            >
              {lang === 'en' ? 'Cambiar a Español (ES)' : 'Switch to English (EN)'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenPortal();
              }}
              className="px-3 py-2 text-xs font-semibold text-[#141518] border border-stone-300 rounded-lg hover:bg-stone-100 cursor-pointer"
            >
              {isAdmin
                ? lang === 'en'
                  ? 'Admin Studio'
                  : 'Panel Admin'
                : lang === 'en'
                  ? 'Engineer Login'
                  : 'Acceso Ingeniero'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

