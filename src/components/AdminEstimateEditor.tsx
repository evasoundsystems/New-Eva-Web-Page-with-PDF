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
  QuoteRecord,
  QuoteStatus,
  QuoteSubmissionInput,
  QuoteUpdateInput,
} from '../types/site';
import {
  buildDefaultCoverLetter,
  calculateEstimateTotals,
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

  const initialTotals = useMemo(
    () => calculateEstimateTotals(items, discount, shippingFee, taxRate),
    [items, discount, shippingFee, taxRate]
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
        initialQuote?.taxRate ?? 0
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
      coverLetter,
    ]
  );

  function handleAddCatalogProduct() {
    if (!activeCatalogSelection) return;
    const sku = activeCatalogSelection.itemNumber || activeCatalogSelection.name;
    const unitPrice =
      typeof activeCatalogSelection.mapPrice === 'number' &&
      activeCatalogSelection.mapPrice > 0
        ? activeCatalogSelection.mapPrice
        : 0;

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
      },
    ]);
    setCatalogQty(1);
  }

  function buildPendingCustomItem(): EstimateLineItem | null {
    const cleanSku = customSku.trim() || customDesc.trim();
    if (!cleanSku) return null;
    const parsedPrice = Number.parseFloat(customPrice);
    return {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      itemNumber: cleanSku,
      brand: customBrand.trim() || 'Custom / Labor',
      description: customDesc.trim() || cleanSku,
      qty: Math.max(1, customQty || 1),
      unitPrice: Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0,
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

  async function handleSaveAndDownloadPdf() {
    const activeItems = flushPendingItems();
    const computedTotals = calculateEstimateTotals(
      activeItems,
      discount,
      shippingFee,
      taxRate
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
              const lineTotal = Math.max(1, item.qty) * Math.max(0, item.unitPrice);
              return (
                <div
                  key={item.id}
                  className="p-3 sm:px-4 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center"
                >
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={item.itemNumber}
                      onChange={(e) => updateLineItem(item.id, { itemNumber: e.target.value })}
                      aria-label="Line item SKU or title"
                      className="w-full px-2.5 py-1.5 text-xs font-semibold bg-[#F8F8F6] border border-stone-300 rounded-md"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                      aria-label="Line item description"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-md"
                    />
                  </div>
                  <div className="md:col-span-1">
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
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                        $
                      </span>
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
                        aria-label="Line item unit price"
                        className="w-full pl-5 pr-2 py-1.5 text-xs font-mono bg-white border border-stone-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-2">
                    <span className="font-mono text-xs font-bold text-[#141518]">
                      {formatUsd(lineTotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      aria-label={`Remove ${item.itemNumber}`}
                      className="p-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Adjustments & Totals */}
        <div className="p-4 bg-[#F8F8F6] border-t border-stone-200 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="est-discount" className="block text-[11px] font-semibold text-stone-700 mb-1">
                Discount ($)
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
                Shipping ($)
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
                Tax (%)
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

          <div className="rounded-lg bg-white border border-stone-200 p-3 space-y-1 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">{formatUsd(initialTotals.subtotal)}</span>
            </div>
            {initialTotals.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Package Discount:</span>
                <span className="font-mono font-semibold">-{formatUsd(initialTotals.discount)}</span>
              </div>
            )}
            {initialTotals.taxAmount > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Tax ({taxRate}%):</span>
                <span className="font-mono font-semibold">{formatUsd(initialTotals.taxAmount)}</span>
              </div>
            )}
            {initialTotals.shippingFee > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Shipping / Delivery:</span>
                <span className="font-mono font-semibold">{formatUsd(initialTotals.shippingFee)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 mt-1 border-t border-stone-200 text-sm font-bold text-[#141518]">
              <span>Final Estimate Total:</span>
              <span className="font-mono text-[#9A6315]">{formatUsd(initialTotals.total)}</span>
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
