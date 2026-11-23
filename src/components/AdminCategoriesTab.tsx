import { useMemo, useState } from 'react';
import {
  Check,
  FolderPlus,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import type { CatalogCategoryConfig, GearProduct } from '../types/site';
import {
  BUILT_IN_CATALOG_CATEGORIES,
  SUGGESTED_CUSTOM_CATEGORIES,
  createCustomCategoryEntry,
  getAllCatalogCategories,
  sanitizeCustomCategories,
  slugifyCategoryId,
} from '../utils/catalogCategories';

interface AdminCategoriesTabProps {
  customCategories?: readonly CatalogCategoryConfig[];
  products: readonly GearProduct[];
  onSaveCategories: (
    nextCustomCategories: CatalogCategoryConfig[],
    reassignedProducts?: GearProduct[]
  ) => Promise<void> | void;
}

export function AdminCategoriesTab({
  customCategories: rawCustomCategories,
  products,
  onSaveCategories,
}: AdminCategoriesTabProps) {
  const customCategories = useMemo(
    () => sanitizeCustomCategories(rawCustomCategories),
    [rawCustomCategories]
  );
  const allCategories = useMemo(
    () => getAllCatalogCategories(customCategories),
    [customCategories]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of products) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, [products]);

  const [labelEn, setLabelEn] = useState('');
  const [labelEs, setLabelEs] = useState('');
  const [hint, setHint] = useState('');
  const [formError, setFormError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabelEn, setEditLabelEn] = useState('');
  const [editLabelEs, setEditLabelEs] = useState('');
  const [editHint, setEditHint] = useState('');

  const [deletingCategory, setDeletingCategory] = useState<CatalogCategoryConfig | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>('cases');

  const previewSlug = useMemo(() => slugifyCategoryId(labelEn), [labelEn]);

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setStatusMessage('');

    const { category, error } = createCustomCategoryEntry(
      { labelEn, labelEs, hint },
      customCategories
    );
    if (!category || error) {
      setFormError(error || 'Unable to create category.');
      return;
    }

    setSaving(true);
    try {
      await onSaveCategories([...customCategories, category]);
      setLabelEn('');
      setLabelEs('');
      setHint('');
      setStatusMessage(
        `Added "${category.labelEn}" — it is now available in Add Product, Bulk Add Sweetwater/Full Compass, and your public storefront.`
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickAddTemplate(template: CatalogCategoryConfig) {
    setFormError('');
    setStatusMessage('');
    const { category, error } = createCustomCategoryEntry(
      {
        id: template.id,
        labelEn: template.labelEn,
        labelEs: template.labelEs,
        hint: template.hint,
      },
      customCategories
    );
    if (!category || error) {
      setFormError(error || 'Category already exists.');
      return;
    }

    setSaving(true);
    try {
      await onSaveCategories([...customCategories, category]);
      setStatusMessage(
        `Added "${category.labelEn}" to your storefront & product picker.`
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(cat: CatalogCategoryConfig) {
    setEditingId(cat.id);
    setEditLabelEn(cat.labelEn);
    setEditLabelEs(cat.labelEs);
    setEditHint(cat.hint || '');
    setFormError('');
    setStatusMessage('');
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const cleanEn = editLabelEn.trim().slice(0, 60);
    if (cleanEn.length < 2) {
      setFormError('Category name must be at least 2 characters.');
      return;
    }
    const cleanEs = editLabelEs.trim().slice(0, 60) || cleanEn;
    const cleanHint = editHint.trim().slice(0, 140) || `Custom storefront department: ${cleanEn}`;

    const next = customCategories.map((cat) =>
      cat.id === editingId
        ? {
            ...cat,
            labelEn: cleanEn,
            labelEs: cleanEs,
            shortLabel: cleanEn.slice(0, 32),
            hint: cleanHint,
          }
        : cat
    );

    setSaving(true);
    try {
      await onSaveCategories(next);
      setEditingId(null);
      setStatusMessage(`Updated category "${cleanEn}".`);
    } finally {
      setSaving(false);
    }
  }

  function requestDelete(cat: CatalogCategoryConfig) {
    setDeletingCategory(cat);
    const defaultFallback = /mic|capsule|drum/i.test(cat.labelEn)
      ? 'mics'
      : /sub|speaker/i.test(cat.labelEn)
        ? 'speakers'
        : /mount|clamp|truss|rig|hardware/i.test(cat.labelEn)
          ? 'rigging'
          : 'cases';
    setReassignTargetId(defaultFallback);
  }

  async function confirmDelete() {
    if (!deletingCategory) return;
    const targetId = deletingCategory.id;
    const affectedCount = categoryCounts[targetId] || 0;
    const nextCustom = customCategories.filter((c) => c.id !== targetId);
    const nextProducts =
      affectedCount > 0
        ? products.map((p) =>
            p.category === targetId ? { ...p, category: reassignTargetId } : p
          )
        : undefined;

    setSaving(true);
    try {
      await onSaveCategories(nextCustom, nextProducts);
      setStatusMessage(
        affectedCount > 0
          ? `Removed "${deletingCategory.labelEn}" and moved its ${affectedCount} product(s) safely.`
          : `Removed custom category "${deletingCategory.labelEn}".`
      );
      setDeletingCategory(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-stone-200">
        <h3 className="font-display text-lg font-bold text-[#141518]">
          Storefront Categories &amp; Departments ({allCategories.length})
        </h3>
        <p className="text-xs text-stone-600 mt-0.5">
          Create custom departments like <strong>Subwoofer Mounts</strong>,{' '}
          <strong>Mounting Hardware</strong>, <strong>Drum Mics</strong>, or{' '}
          <strong>Mic Capsules</strong> so every product you add (single or Sweetwater / Full Compass bulk paste) lands in the exact right place for your customers.
        </p>
      </div>

      {statusMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-900 flex items-center justify-between gap-2">
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage('')}
            aria-label="Dismiss category notice"
            className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {formError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
          {formError}
        </div>
      )}

      {/* Add New Custom Category Form */}
      <form
        onSubmit={handleCreateCategory}
        className="rounded-xl border border-[#C2842D]/50 bg-[#F8F8F6] p-4 sm:p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <FolderPlus className="w-4 h-4 text-[#9A6315]" aria-hidden="true" />
          <h4 className="font-display text-sm sm:text-base font-bold text-[#141518]">
            Add a New Storefront Category
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="new-cat-en"
              className="block text-xs font-semibold text-stone-700 mb-1"
            >
              Category Name *
            </label>
            <input
              id="new-cat-en"
              type="text"
              required
              maxLength={60}
              value={labelEn}
              onChange={(e) => setLabelEn(e.target.value)}
              placeholder="e.g. Subwoofer Mounts & Poles"
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
            />
            {previewSlug && (
              <p className="text-[10px] font-mono text-stone-500 mt-1">
                Category ID: {previewSlug}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="new-cat-es"
              className="block text-xs font-semibold text-stone-700 mb-1"
            >
              Spanish Label (Optional)
            </label>
            <input
              id="new-cat-es"
              type="text"
              maxLength={60}
              value={labelEs}
              onChange={(e) => setLabelEs(e.target.value)}
              placeholder="Auto-fills from English if blank"
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
            />
          </div>

          <div>
            <label
              htmlFor="new-cat-hint"
              className="block text-xs font-semibold text-stone-700 mb-1"
            >
              What Goes Here? (Optional)
            </label>
            <input
              id="new-cat-hint"
              type="text"
              maxLength={140}
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g. Sub poles, wall brackets, clamps & bolts"
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-stone-600">
            New categories appear immediately in <strong>Add Product</strong>,{' '}
            <strong>Bulk Add Sweetwater / Full Compass</strong>, and your live storefront filter bar.
          </p>
          <button
            type="submit"
            disabled={saving || labelEn.trim().length < 2}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C2842D] hover:bg-[#B07523] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{saving ? 'Saving...' : 'Create Category'}</span>
          </button>
        </div>
      </form>

      {/* 1-Click Quick-Add Pro Audio Templates */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#1a73e8]" aria-hidden="true" />
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#141518]">
              1-Click Suggested Pro Audio Categories
            </h4>
            <p className="text-[11px] text-stone-600">
              Click any department below to add it instantly. (You can keep Drum Mics &amp; Capsules inside <strong>Wireless &amp; Wired Mics</strong> or split them out anytime.)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {SUGGESTED_CUSTOM_CATEGORIES.map((tpl) => {
            const alreadyAdded = allCategories.some(
              (c) =>
                c.id === tpl.id ||
                c.labelEn.toLowerCase() === tpl.labelEn.toLowerCase()
            );
            return (
              <button
                key={tpl.id}
                type="button"
                disabled={alreadyAdded || saving}
                onClick={() => handleQuickAddTemplate(tpl)}
                className={`text-left rounded-lg border px-3 py-2.5 transition-colors flex items-start justify-between gap-2 ${
                  alreadyAdded
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 cursor-default'
                    : 'bg-[#F8F8F6] border-stone-200 hover:border-[#1a73e8] hover:bg-white text-[#141518] cursor-pointer'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-snug">{tpl.labelEn}</p>
                  <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                    {tpl.hint}
                  </p>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                    alreadyAdded
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-[#1a73e8]/10 text-[#1a73e8]'
                  }`}
                >
                  {alreadyAdded ? (
                    <>
                      <Check className="w-3 h-3" aria-hidden="true" />
                      <span>Added</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" aria-hidden="true" />
                      <span>Add</span>
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Categories List */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
          Your Custom Categories ({customCategories.length})
        </h4>

        {customCategories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-[#F8F8F6] px-4 py-6 text-center text-xs text-stone-600">
            No custom categories yet. Create one above or click any 1-click template (like{' '}
            <strong>Subwoofer Mounts &amp; Poles</strong> or{' '}
            <strong>Mounting Hardware &amp; Clamps</strong>).
          </div>
        ) : (
          <div className="space-y-2">
            {customCategories.map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              const isEditing = editingId === cat.id;

              if (isEditing) {
                return (
                  <form
                    key={cat.id}
                    onSubmit={handleSaveEdit}
                    className="rounded-xl border border-[#1a73e8] bg-blue-50/40 p-3.5 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          Category Name *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={60}
                          value={editLabelEn}
                          onChange={(e) => setEditLabelEn(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          Spanish Label
                        </label>
                        <input
                          type="text"
                          maxLength={60}
                          value={editLabelEs}
                          onChange={(e) => setEditLabelEs(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          Description / Hint
                        </label>
                        <input
                          type="text"
                          maxLength={140}
                          value={editHint}
                          onChange={(e) => setEditHint(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a73e8] text-white text-xs font-semibold cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </form>
                );
              }

              return (
                <div
                  key={cat.id}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-[#9A6315] shrink-0" aria-hidden="true" />
                      <p className="text-sm font-bold text-[#141518]">{cat.labelEn}</p>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                        {cat.id}
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-[#1a73e8]">
                        {count} {count === 1 ? 'product' : 'products'}
                      </span>
                    </div>
                    {cat.hint && (
                      <p className="text-xs text-stone-500 mt-0.5">{cat.hint}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 text-xs font-semibold text-[#141518] cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDelete(cat)}
                      aria-label={`Delete ${cat.labelEn}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation + Safe Reassignment Box */}
      {deletingCategory && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 space-y-3">
          <p className="text-xs font-bold text-red-900">
            Delete custom category &ldquo;{deletingCategory.labelEn}&rdquo;?
          </p>
          {(categoryCounts[deletingCategory.id] || 0) > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-red-800">
                This category currently holds{' '}
                <strong>{categoryCounts[deletingCategory.id]}</strong> product(s). Pick where to move them safely so nothing is lost:
              </p>
              <select
                value={reassignTargetId}
                onChange={(e) => setReassignTargetId(e.target.value)}
                className="w-full sm:w-80 px-3 py-2 text-xs bg-white border border-red-300 rounded-lg font-semibold text-[#141518]"
              >
                {allCategories
                  .filter((c) => c.id !== deletingCategory.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      Move products to: {c.labelEn}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <p className="text-xs text-red-800">
              No products are assigned to this category yet. It will be removed cleanly.
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={confirmDelete}
              className="px-3.5 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold cursor-pointer"
            >
              {saving ? 'Deleting...' : 'Confirm Delete'}
            </button>
            <button
              type="button"
              onClick={() => setDeletingCategory(null)}
              className="px-3.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Built-in Storefront Departments Overview */}
      <div className="space-y-2.5 pt-2 border-t border-stone-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
          Built-In Storefront Categories ({BUILT_IN_CATALOG_CATEGORIES.length})
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {BUILT_IN_CATALOG_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            return (
              <div
                key={cat.id}
                className="rounded-lg border border-stone-200 bg-[#F8F8F6] px-3.5 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#141518]">{cat.labelEn}</p>
                  <span className="text-[11px] font-mono font-semibold text-stone-600 tabular-nums">
                    {count} items
                  </span>
                </div>
                <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">{cat.hint}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
