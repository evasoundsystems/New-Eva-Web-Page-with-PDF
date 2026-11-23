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
  Printer,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type {
  BrandConfig,
  CustomerOrderRecord,
  CustomerOrderStatus,
  GearProduct,
  OrderLineSourcing,
  OrderLineSourcingStatus,
  PaymentProcessingMethod,
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
import { downloadWorkOrderPdf } from '../utils/workOrderPdf';

interface AdminCustomerOrdersTabProps {
  orders: CustomerOrderRecord[];
  loading: boolean;
  products: GearProduct[];
  quotes: QuoteRecord[];
  vendorEntries: VendorMasterEntry[];
  brand: BrandConfig;
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
    mapPrice: undefined,
    customerUnitPrice: undefined,
    chosenVendor: '',
    contactedRepName: '',
    vendorPhone: '',
    vendorEmail: '',
    contactMethod: 'phone',
    contactedDate: new Date().toISOString().slice(0, 10),
    vendorQuoteRef: '',
    quotedUnitCost: 0,
    shippingCost: 0,
    applyProcessingFee: true,
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
  brand,
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
  const [printPreview, setPrintPreview] = useState<{
    order: CustomerOrderRecord;
    mode: 'field' | 'admin';
  } | null>(null);

  // Auto-populate a working order if admin clicked "Work Order Sheet" from a Customer Lead
  useEffect(() => {
    if (!preloadedQuoteToConvert) return;
    const { resolvedQuote, totals } = prepareQuoteForPdf(preloadedQuoteToConvert, products);
    const lines: OrderLineSourcing[] = (resolvedQuote.estimateItems || []).map((est, idx) => {
      const vm = findMatchingVendorEntry(est.itemNumber || est.description, est.productId);
      const best = vm ? compareVendorQuotes(vm.quotes, vm.mapPrice).bestQuote : null;
      const prodMatch = products.find(
        (p) =>
          (est.productId && p.id === est.productId) ||
          (p.itemNumber || p.name).toLowerCase() === (est.itemNumber || '').trim().toLowerCase()
      );
      const resolvedMap = est.mapPrice ?? prodMatch?.mapPrice ?? vm?.mapPrice;
      const resolvedUnitCost = best?.unitCost || est.dealerCost || 0;
      return {
        id: `line-${idx}-${Date.now()}`,
        ...(est.productId ? { productId: est.productId } : {}),
        productName: est.description || est.itemNumber,
        itemNumber: est.itemNumber,
        qty: est.qty,
        ...(resolvedMap && resolvedMap > 0 ? { mapPrice: resolvedMap } : {}),
        ...(est.unitPrice > 0 ? { customerUnitPrice: est.unitPrice } : {}),
        chosenVendor: best?.vendorName || '',
        contactedRepName: best?.repName || '',
        vendorPhone: best?.phone || '',
        vendorEmail: best?.email || '',
        contactMethod: 'phone',
        contactedDate: new Date().toISOString().slice(0, 10),
        vendorQuoteRef: best?.skuOrPartNo || '',
        quotedUnitCost: resolvedUnitCost,
        shippingCost: best?.shippingCost || 0,
        lineStatus: resolvedUnitCost > 0 && best?.vendorName ? 'quoted' : 'need_to_call',
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
      shippingFee: preloadedQuoteToConvert.shippingFee ?? 0,
      taxRate: preloadedQuoteToConvert.taxRate ?? 0,
      processingFeeRate: preloadedQuoteToConvert.processingFeeRate ?? 0,
      paymentMethod: preloadedQuoteToConvert.paymentMethod || 'none',
      targetDate: preloadedQuoteToConvert.timeline || '',
      generalNotes: preloadedQuoteToConvert.engineerNotes || '',
      engineerSuggestions: '',
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
      shippingFee: 0,
      taxRate: 0,
      processingFeeRate: 0,
      paymentMethod: 'none',
      targetDate: '',
      generalNotes: '',
      engineerSuggestions: '',
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
      const prodMatch = products.find(
        (p) =>
          (est.productId && p.id === est.productId) ||
          (p.itemNumber || p.name).toLowerCase() === (est.itemNumber || '').trim().toLowerCase()
      );
      const resolvedMap = est.mapPrice ?? prodMatch?.mapPrice ?? vm?.mapPrice;
      const resolvedUnitCost = best?.unitCost || est.dealerCost || 0;
      return {
        id: `line-${idx}-${Date.now()}`,
        ...(est.productId ? { productId: est.productId } : {}),
        productName: est.description || est.itemNumber,
        itemNumber: est.itemNumber,
        qty: est.qty,
        ...(resolvedMap && resolvedMap > 0 ? { mapPrice: resolvedMap } : {}),
        ...(est.unitPrice > 0 ? { customerUnitPrice: est.unitPrice } : {}),
        chosenVendor: best?.vendorName || '',
        contactedRepName: best?.repName || '',
        vendorPhone: best?.phone || '',
        vendorEmail: best?.email || '',
        contactMethod: 'phone',
        contactedDate: new Date().toISOString().slice(0, 10),
        vendorQuoteRef: best?.skuOrPartNo || '',
        quotedUnitCost: resolvedUnitCost,
        shippingCost: best?.shippingCost || 0,
        lineStatus: resolvedUnitCost > 0 && best?.vendorName ? 'quoted' : 'need_to_call',
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
      shippingFee: q.shippingFee ?? draft.shippingFee ?? 0,
      taxRate: q.taxRate ?? draft.taxRate ?? 0,
      processingFeeRate: q.processingFeeRate ?? draft.processingFeeRate ?? 0,
      paymentMethod: q.paymentMethod || draft.paymentMethod || 'none',
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
    const mapVal =
      typeof prod.mapPrice === 'number' && prod.mapPrice > 0 ? prod.mapPrice : vm?.mapPrice;

    const line: OrderLineSourcing = {
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: prod.id,
      productName: prod.name,
      itemNumber: prod.itemNumber || prod.name,
      qty: 1,
      ...(mapVal && mapVal > 0 ? { mapPrice: mapVal, customerUnitPrice: mapVal } : {}),
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

  const renderPrintPreviewModal = () => {
    if (!printPreview) return null;
    const previewOrder = printPreview.order;
    const isAdminCopy = printPreview.mode === 'admin';
    const previewTotals = calculateCustomerOrderTotals(
      previewOrder.items,
      previewOrder.customerQuotedTotal,
      products,
      vendorEntries,
      {
        shippingFee: previewOrder.shippingFee,
        taxRate: previewOrder.taxRate,
        processingFeeRate: previewOrder.processingFeeRate,
      }
    );

    return (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-order-print-title"
      >
        <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col">
          {/* Controls bar (hidden on paper print) */}
          <div className="bg-[#141518] text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
            <div>
              <h4 id="work-order-print-title" className="font-display text-sm font-bold">
                Printable Work Order · {previewOrder.orderCode}
              </h4>
              <p className="text-[11px] text-stone-300">
                Choose Field Crew Copy (hides profit/cost) or Admin Copy (shows MAP, cost &amp; net gain).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg bg-stone-800 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPrintPreview({ ...printPreview, mode: 'field' })}
                  className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                    !isAdminCopy ? 'bg-[#C2842D] text-white' : 'text-stone-300 hover:text-white'
                  }`}
                >
                  Field Crew Copy
                </button>
                <button
                  type="button"
                  onClick={() => setPrintPreview({ ...printPreview, mode: 'admin' })}
                  className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                    isAdminCopy ? 'bg-[#C2842D] text-white' : 'text-stone-300 hover:text-white'
                  }`}
                >
                  Admin Cost &amp; Profit
                </button>
              </div>
              <button
                type="button"
                onClick={() =>
                  downloadWorkOrderPdf(previewOrder, brand, products, vendorEntries, {
                    mode: printPreview.mode,
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-600 text-xs font-semibold hover:bg-stone-800 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Download PDF</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Print Work Order</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintPreview(null)}
                aria-label="Close print preview"
                className="p-1.5 rounded-lg border border-stone-700 text-stone-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Printable Sheet Surface */}
          <div id="eva-printable-work-order" className="p-6 sm:p-8 overflow-y-auto space-y-5 bg-white text-[#141518]">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b-2 border-[#C2842D]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#9A6315]">
                  {isAdminCopy
                    ? 'INTERNAL WORK ORDER · SOURCING & MARGIN RECORD'
                    : 'INSTALLATION & FULFILLMENT WORK ORDER'}
                </p>
                <h2 className="font-display text-2xl font-bold text-[#141518]">{brand.name}</h2>
                <p className="text-xs text-stone-600">
                  {brand.leadEngineer} · {brand.phoneDisplay} · {brand.email}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-base font-bold text-[#141518]">{previewOrder.orderCode}</p>
                {previewOrder.linkedQuoteRef && (
                  <p className="font-mono text-xs text-stone-600">
                    Linked Est: {previewOrder.linkedQuoteRef}
                  </p>
                )}
                <p className="text-xs font-semibold text-[#9A6315] mt-0.5">
                  Stage: {ORDER_STATUS_LABELS[previewOrder.status]}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-[#F8F8F6] border border-stone-200 p-4 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9A6315] mb-1">
                  Customer / Sanctuary
                </p>
                <p className="font-bold text-sm text-[#141518]">{previewOrder.customerName || '—'}</p>
                {previewOrder.organization && <p className="text-stone-700">{previewOrder.organization}</p>}
                <p className="font-mono text-stone-600 mt-0.5">
                  {[previewOrder.customerPhone, previewOrder.customerEmail].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9A6315] mb-1">
                  Schedule &amp; Order Totals
                </p>
                <p>Target Date: <strong>{previewOrder.targetDate || 'TBD'}</strong></p>
                {previewTotals.effectiveCustomerTotal > 0 && (
                  <p>
                    Customer Estimate Total:{' '}
                    <strong className="font-mono">{formatUsd(previewTotals.effectiveCustomerTotal)}</strong>
                  </p>
                )}
              </div>
            </div>

            {isAdminCopy && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 rounded-lg bg-[#141518] text-white p-3.5 text-xs">
                <div>
                  <p className="text-[10px] uppercase text-stone-400">Retail MAP Value</p>
                  <p className="font-mono font-bold text-sm">
                    {previewTotals.totalMapValue > 0 ? formatUsd(previewTotals.totalMapValue) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-stone-400">Product Cost</p>
                  <p className="font-mono font-bold text-sm text-amber-300">
                    {formatUsd(previewTotals.totalVendorSubtotal)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-stone-400">Total Shipping</p>
                  <p className="font-mono font-bold text-sm text-sky-300">
                    {formatUsd(previewTotals.totalShipping)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-stone-400">Total Cost</p>
                  <p className="font-mono font-bold text-sm">
                    {formatUsd(previewTotals.totalLandedCost)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-stone-400">Customer Total</p>
                  <p className="font-mono font-bold text-sm text-[#E0A446]">
                    {previewTotals.effectiveCustomerTotal > 0
                      ? formatUsd(previewTotals.effectiveCustomerTotal)
                      : 'Not set'}
                  </p>
                  {(previewTotals.taxAmount > 0 || previewTotals.processingFeeAmount > 0) && (
                    <p className="text-[10px] text-stone-300">
                      Tax {formatUsd(previewTotals.taxAmount)} · Fee {formatUsd(previewTotals.processingFeeAmount)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase text-stone-400">Your Net Gain</p>
                  <p className="font-mono font-bold text-sm text-emerald-400">
                    {previewTotals.estimatedProfit !== null
                      ? `${formatUsd(previewTotals.estimatedProfit)}${
                          previewTotals.marginPercent !== null ? ` (${previewTotals.marginPercent}%)` : ''
                        }`
                      : '—'}
                  </p>
                </div>
              </div>
            )}

            <table className="w-full text-xs border-collapse border border-stone-300">
              <thead>
                <tr className="bg-[#141518] text-white text-left">
                  <th className="p-2 w-8 text-center">[ ]</th>
                  <th className="p-2 w-14">Qty</th>
                  <th className="p-2">Equipment / SKU</th>
                  <th className="p-2">Vendor / Rep / PO#</th>
                  {isAdminCopy && <th className="p-2 text-right">Cost</th>}
                  {isAdminCopy && <th className="p-2 text-right">Cust $</th>}
                  {isAdminCopy && <th className="p-2 text-right">Gain</th>}
                </tr>
              </thead>
              <tbody>
                {previewOrder.items.map((line) => {
                  const costTotal = line.qty * (line.quotedUnitCost || 0) + (line.shippingCost || 0);
                  const custTotal = line.customerUnitPrice ? line.qty * line.customerUnitPrice : 0;
                  const gain = custTotal > 0 ? custTotal - costTotal : null;
                  return (
                    <tr key={line.id} className="border-b border-stone-200 align-top">
                      <td className="p-2 text-center font-mono">☐</td>
                      <td className="p-2 font-mono font-bold">{line.qty}x</td>
                      <td className="p-2">
                        <p className="font-bold text-[#141518]">
                          {line.itemNumber || line.productName}
                        </p>
                        {line.productName && line.productName !== line.itemNumber && (
                          <p className="text-stone-600">{line.productName}</p>
                        )}
                        {line.lineNotes && (
                          <p className="text-[11px] text-stone-500 mt-0.5">Note: {line.lineNotes}</p>
                        )}
                      </td>
                      <td className="p-2 text-stone-700">
                        <p className="font-semibold">{line.chosenVendor || 'Vendor TBD'}</p>
                        <p className="text-[11px]">
                          {[line.contactedRepName, line.vendorQuoteRef ? `Ref: ${line.vendorQuoteRef}` : '']
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </td>
                      {isAdminCopy && <td className="p-2 text-right font-mono">{formatUsd(costTotal)}</td>}
                      {isAdminCopy && (
                        <td className="p-2 text-right font-mono">
                          {custTotal > 0 ? formatUsd(custTotal) : '—'}
                        </td>
                      )}
                      {isAdminCopy && (
                        <td className="p-2 text-right font-mono font-bold text-emerald-700">
                          {gain !== null ? formatUsd(gain) : '—'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {previewOrder.generalNotes && (
              <div className="rounded-lg border border-stone-200 bg-[#F8F8F6] p-3 text-xs">
                <p className="font-bold text-[#141518] mb-1">Job &amp; Shipping Instructions</p>
                <p className="whitespace-pre-line text-stone-700">{previewOrder.generalNotes}</p>
              </div>
            )}

            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs">
              <p className="font-bold text-[#9A6315] uppercase tracking-wider text-[11px] mb-1">
                Suggestions &amp; Technical Notes
              </p>
              <p className="whitespace-pre-line text-stone-800 min-h-[2.5rem]">
                {previewOrder.engineerSuggestions?.trim() ||
                  'Use this space for engineer field notes, speaker aiming angles, recall-safe preset notes, or customer upgrade suggestions.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-6 text-xs text-stone-600">
              <div className="border-t border-stone-400 pt-1.5">
                Lead Engineer / Installer Signature &amp; Date
              </div>
              <div className="border-t border-stone-400 pt-1.5">
                Customer / Sanctuary Representative Sign-Off
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (draft) {
    const draftTotals = calculateCustomerOrderTotals(
      draft.items,
      draft.customerQuotedTotal,
      products,
      vendorEntries,
      {
        shippingFee: draft.shippingFee,
        taxRate: draft.taxRate,
        processingFeeRate: draft.processingFeeRate,
      }
    );

    return (
      <>
        {renderPrintPreviewModal()}
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="px-3.5 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                Back to Saved Orders
              </button>
              <button
                type="button"
                onClick={() => setPrintPreview({ order: draft, mode: 'field' })}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold text-[#141518] cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#9A6315]" aria-hidden="true" />
                <span>Print Work Order</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadWorkOrderPdf(draft, brand, products, vendorEntries, { mode: 'admin' })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#C2842D] hover:bg-[#B07523] text-white text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Work Order PDF</span>
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

        {/* Live Sourcing, Product Cost vs Total Cost, Shipping & Net Gain Summary Strip */}
        <div className="rounded-xl bg-[#141518] text-white p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 items-center">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-stone-400">
              Retail MAP Value
            </p>
            <p className="font-mono text-sm sm:text-base font-bold text-white">
              {draftTotals.totalMapValue > 0 ? formatUsd(draftTotals.totalMapValue) : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-stone-400">
              Customer Total
            </p>
            <p className="font-mono text-sm sm:text-base font-bold text-[#E0A446]">
              {draftTotals.effectiveCustomerTotal > 0
                ? formatUsd(draftTotals.effectiveCustomerTotal)
                : 'Not set'}
            </p>
            {draftTotals.customerSavingsVsMap !== null && draftTotals.customerSavingsVsMap > 0.01 && (
              <p className="text-[10px] text-emerald-300 font-semibold">
                Saves {formatUsd(draftTotals.customerSavingsVsMap)} vs MAP
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-stone-400">
              Product Cost (No Ship)
            </p>
            <p className="font-mono text-sm sm:text-base font-bold text-amber-300">
              {formatUsd(draftTotals.totalVendorSubtotal)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-stone-400">
              Total Shipping
            </p>
            <p className="font-mono text-sm sm:text-base font-bold text-sky-300">
              {formatUsd(draftTotals.totalShipping)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-stone-400">
              Total Cost (Prod + Ship)
            </p>
            <p className="font-mono text-sm sm:text-base font-bold text-white">
              {formatUsd(draftTotals.totalLandedCost)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-stone-400">
              Your Net Gain
            </p>
            <p
              className={`font-mono text-sm sm:text-base font-bold ${
                draftTotals.estimatedProfit !== null && draftTotals.estimatedProfit >= 0
                  ? 'text-emerald-400'
                  : 'text-stone-300'
              }`}
            >
              {draftTotals.estimatedProfit !== null
                ? `${formatUsd(draftTotals.estimatedProfit)}${
                    draftTotals.marginPercent !== null ? ` (${draftTotals.marginPercent}%)` : ''
                  }`
                : '—'}
            </p>
            {draftTotals.unquotedLineCount > 0 && (
              <p className="text-[10px] text-amber-300 inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>{draftTotals.unquotedLineCount} TBD</span>
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
                        Vendor Cost ($/ea)
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
                        className="w-full px-2.5 py-1.5 text-xs font-mono bg-amber-50/70 border border-amber-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        Retail MAP ($/ea)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.mapPrice ?? ''}
                        onChange={(e) =>
                          updateLine(idx, {
                            mapPrice:
                              e.target.value === '' ? undefined : Number(e.target.value) || 0,
                          })
                        }
                        placeholder="MAP $"
                        className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#F8F8F6] border border-stone-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-800 mb-0.5">
                        Customer Price ($/ea)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.customerUnitPrice ?? ''}
                        onChange={(e) =>
                          updateLine(idx, {
                            customerUnitPrice:
                              e.target.value === '' ? undefined : Number(e.target.value) || 0,
                          })
                        }
                        placeholder="Est $"
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-emerald-400 rounded-md"
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

                  {/* Under-Item Shipping & Card Processing Fee Strip */}
                  <div className="rounded-lg bg-[#F8F8F6] border border-stone-200 px-3 py-2 flex flex-wrap items-center justify-between gap-3 text-[11px]">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label
                          htmlFor={`ord-item-ship-${line.id}`}
                          className="font-semibold text-stone-700 whitespace-nowrap"
                        >
                          Product Shipping ($):
                        </label>
                        <input
                          id={`ord-item-ship-${line.id}`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.shippingCost || ''}
                          onChange={(e) =>
                            updateLine(idx, {
                              shippingCost: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          placeholder="0.00"
                          className="w-24 px-2 py-1 text-xs font-mono bg-white border border-stone-300 rounded"
                        />
                      </div>
                      <label className="inline-flex items-center gap-1.5 text-stone-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={line.applyProcessingFee !== false}
                          onChange={(e) =>
                            updateLine(idx, { applyProcessingFee: e.target.checked })
                          }
                          className="rounded border-stone-300 text-[#9A6315]"
                        />
                        <span>Apply Card Processing Fee (%)</span>
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-stone-700 font-mono">
                      <span>
                        Product Cost: <strong>{formatUsd(Math.max(1, line.qty) * (line.quotedUnitCost || 0))}</strong>
                      </span>
                      <span>
                        Ship: <strong>{formatUsd(line.shippingCost || 0)}</strong>
                      </span>
                      {line.customerUnitPrice && line.customerUnitPrice > 0 && (
                        <span className="font-bold text-emerald-700">
                          Cust. Ext: {formatUsd(Math.max(1, line.qty) * line.customerUnitPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Order Totals: Total Shipping, Adjustable Tax %, Bluevine/Stripe Processing Fee & Separated Costs */}
          <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-7 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ord-freight" className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Extra Order Freight / Delivery ($)
                  </label>
                  <input
                    id="ord-freight"
                    type="number"
                    min={0}
                    step="0.01"
                    value={draft.shippingFee ?? 0}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        shippingFee: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="ord-tax-rate" className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Sales Tax (%) — Adjustable
                  </label>
                  <input
                    id="ord-tax-rate"
                    type="number"
                    min={0}
                    max={30}
                    step="0.1"
                    value={draft.taxRate ?? 0}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        taxRate: Math.max(0, Math.min(30, Number(e.target.value) || 0)),
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-stone-200 bg-white p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#141518]">
                    Payment Processing Fee (Bluevine / Stripe / Credit Card)
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-[#9A6315]">
                    {formatUsd(draftTotals.processingFeeAmount)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      { id: 'none', label: 'Cash / Check / ACH (0%)', rate: 0 },
                      { id: 'stripe', label: 'Stripe (2.9%)', rate: 2.9 },
                      { id: 'bluevine', label: 'Bluevine / Card (3.0%)', rate: 3.0 },
                    ] as Array<{ id: PaymentProcessingMethod; label: string; rate: number }>
                  ).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          paymentMethod: preset.id,
                          processingFeeRate: preset.rate,
                        })
                      }
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold border cursor-pointer ${
                        (draft.paymentMethod || 'none') === preset.id
                          ? 'bg-[#141518] text-white border-[#141518]'
                          : 'bg-[#F8F8F6] text-stone-700 border-stone-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <label htmlFor="ord-fee-rate" className="text-[11px] font-semibold text-stone-700">
                      Fee %:
                    </label>
                    <input
                      id="ord-fee-rate"
                      type="number"
                      min={0}
                      max={15}
                      step="0.1"
                      value={draft.processingFeeRate ?? 0}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(15, Number(e.target.value) || 0));
                        setDraft({
                          ...draft,
                          processingFeeRate: val,
                          paymentMethod: val === 0 ? 'none' : 'custom',
                        });
                      }}
                      className="w-20 px-2 py-1 text-xs font-mono bg-white border border-stone-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-lg bg-white border border-stone-200 p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between text-amber-900">
                <span>Product Cost (No Shipping):</span>
                <span className="font-mono font-bold">{formatUsd(draftTotals.totalVendorSubtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>
                  Total Shipping ({formatUsd(draftTotals.itemsShippingTotal)} items
                  {draftTotals.extraShippingFee > 0 ? ` + ${formatUsd(draftTotals.extraShippingFee)} freight` : ''}):
                </span>
                <span className="font-mono font-semibold">{formatUsd(draftTotals.totalShipping)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#141518] pb-1.5 border-b border-stone-200">
                <span>Total Cost (Product + Shipping):</span>
                <span className="font-mono">{formatUsd(draftTotals.totalLandedCost)}</span>
              </div>
              <div className="flex justify-between text-stone-700 pt-0.5">
                <span>Sales Tax ({draft.taxRate ?? 0}%):</span>
                <span className="font-mono font-semibold">{formatUsd(draftTotals.taxAmount)}</span>
              </div>
              {draftTotals.processingFeeAmount > 0 && (
                <div className="flex justify-between text-stone-700">
                  <span>
                    {draft.paymentMethod === 'bluevine'
                      ? 'Bluevine Card Fee'
                      : draft.paymentMethod === 'stripe'
                        ? 'Stripe Card Fee'
                        : 'Processing Fee'}{' '}
                    ({draft.processingFeeRate ?? 0}%):
                  </span>
                  <span className="font-mono font-semibold">{formatUsd(draftTotals.processingFeeAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t border-stone-200 text-sm font-bold text-[#141518]">
                <span>Customer Grand Total:</span>
                <span className="font-mono text-[#9A6315]">{formatUsd(draftTotals.effectiveCustomerTotal)}</span>
              </div>
            </div>
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

        {/* General Order Notes & Printable Work Order Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="ord-general-notes"
              className="block text-xs font-semibold text-stone-700 mb-1"
            >
              Overall Order &amp; Shipping Reminders (Work Order Instructions)
            </label>
            <textarea
              id="ord-general-notes"
              rows={3}
              value={draft.generalNotes}
              onChange={(e) => setDraft({ ...draft, generalNotes: e.target.value })}
              placeholder="Double-check connector types, drop-ship address, liftgate delivery needed, etc..."
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
            />
          </div>

          <div>
            <label
              htmlFor="ord-suggestions"
              className="block text-xs font-semibold text-[#9A6315] mb-1"
            >
              Suggestions &amp; Technical Notes (Printed on Work Order)
            </label>
            <textarea
              id="ord-suggestions"
              rows={3}
              value={draft.engineerSuggestions || ''}
              onChange={(e) => setDraft({ ...draft, engineerSuggestions: e.target.value })}
              placeholder="Recommended speaker rigging angles, spare cable suggestions, room EQ reminders, volunteer checklist..."
              className="w-full px-3 py-2 text-sm bg-amber-50/40 border border-amber-300 rounded-lg"
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-stone-200">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPrintPreview({ order: draft, mode: 'field' })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#9A6315]" aria-hidden="true" />
              <span>Print Work Order</span>
            </button>
            <button
              type="button"
              onClick={() =>
                downloadWorkOrderPdf(draft, brand, products, vendorEntries, { mode: 'field' })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Crew Work Order PDF</span>
            </button>
            <button
              type="button"
              onClick={() =>
                downloadWorkOrderPdf(draft, brand, products, vendorEntries, { mode: 'admin' })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Admin Profit Work Order PDF</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
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
        </div>
        </form>
      </>
    );
  }

  return (
    <div className="space-y-5">
      {renderPrintPreviewModal()}
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
          <div className="relative w-full sm:w-56">
            <Search
              className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="orders-search" className="sr-only">
              Search customer orders
            </label>
            <input
              id="orders-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, rep, gear..."
              className="w-full pl-8 pr-7 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear orders search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select
            aria-label="Filter customer orders by status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | CustomerOrderStatus)
            }
            className="px-2.5 py-2 text-xs font-semibold bg-white border border-stone-300 rounded-lg"
          >
            <option value="all">All Stages ({orders.length})</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, lbl]) => (
              <option key={k} value={k}>
                {lbl}
              </option>
            ))}
          </select>
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
              order.customerQuotedTotal,
              products,
              vendorEntries,
              {
                shippingFee: order.shippingFee,
                taxRate: order.taxRate,
                processingFeeRate: order.processingFeeRate,
              }
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
                        Prod: {formatUsd(totals.totalVendorSubtotal)} · Ship: {formatUsd(totals.totalShipping)} · Total Cost: {formatUsd(totals.totalLandedCost)}
                        {totals.estimatedProfit !== null
                          ? ` · Gain: ${formatUsd(totals.estimatedProfit)}`
                          : ''}
                      </p>
                      <p className="text-[11px] text-stone-500">
                        {totals.totalMapValue > 0 ? `MAP: ${formatUsd(totals.totalMapValue)} · ` : ''}
                        {totals.taxAmount > 0 ? `Tax: ${formatUsd(totals.taxAmount)} · ` : ''}
                        {totals.processingFeeAmount > 0 ? `Fee: ${formatUsd(totals.processingFeeAmount)} · ` : ''}
                        {order.items.length} line{order.items.length === 1 ? '' : 's'} ·{' '}
                        {order.callLogs.length} call{order.callLogs.length === 1 ? '' : 's'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPrintPreview({ order, mode: 'field' })}
                      className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-[#141518] text-xs font-semibold cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#9A6315]" aria-hidden="true" />
                      <span>Print</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        downloadWorkOrderPdf(order, brand, products, vendorEntries, {
                          mode: 'admin',
                        })
                      }
                      aria-label={`Download Work Order PDF for ${order.orderCode}`}
                      className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-[#C2842D] hover:bg-[#B07523] text-white text-xs font-semibold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>PDF</span>
                    </button>

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
