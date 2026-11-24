import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Mail,
  PackagePlus,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type {
  GearProduct,
  VendorMasterEntry,
  VendorQuoteOption,
} from '../types/site';
import {
  compareVendorQuotes,
  formatUsd,
  formatVendorMasterToCsv,
  getVendorLandedCost,
} from '../utils/siteLogic';

import type { BulkImportSupplierSource } from '../utils/fullCompassParser';
import { copyTextToClipboard } from '../utils/clipboard';

interface AdminVendorMasterTabProps {
  entries: VendorMasterEntry[];
  loading: boolean;
  products: GearProduct[];
  onSaveEntry: (entry: VendorMasterEntry) => Promise<VendorMasterEntry | null>;
  onDeleteEntry: (id: string) => Promise<void>;
  onOpenFullCompassImport?: (source?: BulkImportSupplierSource) => void;
}

function makeEmptyQuote(slotNum: number): VendorQuoteOption {
  const defaults = ['Sweetwater Pro', 'Full Compass', 'ADI / Distributor #3'];
  return {
    id: `vq-${slotNum}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    vendorName: slotNum <= 3 ? defaults[slotNum - 1] : '',
    repName: '',
    email: '',
    phone: '',
    unitCost: 0,
    shippingCost: 0,
    leadTime: '',
    skuOrPartNo: '',
    notes: '',
    lastQuotedAt: new Date().toISOString().slice(0, 10),
  };
}

function ensureAtLeastThreeQuotes(existing: readonly VendorQuoteOption[]): VendorQuoteOption[] {
  const copy = [...existing];
  while (copy.length < 3) {
    copy.push(makeEmptyQuote(copy.length + 1));
  }
  return copy;
}

export function AdminVendorMasterTab({
  entries,
  loading,
  products,
  onSaveEntry,
  onDeleteEntry,
  onOpenFullCompassImport,
}: AdminVendorMasterTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pageLimit, setPageLimit] = useState(30);
  const [draft, setDraft] = useState<VendorMasterEntry | null>(null);
  const [catalogPickId, setCatalogPickId] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedSheet, setCopiedSheet] = useState(false);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) => {
      const vendorText = entry.quotes
        .map((v) => `${v.vendorName} ${v.repName} ${v.email} ${v.phone}`)
        .join(' ');
      return `${entry.productName} ${entry.itemNumber} ${entry.brand} ${entry.notes} ${vendorText}`
        .toLowerCase()
        .includes(q);
    });
  }, [entries, searchQuery]);

  function startNewEntry() {
    setCatalogPickId('');
    setDraft({
      id: `vm-${Date.now()}`,
      productName: '',
      itemNumber: '',
      brand: '',
      mapPrice: undefined,
      preferredVendor: '',
      notes: '',
      quotes: [makeEmptyQuote(1), makeEmptyQuote(2), makeEmptyQuote(3)],
      updatedAt: new Date().toISOString(),
    });
  }

  function startEditEntry(entry: VendorMasterEntry) {
    setCatalogPickId(entry.productId || '');
    setDraft({
      ...entry,
      quotes: ensureAtLeastThreeQuotes(entry.quotes),
    });
  }

  function applyCatalogProduct(prodId: string) {
    setCatalogPickId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (!prod || !draft) return;
    setDraft({
      ...draft,
      productId: prod.id,
      productName: prod.name,
      itemNumber: prod.itemNumber || prod.name,
      brand: prod.brand,
      mapPrice: prod.mapPrice,
    });
  }

  function updateQuoteSlot(index: number, patch: Partial<VendorQuoteOption>) {
    if (!draft) return;
    const nextQuotes = draft.quotes.map((q, i) => (i === index ? { ...q, ...patch } : q));
    setDraft({ ...draft, quotes: nextQuotes });
  }

  async function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || !draft.productName.trim()) return;
    setSaving(true);
    try {
      const cleanedQuotes = draft.quotes.filter(
        (q) =>
          q.vendorName.trim() ||
          q.repName.trim() ||
          q.phone.trim() ||
          q.email.trim() ||
          q.unitCost > 0
      );
      const cmp = compareVendorQuotes(cleanedQuotes, draft.mapPrice);
      const toSave: VendorMasterEntry = {
        ...draft,
        preferredVendor: draft.preferredVendor.trim() || cmp.bestQuote?.vendorName || '',
        quotes: cleanedQuotes,
      };
      await onSaveEntry(toSave);
      setDraft(null);
    } finally {
      setSaving(false);
    }
  }

  function handleDownloadCsv() {
    const csv = formatVendorMasterToCsv(entries);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eva-vendor-master-sheet-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopySheet() {
    const headers = [
      'Product Name',
      'SKU',
      'Brand',
      'MAP Price',
      'Best Source',
      'Best Landed Cost',
      'Source 1',
      'Source 2',
      'Source 3',
    ];
    const fmt = (q?: VendorQuoteOption) =>
      q && q.vendorName.trim()
        ? `${q.vendorName} (${q.repName || '-'} | ${q.phone || '-'} | ${q.email || '-'}) $${getVendorLandedCost(q).toFixed(2)}`
        : '';
    const rows = entries.map((e) => {
      const cmp = compareVendorQuotes(e.quotes, e.mapPrice);
      return [
        e.productName,
        e.itemNumber,
        e.brand,
        e.mapPrice ? e.mapPrice.toFixed(2) : '',
        cmp.bestQuote?.vendorName || e.preferredVendor || '',
        cmp.bestQuote ? cmp.bestLandedCost.toFixed(2) : '',
        fmt(e.quotes[0]),
        fmt(e.quotes[1]),
        fmt(e.quotes[2]),
      ].join('\t');
    });
    const ok = await copyTextToClipboard([headers.join('\t'), ...rows].join('\n'));
    if (ok) {
      setCopiedSheet(true);
      setTimeout(() => setCopiedSheet(false), 2500);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header & Toolbar */}
      <div className="flex flex-col gap-3 pb-4 border-b border-stone-200">
        <div>
          <h3 className="font-display text-lg font-bold text-[#141518]">
            Master Vendor &amp; Price Comparison Sheet ({entries.length})
          </h3>
          <p className="text-xs text-stone-600">
            Track where to order every product — distributor emails, phone numbers, and side-by-side pricing across 2–3 suppliers. Private to Admin Studio only.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search
              className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="vm-search" className="sr-only">
              Search vendor master sheet
            </label>
            <input
              id="vm-search"
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPageLimit(30);
              }}
              placeholder="Search SKU, vendor, rep..."
              className="w-full pl-8 pr-7 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPageLimit(30);
                }}
                aria-label="Clear vendor search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {!draft && onOpenFullCompassImport && (
            <>
              <button
                type="button"
                onClick={() => onOpenFullCompassImport('sweetwater')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#141518] hover:bg-[#2a2c32] text-white text-xs font-semibold cursor-pointer"
              >
                <PackagePlus className="w-4 h-4" aria-hidden="true" />
                <span>Bulk Add Sweetwater</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenFullCompassImport('fullcompass')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold cursor-pointer"
              >
                <PackagePlus className="w-4 h-4" aria-hidden="true" />
                <span>Bulk Add Full Compass</span>
              </button>
            </>
          )}
          {!draft && (
            <button
              type="button"
              onClick={startNewEntry}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#C2842D] hover:bg-[#B07523] text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add Sourcing Row</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleCopySheet}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 disabled:opacity-40 text-[#141518] text-xs font-semibold cursor-pointer"
          >
            {copiedSheet ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy Sheet</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add / Edit Sourcing Form */}
      {draft && (
        <form
          onSubmit={handleSaveDraft}
          className="rounded-xl border border-[#C2842D]/50 bg-[#F8F8F6] p-5 space-y-5"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-display text-base font-bold text-[#141518]">
              {entries.some((e) => e.id === draft.id)
                ? `Edit Vendor Sheet: ${draft.productName}`
                : 'New Product Sourcing & Price Comparison Entry'}
            </h4>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="text-xs font-semibold text-stone-600 hover:text-[#141518] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="sm:col-span-2">
              <label
                htmlFor="vm-catalog-pick"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Auto-Fill from Your Catalog (Optional)
              </label>
              <select
                id="vm-catalog-pick"
                value={catalogPickId}
                onChange={(e) => applyCatalogProduct(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
              >
                <option value="">-- Pick existing catalog product or type custom below --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.itemNumber || p.name} ({p.brand})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="vm-product-name"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Product Name *
              </label>
              <input
                id="vm-product-name"
                type="text"
                required
                value={draft.productName}
                onChange={(e) => setDraft({ ...draft, productName: e.target.value })}
                placeholder="e.g. QSC K12.2"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label
                htmlFor="vm-sku"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                SKU / Model #
              </label>
              <input
                id="vm-sku"
                type="text"
                value={draft.itemNumber}
                onChange={(e) => setDraft({ ...draft, itemNumber: e.target.value })}
                placeholder="e.g. K12.2"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label
                htmlFor="vm-brand"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Brand
              </label>
              <input
                id="vm-brand"
                type="text"
                value={draft.brand}
                onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
                placeholder="e.g. QSC"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label
                htmlFor="vm-map"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Catalog MAP Price ($ USD)
              </label>
              <input
                id="vm-map"
                type="number"
                min={0}
                step="0.01"
                value={draft.mapPrice ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : Number(e.target.value);
                  setDraft({
                    ...draft,
                    mapPrice: val !== undefined && Number.isFinite(val) ? val : undefined,
                  });
                }}
                placeholder="999.99"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="vm-notes"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Buying Notes (Account #, Free Freight Minimum, etc.)
              </label>
              <input
                id="vm-notes"
                type="text"
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="e.g. Sweetwater Pro rep gives net-30 + free shipping over $500"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
              />
            </div>
          </div>

          {/* 3 Supplier Comparison Cards Side-by-Side */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Compare 2–3 Suppliers / Distributors (Phone, Email &amp; Cost)
              </p>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    quotes: [...draft.quotes, makeEmptyQuote(draft.quotes.length + 1)],
                  })
                }
                className="text-xs font-semibold text-[#1a73e8] hover:underline cursor-pointer"
              >
                + Add Another Vendor Column
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {draft.quotes.map((q, idx) => {
                const landed = getVendorLandedCost(q);
                return (
                  <div
                    key={q.id}
                    className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <span className="text-xs font-bold text-[#141518]">
                        Place #{idx + 1}
                      </span>
                      {landed > 0 && (
                        <span className="font-mono text-xs font-bold text-emerald-700">
                          Total: {formatUsd(landed)}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        Distributor / Store Name
                      </label>
                      <input
                        type="text"
                        value={q.vendorName}
                        onChange={(e) =>
                          updateQuoteSlot(idx, { vendorName: e.target.value })
                        }
                        placeholder="Sweetwater / Full Compass / ADI"
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                          Rep / Contact
                        </label>
                        <input
                          type="text"
                          value={q.repName}
                          onChange={(e) =>
                            updateQuoteSlot(idx, { repName: e.target.value })
                          }
                          placeholder="Rep name"
                          className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                          Phone
                        </label>
                        <input
                          type="text"
                          value={q.phone}
                          onChange={(e) =>
                            updateQuoteSlot(idx, { phone: e.target.value })
                          }
                          placeholder="(800) 222-4700"
                          className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        Order Email
                      </label>
                      <input
                        type="email"
                        value={q.email}
                        onChange={(e) =>
                          updateQuoteSlot(idx, { email: e.target.value })
                        }
                        placeholder="rep@distributor.com"
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                          Your Cost ($ USD)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={q.unitCost || ''}
                          onChange={(e) =>
                            updateQuoteSlot(idx, {
                              unitCost: Number(e.target.value) || 0,
                            })
                          }
                          placeholder="0.00"
                          className="w-full px-2.5 py-1.5 text-xs font-mono border border-stone-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                          Shipping ($)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={q.shippingCost || ''}
                          onChange={(e) =>
                            updateQuoteSlot(idx, {
                              shippingCost: Number(e.target.value) || 0,
                            })
                          }
                          placeholder="0.00"
                          className="w-full px-2.5 py-1.5 text-xs font-mono border border-stone-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                          Vendor SKU / Quote #
                        </label>
                        <input
                          type="text"
                          value={q.skuOrPartNo}
                          onChange={(e) =>
                            updateQuoteSlot(idx, { skuOrPartNo: e.target.value })
                          }
                          placeholder="Part / Quote #"
                          className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                          Lead Time
                        </label>
                        <input
                          type="text"
                          value={q.leadTime}
                          onChange={(e) =>
                            updateQuoteSlot(idx, { leadTime: e.target.value })
                          }
                          placeholder="In Stock / 3 days"
                          className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="px-4 py-2 rounded-lg border border-stone-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#141518] hover:bg-[#272A30] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save to Vendor Master Sheet'}
            </button>
          </div>
        </form>
      )}

      {/* Master Sheet Rows */}
      {loading ? (
        <p className="text-sm text-stone-500 py-8 text-center">Loading Vendor Master Sheet...</p>
      ) : filteredEntries.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-8 text-center">
          <p className="text-sm font-semibold text-[#141518] mb-1">
            No supplier entries in your Master Sheet yet
          </p>
          <p className="text-xs text-stone-600 mb-4">
            Click &ldquo;Add Sourcing Row&rdquo; above (or fill out the supplier section when adding a product) to save where to buy each item with 2–3 price comparisons.
          </p>
          {!draft && (
            <button
              type="button"
              onClick={startNewEntry}
              className="px-4 py-2 rounded-lg bg-[#C2842D] hover:bg-[#B07523] text-white text-xs font-semibold cursor-pointer"
            >
              + Add Your First Product Supplier Sheet
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.slice(0, pageLimit).map((entry) => {
            const cmp = compareVendorQuotes(entry.quotes, entry.mapPrice);
            return (
              <div
                key={entry.id}
                className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-stone-100">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mb-1">
                      {entry.brand && (
                        <span className="font-semibold uppercase tracking-wide text-[#9A6315]">
                          {entry.brand}
                        </span>
                      )}
                      {entry.itemNumber && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{entry.itemNumber}</span>
                        </>
                      )}
                      {typeof entry.mapPrice === 'number' && entry.mapPrice > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">MAP: {formatUsd(entry.mapPrice)}</span>
                        </>
                      )}
                    </div>
                    <h4 className="font-display text-base font-bold text-[#141518]">
                      {entry.productName}
                    </h4>
                    {entry.notes && (
                      <p className="text-xs text-stone-600 mt-1">{entry.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {cmp.bestQuote && (
                      <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-right">
                        <p className="text-[11px] font-bold uppercase text-emerald-800">
                          Best Price: {cmp.bestQuote.vendorName}
                        </p>
                        <p className="font-mono text-xs font-bold text-emerald-900">
                          {formatUsd(cmp.bestLandedCost)}
                          {cmp.spreadSavings > 0
                            ? ` (Saves ${formatUsd(cmp.spreadSavings)})`
                            : ''}
                          {cmp.estimatedMarginAtMap !== null
                            ? ` · Margin vs MAP: ${formatUsd(cmp.estimatedMarginAtMap)}`
                            : ''}
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => startEditEntry(entry)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#141518] text-white text-xs font-semibold hover:bg-[#272A30] cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteEntry(entry.id)}
                      aria-label={`Delete ${entry.productName} sourcing`}
                      className="p-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Supplier Comparison Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {entry.quotes.map((q) => {
                    const landed = getVendorLandedCost(q);
                    const isBest =
                      cmp.bestQuote && cmp.bestQuote.id === q.id && landed > 0;
                    return (
                      <div
                        key={q.id}
                        className={`rounded-lg border p-3 text-xs space-y-1.5 ${
                          isBest
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : 'bg-[#F8F8F6] border-stone-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#141518]">
                            {q.vendorName || 'Unnamed Vendor'}
                          </span>
                          {isBest && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-bold uppercase">
                              Lowest
                            </span>
                          )}
                        </div>

                        {q.repName && (
                          <p className="text-stone-700">
                            Rep: <span className="font-medium">{q.repName}</span>
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 pt-0.5">
                          {q.phone && (
                            <a
                              href={`tel:${q.phone.replace(/[^\d+]/g, '')}`}
                              className="inline-flex items-center gap-1 text-[#1a73e8] hover:underline font-mono"
                            >
                              <Phone className="w-3 h-3" aria-hidden="true" />
                              <span>{q.phone}</span>
                            </a>
                          )}
                          {q.email && (
                            <a
                              href={`mailto:${q.email}`}
                              className="inline-flex items-center gap-1 text-[#1a73e8] hover:underline break-all"
                            >
                              <Mail className="w-3 h-3 shrink-0" aria-hidden="true" />
                              <span>{q.email}</span>
                            </a>
                          )}
                        </div>

                        <div className="pt-1.5 border-t border-stone-200/70 flex items-center justify-between font-mono">
                          <span className="font-bold text-[#141518]">
                            Cost: {formatUsd(q.unitCost)}
                            {q.shippingCost > 0 ? ` + ${formatUsd(q.shippingCost)} ship` : ''}
                          </span>
                          {q.leadTime && (
                            <span className="text-stone-500">{q.leadTime}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filteredEntries.length > pageLimit && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setPageLimit((prev) => prev + 30)}
                className="px-5 py-2 rounded-lg border border-stone-300 bg-[#F8F8F6] hover:border-[#1a73e8] text-xs font-semibold text-[#141518] cursor-pointer"
              >
                Load More Vendor Rows ({filteredEntries.length - pageLimit} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
