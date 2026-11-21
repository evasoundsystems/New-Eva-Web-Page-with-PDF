import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Expand, Pencil, Phone, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import { isStudioProductImage } from '../assets/assetMap';
import type {
  BrandConfig,
  CartItem,
  GearCategory,
  GearProduct,
  GearSortOption,
  Language,
  PriceRangeFilter,
} from '../types/site';
import {
  filterProducts,
  formatUsd,
  getUniqueBrands,
  selectFeaturedCatalogPreview,
  sortProducts,
} from '../utils/siteLogic';
import { SafeImage } from './SafeImage';

interface GearSalesSectionProps {
  products: GearProduct[];
  brand: BrandConfig;
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
}

const CATEGORIES: Array<{ id: GearCategory; labelEn: string; labelEs: string }> = [
  { id: 'all', labelEn: 'All Gear', labelEs: 'Todos' },
  { id: 'speakers', labelEn: 'Speakers & Subs', labelEs: 'Parlantes' },
  { id: 'consoles', labelEn: 'Mixers & Consoles', labelEs: 'Mezcladoras' },
  { id: 'mics', labelEn: 'Wireless & Wired Mics', labelEs: 'Micrófonos' },
  { id: 'cables', labelEn: 'Stageboxes, XLR & Racks', labelEs: 'Cajas, XLR y Racks' },
  { id: 'lighting', labelEn: 'Moving Lights & Wash', labelEs: 'Luces Móviles y DMX' },
  { id: 'rigging', labelEn: 'Truss, Beam & Ceiling Rigs', labelEs: 'Truss, Vigas y Techo' },
  { id: 'iem', labelEn: 'In-Ear Monitors', labelEs: 'Monitores IEM' },
  { id: 'combiners', labelEn: 'RF Combiners', labelEs: 'Antenas RF' },
];

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
  brand,
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
}: GearSalesSectionProps) {
  const [internalCategory, setInternalCategory] = useState<GearCategory>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<PriceRangeFilter>('all');
  const [sortBy, setSortBy] = useState<GearSortOption>('featured');
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [showAllUnfiltered, setShowAllUnfiltered] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [quickViewProduct, setQuickViewProduct] = useState<GearProduct | null>(null);

  const category = controlledCategory ?? internalCategory;
  const searchQuery = controlledSearchQuery ?? internalSearchQuery;

  function setCategory(next: GearCategory) {
    if (onCategoryChange) onCategoryChange(next);
    else setInternalCategory(next);
  }

  function setSearchQuery(next: string) {
    if (onSearchQueryChange) onSearchQueryChange(next);
    else setInternalSearchQuery(next);
  }

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

  const visibleProducts =
    hasActiveFilters || showAllUnfiltered
      ? filteredProducts
      : adminEditMode
        ? filteredProducts.slice(0, 12)
        : selectFeaturedCatalogPreview(filteredProducts, 12);

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
              {lang === 'en'
                ? "EVA Sound Systems · It's Black Friday Every Day When You Call Direct"
                : 'EVA Sound Systems · ¡Es Black Friday Todos los Días al Llamar Directo!'}
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#141518]"
              style={{ textWrap: 'balance' }}
            >
              {lang === 'en'
                ? 'Pro Audio, Moving Lights, Truss & Stage Catalog'
                : 'Catálogo de Audio Pro, Luces Móviles, Truss y Escenario'}
            </h2>
            <p className="mt-1.5 text-sm sm:text-base text-stone-600 leading-relaxed">
              {lang === 'en'
                ? 'Authorized Dealer. Prices shown are manufacturer advertised prices (MAP). Call for private dealer quotes on any item or complete church bundle.'
                : 'Distribuidor Autorizado. Mostramos precios MAP de fábrica. Llame para precios directos en cualquier equipo o paquete completo.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
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
              {lang === 'en'
                ? 'Beat Sweetwater, Guitar Center & Any Internet Price'
                : 'Mejoramos Sweetwater y Cualquier Precio en Línea'}
            </p>
            <p className="text-xs sm:text-sm text-stone-300 mt-0.5">
              {lang === 'en'
                ? 'Manufacturer MAP pricing is shown below per dealer policy — call directly for private dealer pricing on mixers, speakers, moving lights, F34 truss, beam/ceiling rigging, stageboxes, XLR cables & mics.'
                : 'Por política de fábrica mostramos precios MAP — llame directo para precios privados en consolas, parlantes, luces móviles, truss, vigas/techo, cajas digitales, cables XLR y micrófonos.'}
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
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-5"
          aria-label={lang === 'en' ? 'Equipment Departments' : 'Departamentos'}
        >
          {CATEGORIES.filter((c) => c.id !== 'all').map((dept) => {
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

        {/* Clean Category Bar + Compact Dropdown Filter Toolbar */}
        <div className="space-y-3.5 mb-7">
          <div
            className="flex flex-wrap items-center gap-1 p-1.5 rounded-xl bg-[#F8F8F6] border border-stone-200"
            role="group"
            aria-label="Filter by equipment category"
          >
            {CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            <div className="relative lg:col-span-5">
              <Search
                className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <label htmlFor="gear-search" className="sr-only">
                {lang === 'en' ? 'Search by item number or description' : 'Buscar por modelo o descripción'}
              </label>
              <input
                id="gear-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === 'en'
                    ? 'Search model or gear (Moving Lights, F34 Truss, Wood Beam, Ceiling, Stage Box, XLR, Shure)...'
                    : 'Buscar modelo o equipo (Luces, Truss, Vigas, Techo, Caja Digital, XLR, Shure)...'
                }
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-stone-300 rounded-lg text-[#141518] placeholder:text-stone-400 focus:outline-none focus:border-[#1a73e8]"
              />
            </div>

            <div className="lg:col-span-3">
              <label htmlFor="gear-brand-filter" className="sr-only">
                {lang === 'en' ? 'Filter by brand' : 'Filtrar por marca'}
              </label>
              <select
                id="gear-brand-filter"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg text-[#141518] focus:outline-none focus:border-[#1a73e8] cursor-pointer"
              >
                <option value="all">
                  {lang === 'en' ? `All Brands (${brands.length})` : `Todas las Marcas (${brands.length})`}
                </option>
                {brands.map((brandName) => (
                  <option key={brandName} value={brandName}>
                    {brandName}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label htmlFor="gear-price-filter" className="sr-only">
                {lang === 'en' ? 'Filter by MAP price range' : 'Filtrar por rango de precio'}
              </label>
              <select
                id="gear-price-filter"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as PriceRangeFilter)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg text-[#141518] focus:outline-none focus:border-[#1a73e8] cursor-pointer"
              >
                {PRICE_RANGES.map((range) => (
                  <option key={range.id} value={range.id}>
                    {lang === 'en' ? range.labelEn : range.labelEs}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label htmlFor="gear-sort" className="sr-only">
                {lang === 'en' ? 'Sort products' : 'Ordenar productos'}
              </label>
              <select
                id="gear-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as GearSortOption)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg text-[#141518] focus:outline-none focus:border-[#1a73e8] cursor-pointer"
              >
                <option value="featured">{lang === 'en' ? 'Featured Order' : 'Destacados'}</option>
                <option value="priceAsc">{lang === 'en' ? 'Price: Low to High' : 'Precio: Menor a Mayor'}</option>
                <option value="priceDesc">{lang === 'en' ? 'Price: High to Low' : 'Precio: Mayor a Menor'}</option>
                <option value="nameAsc">{lang === 'en' ? 'Model: A – Z' : 'Modelo: A – Z'}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 px-0.5">
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
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                          {product.brand}
                        </p>

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
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-base font-bold text-[#141518] tabular-nums">
                          {typeof product.mapPrice === 'number' && product.mapPrice > 0
                            ? `${formatUsd(product.mapPrice)}`
                            : product.priceLabel}
                        </span>
                        <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">
                          {typeof product.mapPrice === 'number' && product.mapPrice > 0
                            ? 'MAP (USD)'
                            : 'Quote'}
                        </span>
                      </div>

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

            {!hasActiveFilters && filteredProducts.length > 12 && (
              <div className="flex justify-center mb-8">
                <button
                  type="button"
                  onClick={() => setShowAllUnfiltered((prev) => !prev)}
                  className="px-6 py-2.5 rounded-lg border border-stone-300 bg-[#F8F8F6] hover:border-[#1a73e8] text-sm font-semibold text-[#141518] cursor-pointer"
                >
                  {showAllUnfiltered
                    ? 'Show Curated 12 Featured Items'
                    : `View All ${filteredProducts.length} Catalog Products`}
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
              {lang === 'en'
                ? 'Need a Model Not Listed or Custom Multi-Room Package?'
                : '¿Busca Otro Modelo o un Paquete Completo por Volumen?'}
            </h3>
            <p className="text-sm text-stone-600">
              {lang === 'en'
                ? 'We carry every speaker, mixer, lighting fixture, and rigging mount sold on Sweetwater. Paste any SKU or link below — final dealer pricing is confirmed on your official quote.'
                : 'Manejamos todo equipo de sonido, mezcladora, luz y montaje de Sweetwater. Pegue cualquier modelo o enlace abajo para confirmar su precio final de distribuidor.'}
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
              {lang === 'en' ? 'Request Official Quote' : 'Pedir Cotización'}
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
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#1a73e8] mb-1">
                    {quickViewProduct.brand}
                  </p>
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
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="font-mono text-xl font-bold text-[#141518] tabular-nums">
                        {typeof quickViewProduct.mapPrice === 'number' && quickViewProduct.mapPrice > 0
                          ? formatUsd(quickViewProduct.mapPrice)
                          : quickViewProduct.priceLabel}
                      </span>
                      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                        {typeof quickViewProduct.mapPrice === 'number' && quickViewProduct.mapPrice > 0
                          ? 'MAP (USD)'
                          : 'Quote'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">
                      {lang === 'en'
                        ? 'Authorized Dealer. Final dealer pricing & shipping confirmed on your official quote.'
                        : 'Distribuidor Autorizado. Precio final confirmado en su cotización oficial.'}
                    </p>
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
