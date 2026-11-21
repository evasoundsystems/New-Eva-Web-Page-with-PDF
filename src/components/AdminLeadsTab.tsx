import { useState } from 'react';
import {
  Check,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  BrandConfig,
  GearProduct,
  QuoteRecord,
  QuoteStatus,
  QuoteSubmissionInput,
  QuoteUpdateInput,
} from '../types/site';
import {
  formatQuotesToCsv,
  formatQuotesToTsv,
  formatUsd,
  prepareQuoteForPdf,
} from '../utils/siteLogic';
import { downloadEstimatePdf } from '../utils/estimatePdf';
import { AdminEstimateEditor } from './AdminEstimateEditor';

interface AdminLeadsTabProps {
  quotes: QuoteRecord[];
  loading: boolean;
  products: GearProduct[];
  brand: BrandConfig;
  onCreateEstimate: (
    payload: QuoteSubmissionInput & QuoteUpdateInput
  ) => Promise<QuoteRecord | null>;
  onUpdateQuote: (id: string, updates: QuoteUpdateInput) => Promise<QuoteRecord | null>;
  onDeleteQuote: (id: string) => Promise<void>;
  onOpenOrderSheet?: (quote: QuoteRecord) => void;
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  new: 'New Lead',
  contacted: 'In Contact',
  scheduled: 'Scheduled',
  completed: 'Completed',
};

export function AdminLeadsTab({
  quotes,
  loading,
  products,
  brand,
  onCreateEstimate,
  onUpdateQuote,
  onDeleteQuote,
  onOpenOrderSheet,
}: AdminLeadsTabProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | QuoteStatus>('all');
  const [copiedTsv, setCopiedTsv] = useState(false);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [editingEstimate, setEditingEstimate] = useState<QuoteRecord | 'new' | null>(null);

  if (editingEstimate !== null) {
    return (
      <AdminEstimateEditor
        initialQuote={editingEstimate === 'new' ? null : editingEstimate}
        products={products}
        brand={brand}
        onCancel={() => setEditingEstimate(null)}
        onSaveNew={onCreateEstimate}
        onSaveExisting={onUpdateQuote}
      />
    );
  }

  const filtered =
    statusFilter === 'all' ? quotes : quotes.filter((q) => q.status === statusFilter);

  function handleDownloadCsv() {
    const csv = formatQuotesToCsv(quotes);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eva-worship-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopyForSheets() {
    const tsv = formatQuotesToTsv(quotes);
    try {
      await navigator.clipboard.writeText(tsv);
      setCopiedTsv(true);
      setTimeout(() => setCopiedTsv(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-stone-200">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100 rounded-lg">
          {(['all', 'new', 'contacted', 'scheduled', 'completed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-[#141518] shadow-xs'
                  : 'text-stone-600 hover:text-[#141518]'
              }`}
            >
              {st === 'all' ? `All (${quotes.length})` : STATUS_LABELS[st]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditingEstimate('new')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#C2842D] hover:bg-[#B07523] text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>New Customer Estimate</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={quotes.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>CSV (Sheets)</span>
          </button>

          <button
            type="button"
            onClick={handleCopyForSheets}
            disabled={quotes.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 disabled:opacity-40 text-[#141518] text-xs font-semibold cursor-pointer"
          >
            {copiedTsv ? (
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

      {/* Leads List */}
      {loading ? (
        <p className="text-sm text-stone-500 py-8 text-center">Loading customer requests...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-8 text-center">
          <p className="text-sm font-semibold text-[#141518] mb-1">
            No quote requests in this view yet
          </p>
          <p className="text-xs text-stone-500">
            Customer requests appear here automatically, or click &ldquo;New Customer Estimate&rdquo; above to create one from scratch.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((q) => {
            const noteDraft =
              editingNotes[q.id] !== undefined ? editingNotes[q.id] : q.engineerNotes;
            const savedItems = q.estimateItems ?? [];
            const hasSavedEstimate = savedItems.length > 0 || Boolean(q.coverLetter);
            const { resolvedQuote, totals } = prepareQuoteForPdf(q, products);
            const resolvedCount = resolvedQuote.estimateItems?.length ?? 0;

            return (
              <div
                key={q.id}
                className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-4 sm:p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mb-1">
                      <span className="font-mono font-semibold text-[#9A6315]">{q.refCode}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{q.createdAt.slice(0, 10)}</span>
                      {q.organization && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-stone-700">{q.organization}</span>
                        </>
                      )}
                      {hasSavedEstimate ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono font-semibold text-emerald-800">
                            Saved Estimate: {savedItems.length} item{savedItems.length === 1 ? '' : 's'} ({formatUsd(totals.total)})
                          </span>
                        </>
                      ) : resolvedCount > 0 ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono font-semibold text-[#9A6315]">
                            Quote Cart: {resolvedCount} item{resolvedCount === 1 ? '' : 's'} ({formatUsd(totals.total)})
                          </span>
                        </>
                      ) : null}
                    </div>
                    <h4 className="font-display text-base font-bold text-[#141518]">
                      {q.contactName} — {q.serviceRequested}
                    </h4>
                    <p className="text-xs text-stone-600 mt-1">
                      Phone: <span className="font-mono">{q.phone}</span>
                      {q.email ? ` · Email: ${q.email}` : ''}
                      {q.soundboardModel ? ` · Console: ${q.soundboardModel}` : ''}
                      {q.roomCapacity ? ` · Capacity: ${q.roomCapacity}` : ''}
                      {q.timeline ? ` · Timeline: ${q.timeline}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label htmlFor={`status-${q.id}`} className="sr-only">
                      Lead status
                    </label>
                    <select
                      id={`status-${q.id}`}
                      value={q.status}
                      onChange={(e) =>
                        onUpdateQuote(q.id, { status: e.target.value as QuoteStatus })
                      }
                      className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-stone-300 rounded-lg text-[#141518]"
                    >
                      <option value="new">New Lead</option>
                      <option value="contacted">In Contact</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => onDeleteQuote(q.id)}
                      aria-label={`Delete lead ${q.refCode}`}
                      className="p-1.5 rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {q.notes && (
                  <p className="text-xs text-stone-700 bg-white p-3 rounded-lg border border-stone-200 whitespace-pre-line">
                    <span className="font-semibold">Customer Notes:</span> {q.notes}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={noteDraft}
                    onChange={(e) =>
                      setEditingNotes((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    placeholder="Private engineer notes (e.g. Scheduled site visit Saturday 10am)..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#9A6315]"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateQuote(q.id, { engineerNotes: noteDraft })}
                    className="px-3 py-1.5 rounded-lg bg-[#141518] text-white text-xs font-semibold hover:bg-[#272A30] cursor-pointer"
                  >
                    Save Note
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingEstimate(q)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#C2842D] hover:bg-[#B07523] text-white text-xs font-semibold cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        {q.status === 'completed' || hasSavedEstimate
                          ? 'Edit Estimate & Items'
                          : 'Add Products & Customize'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadEstimatePdf(resolvedQuote, brand, totals)}
                      aria-label={`Download as PDF for ${q.refCode}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#141518] hover:bg-[#272A30] text-white text-xs font-semibold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Download as PDF</span>
                    </button>

                    {onOpenOrderSheet && (
                      <button
                        type="button"
                        onClick={() => onOpenOrderSheet(q)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#1a73e8] bg-white hover:bg-blue-50 text-[#1a73e8] text-xs font-semibold cursor-pointer"
                      >
                        <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Work Order Sheet</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`tel:${q.phone.replace(/[^\d+]/g, '')}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-stone-300 text-xs font-semibold text-[#141518] hover:bg-stone-100"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#9A6315]" />
                      <span>Call</span>
                    </a>
                    <a
                      href={`sms:${q.phone.replace(/[^\d+]/g, '')}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-stone-300 text-xs font-semibold text-[#141518] hover:bg-stone-100"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#9A6315]" />
                      <span>SMS</span>
                    </a>
                    {q.email && (
                      <a
                        href={`mailto:${q.email}?subject=${encodeURIComponent(
                          `Re: Your E.V.A Worship Engineer Quote (${q.refCode})`
                        )}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-stone-300 text-xs font-semibold text-[#141518] hover:bg-stone-100"
                      >
                        <Mail className="w-3.5 h-3.5 text-[#9A6315]" />
                        <span>Email</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
