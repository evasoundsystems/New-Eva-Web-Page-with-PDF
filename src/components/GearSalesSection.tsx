import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  Expand,
  Lock,
  Pencil,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { isStudioProductImage } from '../assets/assetMap';
import type {
  BrandConfig,
  CartItem,
  CatalogCategoryConfig,
  CustomerAccount,
  GearCategory,
  GearProduct,
  GearSortOption,
  Language,
  MemberPricingConfig,
  PageCopyConfig,
  PriceRangeFilter,
} from '../types/site';
import { getAllCatalogCategories } from '../utils/catalogCategories';
import {
  calculateMemberPrice,
  filterProducts,
  formatUsd,
  getProductAvailabilityDisplay,
  getUniqueBrands,
  mergeMemberPricing,
  mergePageCopy,
  selectFeaturedCatalogPreview,
  sortProducts,
} from '../utils/siteLogic';
import { SafeImage } from './SafeImage';

interface GearSalesSectionProps {
  products: GearProduct[];
  customCategories?: readonly CatalogCategoryConfig[];
  brand: BrandConfig;
  pageCopy?: PageCopyConfig;
  memberPricing?: MemberPricingConfig;
  customer?: CustomerAccount | null;
  customerDiscountPercent?: number;
  onOpenCustomerLogin?: () => void;
  lang: Language;
  cart: CartItem[];
  category?: GearCategory;
  onCategoryChange?: (category: GearCategory) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onAddToCart: (product: GearProduct) => void;
  onOpenCart: () => void;
  onOpenQuote: (preselectedService?: string) => void;
  isAdmin: boolean;
  adminEditMode: boolean;
  onEditProduct: (product: GearProduct) => void;
  onAddProduct: () => void;
  onDeleteProduct: (id: string) => void;
  onMoveProductById: (id: string, direction: 'up' | 'down') => void;
  onEditSectionCopy?: () => void;
  onManageCategories?: () => void;
}

const PRICE_RANGES: Array<{ id: PriceRangeFilter; labelEn: string; labelEs: string }> = [
  { id: 'all', labelEn: 'All Prices (MAP)', labelEs: 'Todos los Precios' },
  { id: 'under500', labelEn: 'Under $500', labelEs: 'Menos de $500' },
  { id: '500to1000', labelEn: '$500 – $1,000', labelEs: '$500 – $1,000' },
  { id: '1000to2000', labelEn: '$1,000 – $2,000', labelEs: '$1,000 – $2,000' },
  { id: 'over2000', labelEn: '$2,000+', labelEs: 'Más de $2,000' },
  { id: 'quoteOnly', labelEn: 'Custom Quote', labelEs: 'Cotización Directa' },
];

export function GearSalesSection({
  products,
  customCategories,
  brand,
  pageCopy: rawPageCopy,
  memberPricing: rawMemberPricing,
  customer = null,
  customerDiscountPercent = 0,
  onOpenCustomerLogin,
  lang,
  cart,
  category: controlledCategory,
  onCategoryChange,
  searchQuery: controlledSearchQuery,
  onSearchQueryChange,
  onAddToCart,
  onOpenCart,
  onOpenQuote,
  isAdmin,
  adminEditMode,
  onEditProduct,
  onAddProduct,
  onDeleteProduct,
  onMoveProductById,
  onEditSectionCopy,
  onManageCategories,
}: GearSalesSectionProps) {
  const copy = mergePageCopy(rawPageCopy);
  const memberPricing = mergeMemberPricing(rawMemberPricing);
  const vipUnlocked = Boolean(customer && customer.status === 'active' && customerDiscountPercent > 0);
  const [internalCategory, setInternalCategory] = useState<GearCategory>('all');
  const categories = useMemo(
    () => [
      { id: 'all' as GearCategory, labelEn: 'All Gear', labelEs: 'Todos' },
      ...getAllCatalogCategories(customCategories).map((cat) => ({
        id: cat.id as GearCategory,
        labelEn: cat.labelEn,
        labelEs: cat.labelEs,
      })),
    ],
    [customCategories]
  );
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<PriceRangeFilter>('all');
  const [sortBy, setSortBy] = useState<GearSortOption>('featured');
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [showAllUnfiltered, setShowAllUnfiltered] = useState(false);
  const [pageLimit, setPageLimit] = useState(48);
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [quickViewProduct, setQuickViewProduct] = useState<GearProduct | null>(null);
  const [stickyTop, setStickyTop] = useState(96);
  const [isToolbarStuck, setIsToolbarStuck] = useState(false);

  const stickySentinelRef = useRef<HTMLDivElement | null>(null);
  const stickyToolbarRef = useRef<HTMLDivElement | null>(null);
  const resultsTopRef = useRef<HTMLDivElement | null>(null);

  const category = controlledCategory ?? internalCategory;
  const searchQuery = controlledSearchQuery ?? internalSearchQuery;

  const scrollToResultsIfNeeded = useCallback(() => {
    const target = resultsTopRef.current;
    if (!target) return;
    const toolbarBottom = stickyToolbarRef.current
      ? stickyToolbarRef.current.getBoundingClientRect().bottom
      : stickyTop + 120;
    const rect = target.getBoundingClientRect();
    if (rect.top < toolbarBottom - 8) {
      const targetY = window.scrollY + rect.top - toolbarBottom - 10;
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    }
  }, [stickyTop]);

  function setCategory(next: GearCategory) {
    if (onCategoryChange) onCategoryChange(next);
    else setInternalCategory(next);
  }

  function setSearchQuery(next: string) {
    if (onSearchQueryChange) onSearchQueryChange(next);
    else setInternalSearchQuery(next);
  }

  useEffect(() => {
    const updateStickyOffsets = () => {
      const headerEl = document.querySelector('header');
      const headerHeight = headerEl
        ? Math.round(headerEl.getBoundingClientRect().height)
        : 96;
      setStickyTop(headerHeight);
      if (stickySentinelRef.current) {
        setIsToolbarStuck(
          stickySentinelRef.current.getBoundingClientRect().top <= headerHeight + 2
        );
      }
    };

    updateStickyOffsets();
    const headerEl = document.querySelector('header');
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && headerEl
        ? new ResizeObserver(updateStickyOffsets)
        : null;
    if (resizeObserver && headerEl) {
      resizeObserver.observe(headerEl);
    }

    window.addEventListener('resize', updateStickyOffsets, { passive: true });
    window.addEventListener('scroll', updateStickyOffsets, { passive: true });
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateStickyOffsets);
      window.removeEventListener('scroll', updateStickyOffsets);
    };
  }, []);

  useEffect(() => {
    if (!quickViewProduct) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setQuickViewProduct(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [quickViewProduct]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of products) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, [products]);

  const brands = useMemo(() => getUniqueBrands(products), [products]);
  const filteredProducts = useMemo(() => {
    const filtered = filterProducts(products, category, searchQuery, selectedBrand, priceRange);
    return sortProducts(filtered, sortBy);
  }, [products, category, searchQuery, selectedBrand, priceRange, sortBy]);

  const hasActiveFilters =
    category !== 'all' ||
    selectedBrand !== 'all' ||
    priceRange !== 'all' ||
    sortBy !== 'featured' ||
    searchQuery.trim().length > 0;

  useEffect(() => {
    setPageLimit(48);
  }, [category, selectedBrand, priceRange, sortBy, searchQuery, showAllUnfiltered]);

  const visibleProducts =
    hasActiveFilters || showAllUnfiltered
      ? filteredProducts.slice(0, pageLimit)
      : adminEditMode
        ? filteredProducts.slice(0, 12)
        : selectFeaturedCatalogPreview(filteredProducts, 12);

  const hasMoreToLoad =
    (hasActiveFilters || showAllUnfiltered) && filteredProducts.length > visibleProducts.length;

  function handlePriceMatchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = competitorUrl.trim();
    if (!cleaned) {
      onOpenQuote('Price-Beat Dealer Quote (Sweetwater / Guitar Center Match)');
      return;
    }
    onOpenQuote(`Price-Beat Quote Request: ${cleaned}`);
  }

  function resetFilters() {
    setCategory('all');
    setSelectedBrand('all');
    setPriceRange('all');
    setSortBy('featured');
    setSearchQuery('');
  }

  return (
    <section id="gear" className="py-12 lg:py-16 border-b border-stone-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#1a73e8] mb-1.5">
              {lang === 'en' ? copy.gearEyebrowEn : copy.gearEyebrowEs}
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#141518]"
              style={{ textWrap: 'balance' }}
            >
              {lang === 'en' ? copy.gearHeadingEn : copy.gearHeadingEs}
            </h2>
            <p className="mt-1.5 text-sm sm:text-base text-stone-600 leading-relaxed">
              {lang === 'en' ? copy.gearSubtitleEn : copy.gearSubtitleEs}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {memberPricing.enabled && onOpenCustomerLogin && (
              <button
                type="button"
                onClick={onOpenCustomerLogin}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  vipUnlocked
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : 'bg-[#141518] hover:bg-[#272A30] text-[#E0A446]'
                }`}
              >
                <Award className="w-4 h-4" aria-hidden="true" />
                <span>
                  {vipUnlocked
                    ? `${lang === 'en' ? memberPricing.bannerUnlockedEn : memberPricing.bannerUnlockedEs} (-${customerDiscountPercent}%)`
                    : lang === 'en'
                      ? memberPricing.loginPromptEn
                      : memberPricing.loginPromptEs}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenCart}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#1a73e8] text-[#1a73e8] hover:bg-[#1a73e8]/5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
              <span>
                {lang === 'en' ? 'View Quote Cart' : 'Ver Lista'} (
                {cart.reduce((sum, item) => sum + item.quantity, 0)})
              </span>
            </button>

            {isAdmin && adminEditMode && onEditSectionCopy && (
              <button
                type="button"
                onClick={onEditSectionCopy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{lang === 'en' ? 'Edit Section Text' : 'Editar Texto'}</span>
              </button>
            )}

            {isAdmin && adminEditMode && onManageCategories && (
              <button
                type="button"
                onClick={onManageCategories}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-[#141518] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#1a73e8]" aria-hidden="true" />
                <span>{lang === 'en' ? 'Categories' : 'Categorías'}</span>
              </button>
            )}

            {isAdmin && adminEditMode && (
              <button
                type="button"
                onClick={onAddProduct}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#C2842D] hover:bg-[#B07523] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{lang === 'en' ? 'Add New Product' : 'Agregar Producto'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Direct Black Friday Every Day Slogan + Call-to-Beat-Internet-Pricing Banner (Strict MAP Compliant) */}
        <div className="mb-6 rounded-xl border border-[#C2842D]/40 bg-[#141518] text-stone-100 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-sm sm:text-base font-bold text-white">
              <span className="text-[#E0A446]">
                {lang === 'en'
                  ? "It's Black Friday Every Day at E.V.A — "
                  : '¡Es Black Friday Todos los Días en E.V.A! — '}
              </span>
              {lang === 'en' ? copy.gearBannerTitleEn : copy.gearBannerTitleEs}
            </p>
            <p className="text-xs sm:text-sm text-stone-300 mt-0.5">
              {lang === 'en' ? copy.gearBannerBodyEn : copy.gearBannerBodyEs}
            </p>
          </div>
          <a
            href={brand.phoneHref}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#C2842D] hover:bg-[#D19238] text-white text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors"
          >
            <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {lang === 'en' ? 'Call for Best Price · ' : 'Llamar · '}
              <span className="font-mono tabular-nums">{brand.phoneDisplay}</span>
            </span>
          </a>
        </div>

        {/* Visual Department Cards for Easy Browsing without Wall-of-Text Fatigue */}
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-5"
          aria-label={lang === 'en' ? 'Equipment Departments' : 'Departamentos'}
        >
          {categories.filter((c) => c.id !== 'all').map((dept) => {
            const isSelected = category === dept.id;
            const count = categoryCounts[dept.id] || 0;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => setCategory(isSelected ? 'all' : dept.id)}
                className={`text-left px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1a73e8] border-[#1a73e8] text-white shadow-xs'
                    : 'bg-[#F8F8F6] border-stone-200 hover:border-[#1a73e8] text-[#141518]'
                }`}
              >
                <p className="text-xs font-bold leading-snug line-clamp-2">
                  {lang === 'en' ? dept.labelEn : dept.labelEs}
                </p>
                <p
                  className={`text-[11px] font-mono tabular-nums mt-1 ${
                    isSelected ? 'text-blue-100' : 'text-stone-500'
                  }`}
                >
                  {count} {lang === 'en' ? 'items' : 'ítems'}
                </p>
              </button>
            );
          })}
        </div>

        {/* Locked / Sticky Category Bar + Search & Filter Toolbar */}
        <div ref={stickySentinelRef} className="h-px w-full pointer-events-none" aria-hidden="true" />
        <div
          id="gear-sticky-toolbar"
          ref={stickyToolbarRef}
          style={{ top: `${stickyTop}px` }}
          className={`sticky z-30 mb-6 space-y-2.5 rounded-xl border bg-white/95 backdrop-blur-md p-2.5 sm:p-3 transition-shadow ${
            isToolbarStuck
              ? 'border-stone-300 shadow-md ring-1 ring-black/5'
              : 'border-stone-200 shadow-xs'
          }`}
        >
          <div
            className="flex flex-nowrap lg:flex-wrap items-center gap-1 p-1 rounded-lg bg-[#F8F8F6] border border-stone-200 overflow-x-auto"
            role="group"
            aria-label="Filter by equipment category"
          >
            {categories.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    scrollToResultsIfNeeded();
                  }}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#1a73e8] text-white shadow-xs'
                      : 'text-stone-700 hover:bg-white hover:text-[#141518]'
                  }`}
                >
                  {lang === 'en' ? cat.labelEn : cat.labelEs}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 lg:grid-cols-12 gap-2 sm:gap-2.5">
            <div className="relative col-span-3 lg:col-span-5">
              <Search
                className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <label htmlFor="gear-search" className="sr-only">
                {lang === 'en' ? 'Search by item number or description' : 'Buscar por modelo o descripción'}
              </label>
              <input
                id="gear-search"
                type="text"
                inputMode="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  scrollToResultsIfNeeded();
                }}
                placeholder={
                  lang === 'en'
                    ? 'Search speaker, model, mixer, truss, mic (e.g. RCF HDL, Shure)...'
                    : 'Buscar parlante, modelo, mezcladora, truss, mic (ej. RCF HDL)...'
                }
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg text-[#141518] placeholder:text-stone-400 focus:outline-none focus:border-[#1a73e8]"
              />
              {searchQuery.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    scrollToResultsIfNeeded();
                  }}
                  aria-label={lang === 'en' ? 'Clear equipment search' : 'Limpiar búsqueda'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="col-span-1 lg:col-span-3">
              <label htmlFor="gear-brand-filter" className="sr-only">
                {lang === 'en' ? 'Filter by brand' : 'Filtrar por marca'}
              </label>
              <select
                id="gear-brand-filter"
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  scrollToResultsIfNeeded();
                }}
                className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg text-[#141518] focus:outline-none focus:border-[#1a73e8] cursor-pointer"
              >
                <option value="all">
                  {lang === 'en' ? `All Brands (${brands.length})` : `Marcas (${brands.length})`}
                </option>
                {brands.map((brandName) => (
                  <option key={brandName} value={brandName}>
                    {brandName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1 lg:col-span-2">
              <label htmlFor="gear-price-filter" className="sr-only">
                {lang === 'en' ? 'Filter by MAP price range' : 'Filtrar por rango de precio'}
              </label>
              <select
                id="gear-price-filter"
                value={priceRange}
                onChange={(e) => {
                  setPriceRange(e.target.value as PriceRangeFilter);
                  scrollToResultsIfNeeded();
                }}
                className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg text-[#141518] focus:outline-none focus:border-[#1a73e8] cursor-pointer"
              >
                {PRICE_RANGES.map((range) => (
                  <option key={range.id} value={range.id}>
                    {lang === 'en' ? range.labelEn : range.labelEs}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1 lg:col-span-2">
              <label htmlFor="gear-sort" className="sr-only">
                {lang === 'en' ? 'Sort products' : 'Ordenar productos'}
              </label>
              <select
                id="gear-sort"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as GearSortOption);
                  scrollToResultsIfNeeded();
                }}
                className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg text-[#141518] focus:outline-none focus:border-[#1a73e8] cursor-pointer"
              >
                <option value="featured">{lang === 'en' ? 'Featured' : 'Destacados'}</option>
                <option value="priceAsc">{lang === 'en' ? 'Price: Low-High' : 'Menor Precio'}</option>
                <option value="priceDesc">{lang === 'en' ? 'Price: High-Low' : 'Mayor Precio'}</option>
                <option value="nameAsc">{lang === 'en' ? 'Model: A – Z' : 'Modelo: A–Z'}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-stone-500 px-0.5">
            <span>
              {lang === 'en' ? 'Showing' : 'Mostrando'}{' '}
              <strong className="text-[#141518] tabular-nums">{visibleProducts.length}</strong>{' '}
              {lang === 'en' ? 'of' : 'de'}{' '}
              <strong className="text-[#141518] tabular-nums">{filteredProducts.length}</strong>{' '}
              {lang === 'en' ? 'products' : 'productos'}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-[#1a73e8] hover:underline cursor-pointer"
              >
                {lang === 'en' ? 'Clear All Filters' : 'Limpiar Filtros'}
              </button>
            )}
          </div>
        </div>

        {/* Anchor used to scroll smoothly back to top of results if filtering while scrolled */}
        <div id="gear-results-top" ref={resultsTopRef} className="h-px w-full" aria-hidden="true" />

        {/* Product Grid (1 / 2 / 3 / 4 columns) */}
        {visibleProducts.length === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-10 text-center mb-10">
            <p className="text-base font-semibold text-[#141518] mb-1">
              {lang === 'en' ? 'No matching gear found in this filter' : 'No se encontraron equipos con ese filtro'}
            </p>
            <p className="text-sm text-stone-600 mb-4">
              {lang === 'en'
                ? 'We carry every model sold by authorized pro audio brands. Reset filters or request any SKU below.'
                : 'Manejamos todos los modelos autorizados. Limpie los filtros o solicite cualquier SKU abajo.'}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 rounded-lg bg-[#1a73e8] text-white text-sm font-semibold hover:bg-[#1557b0] cursor-pointer"
            >
              {lang === 'en' ? 'Show All Gear' : 'Ver Todos los Equipos'}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
              {visibleProducts.map((product, visibleIdx) => {
                const globalIndex = products.findIndex((p) => p.id === product.id);
                const itemNumber = product.itemNumber || product.name;
                const cartEntry = cart.find((c) => c.productId === product.id);
                const isStudio = isStudioProductImage(product.imageUrl);

                return (
                  <article
                    key={product.id}
                    className="bg-white border border-stone-200 rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() => setQuickViewProduct(product)}
                        aria-label={`Inspect ${itemNumber} photo and full specifications`}
                        className={`group relative w-full block aspect-[4/3] overflow-hidden border-b border-stone-100 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8] ${
                          isStudio ? 'bg-white' : 'bg-stone-100'
                        }`}
                      >
                        <SafeImage
                          src={product.imageUrl}
                          alt={`${product.brand} ${itemNumber} — ${product.descriptionEn}`}
                          fallbackTitle={itemNumber}
                          loading={visibleIdx < 12 ? 'eager' : 'lazy'}
                          className={
                            isStudio
                              ? 'w-full h-full object-contain p-3 transition-transform duration-200 group-hover:scale-[1.03]'
                              : 'w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]'
                          }
                        />
                        <span
                          className="absolute bottom-2 right-2 w-7 h-7 rounded-md bg-white/90 border border-stone-200 text-stone-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                          aria-hidden="true"
                        >
                          <Expand className="w-3.5 h-3.5" />
                        </span>
                      </button>

                      <div className="p-4">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 truncate">
                            {product.brand}
                          </p>
                          {(() => {
                            const avail = getProductAvailabilityDisplay(product, lang);
                            const badgeCls =
                              avail.tone === 'in_stock'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : avail.tone === 'wait_time'
                                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                                  : 'bg-stone-100 text-stone-700 border-stone-200';
                            return (
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap shrink-0 max-w-[65%] truncate ${badgeCls}`}
                                title={avail.label}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    avail.tone === 'in_stock'
                                      ? 'bg-emerald-500'
                                      : avail.tone === 'wait_time'
                                        ? 'bg-amber-500'
                                        : 'bg-stone-400'
                                  }`}
                                  aria-hidden="true"
                                />
                                <span className="truncate">{avail.label}</span>
                              </span>
                            );
                          })()}
                        </div>

                        <h3 className="font-display text-base font-bold text-[#141518] leading-snug mb-1.5 line-clamp-1">
                          <button
                            type="button"
                            onClick={() => setQuickViewProduct(product)}
                            className="text-left hover:text-[#1a73e8] transition-colors cursor-pointer"
                          >
                            {itemNumber}
                          </button>
                        </h3>

                        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed line-clamp-2 min-h-[2.6rem]">
                          {lang === 'en' ? product.descriptionEn : product.descriptionEs}
                        </p>
                      </div>
                    </div>

                    <div className="px-4 pb-4 pt-3 border-t border-stone-100 space-y-2.5">
                      {(() => {
                        const hasMap = typeof product.mapPrice === 'number' && product.mapPrice > 0;
                        const memberUnit = vipUnlocked && hasMap
                          ? calculateMemberPrice(product.mapPrice, customerDiscountPercent)
                          : undefined;
                        if (vipUnlocked && memberUnit !== undefined && hasMap) {
                          const savedAmt = Math.max(0, Math.round((product.mapPrice! - memberUnit) * 100) / 100);
                          return (
                            <div className="space-y-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="font-mono text-base font-bold text-emerald-700 tabular-nums">
                                  {formatUsd(memberUnit)}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {lang === 'en' ? memberPricing.badgeLabelEn : memberPricing.badgeLabelEs}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono">
                                <span className="line-through">{formatUsd(product.mapPrice!)} MAP</span>
                                <span className="text-emerald-700 font-semibold">Save {formatUsd(savedAmt)}</span>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-mono text-base font-bold text-[#141518] tabular-nums">
                                {hasMap ? `${formatUsd(product.mapPrice!)}` : product.priceLabel}
                              </span>
                              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">
                                {hasMap ? 'MAP (USD)' : 'Quote'}
                              </span>
                            </div>
                            {memberPricing.enabled && hasMap && onOpenCustomerLogin && (
                              <button
                                type="button"
                                onClick={onOpenCustomerLogin}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9A6315] hover:underline cursor-pointer"
                              >
                                <Lock className="w-3 h-3" aria-hidden="true" />
                                <span>
                                  {lang === 'en'
                                    ? 'Sign in for Exclusive Member Price'
                                    : 'Entre para Precio VIP Exclusivo'}
                                </span>
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => onAddToCart(product)}
                          className="w-full px-3.5 py-2.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {cartEntry ? (
                            <>
                              <Check className="w-4 h-4" aria-hidden="true" />
                              <span>
                                {lang === 'en'
                                  ? `Add to Quote (${cartEntry.quantity} in cart)`
                                  : `En Lista (${cartEntry.quantity})`}
                              </span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{lang === 'en' ? 'Add to Quote' : 'Agregar a Cotización'}</span>
                            </>
                          )}
                        </button>

                        <a
                          href={brand.phoneHref}
                          className="w-full px-3.5 py-2 rounded-lg border border-stone-200 hover:border-[#1a73e8] text-[#141518] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#1a73e8]" aria-hidden="true" />
                          <span>Call for Best Price</span>
                        </a>
                      </div>

                      {isAdmin && adminEditMode && (
                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onMoveProductById(product.id, 'up')}
                              disabled={globalIndex <= 0}
                              aria-label={`Move ${itemNumber} up`}
                              className="p-1.5 rounded border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-35 cursor-pointer"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onMoveProductById(product.id, 'down')}
                              disabled={globalIndex === products.length - 1}
                              aria-label={`Move ${itemNumber} down`}
                              className="p-1.5 rounded border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-35 cursor-pointer"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onEditProduct(product)}
                              aria-label={`Edit ${itemNumber}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#C2842D] text-white text-xs font-semibold hover:bg-[#B07523] cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>{lang === 'en' ? 'Edit' : 'Editar'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteProduct(product.id)}
                              aria-label={`Delete ${itemNumber}`}
                              className="p-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}

              {isAdmin && adminEditMode && (
                <button
                  type="button"
                  onClick={onAddProduct}
                  className="min-h-[320px] rounded-xl border-2 border-dashed border-[#C2842D]/60 bg-[#F8F8F6] hover:bg-white flex flex-col items-center justify-center gap-2 p-6 text-center transition-colors cursor-pointer"
                >
                  <span className="w-11 h-11 rounded-full bg-[#C2842D]/15 text-[#9A6315] flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </span>
                  <span className="font-display font-semibold text-[#141518]">
                    {lang === 'en' ? 'Add New Product' : 'Agregar Nuevo Producto'}
                  </span>
                  <span className="text-xs text-stone-500 max-w-[200px]">
                    {lang === 'en'
                      ? 'Upload a photo, set MAP price, and publish instantly.'
                      : 'Sube una foto, fija el precio y publícalo al instante.'}
                  </span>
                </button>
              )}
            </div>

            {hasMoreToLoad && (
              <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                <button
                  type="button"
                  onClick={() => setPageLimit((prev) => prev + 48)}
                  className="px-6 py-2.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-semibold cursor-pointer"
                >
                  {lang === 'en'
                    ? `Load More Gear (${filteredProducts.length - visibleProducts.length} remaining)`
                    : `Cargar Más Equipos (${filteredProducts.length - visibleProducts.length} restantes)`}
                </button>
              </div>
            )}

            {!hasActiveFilters && filteredProducts.length > 12 && (
              <div className="flex justify-center mb-8">
                <button
                  type="button"
                  onClick={() => setShowAllUnfiltered((prev) => !prev)}
                  className="px-6 py-2.5 rounded-lg border border-stone-300 bg-[#F8F8F6] hover:border-[#1a73e8] text-sm font-semibold text-[#141518] cursor-pointer"
                >
                  {showAllUnfiltered
                    ? lang === 'en'
                      ? 'Show Curated 12 Featured Items'
                      : 'Ver 12 Equipos Destacados'
                    : lang === 'en'
                      ? `View All ${filteredProducts.length} Catalog Products`
                      : `Ver Todos los ${filteredProducts.length} Productos`}
                </button>
              </div>
            )}
          </>
        )}

        {/* Direct Quote Request / Any-SKU Bar */}
        <form
          onSubmit={handlePriceMatchSubmit}
          className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
        >
          <div className="max-w-xl">
            <h3 className="font-display text-lg sm:text-xl font-bold text-[#141518] mb-1">
              {lang === 'en' ? copy.gearSourcingTitleEn : copy.gearSourcingTitleEs}
            </h3>
            <p className="text-sm text-stone-600">
              {lang === 'en' ? copy.gearSourcingBodyEn : copy.gearSourcingBodyEs}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto lg:min-w-[420px]">
            <label htmlFor="price-beat-input" className="sr-only">
              Product link or SKU
            </label>
            <input
              id="price-beat-input"
              type="text"
              value={competitorUrl}
              onChange={(e) => setCompetitorUrl(e.target.value)}
              placeholder={
                lang === 'en'
                  ? 'Enter SKU or Sweetwater link (e.g. K12.2-YOKE, CQ-18T)...'
                  : 'Escriba modelo o enlace (ej. K12.2-YOKE, CQ-18T)...'
              }
              className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              {lang === 'en' ? copy.gearSourcingCtaEn : copy.gearSourcingCtaEs}
            </button>
          </div>
        </form>
      </div>

      {/* Product Quick-View Modal */}
      {quickViewProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
          onClick={() => setQuickViewProduct(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-view-title"
        >
          <div
            className="relative w-full max-w-2xl bg-white rounded-2xl border border-stone-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setQuickViewProduct(null)}
              aria-label="Close product details"
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-lg bg-white/95 border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center justify-center shadow-xs cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="overflow-y-auto grid grid-cols-1 sm:grid-cols-2">
              <div className="bg-white border-b sm:border-b-0 sm:border-r border-stone-100 p-6 flex items-center justify-center min-h-[240px]">
                <SafeImage
                  src={quickViewProduct.imageUrl}
                  alt={`${quickViewProduct.brand} ${quickViewProduct.itemNumber || quickViewProduct.name}`}
                  fallbackTitle={quickViewProduct.itemNumber || quickViewProduct.name}
                  loading="eager"
                  className="max-h-72 w-full object-contain"
                />
              </div>

              <div className="p-6 flex flex-col justify-between gap-5">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#1a73e8]">
                      {quickViewProduct.brand}
                    </p>
                    {(() => {
                      const avail = getProductAvailabilityDisplay(quickViewProduct, lang);
                      const badgeCls =
                        avail.tone === 'in_stock'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : avail.tone === 'wait_time'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-stone-100 text-stone-700 border-stone-200';
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-semibold ${badgeCls}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              avail.tone === 'in_stock'
                                ? 'bg-emerald-500'
                                : avail.tone === 'wait_time'
                                  ? 'bg-amber-500'
                                  : 'bg-stone-400'
                            }`}
                            aria-hidden="true"
                          />
                          <span>{avail.label}</span>
                        </span>
                      );
                    })()}
                  </div>
                  <h3
                    id="quick-view-title"
                    className="font-display text-xl font-bold text-[#141518] leading-snug mb-2"
                  >
                    {quickViewProduct.itemNumber || quickViewProduct.name}
                  </h3>
                  <p className="text-sm text-stone-600 leading-relaxed mb-4">
                    {lang === 'en' ? quickViewProduct.descriptionEn : quickViewProduct.descriptionEs}
                  </p>

                  {quickViewProduct.specs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {quickViewProduct.specs.map((spec) => (
                        <span
                          key={spec}
                          className="px-2.5 py-1 rounded-md bg-[#F8F8F6] border border-stone-200 text-xs font-medium text-stone-700"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-stone-100">
                    {(() => {
                      const hasMap =
                        typeof quickViewProduct.mapPrice === 'number' && quickViewProduct.mapPrice > 0;
                      const memberUnit =
                        vipUnlocked && hasMap
                          ? calculateMemberPrice(quickViewProduct.mapPrice, customerDiscountPercent)
                          : undefined;
                      if (vipUnlocked && memberUnit !== undefined && hasMap) {
                        return (
                          <>
                            <div className="flex items-baseline justify-between gap-2 mb-1">
                              <span className="font-mono text-2xl font-bold text-emerald-700 tabular-nums">
                                {formatUsd(memberUnit)}
                              </span>
                              <span className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {lang === 'en' ? memberPricing.badgeLabelEn : memberPricing.badgeLabelEs} (-{customerDiscountPercent}%)
                              </span>
                            </div>
                            <p className="text-xs text-stone-500 font-mono">
                              <span className="line-through">{formatUsd(quickViewProduct.mapPrice!)} MAP</span>{' '}
                              · Authorized Member Pricing Applied
                            </p>
                          </>
                        );
                      }
                      return (
                        <>
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <span className="font-mono text-xl font-bold text-[#141518] tabular-nums">
                              {hasMap
                                ? formatUsd(quickViewProduct.mapPrice!)
                                : quickViewProduct.priceLabel}
                            </span>
                            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                              {hasMap ? 'MAP (USD)' : 'Quote'}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500">
                            {lang === 'en'
                              ? 'Authorized Dealer. Sign in for Exclusive Member Pricing or call for bundle discounts.'
                              : 'Distribuidor Autorizado. Inicie sesión para Precios VIP Exclusivos.'}
                          </p>
                          {memberPricing.enabled && hasMap && onOpenCustomerLogin && (
                            <button
                              type="button"
                              onClick={() => {
                                setQuickViewProduct(null);
                                onOpenCustomerLogin();
                              }}
                              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#9A6315] hover:underline cursor-pointer"
                            >
                              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>
                                {lang === 'en' ? memberPricing.loginPromptEn : memberPricing.loginPromptEs}
                              </span>
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      onAddToCart(quickViewProduct);
                      setQuickViewProduct(null);
                    }}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                    <span>{lang === 'en' ? 'Add to Quote' : 'Agregar a Cotización'}</span>
                  </button>

                  <a
                    href={brand.phoneHref}
                    className="w-full px-4 py-2.5 rounded-lg border border-stone-200 hover:border-[#1a73e8] text-[#141518] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-[#1a73e8] shrink-0" aria-hidden="true" />
                    <span>
                      Call for Best Price · <span className="whitespace-nowrap">{brand.phoneDisplay}</span>
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
