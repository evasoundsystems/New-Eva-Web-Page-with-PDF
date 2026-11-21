import { useMemo, useState } from 'react';
import {
  Building2,
  Download,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  CustomerAccount,
  CustomerPricingTier,
  MemberPricingConfig,
} from '../types/site';
import {
  formatCustomersToCsv,
  getCustomerEffectiveDiscountPercent,
  mergeMemberPricing,
} from '../utils/siteLogic';

interface AdminCustomersTabProps {
  customers: CustomerAccount[];
  loading: boolean;
  memberPricing?: MemberPricingConfig;
  onSaveCustomer: (
    customer: CustomerAccount,
    isExisting: boolean
  ) => Promise<CustomerAccount | null>;
  onDeleteCustomer: (id: string) => Promise<void>;
}

const TIER_OPTIONS: Array<{ value: CustomerPricingTier; label: string }> = [
  { value: 'vip', label: 'VIP Member' },
  { value: 'church_partner', label: 'Church Partner' },
  { value: 'dealer_pro', label: 'Dealer Pro' },
];

export function AdminCustomersTab({
  customers,
  loading,
  memberPricing: rawMemberPricing,
  onSaveCustomer,
  onDeleteCustomer,
}: AdminCustomersTabProps) {
  const memberPricing = mergeMemberPricing(rawMemberPricing);

  const [searchQuery, setSearchQuery] = useState('');
  const [draft, setDraft] = useState<CustomerAccount | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      `${c.fullName} ${c.organization} ${c.email} ${c.phone} ${c.pricingTier} ${c.status} ${c.notes}`
        .toLowerCase()
        .includes(q)
    );
  }, [customers, searchQuery]);

  function startNewCustomer() {
    const nowIso = new Date().toISOString();
    setDraft({
      id: `cust-${Date.now()}`,
      authProvider: 'email',
      fullName: '',
      organization: '',
      phone: '',
      email: '',
      status: 'active',
      pricingTier: 'vip',
      notes: '',
      createdAt: nowIso,
      lastLoginAt: nowIso,
      loginCount: 1,
    });
  }

  async function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || !draft.fullName.trim() || !draft.email.trim()) return;
    setSaving(true);
    try {
      const isExisting = customers.some((c) => c.id === draft.id);
      await onSaveCustomer(draft, isExisting);
      setDraft(null);
    } finally {
      setSaving(false);
    }
  }

  function handleExportCsv() {
    const csv = formatCustomersToCsv(customers);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eva-vip-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      {/* Header + Search Co-located Beside + Add VIP Customer */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-stone-200">
        <div>
          <h3 className="font-display text-lg font-bold text-[#141518]">
            Logged-In Customers &amp; VIP Pricing Directory ({customers.length})
          </h3>
          <p className="text-xs text-stone-600">
            View everyone who created a VIP account or signed in, inspect login history, and set custom discounts per customer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!draft && (
            <>
              <div className="relative min-w-[210px] sm:w-64">
                <Search
                  className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <label htmlFor="customers-search" className="sr-only">
                  Search logged-in customers
                </label>
                <input
                  id="customers-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, church, email..."
                  className="w-full pl-8 pr-7 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear customer search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={startNewCustomer}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#C2842D] hover:bg-[#B07523] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Add VIP Customer</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={customers.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Customer Form */}
      {draft && (
        <form
          onSubmit={handleSaveDraft}
          className="rounded-xl border border-[#C2842D]/50 bg-[#F8F8F6] p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-display text-base font-bold text-[#141518]">
              {customers.some((c) => c.id === draft.id)
                ? `Edit Customer: ${draft.fullName}`
                : 'Add New VIP Customer Account'}
            </h4>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="text-xs font-semibold text-stone-600 hover:text-[#141518] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div>
              <label htmlFor="admin-cust-name" className="block text-xs font-semibold text-stone-700 mb-1">
                Full Name *
              </label>
              <input
                id="admin-cust-name"
                type="text"
                required
                value={draft.fullName}
                onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
                placeholder="Pastor / Buyer Name"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="admin-cust-org" className="block text-xs font-semibold text-stone-700 mb-1">
                Church / Organization
              </label>
              <input
                id="admin-cust-org"
                type="text"
                value={draft.organization}
                onChange={(e) => setDraft({ ...draft, organization: e.target.value })}
                placeholder="Church or company"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="admin-cust-phone" className="block text-xs font-semibold text-stone-700 mb-1">
                Phone
              </label>
              <input
                id="admin-cust-phone"
                type="text"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                placeholder="(414) 555-0199"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="admin-cust-email" className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address *
              </label>
              <input
                id="admin-cust-email"
                type="email"
                required
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                placeholder="buyer@church.org"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="admin-cust-tier" className="block text-xs font-semibold text-stone-700 mb-1">
                Pricing Tier
              </label>
              <select
                id="admin-cust-tier"
                value={draft.pricingTier}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    pricingTier: e.target.value as CustomerPricingTier,
                  })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
              >
                {TIER_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="admin-cust-status" className="block text-xs font-semibold text-stone-700 mb-1">
                Account Status
              </label>
              <select
                id="admin-cust-status"
                value={draft.status}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    status: e.target.value as CustomerAccount['status'],
                  })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
              >
                <option value="active">Active (VIP Pricing On)</option>
                <option value="pending">Pending Approval</option>
                <option value="paused">Paused (MAP Only)</option>
              </select>
            </div>

            <div>
              <label htmlFor="admin-cust-provider" className="block text-xs font-semibold text-stone-700 mb-1">
                Sign-In Method
              </label>
              <select
                id="admin-cust-provider"
                value={draft.authProvider}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    authProvider: e.target.value as 'google' | 'email',
                  })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
              >
                <option value="email">Email &amp; Password</option>
                <option value="google">Google Sign-In</option>
              </select>
            </div>

            <div>
              <label htmlFor="admin-cust-discount" className="block text-xs font-semibold text-stone-700 mb-1">
                Custom Discount % (Optional Override)
              </label>
              <input
                id="admin-cust-discount"
                type="number"
                min={0}
                max={90}
                step="0.5"
                value={draft.customDiscountPercent ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const parsed = val === '' ? undefined : Number(val);
                  setDraft({
                    ...draft,
                    customDiscountPercent:
                      parsed !== undefined && Number.isFinite(parsed)
                        ? parsed
                        : undefined,
                  });
                }}
                placeholder="Blank = use tier default"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label htmlFor="admin-cust-notes" className="block text-xs font-semibold text-stone-700 mb-1">
                Internal Admin Notes
              </label>
              <input
                id="admin-cust-notes"
                type="text"
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Preferred shipping, tax-exempt #, special pricing..."
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
              />
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
              {saving ? 'Saving Customer...' : 'Save Customer Account'}
            </button>
          </div>
        </form>
      )}

      {/* Directory List */}
      {loading ? (
        <div className="py-10 text-center text-xs text-stone-500">
          Loading registered customers...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-8 text-center space-y-2">
          <UserCheck className="w-8 h-8 text-stone-400 mx-auto" aria-hidden="true" />
          <p className="font-display text-sm font-bold text-[#141518]">
            {customers.length === 0
              ? 'No customers have signed in yet'
              : 'No customers match your search'}
          </p>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            {customers.length === 0
              ? 'When customers log in via "Member Login · Exclusive Pricing" on your storefront, their name, church, phone, email, and login count automatically appear here.'
              : 'Try searching a different name, church, or email address.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((cust) => {
            const effectiveDiscount = getCustomerEffectiveDiscountPercent(
              cust,
              memberPricing
            );
            const statusColor =
              cust.status === 'active'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : cust.status === 'pending'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-stone-100 text-stone-600 border-stone-300';

            return (
              <div
                key={cust.id}
                className="rounded-xl border border-stone-200 bg-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-base font-bold text-[#141518]">
                      {cust.fullName}
                    </p>
                    <span
                      className={`px-2 py-0.5 rounded border text-[11px] font-bold uppercase ${statusColor}`}
                    >
                      {cust.status}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#141518] text-[#E0A446] text-[11px] font-bold uppercase">
                      {cust.pricingTier.replace('_', ' ')} · -{effectiveDiscount}%
                    </span>
                    <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 text-[11px] font-semibold uppercase">
                      {cust.authProvider}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600">
                    {cust.organization && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
                        <span>{cust.organization}</span>
                      </span>
                    )}
                    {cust.email && (
                      <a
                        href={`mailto:${cust.email}`}
                        className="inline-flex items-center gap-1 hover:text-[#1a73e8]"
                      >
                        <Mail className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
                        <span>{cust.email}</span>
                      </a>
                    )}
                    {cust.phone && (
                      <a
                        href={`tel:${cust.phone.replace(/[^\d+]/g, '')}`}
                        className="inline-flex items-center gap-1 font-mono hover:text-[#1a73e8]"
                      >
                        <Phone className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
                        <span>{cust.phone}</span>
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500">
                    <span>
                      Logins: <strong className="font-mono text-stone-700">{cust.loginCount}</strong>
                    </span>
                    <span>
                      Last Login:{' '}
                      <strong className="font-mono text-stone-700">
                        {(cust.lastLoginAt || '').slice(0, 10) || '—'}
                      </strong>
                    </span>
                    <span>
                      Joined:{' '}
                      <strong className="font-mono text-stone-700">
                        {(cust.createdAt || '').slice(0, 10) || '—'}
                      </strong>
                    </span>
                    {cust.notes && (
                      <span className="text-stone-700 italic">Note: {cust.notes}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDraft({ ...cust })}
                    aria-label={`Edit customer ${cust.fullName}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" aria-hidden="true" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCustomer(cust.id)}
                    aria-label={`Delete customer ${cust.fullName}`}
                    className="p-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
