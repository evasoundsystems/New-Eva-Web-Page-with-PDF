import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type {
  CustomerOrderRecord,
  CustomerOrderStatus,
  GearProduct,
  OrderLineSourcing,
  OrderLineSourcingStatus,
  QuoteRecord,
  VendorCallLogEntry,
  VendorMasterEntry,
} from '../types/site';
import {
  calculateCustomerOrderTotals,
  compareVendorQuotes,
  formatCustomerOrdersToCsv,
  formatUsd,
  generateOrderCode,
  prepareQuoteForPdf,
} from '../utils/siteLogic';

interface AdminCustomerOrdersTabProps {
  orders: CustomerOrderRecord[];
  loading: boolean;
  products: GearProduct[];
  quotes: QuoteRecord[];
  vendorEntries: VendorMasterEntry[];
  preloadedQuoteToConvert?: QuoteRecord | null;
  onClearPreloadedQuote?: () => void;
  onSaveOrder: (
    order: CustomerOrderRecord,
    isExisting: boolean
  ) => Promise<CustomerOrderRecord | null>;
  onDeleteOrder: (id: string) => Promise<void>;
}

const ORDER_STATUS_LABELS: Record<CustomerOrderStatus, string> = {
  sourcing: '1. Calling Vendors / Sourcing',
  awaiting_quotes: '2. Waiting on Quotes',
  ordered: '3. Ordered with Vendor (PO Sent)',
  in_transit: '4. In Transit / Shipping',
  delivered: '5. Delivered / Completed',
  cancelled: 'Cancelled',
};

const LINE_STATUS_LABELS: Record<OrderLineSourcingStatus, string> = {
  need_to_call: 'Need to Call / Get Price',
  quoted: 'Price Quoted',
  po_placed: 'PO Ordered',
  shipped: 'Shipped',
  received: 'Received',
};

function makeBlankLine(productName = '', itemNumber = ''): OrderLineSourcing {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productName,
    itemNumber,
    qty: 1,
    chosenVendor: '',
    contactedRepName: '',
    vendorPhone: '',
    vendorEmail: '',
    contactMethod: 'phone',
    contactedDate: new Date().toISOString().slice(0, 10),
    vendorQuoteRef: '',
    quotedUnitCost: 0,
    shippingCost: 0,
    lineStatus: 'need_to_call',
    lineNotes: '',
  };
}

function makeBlankCallLog(): VendorCallLogEntry {
  return {
    id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    vendorName: '',
    repName: '',
    phone: '',
    email: '',
    method: 'phone',
    contactedAt: new Date().toISOString().slice(0, 10),
    quoteNumber: '',
    quotedTotal: 0,
    notes: '',
  };
}

export function AdminCustomerOrdersTab({
  orders,
  loading,
  products,
  quotes,
  vendorEntries,
  preloadedQuoteToConvert,
  onClearPreloadedQuote,
  onSaveOrder,
  onDeleteOrder,
}: AdminCustomerOrdersTabProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | CustomerOrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [draft, setDraft] = useState<CustomerOrderRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedCsv, setCopiedCsv] = useState(false);
  const [addCatalogId, setAddCatalogId] = useState('');

  // Auto-populate a working order if admin clicked "Open Order Sheet" from a Customer Lead
  useEffect(() => {
    if (!preloadedQuoteToConvert) return;
    const { resolvedQuote, totals } = prepareQuoteForPdf(preloadedQuoteToConvert, products);
    const lines: OrderLineSourcing[] = (resolvedQuote.estimateItems || []).map((est, idx) => {
      const vm = findMatchingVendorEntry(est.itemNumber || est.description, est.productId);
      const best = vm ? compareVendorQuotes(vm.quotes, vm.mapPrice).bestQuote : null;
      return {
        id: `line-${idx}-${Date.now()}`,
        ...(est.productId ? { productId: est.productId } : {}),
        productName: est.description || est.itemNumber,
        itemNumber: est.itemNumber,
        qty: est.qty,
        chosenVendor: best?.vendorName || '',
        contactedRepName: best?.repName || '',
        vendorPhone: best?.phone || '',
        vendorEmail: best?.email || '',
        contactMethod: 'phone',
        contactedDate: new Date().toISOString().slice(0, 10),
        vendorQuoteRef: best?.skuOrPartNo || '',
        quotedUnitCost: best?.unitCost || 0,
        shippingCost: best?.shippingCost || 0,
        lineStatus: best && best.unitCost > 0 ? 'quoted' : 'need_to_call',
        lineNotes: '',
      };
    });

    setDraft({
      id: `ord-${Date.now()}`,
      orderCode: generateOrderCode(),
      linkedQuoteRef: preloadedQuoteToConvert.refCode,
      customerName: preloadedQuoteToConvert.contactName,
      organization: preloadedQuoteToConvert.organization,
      customerPhone: preloadedQuoteToConvert.phone,
      customerEmail: preloadedQuoteToConvert.email,
      status: 'sourcing',
      customerQuotedTotal: totals.total > 0 ? totals.total : undefined,
      targetDate: preloadedQuoteToConvert.timeline || '',
      generalNotes: preloadedQuoteToConvert.engineerNotes || '',
      items: lines.length > 0 ? lines : [makeBlankLine(preloadedQuoteToConvert.serviceRequested)],
      callLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    onClearPreloadedQuote?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadedQuoteToConvert]);

  function findMatchingVendorEntry(
    nameOrSku: string,
    productId?: string
  ): VendorMasterEntry | undefined {
    const clean = nameOrSku.trim().toLowerCase();
    return vendorEntries.find(
      (vm) =>
        (productId && vm.productId === productId) ||
        (clean &&
          (vm.itemNumber.toLowerCase() === clean ||
            vm.productName.toLowerCase() === clean))
    );
  }

  function startNewOrder() {
    setDraft({
      id: `ord-${Date.now()}`,
      orderCode: generateOrderCode(),
      linkedQuoteRef: '',
      customerName: '',
      organization: '',
      customerPhone: '',
      customerEmail: '',
      status: 'sourcing',
      customerQuotedTotal: undefined,
      targetDate: '',
      generalNotes: '',
      items: [makeBlankLine()],
      callLogs: [makeBlankCallLog()],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  function importFromLeadRef(quoteId: string) {
    const q = quotes.find((item) => item.id === quoteId);
    if (!q || !draft) return;
    const { resolvedQuote, totals } = prepareQuoteForPdf(q, products);
    const lines: OrderLineSourcing[] = (resolvedQuote.estimateItems || []).map((est, idx) => {
      const vm = findMatchingVendorEntry(est.itemNumber || est.description, est.productId);
      const best = vm ? compareVendorQuotes(vm.quotes, vm.mapPrice).bestQuote : null;
      return {
        id: `line-${idx}-${Date.now()}`,
        ...(est.productId ? { productId: est.productId } : {}),
        productName: est.description || est.itemNumber,
        itemNumber: est.itemNumber,
        qty: est.qty,
        chosenVendor: best?.vendorName || '',
        contactedRepName: best?.repName || '',
        vendorPhone: best?.phone || '',
        vendorEmail: best?.email || '',
        contactMethod: 'phone',
        contactedDate: new Date().toISOString().slice(0, 10),
        vendorQuoteRef: best?.skuOrPartNo || '',
        quotedUnitCost: best?.unitCost || 0,
        shippingCost: best?.shippingCost || 0,
        lineStatus: best && best.unitCost > 0 ? 'quoted' : 'need_to_call',
        lineNotes: '',
      };
    });

    setDraft({
      ...draft,
      linkedQuoteRef: q.refCode,
      customerName: q.contactName,
      organization: q.organization,
      customerPhone: q.phone,
      customerEmail: q.email,
      customerQuotedTotal: totals.total > 0 ? totals.total : draft.customerQuotedTotal,
      targetDate: q.timeline || draft.targetDate,
      items: lines.length > 0 ? lines : draft.items,
    });
  }

  function addProductLineFromCatalog() {
    if (!draft || !addCatalogId) return;
    const prod = products.find((p) => p.id === addCatalogId);
    if (!prod) return;
    const vm = findMatchingVendorEntry(prod.itemNumber || prod.name, prod.id);
    const best = vm ? compareVendorQuotes(vm.quotes, vm.mapPrice).bestQuote : null;

    const line: OrderLineSourcing = {
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: prod.id,
      productName: prod.name,
      itemNumber: prod.itemNumber || prod.name,
      qty: 1,
      chosenVendor: best?.vendorName || '',
      contactedRepName: best?.repName || '',
      vendorPhone: best?.phone || '',
      vendorEmail: best?.email || '',
      contactMethod: 'phone',
      contactedDate: new Date().toISOString().slice(0, 10),
      vendorQuoteRef: best?.skuOrPartNo || '',
      quotedUnitCost: best?.unitCost || 0,
      shippingCost: best?.shippingCost || 0,
      lineStatus: best && best.unitCost > 0 ? 'quoted' : 'need_to_call',
      lineNotes: '',
    };
    setDraft({ ...draft, items: [...draft.items, line] });
    setAddCatalogId('');
  }

  function applyBestMasterSourceToLine(lineIdx: number) {
    if (!draft) return;
    const line = draft.items[lineIdx];
    const vm = findMatchingVendorEntry(line.itemNumber || line.productName, line.productId);
    if (!vm) return;
    const best = compareVendorQuotes(vm.quotes, vm.mapPrice).bestQuote;
    if (!best) return;
    updateLine(lineIdx, {
      chosenVendor: best.vendorName,
      contactedRepName: best.repName,
      vendorPhone: best.phone,
      vendorEmail: best.email,
      vendorQuoteRef: best.skuOrPartNo,
      quotedUnitCost: best.unitCost,
      shippingCost: best.shippingCost,
      lineStatus: 'quoted',
    });
  }

  function updateLine(index: number, patch: Partial<OrderLineSourcing>) {
    if (!draft) return;
    setDraft({
      ...draft,
      items: draft.items.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    });
  }

  function updateCallLog(index: number, patch: Partial<VendorCallLogEntry>) {
    if (!draft) return;
    setDraft({
      ...draft,
      callLogs: draft.callLogs.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    });
  }

  async function handleSaveOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || !draft.customerName.trim()) return;
    setSaving(true);
    try {
      const isExisting = orders.some((o) => o.id === draft.id);
      const cleanedCalls = draft.callLogs.filter(
        (c) => c.vendorName.trim() || c.repName.trim() || c.phone.trim() || c.notes.trim()
      );
      await onSaveOrder(
        {
          ...draft,
          callLogs: cleanedCalls,
        },
        isExisting
      );
      setDraft(null);
    } finally {
      setSaving(false);
    }
  }

  function handleDownloadCsv() {
    const csv = formatCustomerOrdersToCsv(orders);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eva-customer-orders-worksheet-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopyCsv() {
    const csv = formatCustomerOrdersToCsv(orders);
    try {
      await navigator.clipboard.writeText(csv);
      setCopiedCsv(true);
      setTimeout(() => setCopiedCsv(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  }

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (!q) return true;
      const itemsText = order.items
        .map((l) => `${l.productName} ${l.itemNumber} ${l.chosenVendor} ${l.contactedRepName}`)
        .join(' ');
      const logsText = order.callLogs
        .map((c) => `${c.vendorName} ${c.repName} ${c.quoteNumber}`)
        .join(' ');
      return `${order.orderCode} ${order.customerName} ${order.organization} ${order.linkedQuoteRef || ''} ${itemsText} ${logsText}`
        .toLowerCase()
        .includes(q);
    });
  }, [orders, statusFilter, searchQuery]);

  if (draft) {
    const draftTotals = calculateCustomerOrderTotals(draft.items, draft.customerQuotedTotal);

    return (
      <form onSubmit={handleSaveOrder} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-200">
          <div>
            <p className="text-xs font-mono font-bold text-[#9A6315]">{draft.orderCode}</p>
            <h3 className="font-display text-lg font-bold text-[#141518]">
              {orders.some((o) => o.id === draft.id)
                ? `Customer Order Worksheet: ${draft.customerName}`
                : 'New Customer Order Worksheet (Separate from Estimate)'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="px-3.5 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
            >
              Back to Saved Orders
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#141518] hover:bg-[#272A30] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
            >
              {saving ? 'Saving Order...' : 'Save Customer Order'}
            </button>
          </div>
        </div>

        {/* Customer Info + Optional Estimate Import */}
        <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-stone-200">
            <div className="flex-1">
              <label
                htmlFor="ord-import-lead"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Copy Items &amp; Customer from a Saved Estimate (Optional — keeps Estimate separate)
              </label>
              <select
                id="ord-import-lead"
                value=""
                onChange={(e) => importFromLeadRef(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg"
              >
                <option value="">-- Select customer lead/estimate to pull items from --</option>
                {quotes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.refCode} · {q.contactName} ({q.organization || q.serviceRequested})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="ord-status"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Order Fulfillment Stage
              </label>
              <select
                id="ord-status"
                value={draft.status}
                onChange={(e) =>
                  setDraft({ ...draft, status: e.target.value as CustomerOrderStatus })
                }
                className="px-3 py-2 text-xs font-semibold bg-white border border-stone-300 rounded-lg"
              >
                {Object.entries(ORDER_STATUS_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div>
              <label
                htmlFor="ord-customer-name"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Customer Name *
              </label>
              <input
                id="ord-customer-name"
                type="text"
                required
                value={draft.customerName}
                onChange={(e) => setDraft({ ...draft, customerName: e.target.value })}
                placeholder="e.g. Pastor Carlos Méndez"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label
                htmlFor="ord-org"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Church / Organization
              </label>
              <input
                id="ord-org"
                type="text"
                value={draft.organization}
                onChange={(e) => setDraft({ ...draft, organization: e.target.value })}
                placeholder="e.g. Iglesia Vida"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label
                htmlFor="ord-phone"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Customer Phone
              </label>
              <input
                id="ord-phone"
                type="text"
                value={draft.customerPhone}
                onChange={(e) => setDraft({ ...draft, customerPhone: e.target.value })}
                placeholder="(414) 555-0199"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label
                htmlFor="ord-sell-total"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Customer Quoted Total ($ USD)
              </label>
              <input
                id="ord-sell-total"
                type="number"
                min={0}
                step="0.01"
                value={draft.customerQuotedTotal ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : Number(e.target.value);
                  setDraft({
                    ...draft,
                    customerQuotedTotal:
                      val !== undefined && Number.isFinite(val) ? val : undefined,
                  });
                }}
                placeholder="What you quoted customer"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label
                htmlFor="ord-linked-ref"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Linked Estimate Ref (Optional)
              </label>
              <input
                id="ord-linked-ref"
                type="text"
                value={draft.linkedQuoteRef ?? ''}
                onChange={(e) => setDraft({ ...draft, linkedQuoteRef: e.target.value })}
                placeholder="EVA-261120-..."
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label
                htmlFor="ord-target-date"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Target Delivery / Install Date
              </label>
              <input
                id="ord-target-date"
                type="text"
                value={draft.targetDate}
                onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })}
                placeholder="e.g. Before Dec 10"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Live Sourcing & Best-Price Summary Strip */}
        <div className="rounded-xl bg-[#141518] text-white p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-stone-400">
              Vendor Total Cost
            </p>
            <p className="font-mono text-lg font-bold text-white">
              {formatUsd(draftTotals.totalLandedCost)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-stone-400">
              Customer Quoted
            </p>
            <p className="font-mono text-lg font-bold text-[#E0A446]">
              {draft.customerQuotedTotal ? formatUsd(draft.customerQuotedTotal) : 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-stone-400">
              Est. Net Margin
            </p>
            <p
              className={`font-mono text-lg font-bold ${
                draftTotals.estimatedProfit !== null && draftTotals.estimatedProfit >= 0
                  ? 'text-emerald-400'
                  : 'text-stone-300'
              }`}
            >
              {draftTotals.estimatedProfit !== null
                ? formatUsd(draftTotals.estimatedProfit)
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-stone-400">
              Best-Price Guard
            </p>
            {draftTotals.unquotedLineCount > 0 ? (
              <p className="text-xs font-semibold text-amber-300 inline-flex items-center gap-1 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {draftTotals.unquotedLineCount} item{draftTotals.unquotedLineCount === 1 ? '' : 's'} need vendor call
                </span>
              </p>
            ) : (
              <p className="text-xs font-semibold text-emerald-400 mt-0.5">
                All {draft.items.length} items sourced &amp; priced
              </p>
            )}
          </div>
        </div>

        {/* Section A: Order Equipment Lines + Who You Contacted Per Item */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-display text-base font-bold text-[#141518]">
                1. Equipment Items &amp; Vendor Ordering Sheet ({draft.items.length})
              </h4>
              <p className="text-xs text-stone-600">
                Record who you called/emailed, quote #, and confirmed price for each product before placing the order.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Add product from catalog"
                value={addCatalogId}
                onChange={(e) => setAddCatalogId(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg max-w-[230px]"
              >
                <option value="">+ Pick catalog product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.itemNumber || p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addProductLineFromCatalog}
                disabled={!addCatalogId}
                className="px-3 py-1.5 rounded-lg bg-[#1a73e8] disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
              >
                Add Picked Item
              </button>
              <button
                type="button"
                onClick={() =>
                  setDraft({ ...draft, items: [...draft.items, makeBlankLine()] })
                }
                className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold cursor-pointer"
              >
                + Blank Item
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {draft.items.map((line, idx) => {
              const masterMatch = findMatchingVendorEntry(
                line.itemNumber || line.productName,
                line.productId
              );
              return (
                <div
                  key={line.id}
                  className="rounded-xl border border-stone-200 bg-white p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#9A6315]">
                        Item #{idx + 1}
                      </span>
                      {masterMatch && (
                        <button
                          type="button"
                          onClick={() => applyBestMasterSourceToLine(idx)}
                          className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-semibold hover:bg-emerald-200 cursor-pointer"
                        >
                          Fill Lowest from Master Sheet
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`Line ${idx + 1} status`}
                        value={line.lineStatus}
                        onChange={(e) =>
                          updateLine(idx, {
                            lineStatus: e.target.value as OrderLineSourcingStatus,
                          })
                        }
                        className="px-2 py-1 text-xs font-semibold bg-[#F8F8F6] border border-stone-300 rounded-md"
                      >
                        {Object.entries(LINE_STATUS_LABELS).map(([k, lbl]) => (
                          <option key={k} value={k}>
                            {lbl}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            items: draft.items.filter((_, i) => i !== idx),
                          })
                        }
                        aria-label={`Remove line ${idx + 1}`}
                        className="p-1 text-red-700 hover:bg-red-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                    <div className="lg:col-span-2">
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={line.productName}
                        onChange={(e) => updateLine(idx, { productName: e.target.value })}
                        placeholder="e.g. QSC K12.2"
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        SKU
                      </label>
                      <input
                        type="text"
                        value={line.itemNumber}
                        onChange={(e) => updateLine(idx, { itemNumber: e.target.value })}
                        placeholder="Model #"
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        Qty
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={line.qty}
                        onChange={(e) =>
                          updateLine(idx, {
                            qty: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-stone-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        Quoted Cost ($/ea)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.quotedUnitCost || ''}
                        onChange={(e) =>
                          updateLine(idx, {
                            quotedUnitCost: Number(e.target.value) || 0,
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
                        value={line.shippingCost || ''}
                        onChange={(e) =>
                          updateLine(idx, {
                            shippingCost: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-stone-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        Ordering From (Vendor)
                      </label>
                      <input
                        type="text"
                        value={line.chosenVendor}
                        onChange={(e) => updateLine(idx, { chosenVendor: e.target.value })}
                        placeholder="Sweetwater / Full Compass"
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        Who You Called / Emailed
                      </label>
                      <input
                        type="text"
                        value={line.contactedRepName}
                        onChange={(e) =>
                          updateLine(idx, { contactedRepName: e.target.value })
                        }
                        placeholder="Rep full name"
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        Vendor Phone
                      </label>
                      <input
                        type="text"
                        value={line.vendorPhone}
                        onChange={(e) => updateLine(idx, { vendorPhone: e.target.value })}
                        placeholder="Phone #"
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        Vendor Email
                      </label>
                      <input
                        type="email"
                        value={line.vendorEmail}
                        onChange={(e) => updateLine(idx, { vendorEmail: e.target.value })}
                        placeholder="rep@vendor.com"
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        Quote / PO #
                      </label>
                      <input
                        type="text"
                        value={line.vendorQuoteRef}
                        onChange={(e) =>
                          updateLine(idx, { vendorQuoteRef: e.target.value })
                        }
                        placeholder="Q-48291 / PO #"
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        Contacted Date
                      </label>
                      <input
                        type="text"
                        value={line.contactedDate}
                        onChange={(e) =>
                          updateLine(idx, { contactedDate: e.target.value })
                        }
                        placeholder="YYYY-MM-DD"
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={line.lineNotes}
                      onChange={(e) => updateLine(idx, { lineNotes: e.target.value })}
                      placeholder="Call notes for this item (e.g. Rep promised match if ordered by Friday 3pm)..."
                      className="w-full px-2.5 py-1.5 text-xs bg-[#F8F8F6] border border-stone-200 rounded-md"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section B: Dedicated Vendor Call / Outreach Quote Log */}
        <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="font-display text-base font-bold text-[#141518]">
                2. Vendor Quote Call &amp; Outreach Log ({draft.callLogs.length})
              </h4>
              <p className="text-xs text-stone-600">
                Log every vendor rep you called or emailed while shopping around for the best package pricing on this order.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  callLogs: [...draft.callLogs, makeBlankCallLog()],
                })
              }
              className="px-3 py-1.5 rounded-lg bg-[#141518] text-white text-xs font-semibold cursor-pointer shrink-0"
            >
              + Log Vendor Call / Quote
            </button>
          </div>

          {draft.callLogs.length === 0 ? (
            <p className="text-xs text-stone-500 py-2">
              No outreach logged yet. Click &ldquo;+ Log Vendor Call / Quote&rdquo; to record whom you spoke with.
            </p>
          ) : (
            <div className="space-y-2.5">
              {draft.callLogs.map((log, idx) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-stone-200 bg-white p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-end"
                >
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                      Company / Store
                    </label>
                    <input
                      type="text"
                      value={log.vendorName}
                      onChange={(e) =>
                        updateCallLog(idx, { vendorName: e.target.value })
                      }
                      placeholder="Sweetwater / Full Compass"
                      className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                      Who I Called / Spoke With
                    </label>
                    <input
                      type="text"
                      value={log.repName}
                      onChange={(e) => updateCallLog(idx, { repName: e.target.value })}
                      placeholder="Rep name"
                      className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                      Phone / Email
                    </label>
                    <input
                      type="text"
                      value={log.phone || log.email}
                      onChange={(e) =>
                        updateCallLog(idx, {
                          phone: e.target.value.includes('@') ? log.phone : e.target.value,
                          email: e.target.value.includes('@') ? e.target.value : log.email,
                        })
                      }
                      placeholder="(800)... or email"
                      className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                      Method &amp; Date
                    </label>
                    <div className="flex gap-1">
                      <select
                        value={log.method}
                        onChange={(e) =>
                          updateCallLog(idx, {
                            method: e.target.value as VendorCallLogEntry['method'],
                          })
                        }
                        className="px-2 py-1.5 text-xs border border-stone-300 rounded-md"
                      >
                        <option value="phone">Phone</option>
                        <option value="email">Email</option>
                        <option value="text">Text</option>
                        <option value="portal">Portal</option>
                      </select>
                      <input
                        type="text"
                        value={log.contactedAt}
                        onChange={(e) =>
                          updateCallLog(idx, { contactedAt: e.target.value })
                        }
                        className="w-full px-2 py-1.5 text-xs border border-stone-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                      Quote # &amp; Total ($)
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={log.quoteNumber}
                        onChange={(e) =>
                          updateCallLog(idx, { quoteNumber: e.target.value })
                        }
                        placeholder="Q#"
                        className="w-1/2 px-2 py-1.5 text-xs border border-stone-300 rounded-md"
                      />
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={log.quotedTotal || ''}
                        onChange={(e) =>
                          updateCallLog(idx, {
                            quotedTotal: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="$"
                        className="w-1/2 px-2 py-1.5 text-xs font-mono border border-stone-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={log.notes}
                      onChange={(e) => updateCallLog(idx, { notes: e.target.value })}
                      placeholder="Call notes..."
                      className="flex-1 px-2.5 py-1.5 text-xs border border-stone-300 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          callLogs: draft.callLogs.filter((_, i) => i !== idx),
                        })
                      }
                      aria-label={`Delete call log ${idx + 1}`}
                      className="p-1.5 text-red-700 hover:bg-red-50 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* General Order Notes */}
        <div>
          <label
            htmlFor="ord-general-notes"
            className="block text-xs font-semibold text-stone-700 mb-1"
          >
            Overall Order &amp; Shipping Reminders (Private)
          </label>
          <textarea
            id="ord-general-notes"
            rows={2}
            value={draft.generalNotes}
            onChange={(e) => setDraft({ ...draft, generalNotes: e.target.value })}
            placeholder="Double-check connector types, drop-ship address, liftgate delivery needed, etc..."
            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
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
            className="px-5 py-2 rounded-lg bg-[#C2842D] hover:bg-[#B07523] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
          >
            {saving ? 'Saving Order...' : 'Save Working Order'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-stone-200">
        <div>
          <h3 className="font-display text-lg font-bold text-[#141518]">
            Saved Customer Order Worksheets ({orders.length})
          </h3>
          <p className="text-xs text-stone-600">
            Separate from public Customer Estimates — save active orders, track who you called/emailed for quotes, and verify best dealer pricing before ordering.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={startNewOrder}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#C2842D] hover:bg-[#B07523] text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>New Customer Order</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={orders.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleCopyCsv}
            disabled={orders.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 disabled:opacity-40 text-[#141518] text-xs font-semibold cursor-pointer"
          >
            {copiedCsv ? (
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer, order #, vendor rep you called, or gear item..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
          />
        </div>
        <select
          aria-label="Filter customer orders by status"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as 'all' | CustomerOrderStatus)
          }
          className="px-3 py-2 text-xs font-semibold bg-white border border-stone-300 rounded-lg"
        >
          <option value="all">All Stages ({orders.length})</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, lbl]) => (
            <option key={k} value={k}>
              {lbl}
            </option>
          ))}
        </select>
      </div>

      {/* Saved Orders List */}
      {loading ? (
        <p className="text-sm text-stone-500 py-8 text-center">
          Loading saved customer orders...
        </p>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-8 text-center">
          <p className="text-sm font-semibold text-[#141518] mb-1">
            No saved customer working orders yet
          </p>
          <p className="text-xs text-stone-600 mb-4">
            Start a working order from scratch or click &ldquo;Work Order Sheet&rdquo; on any Customer Lead to track vendor phone calls, rep quotes, and final fulfillment separately from the estimate.
          </p>
          <button
            type="button"
            onClick={startNewOrder}
            className="px-4 py-2 rounded-lg bg-[#C2842D] hover:bg-[#B07523] text-white text-xs font-semibold cursor-pointer"
          >
            + Create First Working Order
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const totals = calculateCustomerOrderTotals(
              order.items,
              order.customerQuotedTotal
            );
            return (
              <div
                key={order.id}
                className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-4 sm:p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mb-1">
                      <span className="font-mono font-bold text-[#9A6315]">
                        {order.orderCode}
                      </span>
                      {order.linkedQuoteRef && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-stone-700">
                            Ref: {order.linkedQuoteRef}
                          </span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="px-2 py-0.5 rounded bg-white border border-stone-200 font-semibold text-[#141518]">
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <h4 className="font-display text-base font-bold text-[#141518]">
                      {order.customerName}
                      {order.organization ? ` · ${order.organization}` : ''}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 mt-1">
                      {order.customerPhone && (
                        <a
                          href={`tel:${order.customerPhone.replace(/[^\d+]/g, '')}`}
                          className="inline-flex items-center gap-1 text-[#1a73e8] hover:underline font-mono"
                        >
                          <Phone className="w-3 h-3" aria-hidden="true" />
                          <span>{order.customerPhone}</span>
                        </a>
                      )}
                      {order.customerEmail && (
                        <a
                          href={`mailto:${order.customerEmail}`}
                          className="inline-flex items-center gap-1 text-[#1a73e8] hover:underline"
                        >
                          <Mail className="w-3 h-3" aria-hidden="true" />
                          <span>{order.customerEmail}</span>
                        </a>
                      )}
                      {order.targetDate && <span>Target: {order.targetDate}</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-right">
                      <p className="font-mono text-xs font-bold text-[#141518]">
                        Cost: {formatUsd(totals.totalLandedCost)}
                        {totals.estimatedProfit !== null
                          ? ` · Profit: ${formatUsd(totals.estimatedProfit)}`
                          : ''}
                      </p>
                      <p className="text-[11px] text-stone-500">
                        {order.items.length} line{order.items.length === 1 ? '' : 's'} ·{' '}
                        {order.callLogs.length} vendor call{order.callLogs.length === 1 ? '' : 's'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDraft({ ...order })}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#141518] hover:bg-[#272A30] text-white text-xs font-semibold cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Open &amp; Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteOrder(order.id)}
                      aria-label={`Delete order ${order.orderCode}`}
                      className="p-2 rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Glance at Who Was Called & Line Status */}
                {order.items.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-stone-200">
                    {order.items.map((line) => (
                      <div
                        key={line.id}
                        className="rounded-lg bg-white border border-stone-200 px-3 py-2 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[#141518] truncate">
                            {line.qty}x {line.itemNumber || line.productName}
                          </p>
                          <p className="text-stone-500 truncate">
                            {line.chosenVendor
                              ? `${line.chosenVendor}${line.contactedRepName ? ` (${line.contactedRepName})` : ''}`
                              : 'No vendor picked yet'}
                            {line.vendorQuoteRef ? ` · Ref: ${line.vendorQuoteRef}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono font-bold text-[#141518]">
                            {line.quotedUnitCost > 0
                              ? formatUsd(line.quotedUnitCost)
                              : 'Quote TBD'}
                          </p>
                          <p className="text-[10px] font-semibold text-stone-500">
                            {LINE_STATUS_LABELS[line.lineStatus]}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
