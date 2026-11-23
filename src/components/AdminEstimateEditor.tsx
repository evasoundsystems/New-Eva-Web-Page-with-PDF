import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import type {
  BrandConfig,
  EstimateLineItem,
  GearProduct,
  PaymentProcessingMethod,
  QuoteRecord,
  QuoteStatus,
  QuoteSubmissionInput,
  QuoteUpdateInput,
  VendorMasterEntry,
} from '../types/site';
import {
  buildDefaultCoverLetter,
  calculateEstimateTotals,
  compareVendorQuotes,
  formatUsd,
  generateRefCode,
  parseEstimateItemsFromNotes,
} from '../utils/siteLogic';
import {
  buildEstimateEmailHref,
  buildEstimateSmsHref,
  downloadEstimatePdf,
} from '../utils/estimatePdf';

interface AdminEstimateEditorProps {
  initialQuote: QuoteRecord | null;
  products: readonly GearProduct[];
  vendorEntries?: readonly VendorMasterEntry[];
  brand: BrandConfig;
  onCancel: () => void;
  onSaveNew: (
    payload: QuoteSubmissionInput & QuoteUpdateInput
  ) => Promise<QuoteRecord | null>;
  onSaveExisting: (id: string, updates: QuoteUpdateInput) => Promise<QuoteRecord | null>;
}

export function AdminEstimateEditor({
  initialQuote,
  products,
  vendorEntries = [],
  brand,
  onCancel,
  onSaveNew,
  onSaveExisting,
}: AdminEstimateEditorProps) {
  const [savedRecord, setSavedRecord] = useState<QuoteRecord | null>(initialQuote);
  const [previewRefCode] = useState(() => initialQuote?.refCode || generateRefCode());

  const [status, setStatus] = useState<QuoteStatus>(initialQuote?.status || 'new');
  const [contactName, setContactName] = useState(initialQuote?.contactName || '');
  const [organization, setOrganization] = useState(initialQuote?.organization || '');
  const [phone, setPhone] = useState(initialQuote?.phone || '');
  const [email, setEmail] = useState(initialQuote?.email || '');
  const [serviceRequested, setServiceRequested] = useState(
    initialQuote?.serviceRequested || 'Pro Audio Equipment & Installation Estimate'
  );
  const [soundboardModel, setSoundboardModel] = useState(initialQuote?.soundboardModel || '');
  const [roomCapacity, setRoomCapacity] = useState(initialQuote?.roomCapacity || '');
  const [timeline, setTimeline] = useState(initialQuote?.timeline || '');
  const [notes, setNotes] = useState(initialQuote?.notes || '');
  const [engineerNotes, setEngineerNotes] = useState(initialQuote?.engineerNotes || '');

  const [items, setItems] = useState<EstimateLineItem[]>(() => {
    if (initialQuote?.estimateItems && initialQuote.estimateItems.length > 0) {
      return initialQuote.estimateItems.map((it) => ({ ...it }));
    }
    if (initialQuote?.notes) {
      return parseEstimateItemsFromNotes(initialQuote.notes, products);
    }
    return [];
  });

  const [discount, setDiscount] = useState<number>(initialQuote?.discount ?? 0);
  const [shippingFee, setShippingFee] = useState<number>(initialQuote?.shippingFee ?? 0);
  const [taxRate, setTaxRate] = useState<number>(initialQuote?.taxRate ?? 0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentProcessingMethod>(
    initialQuote?.paymentMethod || 'none'
  );
  const [processingFeeRate, setProcessingFeeRate] = useState<number>(
    initialQuote?.processingFeeRate ?? 0
  );

  const initialTotals = useMemo(
    () =>
      calculateEstimateTotals(
        items,
        discount,
        shippingFee,
        taxRate,
        processingFeeRate
      ),
    [items, discount, shippingFee, taxRate, processingFeeRate]
  );

  const [coverLetter, setCoverLetter] = useState<string>(() => {
    if (initialQuote?.coverLetter) return initialQuote.coverLetter;
    return buildDefaultCoverLetter(
      {
        contactName: initialQuote?.contactName || '',
        organization: initialQuote?.organization || '',
        refCode: initialQuote?.refCode || previewRefCode,
        serviceRequested:
          initialQuote?.serviceRequested || 'Pro Audio Equipment & Installation',
      },
      brand,
      calculateEstimateTotals(
        initialQuote?.estimateItems && initialQuote.estimateItems.length > 0
          ? initialQuote.estimateItems
          : initialQuote?.notes
            ? parseEstimateItemsFromNotes(initialQuote.notes, products)
            : [],
        initialQuote?.discount ?? 0,
        initialQuote?.shippingFee ?? 0,
        initialQuote?.taxRate ?? 0,
        initialQuote?.processingFeeRate ?? 0
      )
    );
  });

  // Catalog picker state
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(() => products[0]?.id || '');
  const [catalogQty, setCatalogQty] = useState<number>(1);

  // Custom item quick-add state
  const [customSku, setCustomSku] = useState('');
  const [customBrand, setCustomBrand] = useState('Custom / Service');
  const [customDesc, setCustomDesc] = useState('');
  const [customQty, setCustomQty] = useState<number>(1);
  const [customPrice, setCustomPrice] = useState<string>('');

  const [showLetterPreview, setShowLetterPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const hay = `${p.itemNumber || ''} ${p.name} ${p.brand} ${p.descriptionEn}`.toLowerCase();
      return hay.includes(q);
    });
  }, [products, catalogSearch]);

  const activeCatalogSelection = useMemo(() => {
    return (
      filteredCatalog.find((p) => p.id === selectedCatalogId) ||
      filteredCatalog[0] ||
      products[0]
    );
  }, [filteredCatalog, selectedCatalogId, products]);

  const draftRecord: QuoteRecord = useMemo(
    () => ({
      id: savedRecord?.id || 'draft',
      refCode: savedRecord?.refCode || previewRefCode,
      createdAt: savedRecord?.createdAt || new Date().toISOString(),
      status,
      organization,
      contactName: contactName || 'Valued Client',
      phone: phone || brand.phoneDisplay,
      email,
      serviceRequested: serviceRequested || 'Pro Audio Equipment & Installation',
      soundboardModel,
      roomCapacity,
      timeline,
      notes,
      engineerNotes,
      estimateItems: items,
      discount,
      shippingFee,
      taxRate,
      processingFeeRate,
      paymentMethod,
      coverLetter,
      estimateUpdatedAt: new Date().toISOString(),
    }),
    [
      savedRecord,
      previewRefCode,
      status,
      organization,
      contactName,
      phone,
      brand.phoneDisplay,
      email,
      serviceRequested,
      soundboardModel,
      roomCapacity,
      timeline,
      notes,
      engineerNotes,
      items,
      discount,
      shippingFee,
      taxRate,
      processingFeeRate,
      paymentMethod,
      coverLetter,
    ]
  );

  function findBestVendorCost(product: GearProduct): number | undefined {
    const skuLower = (product.itemNumber || product.name).trim().toLowerCase();
    const vm = vendorEntries.find(
      (entry) =>
        entry.productId === product.id ||
        (skuLower && entry.itemNumber.toLowerCase() === skuLower)
    );
    if (!vm) return undefined;
    const cmp = compareVendorQuotes(vm.quotes, product.mapPrice ?? vm.mapPrice);
    return cmp.bestLandedCost > 0 ? cmp.bestLandedCost : undefined;
  }

  function handleAddCatalogProduct() {
    if (!activeCatalogSelection) return;
    const sku = activeCatalogSelection.itemNumber || activeCatalogSelection.name;
    const mapPrice =
      typeof activeCatalogSelection.mapPrice === 'number' &&
      activeCatalogSelection.mapPrice > 0
        ? activeCatalogSelection.mapPrice
        : undefined;
    const unitPrice = mapPrice ?? 0;
    const dealerCost = findBestVendorCost(activeCatalogSelection);

    setItems((prev) => [
      ...prev,
      {
        id: `est-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: activeCatalogSelection.id,
        itemNumber: sku,
        brand: activeCatalogSelection.brand,
        description: activeCatalogSelection.descriptionEn || activeCatalogSelection.name,
        qty: Math.max(1, catalogQty || 1),
        unitPrice,
        ...(mapPrice !== undefined ? { mapPrice } : {}),
        ...(dealerCost !== undefined ? { dealerCost } : {}),
      },
    ]);
    setCatalogQty(1);
  }

  function buildPendingCustomItem(): EstimateLineItem | null {
    const cleanSku = customSku.trim() || customDesc.trim();
    if (!cleanSku) return null;
    const parsedPrice = Number.parseFloat(customPrice);
    const validPrice = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0;
    return {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      itemNumber: cleanSku,
      brand: customBrand.trim() || 'Custom / Labor',
      description: customDesc.trim() || cleanSku,
      qty: Math.max(1, customQty || 1),
      unitPrice: validPrice,
      ...(validPrice > 0 ? { mapPrice: validPrice } : {}),
    };
  }

  function resetCustomInputs() {
    setCustomSku('');
    setCustomDesc('');
    setCustomQty(1);
    setCustomPrice('');
  }

  function handleAddCustomProduct() {
    const nextItem = buildPendingCustomItem();
    if (!nextItem) {
      setErrorMessage('Enter a manual product name or service description before adding.');
      return;
    }
    setErrorMessage('');
    setItems((prev) => [...prev, nextItem]);
    resetCustomInputs();
  }

  function handleCustomKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomProduct();
    }
  }

  function updateLineItem(id: string, patch: Partial<EstimateLineItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeLineItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function handleRegenerateLetter() {
    setCoverLetter(
      buildDefaultCoverLetter(
        {
          contactName,
          organization,
          refCode: draftRecord.refCode,
          serviceRequested,
        },
        brand,
        initialTotals
      )
    );
  }

  function flushPendingItems(): EstimateLineItem[] {
    const pending = buildPendingCustomItem();
    if (!pending) return items;
    const nextItems = [...items, pending];
    setItems(nextItems);
    resetCustomInputs();
    return nextItems;
  }

  async function persistEstimate(
    targetStatus?: QuoteStatus,
    overrideItems?: EstimateLineItem[]
  ): Promise<QuoteRecord | null> {
    setErrorMessage('');
    const cleanName = contactName.trim();
    const cleanPhone = phone.trim();
    if (!cleanName || cleanPhone.replace(/\D/g, '').length < 7) {
      setErrorMessage('Customer Name and a valid 7+ digit Phone Number are required to save.');
      return null;
    }

    const activeItems = overrideItems ?? flushPendingItems();

    const nextStatus = targetStatus || status;
    if (targetStatus) {
      setStatus(targetStatus);
    }

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const payload: QuoteUpdateInput = {
        status: nextStatus,
        organization: organization.trim(),
        contactName: cleanName,
        phone: cleanPhone,
        email: email.trim(),
        serviceRequested: serviceRequested.trim() || 'Pro Audio Estimate',
        soundboardModel: soundboardModel.trim(),
        roomCapacity: roomCapacity.trim(),
        timeline: timeline.trim(),
        notes: notes.trim(),
        engineerNotes,
        estimateItems: activeItems,
        discount,
        shippingFee,
        taxRate,
        processingFeeRate,
        paymentMethod,
        coverLetter,
        estimateUpdatedAt: nowIso,
      };

      let result: QuoteRecord | null = null;
      if (savedRecord?.id) {
        result = await onSaveExisting(savedRecord.id, payload);
      } else {
        result = await onSaveNew({
          organization: organization.trim(),
          contactName: cleanName,
          phone: cleanPhone,
          email: email.trim(),
          serviceRequested: serviceRequested.trim() || 'Pro Audio Estimate',
          soundboardModel: soundboardModel.trim(),
          roomCapacity: roomCapacity.trim(),
          timeline: timeline.trim(),
          notes: notes.trim(),
          ...payload,
        });
      }

      if (result) {
        setSavedRecord(result);
        setFeedbackMessage(
          nextStatus === 'completed'
            ? 'Estimate saved & marked Completed (still editable anytime).'
            : 'Estimate saved to customer record.'
        );
        setTimeout(() => setFeedbackMessage(''), 3500);
        return result;
      }
      return null;
    } finally {
      setSaving(false);
    }
  }

  function applyPaymentPreset(method: PaymentProcessingMethod, rate: number) {
    setPaymentMethod(method);
    setProcessingFeeRate(rate);
  }

  async function handleSaveAndDownloadPdf() {
    const activeItems = flushPendingItems();
    const computedTotals = calculateEstimateTotals(
      activeItems,
      discount,
      shippingFee,
      taxRate,
      processingFeeRate
    );
    const activeDraft: QuoteRecord = {
      ...draftRecord,
      estimateItems: activeItems,
    };

    if (contactName.trim() && phone.replace(/\D/g, '').length >= 7) {
      const saved = await persistEstimate(undefined, activeItems);
      downloadEstimatePdf(saved || activeDraft, brand, computedTotals);
      return;
    }
    downloadEstimatePdf(activeDraft, brand, computedTotals);
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-stone-200">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-xs font-semibold text-[#141518] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Leads</span>
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-mono font-semibold text-[#9A6315] truncate">
              {savedRecord ? `EDITING ESTIMATE · ${draftRecord.refCode}` : `NEW ESTIMATE · ${draftRecord.refCode}`}
            </p>
            <h3 className="font-display text-base sm:text-lg font-bold text-[#141518] truncate">
              {contactName.trim() || 'New Customer Estimate'}
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <label htmlFor="est-status" className="text-xs font-semibold text-stone-600">
            Status:
          </label>
          <select
            id="est-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as QuoteStatus)}
            className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-stone-300 rounded-lg text-[#141518]"
          >
            <option value="new">New Lead</option>
            <option value="contacted">In Contact</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
          </select>

          <button
            type="button"
            onClick={() => persistEstimate()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#141518] hover:bg-[#272A30] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{saving ? 'Saving...' : 'Save Estimate'}</span>
          </button>

          <button
            type="button"
            onClick={() => persistEstimate('completed')}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Mark Completed</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndDownloadPdf}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#C2842D] hover:bg-[#B07523] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Download as PDF</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700">
          {errorMessage}
        </div>
      )}
      {feedbackMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          {feedbackMessage}
        </div>
      )}

      {/* 1. Customer & Project Info */}
      <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-4 sm:p-5 space-y-4">
        <h4 className="font-display text-sm font-bold text-[#141518]">
          1. Customer &amp; Project Information
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="est-name" className="block text-xs font-semibold text-stone-700 mb-1">
              Customer Name *
            </label>
            <input
              id="est-name"
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Pastor / Client Name"
              className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="est-org" className="block text-xs font-semibold text-stone-700 mb-1">
              Church / Organization
            </label>
            <input
              id="est-org"
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Church or Venue"
              className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="est-phone" className="block text-xs font-semibold text-stone-700 mb-1">
              Phone *
            </label>
            <input
              id="est-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(414) 555-0199"
              className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="est-email" className="block text-xs font-semibold text-stone-700 mb-1">
              Email
            </label>
            <input
              id="est-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@church.org"
              className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="est-service" className="block text-xs font-semibold text-stone-700 mb-1">
              Project / Estimate Title *
            </label>
            <input
              id="est-service"
              type="text"
              value={serviceRequested}
              onChange={(e) => setServiceRequested(e.target.value)}
              placeholder="e.g. Sanctuary Wireless Mics & Behringer WING Package"
              className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="est-console" className="block text-xs font-semibold text-stone-700 mb-1">
              Console / Model
            </label>
            <input
              id="est-console"
              type="text"
              value={soundboardModel}
              onChange={(e) => setSoundboardModel(e.target.value)}
              placeholder="e.g. Behringer WING"
              className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="est-capacity" className="block text-xs font-semibold text-stone-700 mb-1">
              Room Size / Timeline
            </label>
            <input
              id="est-capacity"
              type="text"
              value={roomCapacity}
              onChange={(e) => setRoomCapacity(e.target.value)}
              placeholder="e.g. 350 seats · Next month"
              className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* 2. Add Products & Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Catalog Product Picker */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
          <h4 className="font-display text-sm font-bold text-[#141518]">
            2A. Add Product from Catalog (Editable Price)
          </h4>
          <input
            type="search"
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            placeholder="Filter catalog (e.g. Shure SLXD, Sennheiser, WING, RCF, QSC)..."
            aria-label="Filter catalog products for estimate"
            className="w-full px-3 py-2 text-xs bg-[#F8F8F6] border border-stone-300 rounded-lg"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              aria-label="Select catalog product"
              value={activeCatalogSelection?.id || ''}
              onChange={(e) => setSelectedCatalogId(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg"
            >
              {filteredCatalog.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand} · {p.itemNumber || p.name}{' '}
                  {typeof p.mapPrice === 'number' && p.mapPrice > 0
                    ? `(${formatUsd(p.mapPrice)} MAP)`
                    : '(Custom Quote)'}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={catalogQty}
              onChange={(e) => setCatalogQty(Math.max(1, Number(e.target.value) || 1))}
              aria-label="Catalog product quantity"
              className="w-16 px-2.5 py-2 text-xs font-mono text-center bg-white border border-stone-300 rounded-lg"
            />
            <button
              type="button"
              onClick={handleAddCatalogProduct}
              disabled={!activeCatalogSelection}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#141518] hover:bg-[#272A30] disabled:opacity-40 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Manual Product / Price / Labor / Service Adder */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-2.5 min-w-0">
          <h4 className="font-display text-sm font-bold text-[#141518]">
            2B. Add Manual Product, Custom Price, Labor or Fee
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={customSku}
              onChange={(e) => setCustomSku(e.target.value)}
              onKeyDown={handleCustomKeyDown}
              placeholder="Manual Product / Service Name *"
              aria-label="Manual product or service name"
              className="w-full min-w-0 px-3 py-2 text-xs bg-[#F8F8F6] border border-stone-300 rounded-lg"
            />
            <input
              type="text"
              value={customBrand}
              onChange={(e) => setCustomBrand(e.target.value)}
              onKeyDown={handleCustomKeyDown}
              placeholder="Brand or Category (e.g. Install Labor)"
              aria-label="Manual product brand or category"
              className="w-full min-w-0 px-3 py-2 text-xs bg-[#F8F8F6] border border-stone-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-12 gap-2 items-center">
            <input
              type="text"
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              onKeyDown={handleCustomKeyDown}
              placeholder="Description (e.g. Full Sanctuary Rigging & EQ)"
              aria-label="Manual product description"
              className="col-span-12 sm:col-span-6 w-full min-w-0 px-3 py-2 text-xs bg-[#F8F8F6] border border-stone-300 rounded-lg"
            />
            <input
              type="number"
              min={1}
              value={customQty}
              onChange={(e) => setCustomQty(Math.max(1, Number(e.target.value) || 1))}
              onKeyDown={handleCustomKeyDown}
              aria-label="Manual item quantity"
              className="col-span-3 sm:col-span-2 w-full min-w-0 px-2 py-2 text-xs font-mono text-center bg-white border border-stone-300 rounded-lg"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              onKeyDown={handleCustomKeyDown}
              placeholder="Price $"
              aria-label="Manual item unit price"
              className="col-span-4 sm:col-span-2 w-full min-w-0 px-2 py-2 text-xs font-mono bg-white border border-stone-300 rounded-lg"
            />
            <button
              type="button"
              onClick={handleAddCustomProduct}
              className="col-span-5 sm:col-span-2 w-full inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-[#C2842D] hover:bg-[#B07523] text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Line Items & Pricing Editor */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <div className="px-4 py-3 bg-[#F8F8F6] border-b border-stone-200 flex items-center justify-between">
          <h4 className="font-display text-sm font-bold text-[#141518]">
            3. Estimate Line Items ({items.length}) — Edit Your Quoted Dealer Price Directly
          </h4>
          <span className="font-mono text-xs font-bold text-[#9A6315]">
            Total: {formatUsd(initialTotals.total)}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-500">
            No line items added yet. Pick gear from the catalog above or add custom products / labor.
          </div>
        ) : (
          <div className="divide-y divide-stone-200">
            {items.map((item) => {
              const qty = Math.max(1, item.qty);
              const lineTotal = qty * Math.max(0, item.unitPrice);
              const hasMap = typeof item.mapPrice === 'number' && item.mapPrice > 0;
              const rowSavingsVsMap = hasMap ? (item.mapPrice! - item.unitPrice) * qty : 0;
              const hasCost = typeof item.dealerCost === 'number' && item.dealerCost > 0;
              const rowGain = hasCost ? (item.unitPrice - item.dealerCost!) * qty : null;

              return (
                <div key={item.id} className="p-3 sm:px-4 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                        SKU / Model
                      </label>
                      <input
                        type="text"
                        value={item.itemNumber}
                        onChange={(e) => updateLineItem(item.id, { itemNumber: e.target.value })}
                        aria-label="Line item SKU or title"
                        className="w-full px-2.5 py-1.5 text-xs font-semibold bg-[#F8F8F6] border border-stone-300 rounded-md"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                        Description (Printed)
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                        aria-label="Line item description"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-md"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                        Qty
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) =>
                          updateLineItem(item.id, {
                            qty: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        aria-label="Line item quantity"
                        className="w-full px-2 py-1.5 text-xs font-mono text-center bg-white border border-stone-300 rounded-md"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                        MAP Price ($)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.mapPrice ?? ''}
                        onChange={(e) => {
                          const v = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0);
                          updateLineItem(item.id, { mapPrice: v });
                        }}
                        placeholder="MAP"
                        aria-label="Line item MAP price"
                        className="w-full px-2 py-1.5 text-xs font-mono bg-[#F8F8F6] border border-stone-300 rounded-md text-stone-700"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-amber-800 mb-0.5">
                        Your Cost ($ Private)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.dealerCost ?? ''}
                        onChange={(e) => {
                          const v = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0);
                          updateLineItem(item.id, { dealerCost: v });
                        }}
                        placeholder="Vendor Cost"
                        aria-label="Line item private dealer cost"
                        className="w-full px-2 py-1.5 text-xs font-mono bg-amber-50/70 border border-amber-300 rounded-md text-amber-950"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-end gap-1.5">
                      <div className="flex-1 min-w-0">
                        <label className="block text-[10px] font-semibold text-emerald-800 mb-0.5">
                          Cust. Price ($)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateLineItem(item.id, {
                              unitPrice: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          aria-label="Line item customer estimate price"
                          className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-white border border-emerald-400 rounded-md"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        aria-label={`Remove ${item.itemNumber}`}
                        className="p-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Under-Item Shipping & Card Processing Fee Strip (kept strictly underneath item) */}
                  <div className="rounded-lg bg-[#F8F8F6] border border-stone-200 px-3 py-2 flex flex-wrap items-center justify-between gap-3 text-[11px]">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label
                          htmlFor={`est-ship-${item.id}`}
                          className="font-semibold text-stone-700 whitespace-nowrap"
                        >
                          Product Shipping ($):
                        </label>
                        <input
                          id={`est-ship-${item.id}`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.shippingCost ?? ''}
                          onChange={(e) => {
                            const v =
                              e.target.value === ''
                                ? undefined
                                : Math.max(0, Number(e.target.value) || 0);
                            updateLineItem(item.id, { shippingCost: v });
                          }}
                          placeholder="0.00"
                          className="w-24 px-2 py-1 text-xs font-mono bg-white border border-stone-300 rounded"
                        />
                      </div>

                      <label className="inline-flex items-center gap-1.5 text-stone-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={item.applyProcessingFee !== false}
                          onChange={(e) =>
                            updateLineItem(item.id, { applyProcessingFee: e.target.checked })
                          }
                          className="rounded border-stone-300 text-[#9A6315]"
                        />
                        <span>Apply Card Fee (%)</span>
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-stone-600">
                      {hasMap && (
                        <span>
                          MAP Line: <strong className="font-mono">{formatUsd(item.mapPrice! * qty)}</strong>
                        </span>
                      )}
                      {rowSavingsVsMap > 0.01 && (
                        <span className="font-semibold text-emerald-700">
                          Customer Saves vs MAP: {formatUsd(rowSavingsVsMap)}
                        </span>
                      )}
                      {rowGain !== null && (
                        <span
                          className={`font-mono font-bold ${
                            rowGain >= 0 ? 'text-amber-800' : 'text-red-700'
                          }`}
                        >
                          Private Gain: {rowGain >= 0 ? '+' : ''}
                          {formatUsd(rowGain)}
                        </span>
                      )}
                      <span className="font-mono text-xs font-bold text-[#141518]">
                        Item Price: {formatUsd(lineTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Private Engineer Comparison: Separated Product Cost vs Shipping vs Total Cost & Gain */}
        <div className="px-4 py-3.5 bg-[#141518] text-white border-t border-stone-800">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#E0A446]">
              Private Engineer Cost Separation, Shipping &amp; MAP Margin (Cost &amp; Net Gain NEVER print on Customer PDF)
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-stone-400">Public Retail MAP</p>
              <p className="font-mono text-sm font-bold text-white">
                {formatUsd(initialTotals.mapTotal)}
              </p>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-stone-400">
                Cust. Equipment
              </p>
              <p className="font-mono text-sm font-bold text-[#E0A446]">
                {formatUsd(initialTotals.taxableAmount)}
              </p>
              {initialTotals.savingsVsMap > 0.01 && (
                <p className="text-[10px] text-emerald-300 font-semibold">
                  -{formatUsd(initialTotals.savingsVsMap)} vs MAP
                </p>
              )}
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-stone-400">
                Product Cost (Private)
              </p>
              <p className="font-mono text-sm font-bold text-amber-300">
                {initialTotals.hasCostBasis ? formatUsd(initialTotals.totalDealerCost) : 'Enter cost'}
              </p>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-stone-400">
                Total Shipping
              </p>
              <p className="font-mono text-sm font-bold text-sky-300">
                {formatUsd(initialTotals.totalShipping)}
              </p>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-stone-400">
                Total Cost (Prod + Ship)
              </p>
              <p className="font-mono text-sm font-bold text-white">
                {formatUsd(initialTotals.totalLandedCost)}
              </p>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-stone-400">
                Your Net Gain (Private)
              </p>
              <p
                className={`font-mono text-sm font-bold ${
                  initialTotals.netGainProfit === null
                    ? 'text-stone-300'
                    : initialTotals.netGainProfit >= 0
                      ? 'text-emerald-400'
                      : 'text-red-400'
                }`}
              >
                {initialTotals.netGainProfit !== null
                  ? `${initialTotals.netGainProfit >= 0 ? '+' : ''}${formatUsd(
                      initialTotals.netGainProfit
                    )}`
                  : '—'}
              </p>
              {initialTotals.grossMarginPercent !== null && (
                <p className="text-[10px] text-emerald-300 font-mono">
                  {initialTotals.grossMarginPercent}% margin
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Adjustments, Adjustable Tax, Bluevine/Stripe Processing Fee & Totals */}
        <div className="p-4 bg-[#F8F8F6] border-t border-stone-200 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-7 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="est-discount" className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Package Discount ($)
                </label>
                <input
                  id="est-discount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="est-shipping" className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Extra Freight Shipping ($)
                </label>
                <input
                  id="est-shipping"
                  type="number"
                  min={0}
                  step="0.01"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="est-tax" className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Sales Tax (%) — Adjustable
                </label>
                <input
                  id="est-tax"
                  type="number"
                  min={0}
                  max={30}
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Math.max(0, Math.min(30, Number(e.target.value) || 0)))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-stone-300 rounded-lg"
                />
              </div>
            </div>

            <div className="rounded-lg border border-stone-200 bg-white p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#141518]">
                  Payment Method &amp; Processing Fee (Bluevine / Stripe / Credit Card)
                </span>
                <span className="text-[11px] font-mono font-semibold text-[#9A6315]">
                  {formatUsd(initialTotals.processingFeeAmount)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyPaymentPreset('none', 0)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold border cursor-pointer ${
                    paymentMethod === 'none' || processingFeeRate === 0
                      ? 'bg-[#141518] text-white border-[#141518]'
                      : 'bg-[#F8F8F6] text-stone-700 border-stone-300'
                  }`}
                >
                  Cash / Check / ACH (0%)
                </button>
                <button
                  type="button"
                  onClick={() => applyPaymentPreset('stripe', 2.9)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold border cursor-pointer ${
                    paymentMethod === 'stripe'
                      ? 'bg-[#141518] text-white border-[#141518]'
                      : 'bg-[#F8F8F6] text-stone-700 border-stone-300'
                  }`}
                >
                  Stripe (2.9%)
                </button>
                <button
                  type="button"
                  onClick={() => applyPaymentPreset('bluevine', 3.0)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold border cursor-pointer ${
                    paymentMethod === 'bluevine'
                      ? 'bg-[#141518] text-white border-[#141518]'
                      : 'bg-[#F8F8F6] text-stone-700 border-stone-300'
                  }`}
                >
                  Bluevine / Credit Card (3.0%)
                </button>
                <div className="flex items-center gap-1.5 ml-auto">
                  <label htmlFor="est-fee-rate" className="text-[11px] font-semibold text-stone-700">
                    Fee %:
                  </label>
                  <input
                    id="est-fee-rate"
                    type="number"
                    min={0}
                    max={15}
                    step="0.1"
                    value={processingFeeRate}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(15, Number(e.target.value) || 0));
                      setProcessingFeeRate(val);
                      setPaymentMethod(val === 0 ? 'none' : 'custom');
                    }}
                    className="w-20 px-2 py-1 text-xs font-mono bg-white border border-stone-300 rounded"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-lg bg-white border border-stone-200 p-3.5 space-y-1.5 text-xs">
            {initialTotals.savingsVsMap > 0.01 && (
              <div className="flex justify-between text-stone-500">
                <span>Retail MAP Reference:</span>
                <span className="font-mono line-through">{formatUsd(initialTotals.mapTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-700">
              <span>Product &amp; Labor Subtotal:</span>
              <span className="font-mono font-semibold">{formatUsd(initialTotals.subtotal)}</span>
            </div>
            {initialTotals.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Package Discount:</span>
                <span className="font-mono font-semibold">-{formatUsd(initialTotals.discount)}</span>
              </div>
            )}
            {initialTotals.savingsVsMap > 0.01 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Customer Saves vs MAP:</span>
                <span className="font-mono">
                  -{formatUsd(initialTotals.savingsVsMap)} ({initialTotals.savingsPercentVsMap}%)
                </span>
              </div>
            )}
            <div className="flex justify-between text-stone-700">
              <span>
                Total Shipping
                {initialTotals.itemsShippingTotal > 0 && initialTotals.extraShippingFee > 0
                  ? ` (${formatUsd(initialTotals.itemsShippingTotal)} items + ${formatUsd(
                      initialTotals.extraShippingFee
                    )} freight)`
                  : ''}
                :
              </span>
              <span className="font-mono font-semibold">{formatUsd(initialTotals.totalShipping)}</span>
            </div>
            <div className="flex justify-between text-stone-700">
              <span>Sales Tax ({taxRate}%):</span>
              <span className="font-mono font-semibold">{formatUsd(initialTotals.taxAmount)}</span>
            </div>
            {initialTotals.processingFeeAmount > 0 && (
              <div className="flex justify-between text-stone-700">
                <span>
                  {paymentMethod === 'bluevine'
                    ? 'Bluevine Card Fee'
                    : paymentMethod === 'stripe'
                      ? 'Stripe Card Fee'
                      : 'Processing Fee'}{' '}
                  ({processingFeeRate}%):
                </span>
                <span className="font-mono font-semibold">
                  {formatUsd(initialTotals.processingFeeAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 mt-1 border-t border-stone-200 text-sm font-bold text-[#141518]">
              <span>Final Customer Total:</span>
              <span className="font-mono text-[#9A6315]">{formatUsd(initialTotals.total)}</span>
            </div>
            <div className="pt-2 mt-1.5 border-t border-dashed border-stone-200 text-[11px] text-amber-900 space-y-0.5">
              <div className="flex justify-between">
                <span>Private Product Cost (No Shipping):</span>
                <span className="font-mono font-semibold">
                  {formatUsd(initialTotals.totalDealerCost)}
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Private Total Cost (Product + Ship):</span>
                <span className="font-mono">{formatUsd(initialTotals.totalLandedCost)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Customer Proposal Letter & Notes */}
      <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-display text-sm font-bold text-[#141518]">
              4. Cover Letter for PDF &amp; Customer Email
            </h4>
            <p className="text-xs text-stone-600">
              This personal letter appears at the top of the PDF estimate and pre-fills your email to the customer.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRegenerateLetter}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-xs font-semibold text-[#141518] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Refresh Letter Template</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLetterPreview((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-xs font-semibold text-[#141518] cursor-pointer"
            >
              {showLetterPreview ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Hide Preview</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Preview Letter</span>
                </>
              )}
            </button>
          </div>
        </div>

        <textarea
          rows={6}
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          aria-label="Customer estimate cover letter"
          className="w-full px-3.5 py-2.5 text-xs bg-white border border-stone-300 rounded-lg font-sans leading-relaxed"
        />

        <div>
          <label htmlFor="est-eng-notes" className="block text-xs font-semibold text-stone-700 mb-1">
            Private Engineer Notes (Not printed on customer PDF)
          </label>
          <input
            id="est-eng-notes"
            type="text"
            value={engineerNotes}
            onChange={(e) => setEngineerNotes(e.target.value)}
            placeholder="Internal notes, dealer cost margin reminders, install dates..."
            className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg"
          />
        </div>

        {showLetterPreview && (
          <div className="rounded-xl border border-stone-300 bg-white p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-2 border-[#C2842D]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#9A6315]">
                  {brand.name} · {brand.companyFull}
                </p>
                <p className="text-xs text-stone-600">
                  {brand.leadEngineer} · {brand.phoneDisplay} · {brand.email}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs font-bold text-[#141518]">{draftRecord.refCode}</p>
                <p className="text-[11px] text-stone-500">
                  Total: {formatUsd(initialTotals.total)}
                </p>
              </div>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-xs text-stone-800 leading-relaxed">
              {coverLetter}
            </pre>
          </div>
        )}
      </div>

      {/* Bottom Save & Send Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-200">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={buildEstimateEmailHref(draftRecord, brand, initialTotals)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-xs font-semibold text-[#141518]"
          >
            <Mail className="w-3.5 h-3.5 text-[#9A6315]" aria-hidden="true" />
            <span>Send Letter by Email</span>
          </a>
          <a
            href={buildEstimateSmsHref(draftRecord, brand, initialTotals)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-xs font-semibold text-[#141518]"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#9A6315]" aria-hidden="true" />
            <span>Text Total to Customer</span>
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => persistEstimate()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#141518] hover:bg-[#272A30] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Save Estimate</span>
          </button>
          <button
            type="button"
            onClick={() => persistEstimate('completed')}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Complete &amp; Save</span>
          </button>
          <button
            type="button"
            onClick={handleSaveAndDownloadPdf}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C2842D] hover:bg-[#B07523] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Save &amp; Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
