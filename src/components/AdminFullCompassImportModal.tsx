import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FileText,
  FolderPlus,
  Image as ImageIcon,
  Loader2,
  PackagePlus,
  Plus,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import type {
  CatalogCategoryConfig,
  GearCategory,
  GearProduct,
  VendorMasterEntry,
} from '../types/site';
import { createCustomCategoryEntry } from '../utils/catalogCategories';
import {
  applyFullCompassCategoryOverrides,
  buildGearProductFromFullCompass,
  getBulkCategoryOptions,
  getGearCategoryLabel,
  mergeVendorEntryWithSupplierImport,
  parseSupplierBulkList,
  slugifyCatalogId,
  type BulkImportSupplierSource,
  type FullCompassTargetCategory,
} from '../utils/fullCompassParser';
import { resolveProductPhotosBatch } from '../services/apiClient';
import { formatUsd } from '../utils/siteLogic';

interface AdminFullCompassImportModalProps {
  isOpen: boolean;
  initialSupplier?: BulkImportSupplierSource;
  onClose: () => void;
  existingProducts: readonly GearProduct[];
  existingVendorEntries: readonly VendorMasterEntry[];
  customCategories?: readonly CatalogCategoryConfig[];
  onCreateCategory?: (category: CatalogCategoryConfig) => Promise<void> | void;
  adminPasscode: string;
  onCompleteImport: (
    nextProducts: GearProduct[],
    vendorEntriesToSave: VendorMasterEntry[]
  ) => Promise<void>;
}

const CATEGORY_FALLBACK_IMAGE: Record<string, string> = {
  consoles: 'asset:console',
  dj: 'https://cdn.shopify.com/s/files/1/0687/4667/4285/files/djm-a9_prm_top_221223.png?v=1792521420',
  speakers: 'asset:sanctuary-wide',
  mics: 'asset:shure-mic',
  iem: 'asset:iem',
  combiners:
    'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/116565_RF-Venue-COMBINE8-Transmitter-Combiner.jpg?v=1768866197',
  lighting: 'asset:lighting',
  rigging: 'asset:line-array',
  cables: 'asset:rack-wiring',
  cases: 'asset:rack-wiring',
};

const SUPPLIER_META: Record<
  BulkImportSupplierSource,
  {
    slotNumber: string;
    name: string;
    shortName: string;
    tagline: string;
    pasteLabel: string;
    placeholder: string;
    privacyDetail: string;
    costColumnLabel: string;
  }
> = {
  sweetwater: {
    slotNumber: 'Supplier #1',
    name: 'Sweetwater Pro',
    shortName: 'Sweetwater',
    tagline: 'Catalog pages, Sweetwater Pro quotes, or spreadsheets → Slot #1',
    pasteLabel: 'Step 2 — Paste Sweetwater Product List or Pro Quote Below (No Item Limit)',
    placeholder: `Paste directly from Sweetwater.com search/category results OR a tab-separated Sweetwater Pro quote, e.g.:\nQSC K12.2 2000W 12-inch Powered Speaker\n2000W 12" Powered Speaker with DSP\n$999.99\nOr $42/month for 24 months\nIn Stock!\nFree Shipping\n\n— OR Tab-Separated Pro Quote —\nShure SM58-LC\tCardioid Dynamic Vocal Microphone\tCost: $74.00\tMAP: $99.00\tIn Stock`,
    privacyDetail:
      'Customers only ever see Manufacturer MAP Price (or Best Price Quote) + In Stock / Wait Time. Any Sweetwater Pro dealer cost is saved privately inside Supplier #1 (Sweetwater Pro) without overwriting Supplier #2 (Full Compass).',
    costColumnLabel: 'Sweetwater Cost (#1)',
  },
  fullcompass: {
    slotNumber: 'Supplier #2',
    name: 'Full Compass',
    shortName: 'Full Compass',
    tagline: 'Full Compass List View copy-paste (Your Cost + List + MAP) → Slot #2',
    pasteLabel: 'Step 2 — Paste Full Compass List View Text Below (No Item Limit)',
    placeholder: `Paste directly from Full Compass List View, e.g.:\nSennheiser EW-D-ASA (Q-R-S) Active Antenna Splitter...\nSennheiser EW-D-ASA (Q-R-S)\nActive Antenna Splitter for EW-D Receivers\n$548.03\nList Price: $829.00\n699.00\nIn Stock\n1\nAdd to Cart`,
    privacyDetail:
      'Customers only ever see Manufacturer MAP Price (or Best Price Quote) + In Stock / Wait Time. Your Full Compass wholesale cost & List Price are saved privately inside Supplier #2 (Full Compass) without overwriting Supplier #1 (Sweetwater Pro).',
    costColumnLabel: 'Full Compass Cost (#2)',
  },
};

function normalizeSkuKey(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function AdminFullCompassImportModal({
  isOpen,
  initialSupplier = 'fullcompass',
  onClose,
  existingProducts,
  existingVendorEntries,
  customCategories,
  onCreateCategory,
  adminPasscode,
  onCompleteImport,
}: AdminFullCompassImportModalProps) {
  const [supplierSource, setSupplierSource] =
    useState<BulkImportSupplierSource>(initialSupplier);
  const [rawText, setRawText] = useState('');
  const [targetCategory, setTargetCategory] = useState<FullCompassTargetCategory>('auto');
  const [rowCategoryOverrides, setRowCategoryOverrides] = useState<
    Record<string, Exclude<GearCategory, 'all'>>
  >({});
  const [showNewCatBox, setShowNewCatBox] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatHint, setNewCatHint] = useState('');
  const [newCatError, setNewCatError] = useState('');
  const [savingNewCat, setSavingNewCat] = useState(false);
  const [fetchPhotos, setFetchPhotos] = useState(true);
  const [importing, setImporting] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categoryOptions = useMemo(
    () => getBulkCategoryOptions(customCategories),
    [customCategories]
  );

  async function handleQuickCreateCategory() {
    if (!onCreateCategory) return;
    setNewCatError('');
    const { category, error } = createCustomCategoryEntry(
      { labelEn: newCatName, hint: newCatHint },
      customCategories
    );
    if (!category || error) {
      setNewCatError(error || 'Enter a valid category name.');
      return;
    }
    setSavingNewCat(true);
    try {
      await onCreateCategory(category);
      setTargetCategory(category.id);
      setRowCategoryOverrides({});
      setNewCatName('');
      setNewCatHint('');
      setShowNewCatBox(false);
    } finally {
      setSavingNewCat(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      setSupplierSource(initialSupplier);
      setImportError('');
    }
  }, [isOpen, initialSupplier]);

  const supplierMeta = SUPPLIER_META[supplierSource];

  const parsedItems = useMemo(() => {
    if (!rawText.trim()) return [];
    const base = parseSupplierBulkList(rawText, supplierSource, targetCategory);
    return applyFullCompassCategoryOverrides(base, rowCategoryOverrides);
  }, [rawText, supplierSource, targetCategory, rowCategoryOverrides]);

  function handleSelectSupplier(nextSupplier: BulkImportSupplierSource) {
    if (nextSupplier === supplierSource) return;
    setSupplierSource(nextSupplier);
    setRowCategoryOverrides({});
    setImportError('');
  }

  function handleSelectTargetCategory(nextCat: FullCompassTargetCategory) {
    setTargetCategory(nextCat);
    setRowCategoryOverrides({});
  }

  const existingBySku = useMemo(() => {
    const map = new Map<string, GearProduct>();
    for (const p of existingProducts) {
      const k1 = normalizeSkuKey(p.itemNumber || p.name);
      const k2 = normalizeSkuKey(p.name);
      if (k1) map.set(k1, p);
      if (k2) map.set(k2, p);
    }
    return map;
  }, [existingProducts]);

  const existingVendorByKey = useMemo(() => {
    const map = new Map<string, VendorMasterEntry>();
    for (const vm of existingVendorEntries) {
      if (vm.productId) map.set(vm.productId, vm);
      const k = normalizeSkuKey(vm.itemNumber || vm.productName);
      if (k) map.set(`sku:${k}`, vm);
    }
    return map;
  }, [existingVendorEntries]);

  const stats = useMemo(() => {
    let inStockCount = 0;
    let waitTimeCount = 0;
    let matchedExisting = 0;
    let brandNew = 0;
    let pricedCostCount = 0;
    for (const item of parsedItems) {
      if (item.inStock) inStockCount += 1;
      else waitTimeCount += 1;
      if (item.dealerCost && item.dealerCost > 0) pricedCostCount += 1;
      const key = normalizeSkuKey(item.itemNumber);
      if (existingBySku.has(key)) matchedExisting += 1;
      else brandNew += 1;
    }
    return {
      total: parsedItems.length,
      inStockCount,
      waitTimeCount,
      matchedExisting,
      brandNew,
      pricedCostCount,
    };
  }, [parsedItems, existingBySku]);

  if (!isOpen) return null;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setRawText((prev) => (prev.trim() ? `${prev}\n${text}` : text));
      setImportError('');
    } catch {
      setImportError('Could not read the selected text file.');
    } finally {
      e.target.value = '';
    }
  }

  async function handleRunImport() {
    if (parsedItems.length === 0 || importing) return;
    setImporting(true);
    setImportError('');
    setProgressLabel(
      `Preparing products and ${supplierMeta.slotNumber} (${supplierMeta.name}) pricing...`
    );

    try {
      const itemsNeedingPhotos: Array<{ key: string; brand: string; itemNumber: string }> = [];
      for (const item of parsedItems) {
        const skuKey = normalizeSkuKey(item.itemNumber);
        const existing = existingBySku.get(skuKey);
        if (!existing) {
          itemsNeedingPhotos.push({
            key: skuKey,
            brand: item.brand,
            itemNumber: item.itemNumber,
          });
        }
      }

      let resolvedPhotos: Record<string, string> = {};
      if (fetchPhotos && itemsNeedingPhotos.length > 0 && adminPasscode) {
        const BATCH_SIZE = 30;
        for (let i = 0; i < itemsNeedingPhotos.length; i += BATCH_SIZE) {
          const chunk = itemsNeedingPhotos.slice(i, i + BATCH_SIZE);
          setProgressLabel(
            `Fetching real product photos (${Math.min(i + chunk.length, itemsNeedingPhotos.length)} / ${itemsNeedingPhotos.length})...`
          );
          const batchPhotos = await resolveProductPhotosBatch(chunk, adminPasscode);
          Object.assign(resolvedPhotos, batchPhotos);
        }
      }

      setProgressLabel(
        `Merging catalog products (MAP-only) & ${supplierMeta.slotNumber} (${supplierMeta.name}) records...`
      );

      const productMap = new Map<string, GearProduct>();
      for (const p of existingProducts) {
        productMap.set(p.id, p);
      }

      const newlyAddedProducts: GearProduct[] = [];
      const vendorEntriesToSave: VendorMasterEntry[] = [];
      const todayIsoDate = new Date().toISOString().slice(0, 10);

      for (const item of parsedItems) {
        const skuKey = normalizeSkuKey(item.itemNumber);
        const existing = existingBySku.get(skuKey);

        let targetProductId: string;
        if (existing) {
          targetProductId = existing.id;
          const hasMap = typeof item.mapPrice === 'number' && item.mapPrice > 0;
          const explicitCategoryPicked =
            targetCategory !== 'auto' || Boolean(rowCategoryOverrides[item.itemNumber]);
          const updatedProduct: GearProduct = {
            ...existing,
            ...(explicitCategoryPicked ? { category: item.category } : {}),
            inStock: item.inStock,
            availability: item.availability,
            ...(hasMap
              ? {
                  mapPrice: item.mapPrice,
                  priceLabel: `${formatUsd(item.mapPrice!)} MAP`,
                  priceNote: `${item.availability} · Authorized Dealer MAP`,
                }
              : {
                  priceNote: `${item.availability} · Call for Dealer Quote`,
                }),
          };
          productMap.set(existing.id, updatedProduct);
        } else {
          targetProductId = slugifyCatalogId(item.itemNumber);
          const photoUrl =
            resolvedPhotos[skuKey] ||
            CATEGORY_FALLBACK_IMAGE[item.category] ||
            'asset:console';
          const built = buildGearProductFromFullCompass(item, photoUrl, targetProductId);
          productMap.set(built.id, built);
          newlyAddedProducts.push(built);
        }

        // Non-destructively merge into Slot #1 (Sweetwater Pro) or Slot #2 (Full Compass)
        const existingVm =
          existingVendorByKey.get(targetProductId) || existingVendorByKey.get(`sku:${skuKey}`);
        const mergedVm = mergeVendorEntryWithSupplierImport(
          existingVm,
          item,
          targetProductId,
          supplierSource,
          todayIsoDate
        );
        vendorEntriesToSave.push(mergedVm);
      }

      // Keep newly added products at the top so Luis sees them immediately, followed by updated existing catalog
      const newIds = new Set(newlyAddedProducts.map((p) => p.id));
      const updatedExistingList = existingProducts.map((p) => productMap.get(p.id) || p);
      const nextProducts = [
        ...newlyAddedProducts,
        ...updatedExistingList.filter((p) => !newIds.has(p.id)),
      ];

      setProgressLabel(
        `Saving ${parsedItems.length} products & ${vendorEntriesToSave.length} ${supplierMeta.slotNumber} (${supplierMeta.name}) records...`
      );
      await onCompleteImport(nextProducts, vendorEntriesToSave);

      setRawText('');
      setRowCategoryOverrides({});
      setProgressLabel('');
      onClose();
    } catch (err) {
      setImportError(
        err instanceof Error
          ? err.message
          : `Failed to import ${supplierMeta.name} list. Please try again.`
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-[2px]"
      onClick={() => !importing && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fc-import-title"
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl border border-stone-200 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-[#141518] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-[#C2842D] text-white flex items-center justify-center shrink-0">
              <PackagePlus className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 id="fc-import-title" className="font-display text-base sm:text-lg font-bold truncate">
                Bulk Add Products — Sweetwater (#1) &amp; Full Compass (#2)
              </h3>
              <p className="text-[11px] sm:text-xs text-stone-300">
                Paste 10 or 600+ items from Sweetwater or Full Compass — auto-parses MAP, Dealer Cost, In Stock / Wait Time &amp; real photos.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={importing}
            onClick={onClose}
            aria-label="Close bulk supplier importer"
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Supplier Source Switcher */}
          <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-3.5 space-y-2.5">
            <p className="text-xs font-bold text-[#141518]">
              Choose Supplier Source (Non-Destructive Merge)
            </p>
            <div
              role="radiogroup"
              aria-label="Bulk import supplier source"
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            >
              {(['sweetwater', 'fullcompass'] as const).map((src) => {
                const meta = SUPPLIER_META[src];
                const active = supplierSource === src;
                return (
                  <button
                    key={src}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={importing}
                    onClick={() => handleSelectSupplier(src)}
                    className={`text-left px-3.5 py-2.5 rounded-xl border transition-colors cursor-pointer disabled:opacity-50 ${
                      active
                        ? src === 'sweetwater'
                          ? 'bg-[#141518] text-white border-[#141518] shadow-xs'
                          : 'bg-[#1a73e8] text-white border-[#1a73e8] shadow-xs'
                        : 'bg-white text-[#141518] border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold">
                        {meta.slotNumber} — {meta.name}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {src === 'sweetwater' ? 'Slot #1' : 'Slot #2'}
                      </span>
                    </div>
                    <p
                      className={`text-[11px] mt-1 ${
                        active ? 'text-white/85' : 'text-stone-500'
                      }`}
                    >
                      {meta.tagline}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacy Assurance Banner */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 flex items-start gap-2.5 text-xs text-emerald-950">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold">Strict Customer Price Privacy Enforced</p>
              <p className="text-emerald-900/90 mt-0.5">{supplierMeta.privacyDetail}</p>
            </div>
          </div>

          {/* Step 1: Target Storefront Category Picker */}
          <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-[#141518]">
                  Step 1 — Choose Storefront Category for This Paste
                </p>
                <p className="text-[11px] text-stone-600">
                  Doing one {supplierMeta.shortName} category at a time? Pick the exact department below and every pasted item will go straight into it.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="fc-category-select" className="sr-only">
                  Target storefront category
                </label>
                <select
                  id="fc-category-select"
                  value={targetCategory}
                  disabled={importing}
                  onChange={(e) =>
                    handleSelectTargetCategory(e.target.value as FullCompassTargetCategory)
                  }
                  className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-[#141518] focus:outline-none focus:border-[#1a73e8]"
                >
                  <option value="auto">Auto-Detect per Item (Smart)</option>
                  {categoryOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {onCreateCategory && (
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() => {
                      setShowNewCatBox((prev) => !prev);
                      setNewCatError('');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#C2842D] bg-white hover:bg-amber-50 text-[#9A6315] text-xs font-semibold cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>+ New Category</span>
                  </button>
                )}
              </div>
            </div>

            {showNewCatBox && onCreateCategory && (
              <div className="rounded-lg border border-[#C2842D]/50 bg-white p-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newCatName}
                    maxLength={60}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="New category name (e.g. Subwoofer Mounts, Hardware, Drum Mics)"
                    className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                  />
                  <input
                    type="text"
                    value={newCatHint}
                    maxLength={140}
                    onChange={(e) => setNewCatHint(e.target.value)}
                    placeholder="Short description (optional)"
                    className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>
                {newCatError && (
                  <p className="text-[11px] font-semibold text-red-700">{newCatError}</p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCatBox(false)}
                    className="px-2.5 py-1 rounded border border-stone-300 text-[11px] font-semibold text-stone-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingNewCat || newCatName.trim().length < 2}
                    onClick={handleQuickCreateCategory}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded bg-[#C2842D] hover:bg-[#B07523] disabled:opacity-50 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" aria-hidden="true" />
                    <span>{savingNewCat ? 'Adding...' : 'Create & Select'}</span>
                  </button>
                </div>
              </div>
            )}

            <div
              role="radiogroup"
              aria-label="Target storefront category"
              className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            >
              <button
                type="button"
                role="radio"
                aria-checked={targetCategory === 'auto'}
                disabled={importing}
                onClick={() => handleSelectTargetCategory('auto')}
                className={`text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
                  targetCategory === 'auto'
                    ? 'bg-[#141518] text-white border-[#141518] shadow-xs'
                    : 'bg-white text-[#141518] border-stone-200 hover:border-stone-400'
                }`}
              >
                <p className="text-xs font-bold leading-tight">Auto-Detect (Mixed)</p>
                <p
                  className={`text-[10px] mt-0.5 leading-snug ${
                    targetCategory === 'auto' ? 'text-stone-300' : 'text-stone-500'
                  }`}
                >
                  Smart match by model &amp; keywords
                </p>
              </button>

              {categoryOptions.map((opt) => {
                const selected = targetCategory === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={importing}
                    onClick={() => handleSelectTargetCategory(opt.id)}
                    className={`text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
                      selected
                        ? 'bg-[#C2842D] text-white border-[#C2842D] shadow-xs'
                        : 'bg-white text-[#141518] border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <p className="text-xs font-bold leading-tight">{opt.label}</p>
                    <p
                      className={`text-[10px] mt-0.5 leading-snug ${
                        selected ? 'text-amber-50' : 'text-stone-500'
                      }`}
                    >
                      {opt.hint}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Paste Textarea + .txt Upload */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="fc-raw-paste" className="text-xs font-bold text-[#141518]">
                {supplierMeta.pasteLabel}
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv,.tsv,.log,text/plain"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-[#F8F8F6] hover:bg-stone-100 text-xs font-semibold text-[#141518] cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Load .txt / .tsv File</span>
                </button>
                {rawText && (
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() => {
                      setRawText('');
                      setRowCategoryOverrides({});
                    }}
                    className="text-xs font-semibold text-stone-500 hover:text-red-700 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <textarea
              id="fc-raw-paste"
              rows={7}
              disabled={importing}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setImportError('');
              }}
              placeholder={supplierMeta.placeholder}
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-[#F8F8F6] border border-stone-300 rounded-xl focus:outline-none focus:border-[#1a73e8] focus:bg-white"
            />
          </div>

          {/* Live Parsed Stats */}
          {stats.total > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-3">
                  <p className="text-[11px] font-semibold text-stone-500">Parsed Unique Items</p>
                  <p className="font-mono text-lg font-bold text-[#141518] tabular-nums">
                    {stats.total}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {stats.brandNew} new · {stats.matchedExisting} updates
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                  <p className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>In Stock</span>
                  </p>
                  <p className="font-mono text-lg font-bold text-emerald-900 tabular-nums">
                    {stats.inStockCount}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                  <p className="text-[11px] font-semibold text-amber-900 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Wait Time / Order</span>
                  </p>
                  <p className="font-mono text-lg font-bold text-amber-950 tabular-nums">
                    {stats.waitTimeCount}
                  </p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
                  <p className="text-[11px] font-semibold text-blue-900 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{supplierMeta.slotNumber} Priced</span>
                  </p>
                  <p className="font-mono text-lg font-bold text-blue-950 tabular-nums">
                    {stats.pricedCostCount}
                  </p>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#141518] cursor-pointer">
                <input
                  type="checkbox"
                  checked={fetchPhotos}
                  disabled={importing}
                  onChange={(e) => setFetchPhotos(e.target.checked)}
                />
                <ImageIcon className="w-3.5 h-3.5 text-[#1a73e8]" aria-hidden="true" />
                <span>
                  Automatically fetch real manufacturer/dealer product photos for new items (recommended)
                </span>
              </label>

              {/* Preview Table */}
              <div className="rounded-xl border border-stone-200 overflow-hidden">
                <div className="px-3.5 py-2 bg-[#F8F8F6] border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-600 flex flex-wrap items-center justify-between gap-2">
                  <span>Live Preview (First {Math.min(12, parsedItems.length)} of {parsedItems.length})</span>
                  <span>
                    MAP Shown to Customers · Cost Saved to {supplierMeta.slotNumber} ({supplierMeta.shortName})
                  </span>
                </div>
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white border-b border-stone-200 text-[11px] text-stone-500 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">SKU / Model</th>
                        <th className="py-2 px-2">Category</th>
                        <th className="py-2 px-2 text-right">Public MAP</th>
                        <th className="py-2 px-2 text-right">{supplierMeta.costColumnLabel}</th>
                        <th className="py-2 px-2 text-right">Gain vs MAP</th>
                        <th className="py-2 px-3">Stock / Wait Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {parsedItems.slice(0, 12).map((item) => {
                        const gain =
                          typeof item.mapPrice === 'number' &&
                          typeof item.dealerCost === 'number' &&
                          item.mapPrice > 0 &&
                          item.dealerCost > 0
                            ? Math.round((item.mapPrice - item.dealerCost) * 100) / 100
                            : null;
                        return (
                          <tr key={item.itemNumber} className="hover:bg-stone-50">
                            <td className="py-2 px-3 font-semibold text-[#141518]">
                              {item.itemNumber}
                              <p className="text-[11px] font-normal text-stone-500 line-clamp-1">
                                {item.description}
                              </p>
                            </td>
                            <td className="py-2 px-2">
                              <select
                                aria-label={`Category for ${item.itemNumber}`}
                                value={item.category}
                                disabled={importing}
                                onChange={(e) => {
                                  const nextCat = e.target.value as Exclude<GearCategory, 'all'>;
                                  setRowCategoryOverrides((prev) => ({
                                    ...prev,
                                    [item.itemNumber]: nextCat,
                                  }));
                                }}
                                className="px-2 py-1 rounded border border-stone-200 bg-white text-[11px] font-semibold text-[#141518] focus:outline-none focus:border-[#1a73e8]"
                              >
                                {categoryOptions.map((opt) => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.shortLabel}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-semibold text-[#141518]">
                              {item.mapPrice ? formatUsd(item.mapPrice) : 'Quote'}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-blue-800 font-semibold">
                              {item.dealerCost ? formatUsd(item.dealerCost) : '—'}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-emerald-700 font-semibold">
                              {gain !== null ? `+${formatUsd(gain)}` : '—'}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  item.inStock
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-900 border border-amber-200'
                                }`}
                              >
                                {item.availability}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {importError && (
            <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {importError}
            </p>
          )}

          {progressLabel && (
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1a73e8] bg-blue-50 border border-blue-200 rounded-lg px-3.5 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
              <span>{progressLabel}</span>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 bg-[#F8F8F6] border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-stone-600">
            Saves directly to your storefront catalog + Admin Vendor Master Sheet ({supplierMeta.slotNumber}: {supplierMeta.name}).
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={importing}
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={importing || stats.total === 0}
              onClick={handleRunImport}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#C2842D] hover:bg-[#B07523] disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
            >
              {importing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <PackagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    Import {stats.total > 0 ? `${stats.total} Products` : 'List'}
                    {targetCategory !== 'auto'
                      ? ` into ${getGearCategoryLabel(targetCategory, customCategories)}`
                      : ''}{' '}
                    &amp; {supplierMeta.slotNumber} ({supplierMeta.shortName})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
