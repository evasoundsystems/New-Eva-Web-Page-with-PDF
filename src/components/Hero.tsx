import { useState } from 'react';
import { Award, Mail, Pencil, Phone, Search, ShoppingBag } from 'lucide-react';
import type {
  BrandConfig,
  CustomerAccount,
  GearCategory,
  HeroConfig,
  Language,
  PricingConfig,
} from '../types/site';
import { mergeHeroConfig } from '../utils/siteLogic';
import { EvaLogo } from './EvaLogo';
import { SafeImage } from './SafeImage';

interface HeroProps {
  brand: BrandConfig;
  hero: HeroConfig;
  pricing: PricingConfig;
  productCount: number;
  lang: Language;
  onOpenQuote: (preselectedService?: string) => void;
  onSearchGear: (query: string, category?: GearCategory) => void;
  isAdmin: boolean;
  adminEditMode: boolean;
  onEditHero: () => void;
  customer?: CustomerAccount | null;
  customerDiscountPercent?: number;
  onOpenCustomerLogin?: () => void;
}

const HERO_QUICK_CATEGORIES: Array<{ id: GearCategory; labelEn: string; labelEs: string }> = [
  { id: 'all', labelEn: 'All Equipment', labelEs: 'Todo Equipo' },
  { id: 'lighting', labelEn: 'Moving Lights & Wash', labelEs: 'Luces Móviles' },
  { id: 'rigging', labelEn: 'Truss, Beam & Ceiling Rigs', labelEs: 'Truss y Vigas' },
  { id: 'cables', labelEn: 'Stageboxes & XLR', labelEs: 'Cajas Digitales y XLR' },
  { id: 'mics', labelEn: 'Wireless & Wired Mics', labelEs: 'Micrófonos' },
  { id: 'consoles', labelEn: 'Mixers & Consoles', labelEs: 'Mezcladoras' },
  { id: 'speakers', labelEn: 'Speakers & Subs', labelEs: 'Parlantes' },
];

export function Hero({
  brand,
  hero: rawHero,
  pricing,
  productCount,
  lang,
  onOpenQuote,
  onSearchGear,
  isAdmin,
  adminEditMode,
  onEditHero,
  customer = null,
  customerDiscountPercent = 0,
  onOpenCustomerLogin,
}: HeroProps) {
  const [heroSearch, setHeroSearch] = useState('');
  const hero = mergeHeroConfig(rawHero);
  const standaloneMin = pricing.standaloneHourlyRate * pricing.standaloneMinHours;

  function handleHeroSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearchGear(heroSearch, 'all');
  }

  return (
    <section id="top" className="bg-[#0F1115] text-stone-100 border-b border-stone-800">
      {/* Main Split Hero + Top-of-Page Equipment Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 lg:py-10">
        {isAdmin && adminEditMode && (
          <div className="mb-5 flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg bg-[#1F242D] border border-[#C2842D]/50 text-xs text-stone-200">
            <span className="font-medium">
              {lang === 'en' ? 'Hero Banner & Contact Info' : 'Portada Principal y Contacto'}
            </span>
            <button
              type="button"
              onClick={onEditHero}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#C2842D] hover:bg-[#B07523] text-white font-semibold transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{lang === 'en' ? 'Edit Hero & Photo' : 'Editar Portada y Foto'}</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10 items-stretch">
          {/* Left Column */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-5">
            <div className="space-y-3.5">
              <p className="text-xs font-semibold tracking-wider uppercase text-[#E0A446]">
                {lang === 'en' ? hero.eyebrowEn : hero.eyebrowEs}
              </p>

              <h1
                className="font-display font-bold tracking-tight text-white leading-[1.08]"
                style={{ fontSize: 'clamp(2rem, 3.4vw, 3.1rem)', textWrap: 'balance' }}
              >
                {lang === 'en' ? hero.headlineEn : hero.headlineEs}
              </h1>

              <p className="text-sm sm:text-base text-stone-300 leading-relaxed max-w-xl">
                {lang === 'en' ? hero.subheadlineEn : hero.subheadlineEs}
              </p>

              {/* Interactive Top-of-Page Equipment Search Bar */}
              <form
                onSubmit={handleHeroSearchSubmit}
                className="pt-1 space-y-2"
                role="search"
                aria-label={lang === 'en' ? 'Search pro audio equipment catalog' : 'Buscar catálogo de equipos'}
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search
                      className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <label htmlFor="hero-gear-search" className="sr-only">
                      {lang === 'en'
                        ? 'Search speakers, mixers, wireless mics, lighting, or mounts'
                        : 'Buscar parlantes, mezcladoras, micrófonos, luces o montaje'}
                    </label>
                    <input
                      id="hero-gear-search"
                      type="search"
                      value={heroSearch}
                      onChange={(e) => setHeroSearch(e.target.value)}
                      placeholder={
                        lang === 'en'
                          ? hero.searchPlaceholderEn
                          : hero.searchPlaceholderEs
                      }
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#171A21] border border-stone-700 rounded-lg text-white placeholder:text-stone-400 focus:outline-none focus:border-[#E0A446]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {lang === 'en' ? hero.searchButtonEn : hero.searchButtonEs}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {HERO_QUICK_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => onSearchGear(heroSearch, cat.id)}
                      className="px-2.5 py-1 rounded-md bg-[#171A21] hover:bg-[#222732] border border-stone-700/80 text-xs font-medium text-stone-200 hover:text-white transition-colors cursor-pointer"
                    >
                      {lang === 'en' ? cat.labelEn : cat.labelEs}
                    </button>
                  ))}
                </div>
              </form>
            </div>

            <div className="space-y-3.5">
              {/* Primary Beat-Any-Price Phone CTA with Black Friday Every Day Slogan */}
              <div className="rounded-xl bg-[#171A21] border border-[#C2842D]/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#E0A446]">
                    {lang === 'en' ? hero.sloganTitleEn : hero.sloganTitleEs}
                  </p>
                  <p className="text-xs sm:text-sm text-stone-200 mt-0.5">
                    {lang === 'en' ? hero.sloganBodyEn : hero.sloganBodyEs}
                  </p>
                </div>
                <a
                  href={brand.phoneHref}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#C2842D] hover:bg-[#D19238] text-white font-semibold text-sm transition-colors whitespace-nowrap shrink-0"
                >
                  <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="font-mono tabular-nums">{brand.phoneDisplay}</span>
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href="#gear"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-[#141518] hover:bg-stone-100 font-semibold text-sm transition-colors whitespace-nowrap shrink-0"
                >
                  <ShoppingBag className="w-4 h-4 text-[#1a73e8]" aria-hidden="true" />
                  <span>
                    {lang === 'en'
                      ? `${hero.shopButtonEn} (${productCount}+)`
                      : `${hero.shopButtonEs} (${productCount}+)`}
                  </span>
                </a>

                <button
                  type="button"
                  onClick={() => onOpenQuote()}
                  className="px-4 py-2.5 rounded-lg border border-stone-700 hover:border-stone-500 text-stone-200 hover:text-white font-medium text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {lang === 'en' ? hero.quoteButtonEn : hero.quoteButtonEs}
                </button>

                {onOpenCustomerLogin && (
                  <button
                    type="button"
                    onClick={onOpenCustomerLogin}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      customer && customerDiscountPercent > 0
                        ? 'bg-emerald-900/60 border border-emerald-500/60 text-emerald-200'
                        : 'bg-[#171A21] border border-[#E0A446]/50 text-[#E0A446] hover:bg-[#222732]'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      {customer && customerDiscountPercent > 0
                        ? `VIP Pricing Unlocked (-${customerDiscountPercent}%)`
                        : lang === 'en'
                          ? 'Member Login · VIP Pricing'
                          : 'Acceso VIP · Precios'}
                    </span>
                  </button>
                )}

                <a
                  href={`mailto:${brand.email}`}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-stone-300 hover:text-white transition-colors ml-auto break-all sm:break-normal"
                >
                  <Mail className="w-3.5 h-3.5 text-[#E0A446] shrink-0" aria-hidden="true" />
                  <span>{brand.email}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Full-height Balanced Media with Refined E.V.A Logo Emblem */}
          <div className="lg:col-span-6 flex">
            <div className="relative w-full min-h-[250px] sm:min-h-[320px] lg:h-full rounded-xl overflow-hidden border border-stone-800 bg-[#171A21]">
              <SafeImage
                src={hero.imageUrl}
                alt={`${brand.name} — ${brand.leadEngineer}`}
                fallbackTitle={brand.name}
                loading="eager"
                className="w-full h-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent pointer-events-none"
              />
              <div className="absolute top-3.5 left-3.5 rounded-xl bg-[#0B1324]/90 backdrop-blur-sm border border-stone-700/80 px-3 py-2 shadow-lg">
                <EvaLogo size="sm" theme="dark" showText />
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 text-xs text-stone-200">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#E0A446] bg-[#141518] shrink-0 shadow-lg">
                  <SafeImage
                    src="asset:luis-portrait"
                    alt={brand.leadEngineer}
                    fallbackTitle={brand.leadEngineer}
                    loading="eager"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white text-sm">
                    {brand.leadEngineer} · {lang === 'en' ? hero.photoTitleEn : hero.photoTitleEs}
                  </p>
                  <p className="text-stone-300">
                    {lang === 'en' ? hero.photoCaptionEn : hero.photoCaptionEs}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Summary Strip Below Hero Split */}
        <div className="mt-7 pt-5 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div>
            <p className="font-mono text-lg font-semibold text-[#E0A446]">
              {lang === 'en' ? hero.stripStat1TitleEn : hero.stripStat1TitleEs}
            </p>
            <p className="text-xs sm:text-sm text-stone-300 mt-0.5">
              {lang === 'en' ? hero.stripStat1BodyEn : hero.stripStat1BodyEs}
            </p>
          </div>

          <div>
            <p className="font-mono text-lg font-semibold text-white tabular-nums">
              {productCount}+ {lang === 'en' ? hero.stripStat2LabelEn : hero.stripStat2LabelEs}
            </p>
            <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
              {lang === 'en' ? hero.stripStat2BodyEn : hero.stripStat2BodyEs}
            </p>
          </div>

          <div>
            <p className="font-mono text-lg font-semibold text-white tabular-nums">
              ${pricing.weeklyRate}
              <span className="text-sm font-normal text-stone-400">
                {lang === 'en' ? ' / week' : ' / semana'}
              </span>
            </p>
            <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
              {lang === 'en' ? hero.stripStat3BodyEn : hero.stripStat3BodyEs}
            </p>
          </div>

          <div>
            <p className="font-mono text-lg font-semibold text-white tabular-nums">
              ${pricing.standaloneHourlyRate}/hr{' '}
              <span className="text-sm font-normal text-stone-400">
                ({pricing.standaloneMinHours}h min · ${standaloneMin})
              </span>
            </p>
            <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
              {lang === 'en' ? hero.stripStat4BodyEn : hero.stripStat4BodyEs}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}


