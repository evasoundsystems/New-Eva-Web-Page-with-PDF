import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Download,
  Eye,
  EyeOff,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { DEFAULT_SITE_CONTENT } from '../data/defaultContent';
import type {
  CustomerOrderRecord,
  GearCategory,
  GearProduct,
  Language,
  QuoteRecord,
  QuoteSubmissionInput,
  QuoteUpdateInput,
  SectionId,
  ServiceItem,
  SiteContent,
  TestimonialCategory,
  TestimonialItem,
  VendorMasterEntry,
  VendorQuoteOption,
} from '../types/site';
import { formatUsd, getVendorLandedCost, moveItemInArray } from '../utils/siteLogic';
import { AdminCustomerOrdersTab } from './AdminCustomerOrdersTab';
import { AdminImagePicker } from './AdminImagePicker';
import { AdminLeadsTab } from './AdminLeadsTab';
import { AdminVendorMasterTab } from './AdminVendorMasterTab';
import { SafeImage } from './SafeImage';

export type AdminTabId =
  | 'products'
  | 'vendor-master'
  | 'customer-orders'
  | 'layout'
  | 'hero-pricing'
  | 'services'
  | 'testimonials'
  | 'leads'
  | 'backup';

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  isAdmin: boolean;
  firebaseAdminEmail: string | null;
  onGoogleLogin: () => Promise<{ ok: boolean; error?: string }>;
  onLogin: (passcode: string) => Promise<boolean>;
  onLogout: () => void;
  adminEditMode: boolean;
  onToggleEditMode: () => void;
  siteContent: SiteContent;
  onChangeContent: (next: SiteContent) => void;
  quotes: QuoteRecord[];
  quotesLoading: boolean;
  onCreateEstimate: (
    payload: QuoteSubmissionInput & QuoteUpdateInput
  ) => Promise<QuoteRecord | null>;
  onUpdateQuote: (id: string, updates: QuoteUpdateInput) => Promise<QuoteRecord | null>;
  onDeleteQuote: (id: string) => Promise<void>;
  vendorEntries: VendorMasterEntry[];
  vendorLoading: boolean;
  onSaveVendorEntry: (entry: VendorMasterEntry) => Promise<VendorMasterEntry | null>;
  onDeleteVendorEntry: (id: string) => Promise<void>;
  customerOrders: CustomerOrderRecord[];
  ordersLoading: boolean;
  onSaveCustomerOrder: (
    order: CustomerOrderRecord,
    isExisting: boolean
  ) => Promise<CustomerOrderRecord | null>;
  onDeleteCustomerOrder: (id: string) => Promise<void>;
  initialTab?: AdminTabId;
  initialProductToEdit?: GearProduct | null;
  initialServiceToEdit?: ServiceItem | null;
  initialTestimonialToEdit?: TestimonialItem | null;
}

const SECTION_LABELS: Record<SectionId, { en: string; es: string }> = {
  services: { en: 'Services & Capabilities Grid', es: 'Servicios e Instalaciones' },
  pricing: { en: '$50/Week Care Plan & Calculator', es: 'Plan $50/sem y Calculadora' },
  gear: { en: 'Pro Audio Gear Storefront', es: 'Tienda de Equipos Pro Audio' },
  training: { en: 'Volunteer Sound Training', es: 'Capacitación de Voluntarios' },
  diagnostic: { en: '30-Second Audio Diagnostic Tool', es: 'Diagnóstico Rápido de Audio' },
  testimonials: { en: 'Client Reviews & Testimonials', es: 'Testimonios de Clientes' },
};

const EMPTY_PRODUCT: GearProduct = {
  id: '',
  itemNumber: '',
  name: '',
  brand: '',
  category: 'speakers',
  mapPrice: undefined,
  priceLabel: 'Best Price Quote',
  priceNote: 'MAP / Authorized Dealer Quote',
  descriptionEn: '',
  descriptionEs: '',
  specs: [],
  imageUrl: 'asset:console',
  inStock: true,
};

const EMPTY_SERVICE: ServiceItem = {
  id: '',
  titleEn: '',
  titleEs: '',
  descriptionEn: '',
  descriptionEs: '',
  deliverableEn: '',
  deliverableEs: '',
  imageUrl: 'asset:console',
};

const EMPTY_TESTIMONIAL: TestimonialItem = {
  id: '',
  name: '',
  roleEn: '',
  roleEs: '',
  organization: '',
  category: 'church',
  outcomeMetric: '',
  gearContext: '',
  quoteEn: '',
  quoteEs: '',
};

function makeDefaultVendorSlots(): VendorQuoteOption[] {
  const names = ['Sweetwater Pro', 'Full Compass', 'ADI / Supplier #3'];
  const today = new Date().toISOString().slice(0, 10);
  return names.map((vendorName, i) => ({
    id: `vq-inline-${i + 1}-${Date.now()}`,
    vendorName,
    repName: '',
    email: '',
    phone: '',
    unitCost: 0,
    shippingCost: 0,
    leadTime: '',
    skuOrPartNo: '',
    notes: '',
    lastQuotedAt: today,
  }));
}

export function AdminPortalModal({
  isOpen,
  onClose,
  lang,
  isAdmin,
  firebaseAdminEmail,
  onGoogleLogin,
  onLogin,
  onLogout,
  adminEditMode,
  onToggleEditMode,
  siteContent,
  onChangeContent,
  quotes,
  quotesLoading,
  onCreateEstimate,
  onUpdateQuote,
  onDeleteQuote,
  vendorEntries,
  vendorLoading,
  onSaveVendorEntry,
  onDeleteVendorEntry,
  customerOrders,
  ordersLoading,
  onSaveCustomerOrder,
  onDeleteCustomerOrder,
  initialTab = 'products',
  initialProductToEdit = null,
  initialServiceToEdit = null,
  initialTestimonialToEdit = null,
}: AdminPortalModalProps) {
  const [passcodeInput, setPasscodeInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTabId>(initialTab);
  const [preloadedQuoteToConvert, setPreloadedQuoteToConvert] =
    useState<QuoteRecord | null>(null);

  // Product editor state
  const [productDraft, setProductDraft] = useState<GearProduct | null>(null);
  const [specsText, setSpecsText] = useState('');
  const [productVendorQuotes, setProductVendorQuotes] = useState<VendorQuoteOption[]>(
    makeDefaultVendorSlots()
  );
  const [productVendorNotes, setProductVendorNotes] = useState('');
  const [matchedVendorEntryId, setMatchedVendorEntryId] = useState<string | null>(null);

  // Service editor state
  const [serviceDraft, setServiceDraft] = useState<ServiceItem | null>(null);

  // Testimonial editor state
  const [testimonialDraft, setTestimonialDraft] = useState<TestimonialItem | null>(null);

  // Backup import state
  const [importError, setImportError] = useState('');

  function hydrateInlineVendorForProduct(prod: GearProduct | null) {
    if (!prod) {
      setProductVendorQuotes(makeDefaultVendorSlots());
      setProductVendorNotes('');
      setMatchedVendorEntryId(null);
      return;
    }
    const existingVm = vendorEntries.find(
      (vm) =>
        vm.productId === prod.id ||
        (prod.itemNumber && vm.itemNumber.toLowerCase() === prod.itemNumber.toLowerCase()) ||
        (prod.name && vm.productName.toLowerCase() === prod.name.toLowerCase())
    );
    if (existingVm) {
      const slots = [...existingVm.quotes];
      const fallback = makeDefaultVendorSlots();
      while (slots.length < 3) {
        slots.push(fallback[slots.length]);
      }
      setProductVendorQuotes(slots);
      setProductVendorNotes(existingVm.notes || '');
      setMatchedVendorEntryId(existingVm.id);
    } else {
      setProductVendorQuotes(makeDefaultVendorSlots());
      setProductVendorNotes('');
      setMatchedVendorEntryId(null);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setAuthError('');
    setImportError('');
    setPreloadedQuoteToConvert(null);

    if (initialProductToEdit) {
      setProductDraft({ ...initialProductToEdit });
      setSpecsText(initialProductToEdit.specs.join(', '));
      hydrateInlineVendorForProduct(initialProductToEdit);
    } else {
      setProductDraft(null);
      hydrateInlineVendorForProduct(null);
    }

    if (initialServiceToEdit) {
      setServiceDraft({ ...initialServiceToEdit });
    } else {
      setServiceDraft(null);
    }

    if (initialTestimonialToEdit) {
      setTestimonialDraft({ ...initialTestimonialToEdit });
    } else {
      setTestimonialDraft(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    initialTab,
    initialProductToEdit,
    initialServiceToEdit,
    initialTestimonialToEdit,
  ]);

  if (!isOpen) {
    return null;
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setVerifying(true);
    try {
      const ok = await onLogin(passcodeInput.trim());
      if (!ok) {
        setAuthError('Incorrect security passcode.');
      } else {
        setPasscodeInput('');
      }
    } finally {
      setVerifying(false);
    }
  }

  async function handleGoogleAuthClick() {
    setAuthError('');
    setGoogleLoading(true);
    try {
      const result = await onGoogleLogin();
      if (!result.ok && result.error) {
        setAuthError(result.error);
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  // Product handlers
  function startNewProduct() {
    setProductDraft({
      ...EMPTY_PRODUCT,
      id: `gear-${Date.now()}`,
    });
    setSpecsText('');
    hydrateInlineVendorForProduct(null);
  }

  function startEditProduct(p: GearProduct) {
    setProductDraft({ ...p });
    setSpecsText(p.specs.join(', '));
    hydrateInlineVendorForProduct(p);
  }

  function updateInlineVendorSlot(index: number, patch: Partial<VendorQuoteOption>) {
    setProductVendorQuotes((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  }

  async function saveProductDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!productDraft || !productDraft.name.trim()) return;

    const numericMap =
      typeof productDraft.mapPrice === 'number' &&
      Number.isFinite(productDraft.mapPrice) &&
      productDraft.mapPrice > 0
        ? productDraft.mapPrice
        : undefined;

    const cleanLabel = productDraft.priceLabel.trim();
    const resolvedPriceLabel =
      numericMap !== undefined && (!cleanLabel || cleanLabel === 'Best Price Quote')
        ? `${formatUsd(numericMap)} MAP`
        : cleanLabel || 'Best Price Quote';

    const prepared: GearProduct = {
      ...productDraft,
      itemNumber: productDraft.itemNumber?.trim() || productDraft.name.trim(),
      name: productDraft.name.trim(),
      brand: productDraft.brand.trim() || 'Pro Audio',
      mapPrice: numericMap,
      priceLabel: resolvedPriceLabel,
      descriptionEs: productDraft.descriptionEs.trim() || productDraft.descriptionEn.trim(),
      specs: specsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    const exists = siteContent.products.some((p) => p.id === prepared.id);
    const nextProducts = exists
      ? siteContent.products.map((p) => (p.id === prepared.id ? prepared : p))
      : [prepared, ...siteContent.products];

    onChangeContent({ ...siteContent, products: nextProducts });

    // Save private Vendor Master Sheet comparison entry if any supplier contact or pricing was entered
    const populatedVendorQuotes = productVendorQuotes.filter(
      (q) =>
        q.repName.trim() ||
        q.phone.trim() ||
        q.email.trim() ||
        q.unitCost > 0 ||
        q.shippingCost > 0 ||
        q.skuOrPartNo.trim()
    );
    if (populatedVendorQuotes.length > 0 || productVendorNotes.trim()) {
      const sortedPriced = populatedVendorQuotes
        .filter((q) => q.unitCost > 0)
        .sort((a, b) => getVendorLandedCost(a) - getVendorLandedCost(b));
      await onSaveVendorEntry({
        id: matchedVendorEntryId || `vm-${prepared.id}`,
        productId: prepared.id,
        productName: prepared.name,
        itemNumber: prepared.itemNumber || prepared.name,
        brand: prepared.brand,
        ...(prepared.mapPrice !== undefined ? { mapPrice: prepared.mapPrice } : {}),
        preferredVendor:
          sortedPriced[0]?.vendorName || populatedVendorQuotes[0]?.vendorName || '',
        notes: productVendorNotes.trim(),
        quotes: populatedVendorQuotes,
        updatedAt: new Date().toISOString(),
      });
    }

    setProductDraft(null);
  }

  // Service handlers
  function startNewService() {
    setServiceDraft({
      ...EMPTY_SERVICE,
      id: `svc-${Date.now()}`,
    });
  }

  function saveServiceDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceDraft || !serviceDraft.titleEn.trim()) return;

    const prepared: ServiceItem = {
      ...serviceDraft,
      titleEs: serviceDraft.titleEs.trim() || serviceDraft.titleEn.trim(),
      descriptionEs: serviceDraft.descriptionEs.trim() || serviceDraft.descriptionEn.trim(),
      deliverableEs: serviceDraft.deliverableEs.trim() || serviceDraft.deliverableEn.trim(),
    };

    const exists = siteContent.services.some((s) => s.id === prepared.id);
    const nextServices = exists
      ? siteContent.services.map((s) => (s.id === prepared.id ? prepared : s))
      : [...siteContent.services, prepared];

    onChangeContent({ ...siteContent, services: nextServices });
    setServiceDraft(null);
  }

  // Testimonial handlers
  function startNewTestimonial() {
    setTestimonialDraft({
      ...EMPTY_TESTIMONIAL,
      id: `test-${Date.now()}`,
    });
  }

  function saveTestimonialDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!testimonialDraft || !testimonialDraft.name.trim()) return;

    const prepared: TestimonialItem = {
      ...testimonialDraft,
      roleEs: testimonialDraft.roleEs.trim() || testimonialDraft.roleEn.trim(),
      quoteEs: testimonialDraft.quoteEs.trim() || testimonialDraft.quoteEn.trim(),
    };

    const exists = siteContent.testimonials.some((t) => t.id === prepared.id);
    const nextTestimonials = exists
      ? siteContent.testimonials.map((t) => (t.id === prepared.id ? prepared : t))
      : [prepared, ...siteContent.testimonials];

    onChangeContent({ ...siteContent, testimonials: nextTestimonials });
    setTestimonialDraft(null);
  }

  // Backup handlers
  function handleExportJson() {
    const blob = new Blob([JSON.stringify(siteContent, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eva-site-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as SiteContent;
      if (!parsed.brand || !Array.isArray(parsed.products) || !Array.isArray(parsed.sectionOrder)) {
        throw new Error('Invalid backup JSON file.');
      }
      onChangeContent(parsed);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import JSON backup.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-portal-title"
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-xl bg-white border border-stone-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#141518] text-white px-5 sm:px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-[#E0A446]" aria-hidden="true" />
            <h2 id="admin-portal-title" className="font-display text-base sm:text-lg font-bold">
              {isAdmin
                ? lang === 'en'
                  ? 'E.V.A — Admin CMS Studio & Lead Tracker'
                  : 'E.V.A — Panel Admin CMS y Clientes'
                : lang === 'en'
                  ? 'Sound Engineer Portal Login'
                  : 'Acceso al Portal del Ingeniero'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                {firebaseAdminEmail ? (
                  <span className="hidden sm:inline text-xs text-emerald-400 font-medium pr-2">
                    Firebase Connected ({firebaseAdminEmail})
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleAuthClick}
                    disabled={googleLoading}
                    className="px-3 py-1.5 rounded-md bg-[#C2842D] hover:bg-[#B07523] text-white text-xs font-semibold cursor-pointer"
                  >
                    {googleLoading ? 'Connecting...' : 'Sync with Google'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3 py-1.5 rounded-md border border-stone-700 text-xs font-medium text-stone-300 hover:text-white hover:border-stone-500 cursor-pointer"
                >
                  {lang === 'en' ? 'Log Out' : 'Salir'}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close portal"
              className="w-8 h-8 rounded-lg border border-stone-700 flex items-center justify-center text-stone-300 hover:text-white hover:bg-stone-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {!isAdmin ? (
          <div className="p-6 sm:p-10 max-w-md mx-auto w-full space-y-6">
            <div>
              <h3 className="font-display text-xl font-bold text-[#141518] mb-1">
                {lang === 'en' ? 'Authorized Engineer Access' : 'Acceso Autorizado'}
              </h3>
              <p className="text-sm text-stone-600">
                {lang === 'en'
                  ? 'Sign in with Google for live Firebase Firestore cloud sync, or use your engineer security passcode.'
                  : 'Inicie sesión con Google para sincronización en la nube Firebase o use su código de seguridad.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuthClick}
              disabled={googleLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#141518] hover:bg-[#272A30] disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {googleLoading
                ? 'Connecting Google Account...'
                : lang === 'en'
                  ? 'Sign in with Google (Firebase Cloud Sync)'
                  : 'Entrar con Google (Nube Firebase)'}
            </button>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-stone-200" />
              <span className="shrink mx-3 text-xs text-stone-400 uppercase">or</span>
              <div className="flex-grow border-t border-stone-200" />
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="admin-passcode-input" className="block text-xs font-semibold text-stone-700 mb-1.5">
                  {lang === 'en' ? 'Security Passcode' : 'Código de Seguridad'}
                </label>
                <input
                  id="admin-passcode-input"
                  type="password"
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  placeholder="Enter your security passcode"
                  className="w-full px-4 py-2.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#9A6315]"
                />
                {authError && <p className="text-xs text-red-600 mt-1.5">{authError}</p>}
              </div>

              <button
                type="submit"
                disabled={verifying || !passcodeInput.trim()}
                className="w-full py-2.5 rounded-lg bg-[#C2842D] hover:bg-[#B07523] disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {verifying ? 'Verifying...' : lang === 'en' ? 'Unlock Admin Studio' : 'Entrar al Panel'}
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="border-b border-stone-200 bg-[#F8F8F6] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'products', label: `Products (${siteContent.products.length})` },
                    { id: 'vendor-master', label: `Vendor Sheet (${vendorEntries.length})` },
                    { id: 'customer-orders', label: `Order Sheet (${customerOrders.length})` },
                    { id: 'leads', label: `Estimates & Leads (${quotes.length})` },
                    { id: 'layout', label: 'Move Sections' },
                    { id: 'hero-pricing', label: 'Hero & Pricing' },
                    { id: 'services', label: `Services (${siteContent.services.length})` },
                    { id: 'testimonials', label: `Reviews (${siteContent.testimonials.length})` },
                    { id: 'backup', label: 'Backup' },
                  ] as Array<{ id: AdminTabId; label: string }>
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === t.id
                        ? 'bg-[#141518] text-white'
                        : 'text-stone-700 hover:bg-stone-200/70'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onToggleEditMode}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  adminEditMode
                    ? 'bg-[#C2842D] text-white'
                    : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {adminEditMode ? 'On-Page Edit: ON' : 'On-Page Edit: OFF'}
              </button>
            </div>

            {/* Scrollable Tab Content */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: PRODUCTS & PHOTOS */}
              {activeTab === 'products' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-bold text-[#141518]">
                        Manage Products, Photos &amp; Prices
                      </h3>
                      <p className="text-xs text-stone-600">
                        Add new gear, upload photos from your device, edit prices, or move items up and down. Changes save immediately.
                      </p>
                    </div>
                    {!productDraft && (
                      <button
                        type="button"
                        onClick={startNewProduct}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C2842D] hover:bg-[#B07523] text-white text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add New Product</span>
                      </button>
                    )}
                  </div>

                  {productDraft && (
                    <form
                      onSubmit={saveProductDraft}
                      className="rounded-xl border border-[#C2842D]/50 bg-[#F8F8F6] p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-display text-base font-bold text-[#141518]">
                          {siteContent.products.some((p) => p.id === productDraft.id)
                            ? `Editing: ${productDraft.name}`
                            : 'Add New Pro Audio / Lighting Product'}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setProductDraft(null)}
                          className="text-xs text-stone-600 hover:text-[#141518] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <AdminImagePicker
                        label="Product Photo"
                        value={productDraft.imageUrl}
                        onChange={(url) => setProductDraft({ ...productDraft, imageUrl: url })}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Product Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={productDraft.name}
                            onChange={(e) =>
                              setProductDraft({ ...productDraft, name: e.target.value })
                            }
                            placeholder="e.g. QSC K12.2"
                            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Item # / SKU
                          </label>
                          <input
                            type="text"
                            value={productDraft.itemNumber ?? ''}
                            onChange={(e) =>
                              setProductDraft({ ...productDraft, itemNumber: e.target.value })
                            }
                            placeholder="e.g. QSC K12.2"
                            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Brand
                          </label>
                          <input
                            type="text"
                            value={productDraft.brand}
                            onChange={(e) =>
                              setProductDraft({ ...productDraft, brand: e.target.value })
                            }
                            placeholder="e.g. QSC / JBL / Shure"
                            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Category
                          </label>
                          <select
                            value={productDraft.category}
                            onChange={(e) =>
                              setProductDraft({
                                ...productDraft,
                                category: e.target.value as Exclude<GearCategory, 'all'>,
                              })
                            }
                            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                          >
                            <option value="speakers">Speakers &amp; Subs</option>
                            <option value="mics">Wireless &amp; Wired Mics + Stands</option>
                            <option value="consoles">Mixers &amp; Digital Consoles</option>
                            <option value="cables">Stageboxes, XLR, DI, Power &amp; Racks</option>
                            <option value="iem">In-Ear Monitors</option>
                            <option value="combiners">RF Combiners &amp; Antennas</option>
                            <option value="lighting">Moving Lights, Wash &amp; DMX</option>
                            <option value="rigging">Truss &amp; Speaker Hanging Rigs</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            MAP Price ($ USD)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={productDraft.mapPrice ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const parsed = raw === '' ? undefined : Number(raw);
                              setProductDraft({
                                ...productDraft,
                                mapPrice:
                                  parsed !== undefined && Number.isFinite(parsed)
                                    ? parsed
                                    : undefined,
                              });
                            }}
                            placeholder="e.g. 999.99 (blank = Quote only)"
                            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Display Price / Quote Label
                          </label>
                          <input
                            type="text"
                            value={productDraft.priceLabel}
                            onChange={(e) =>
                              setProductDraft({ ...productDraft, priceLabel: e.target.value })
                            }
                            placeholder="e.g. $999.99 MAP or Best Price Quote"
                            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Price Note
                          </label>
                          <input
                            type="text"
                            value={productDraft.priceNote}
                            onChange={(e) =>
                              setProductDraft({ ...productDraft, priceNote: e.target.value })
                            }
                            placeholder="e.g. Beats Sweetwater & Guitar Center"
                            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Key Specs (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={specsText}
                            onChange={(e) => setSpecsText(e.target.value)}
                            placeholder="e.g. 40 Channels, 25 Buses, Midas Preamps"
                            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Description (English)
                          </label>
                          <textarea
                            rows={2}
                            value={productDraft.descriptionEn}
                            onChange={(e) =>
                              setProductDraft({ ...productDraft, descriptionEn: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Description (Spanish — optional)
                          </label>
                          <textarea
                            rows={2}
                            value={productDraft.descriptionEs}
                            onChange={(e) =>
                              setProductDraft({ ...productDraft, descriptionEs: e.target.value })
                            }
                            placeholder="Defaults to English if left blank"
                            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Inline Private Vendor Sourcing Sheet (Admin Only) */}
                      <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#9A6315]">
                              Private Vendor Sourcing &amp; 3-Supplier Price Comparison (Admin Only)
                            </p>
                            <p className="text-[11px] text-stone-600">
                              Optional: enter where to order this product (phone, email, rep &amp; cost) to save directly to your Master Vendor Sheet.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {productVendorQuotes.map((vq, idx) => (
                            <div
                              key={vq.id}
                              className="rounded-lg border border-stone-200 bg-[#F8F8F6] p-3 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-[#141518]">
                                  Supplier #{idx + 1}
                                </span>
                                {getVendorLandedCost(vq) > 0 && (
                                  <span className="font-mono text-[11px] font-bold text-emerald-700">
                                    {formatUsd(getVendorLandedCost(vq))}
                                  </span>
                                )}
                              </div>
                              <input
                                type="text"
                                value={vq.vendorName}
                                onChange={(e) =>
                                  updateInlineVendorSlot(idx, { vendorName: e.target.value })
                                }
                                placeholder="Place name (e.g. Sweetwater Pro)"
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-md"
                              />
                              <div className="grid grid-cols-2 gap-1.5">
                                <input
                                  type="text"
                                  value={vq.repName}
                                  onChange={(e) =>
                                    updateInlineVendorSlot(idx, { repName: e.target.value })
                                  }
                                  placeholder="Rep name"
                                  className="w-full px-2 py-1 text-xs bg-white border border-stone-300 rounded-md"
                                />
                                <input
                                  type="text"
                                  value={vq.phone}
                                  onChange={(e) =>
                                    updateInlineVendorSlot(idx, { phone: e.target.value })
                                  }
                                  placeholder="Phone #"
                                  className="w-full px-2 py-1 text-xs bg-white border border-stone-300 rounded-md"
                                />
                              </div>
                              <input
                                type="email"
                                value={vq.email}
                                onChange={(e) =>
                                  updateInlineVendorSlot(idx, { email: e.target.value })
                                }
                                placeholder="Order email"
                                className="w-full px-2.5 py-1 text-xs bg-white border border-stone-300 rounded-md"
                              />
                              <div className="grid grid-cols-2 gap-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={vq.unitCost || ''}
                                  onChange={(e) =>
                                    updateInlineVendorSlot(idx, {
                                      unitCost: Number(e.target.value) || 0,
                                    })
                                  }
                                  placeholder="Cost $"
                                  className="w-full px-2 py-1 text-xs font-mono bg-white border border-stone-300 rounded-md"
                                />
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={vq.shippingCost || ''}
                                  onChange={(e) =>
                                    updateInlineVendorSlot(idx, {
                                      shippingCost: Number(e.target.value) || 0,
                                    })
                                  }
                                  placeholder="Ship $"
                                  className="w-full px-2 py-1 text-xs font-mono bg-white border border-stone-300 rounded-md"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <input
                          type="text"
                          value={productVendorNotes}
                          onChange={(e) => setProductVendorNotes(e.target.value)}
                          placeholder="Private vendor buying notes (account #, minimum freight threshold, etc.)..."
                          className="w-full px-3 py-1.5 text-xs bg-[#F8F8F6] border border-stone-200 rounded-md"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-stone-700">
                          <input
                            type="checkbox"
                            checked={productDraft.inStock}
                            onChange={(e) =>
                              setProductDraft({ ...productDraft, inStock: e.target.checked })
                            }
                          />
                          <span>Available / In Stock</span>
                        </label>

                        <button
                          type="submit"
                          className="px-5 py-2 rounded-lg bg-[#141518] hover:bg-[#272A30] text-white text-xs font-semibold cursor-pointer"
                        >
                          Save Product
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Product Rows */}
                  <div className="space-y-2.5">
                    {siteContent.products.map((product, idx) => (
                      <div
                        key={product.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-stone-200 bg-white"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-16 h-12 rounded-lg overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                            <SafeImage
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-display text-sm font-bold text-[#141518] truncate">
                              {product.name}
                            </p>
                            <p className="text-xs text-stone-500">
                              {product.brand} · {product.category} ·{' '}
                              <span className="font-mono font-semibold text-[#9A6315]">
                                {product.priceLabel}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onChangeContent({
                                ...siteContent,
                                products: moveItemInArray(siteContent.products, idx, 'up'),
                              })
                            }
                            disabled={idx === 0}
                            aria-label={`Move ${product.name} up`}
                            className="p-1.5 rounded border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-35 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onChangeContent({
                                ...siteContent,
                                products: moveItemInArray(siteContent.products, idx, 'down'),
                              })
                            }
                            disabled={idx === siteContent.products.length - 1}
                            aria-label={`Move ${product.name} down`}
                            className="p-1.5 rounded border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-35 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditProduct(product)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-stone-900 text-white text-xs font-semibold hover:bg-stone-700 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onChangeContent({
                                ...siteContent,
                                products: siteContent.products.filter((p) => p.id !== product.id),
                              })
                            }
                            aria-label={`Delete ${product.name}`}
                            className="p-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: MOVE SECTIONS & LAYOUT */}
              {activeTab === 'layout' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-bold text-[#141518]">
                        Rearrange Website Sections
                      </h3>
                      <p className="text-xs text-stone-600">
                        Move any section up or down to change the order customers see on your homepage, or hide sections temporarily.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeContent({
                          ...siteContent,
                          sectionOrder: DEFAULT_SITE_CONTENT.sectionOrder,
                          hiddenSections: [],
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Order</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {siteContent.sectionOrder.map((secId, idx) => {
                      const isHidden = siteContent.hiddenSections.includes(secId);
                      const label = SECTION_LABELS[secId];
                      return (
                        <div
                          key={secId}
                          className={`flex items-center justify-between gap-4 p-4 rounded-xl border ${
                            isHidden
                              ? 'border-stone-200 bg-stone-100 opacity-70'
                              : 'border-stone-200 bg-white'
                          }`}
                        >
                          <div>
                            <p className="font-display text-sm font-bold text-[#141518]">
                              {idx + 1}. {lang === 'en' ? label.en : label.es}
                            </p>
                            <p className="text-xs text-stone-500">
                              {isHidden ? 'Hidden from visitors' : 'Visible on homepage'}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                onChangeContent({
                                  ...siteContent,
                                  sectionOrder: moveItemInArray(
                                    siteContent.sectionOrder,
                                    idx,
                                    'up'
                                  ),
                                })
                              }
                              disabled={idx === 0}
                              aria-label={`Move ${label.en} up`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-35 cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                              <span>Up</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                onChangeContent({
                                  ...siteContent,
                                  sectionOrder: moveItemInArray(
                                    siteContent.sectionOrder,
                                    idx,
                                    'down'
                                  ),
                                })
                              }
                              disabled={idx === siteContent.sectionOrder.length - 1}
                              aria-label={`Move ${label.en} down`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-35 cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                              <span>Down</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const nextHidden = isHidden
                                  ? siteContent.hiddenSections.filter((s) => s !== secId)
                                  : [...siteContent.hiddenSections, secId];
                                onChangeContent({ ...siteContent, hiddenSections: nextHidden });
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                            >
                              {isHidden ? (
                                <>
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Show</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>Hide</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: HERO, CONTACT & PRICING */}
              {activeTab === 'hero-pricing' && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-5 space-y-4">
                    <h3 className="font-display text-base font-bold text-[#141518]">
                      Business Contact &amp; Hero Banner
                    </h3>

                    <AdminImagePicker
                      label="Hero Sanctuary / Console Photo"
                      value={siteContent.hero.imageUrl}
                      onChange={(url) =>
                        onChangeContent({
                          ...siteContent,
                          hero: { ...siteContent.hero, imageUrl: url },
                        })
                      }
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Phone Display
                        </label>
                        <input
                          type="text"
                          value={siteContent.brand.phoneDisplay}
                          onChange={(e) =>
                            onChangeContent({
                              ...siteContent,
                              brand: { ...siteContent.brand, phoneDisplay: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={siteContent.brand.email}
                          onChange={(e) =>
                            onChangeContent({
                              ...siteContent,
                              brand: { ...siteContent.brand, email: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Hero Headline (English)
                        </label>
                        <input
                          type="text"
                          value={siteContent.hero.headlineEn}
                          onChange={(e) =>
                            onChangeContent({
                              ...siteContent,
                              hero: { ...siteContent.hero, headlineEn: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Hero Headline (Spanish)
                        </label>
                        <input
                          type="text"
                          value={siteContent.hero.headlineEs}
                          onChange={(e) =>
                            onChangeContent({
                              ...siteContent,
                              hero: { ...siteContent.hero, headlineEs: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Hero Subheadline (English)
                      </label>
                      <textarea
                        rows={2}
                        value={siteContent.hero.subheadlineEn}
                        onChange={(e) =>
                          onChangeContent({
                            ...siteContent,
                            hero: { ...siteContent.hero, subheadlineEn: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-5 space-y-4">
                    <h3 className="font-display text-base font-bold text-[#141518]">
                      Subscription &amp; Hourly Service Rates
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Weekly Plan ($/wk)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={siteContent.pricing.weeklyRate}
                          onChange={(e) => {
                            const weeklyRate = Number(e.target.value) || 0;
                            onChangeContent({
                              ...siteContent,
                              pricing: {
                                ...siteContent.pricing,
                                weeklyRate,
                                monthlyEquivalent: weeklyRate * 4,
                              },
                            });
                          }}
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Hourly Rate ($/hr)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={siteContent.pricing.standaloneHourlyRate}
                          onChange={(e) =>
                            onChangeContent({
                              ...siteContent,
                              pricing: {
                                ...siteContent.pricing,
                                standaloneHourlyRate: Number(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Min Hours
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={siteContent.pricing.standaloneMinHours}
                          onChange={(e) =>
                            onChangeContent({
                              ...siteContent,
                              pricing: {
                                ...siteContent.pricing,
                                standaloneMinHours: Number(e.target.value) || 1,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Re-EQ Every (Months)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={siteContent.pricing.reEqIntervalMonths}
                          onChange={(e) =>
                            onChangeContent({
                              ...siteContent,
                              pricing: {
                                ...siteContent.pricing,
                                reEqIntervalMonths: Number(e.target.value) || 1,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SERVICES */}
              {activeTab === 'services' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold text-[#141518]">
                      Edit Services &amp; Photos
                    </h3>
                    {!serviceDraft && (
                      <button
                        type="button"
                        onClick={startNewService}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C2842D] hover:bg-[#B07523] text-white text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Service</span>
                      </button>
                    )}
                  </div>

                  {serviceDraft && (
                    <form
                      onSubmit={saveServiceDraft}
                      className="rounded-xl border border-[#C2842D]/50 bg-[#F8F8F6] p-5 space-y-4"
                    >
                      <AdminImagePicker
                        label="Service Photo"
                        value={serviceDraft.imageUrl}
                        onChange={(url) => setServiceDraft({ ...serviceDraft, imageUrl: url })}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Title (English) *
                          </label>
                          <input
                            type="text"
                            required
                            value={serviceDraft.titleEn}
                            onChange={(e) =>
                              setServiceDraft({ ...serviceDraft, titleEn: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Deliverable Tag
                          </label>
                          <input
                            type="text"
                            value={serviceDraft.deliverableEn}
                            onChange={(e) =>
                              setServiceDraft({ ...serviceDraft, deliverableEn: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Description (English)
                        </label>
                        <textarea
                          rows={2}
                          value={serviceDraft.descriptionEn}
                          onChange={(e) =>
                            setServiceDraft({ ...serviceDraft, descriptionEn: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setServiceDraft(null)}
                          className="px-4 py-2 rounded-lg border border-stone-300 text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-lg bg-[#141518] text-white text-xs font-semibold cursor-pointer"
                        >
                          Save Service
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2.5">
                    {siteContent.services.map((svc, idx) => (
                      <div
                        key={svc.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-stone-200 bg-white"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-16 h-12 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                            <SafeImage
                              src={svc.imageUrl}
                              alt={svc.titleEn}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-display text-sm font-bold text-[#141518] truncate">
                              {svc.titleEn}
                            </p>
                            <p className="text-xs text-stone-500 truncate">{svc.deliverableEn}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onChangeContent({
                                ...siteContent,
                                services: moveItemInArray(siteContent.services, idx, 'up'),
                              })
                            }
                            disabled={idx === 0}
                            className="p-1.5 rounded border border-stone-200 disabled:opacity-35 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onChangeContent({
                                ...siteContent,
                                services: moveItemInArray(siteContent.services, idx, 'down'),
                              })
                            }
                            disabled={idx === siteContent.services.length - 1}
                            className="p-1.5 rounded border border-stone-200 disabled:opacity-35 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setServiceDraft({ ...svc })}
                            className="px-2.5 py-1.5 rounded bg-stone-900 text-white text-xs font-semibold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onChangeContent({
                                ...siteContent,
                                services: siteContent.services.filter((s) => s.id !== svc.id),
                              })
                            }
                            className="p-1.5 rounded border border-red-200 text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: TESTIMONIALS */}
              {activeTab === 'testimonials' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold text-[#141518]">
                      Client Testimonials
                    </h3>
                    {!testimonialDraft && (
                      <button
                        type="button"
                        onClick={startNewTestimonial}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C2842D] text-white text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Testimonial</span>
                      </button>
                    )}
                  </div>

                  {testimonialDraft && (
                    <form
                      onSubmit={saveTestimonialDraft}
                      className="rounded-xl border border-[#C2842D]/50 bg-[#F8F8F6] p-5 space-y-4"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Client Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={testimonialDraft.name}
                            onChange={(e) =>
                              setTestimonialDraft({ ...testimonialDraft, name: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Organization / Church
                          </label>
                          <input
                            type="text"
                            value={testimonialDraft.organization}
                            onChange={(e) =>
                              setTestimonialDraft({
                                ...testimonialDraft,
                                organization: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Role
                          </label>
                          <input
                            type="text"
                            value={testimonialDraft.roleEn}
                            onChange={(e) =>
                              setTestimonialDraft({ ...testimonialDraft, roleEn: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Category
                          </label>
                          <select
                            value={testimonialDraft.category}
                            onChange={(e) =>
                              setTestimonialDraft({
                                ...testimonialDraft,
                                category: e.target.value as Exclude<TestimonialCategory, 'all'>,
                              })
                            }
                            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                          >
                            <option value="church">Church / Sanctuary</option>
                            <option value="corporate">Corporate Event</option>
                            <option value="ministry">Special Ministry</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Outcome Metric
                          </label>
                          <input
                            type="text"
                            value={testimonialDraft.outcomeMetric}
                            onChange={(e) =>
                              setTestimonialDraft({
                                ...testimonialDraft,
                                outcomeMetric: e.target.value,
                              })
                            }
                            placeholder="e.g. Zero Feedback in 12 Months"
                            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Gear / Service Context
                          </label>
                          <input
                            type="text"
                            value={testimonialDraft.gearContext}
                            onChange={(e) =>
                              setTestimonialDraft({
                                ...testimonialDraft,
                                gearContext: e.target.value,
                              })
                            }
                            placeholder="e.g. Behringer X32 · $50/wk Plan"
                            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Quote (English)
                        </label>
                        <textarea
                          rows={2}
                          value={testimonialDraft.quoteEn}
                          onChange={(e) =>
                            setTestimonialDraft({ ...testimonialDraft, quoteEn: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setTestimonialDraft(null)}
                          className="px-4 py-2 rounded-lg border border-stone-300 text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-lg bg-[#141518] text-white text-xs font-semibold cursor-pointer"
                        >
                          Save Testimonial
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2.5">
                    {siteContent.testimonials.map((t, idx) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-stone-200 bg-white"
                      >
                        <div className="min-w-0">
                          <p className="font-display text-sm font-bold text-[#141518]">
                            {t.name} · <span className="font-normal text-stone-600">{t.organization}</span>
                          </p>
                          <p className="text-xs text-[#9A6315] font-mono">{t.outcomeMetric}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onChangeContent({
                                ...siteContent,
                                testimonials: moveItemInArray(siteContent.testimonials, idx, 'up'),
                              })
                            }
                            disabled={idx === 0}
                            className="p-1.5 rounded border border-stone-200 disabled:opacity-35 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onChangeContent({
                                ...siteContent,
                                testimonials: moveItemInArray(
                                  siteContent.testimonials,
                                  idx,
                                  'down'
                                ),
                              })
                            }
                            disabled={idx === siteContent.testimonials.length - 1}
                            className="p-1.5 rounded border border-stone-200 disabled:opacity-35 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTestimonialDraft({ ...t })}
                            className="px-2.5 py-1.5 rounded bg-stone-900 text-white text-xs font-semibold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onChangeContent({
                                ...siteContent,
                                testimonials: siteContent.testimonials.filter((x) => x.id !== t.id),
                              })
                            }
                            className="p-1.5 rounded border border-red-200 text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 1B: MASTER VENDOR SHEET */}
              {activeTab === 'vendor-master' && (
                <AdminVendorMasterTab
                  entries={vendorEntries}
                  loading={vendorLoading}
                  products={siteContent.products}
                  onSaveEntry={onSaveVendorEntry}
                  onDeleteEntry={onDeleteVendorEntry}
                />
              )}

              {/* TAB 1C: CUSTOMER WORKING ORDER SHEET */}
              {activeTab === 'customer-orders' && (
                <AdminCustomerOrdersTab
                  orders={customerOrders}
                  loading={ordersLoading}
                  products={siteContent.products}
                  quotes={quotes}
                  vendorEntries={vendorEntries}
                  preloadedQuoteToConvert={preloadedQuoteToConvert}
                  onClearPreloadedQuote={() => setPreloadedQuoteToConvert(null)}
                  onSaveOrder={onSaveCustomerOrder}
                  onDeleteOrder={onDeleteCustomerOrder}
                />
              )}

              {/* TAB 6: CUSTOMER LEADS */}
              {activeTab === 'leads' && (
                <AdminLeadsTab
                  quotes={quotes}
                  loading={quotesLoading}
                  products={siteContent.products}
                  brand={siteContent.brand}
                  onCreateEstimate={onCreateEstimate}
                  onUpdateQuote={onUpdateQuote}
                  onDeleteQuote={onDeleteQuote}
                  onOpenOrderSheet={(q) => {
                    setPreloadedQuoteToConvert(q);
                    setActiveTab('customer-orders');
                  }}
                />
              )}

              {/* TAB 7: BACKUP & EXPORT */}
              {activeTab === 'backup' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#141518]">
                      Site Content Backup &amp; Restore
                    </h3>
                    <p className="text-xs text-stone-600">
                      Download a JSON backup of all your products, photos, prices, and section order—or restore defaults anytime.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleExportJson}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#141518] text-white text-xs font-semibold cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Site Backup (JSON)</span>
                    </button>

                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-stone-300 bg-white text-[#141518] text-xs font-semibold hover:bg-stone-50 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>Restore from JSON File</span>
                      <input
                        type="file"
                        accept="application/json"
                        onChange={handleImportJson}
                        className="sr-only"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => onChangeContent(DEFAULT_SITE_CONTENT)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 text-red-700 bg-red-50/50 text-xs font-semibold hover:bg-red-50 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset All Content to Defaults</span>
                    </button>
                  </div>

                  {importError && <p className="text-xs text-red-600">{importError}</p>}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
