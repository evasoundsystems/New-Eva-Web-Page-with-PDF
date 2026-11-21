import { useEffect, useState } from 'react';
import { Check, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { DEFAULT_MEMBER_PRICING, DEFAULT_PAGE_COPY, DEFAULT_SITE_CONTENT } from '../data/defaultContent';
import type {
  BrandConfig,
  HeroConfig,
  MemberPricingConfig,
  PageCopyConfig,
  PricingConfig,
  SiteContent,
} from '../types/site';
import { mergeHeroConfig, mergeMemberPricing, mergePageCopy } from '../utils/siteLogic';
import { AdminImagePicker } from './AdminImagePicker';

export type CopySubTab =
  | 'brand'
  | 'hero'
  | 'gear'
  | 'services-reviews'
  | 'pricing'
  | 'training'
  | 'diagnostic'
  | 'footer'
  | 'member-pricing';

interface AdminPageCopyTabProps {
  siteContent: SiteContent;
  onChangeContent: (next: SiteContent) => Promise<void> | void;
  initialSubTab?: CopySubTab;
}

const SUB_TABS: Array<{ id: CopySubTab; label: string }> = [
  { id: 'brand', label: 'Brand & Header' },
  { id: 'hero', label: 'Hero Banner & Strip' },
  { id: 'gear', label: 'Gear Catalog Copy' },
  { id: 'pricing', label: 'Care Plan & Rates' },
  { id: 'training', label: 'Volunteer Training' },
  { id: 'services-reviews', label: 'Services & Reviews Copy' },
  { id: 'diagnostic', label: 'Audio Diagnostic' },
  { id: 'footer', label: 'Footer Copy' },
  { id: 'member-pricing', label: 'VIP Member Discounts' },
];

export function AdminPageCopyTab({
  siteContent,
  onChangeContent,
  initialSubTab = 'hero',
}: AdminPageCopyTabProps) {
  const [subTab, setSubTab] = useState<CopySubTab>(initialSubTab);

  // Local draft synchronized with siteContent so typing feels instant and explicit Save commits cleanly
  const [brand, setBrand] = useState<BrandConfig>(siteContent.brand);
  const [hero, setHero] = useState<HeroConfig>(mergeHeroConfig(siteContent.hero));
  const [pageCopy, setPageCopy] = useState<PageCopyConfig>(mergePageCopy(siteContent.pageCopy));
  const [pricing, setPricing] = useState<PricingConfig>(siteContent.pricing);
  const [memberPricing, setMemberPricing] = useState<MemberPricingConfig>(
    mergeMemberPricing(siteContent.memberPricing)
  );
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    setBrand(siteContent.brand);
    setHero(mergeHeroConfig(siteContent.hero));
    setPageCopy(mergePageCopy(siteContent.pageCopy));
    setPricing(siteContent.pricing);
    setMemberPricing(mergeMemberPricing(siteContent.memberPricing));
  }, [siteContent]);

  async function handleSaveAll(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    try {
      await onChangeContent({
        ...siteContent,
        brand,
        hero,
        pageCopy,
        pricing,
        memberPricing,
      });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2600);
    } finally {
      setSaving(false);
    }
  }

  function renderField(
    label: string,
    value: string,
    onChange: (val: string) => void,
    options?: { multiline?: boolean; placeholder?: string }
  ) {
    const id = `copy-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    return (
      <div>
        <label htmlFor={id} className="block text-xs font-semibold text-stone-700 mb-1">
          {label}
        </label>
        {options?.multiline ? (
          <textarea
            id={id}
            rows={2}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={options.placeholder}
            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
          />
        ) : (
          <input
            id={id}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={options?.placeholder}
            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#1a73e8]"
          />
        )}
      </div>
    );
  }

  function updateCopy<K extends keyof PageCopyConfig>(key: K, val: PageCopyConfig[K]) {
    setPageCopy((prev) => ({ ...prev, [key]: val }));
  }

  function updateHero<K extends keyof HeroConfig>(key: K, val: HeroConfig[K]) {
    setHero((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <form onSubmit={handleSaveAll} className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
        <div>
          <h3 className="font-display text-lg font-bold text-[#141518]">
            Full Website Word-by-Word Editor &amp; VIP Pricing Rules
          </h3>
          <p className="text-xs text-stone-600">
            Edit any headline, slogan, button, navbar link, scripture, bullet point, or footer text in English &amp; Spanish, then click Save &amp; Publish Changes.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#141518] hover:bg-[#272A30] disabled:opacity-50 text-white text-xs font-semibold shrink-0 cursor-pointer"
        >
          {justSaved ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Saved &amp; Published!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-[#E0A446]" aria-hidden="true" />
              <span>{saving ? 'Saving...' : 'Save & Publish All Text'}</span>
            </>
          )}
        </button>
      </div>

      {/* Section Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-[#F8F8F6] p-1.5 rounded-xl border border-stone-200">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              subTab === t.id
                ? 'bg-[#1a73e8] text-white'
                : 'text-stone-700 hover:bg-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SUBTAB: BRAND & NAVBAR */}
      {subTab === 'brand' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-5 space-y-4">
            <h4 className="font-display text-base font-bold text-[#141518]">
              Brand Identity, Contact &amp; Scripture Banner
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderField('Brand Display Name', brand.name, (v) =>
                setBrand({ ...brand, name: v })
              )}
              {renderField('Company Full Name', brand.companyFull, (v) =>
                setBrand({ ...brand, companyFull: v })
              )}
              {renderField('Lead Engineer', brand.leadEngineer, (v) =>
                setBrand({ ...brand, leadEngineer: v })
              )}
              {renderField('Phone Display', brand.phoneDisplay, (v) =>
                setBrand({ ...brand, phoneDisplay: v })
              )}
              {renderField('Phone Link (tel:+1...)', brand.phoneHref, (v) =>
                setBrand({ ...brand, phoneHref: v })
              )}
              {renderField('Email Address', brand.email, (v) =>
                setBrand({ ...brand, email: v })
              )}
              {renderField('Service Location Region', brand.location, (v) =>
                setBrand({ ...brand, location: v })
              )}
              {renderField('Scripture Reference', brand.scriptureRef, (v) =>
                setBrand({ ...brand, scriptureRef: v })
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderField('Scripture Quote (English)', brand.scriptureEn, (v) =>
                setBrand({ ...brand, scriptureEn: v })
              )}
              {renderField('Scripture Quote (Spanish)', brand.scriptureEs, (v) =>
                setBrand({ ...brand, scriptureEs: v })
              )}
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-5 space-y-4">
            <h4 className="font-display text-base font-bold text-[#141518]">
              Top Navigation Bar Labels
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderField('Nav: Gear (EN)', pageCopy.navGearEn, (v) => updateCopy('navGearEn', v))}
              {renderField('Nav: Gear (ES)', pageCopy.navGearEs, (v) => updateCopy('navGearEs', v))}
              {renderField('Nav: Services (EN)', pageCopy.navServicesEn, (v) => updateCopy('navServicesEn', v))}
              {renderField('Nav: Services (ES)', pageCopy.navServicesEs, (v) => updateCopy('navServicesEs', v))}
              {renderField('Nav: Care Plan (EN)', pageCopy.navPricingEn, (v) => updateCopy('navPricingEn', v))}
              {renderField('Nav: Care Plan (ES)', pageCopy.navPricingEs, (v) => updateCopy('navPricingEs', v))}
              {renderField('Nav: Training (EN)', pageCopy.navTrainingEn, (v) => updateCopy('navTrainingEn', v))}
              {renderField('Nav: Training (ES)', pageCopy.navTrainingEs, (v) => updateCopy('navTrainingEs', v))}
              {renderField('Nav: Reviews (EN)', pageCopy.navReviewsEn, (v) => updateCopy('navReviewsEn', v))}
              {renderField('Nav: Reviews (ES)', pageCopy.navReviewsEs, (v) => updateCopy('navReviewsEs', v))}
              {renderField('Header Estimate Button (EN)', pageCopy.navQuoteCtaEn, (v) => updateCopy('navQuoteCtaEn', v))}
              {renderField('Header Estimate Button (ES)', pageCopy.navQuoteCtaEs, (v) => updateCopy('navQuoteCtaEs', v))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: HERO BANNER */}
      {subTab === 'hero' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-5 space-y-4">
            <h4 className="font-display text-base font-bold text-[#141518]">
              Hero Photo &amp; Primary Headlines
            </h4>
            <AdminImagePicker
              label="Hero Sanctuary / Console Photo"
              value={hero.imageUrl}
              onChange={(url) => updateHero('imageUrl', url)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderField('Top Eyebrow (EN)', hero.eyebrowEn || '', (v) => updateHero('eyebrowEn', v))}
              {renderField('Top Eyebrow (ES)', hero.eyebrowEs || '', (v) => updateHero('eyebrowEs', v))}
              {renderField('Main Hero Headline (EN)', hero.headlineEn, (v) => updateHero('headlineEn', v))}
              {renderField('Main Hero Headline (ES)', hero.headlineEs, (v) => updateHero('headlineEs', v))}
              {renderField('Hero Subheadline (EN)', hero.subheadlineEn, (v) => updateHero('subheadlineEn', v), { multiline: true })}
              {renderField('Hero Subheadline (ES)', hero.subheadlineEs, (v) => updateHero('subheadlineEs', v), { multiline: true })}
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-5 space-y-4">
            <h4 className="font-display text-base font-bold text-[#141518]">
              Search Box, Black Friday Slogan &amp; Action Buttons
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderField('Search Box Placeholder (EN)', hero.searchPlaceholderEn || '', (v) => updateHero('searchPlaceholderEn', v))}
              {renderField('Search Box Placeholder (ES)', hero.searchPlaceholderEs || '', (v) => updateHero('searchPlaceholderEs', v))}
              {renderField('Search Button Text (EN)', hero.searchButtonEn || '', (v) => updateHero('searchButtonEn', v))}
              {renderField('Search Button Text (ES)', hero.searchButtonEs || '', (v) => updateHero('searchButtonEs', v))}
              {renderField('Black Friday Slogan Title (EN)', hero.sloganTitleEn || '', (v) => updateHero('sloganTitleEn', v))}
              {renderField('Black Friday Slogan Title (ES)', hero.sloganTitleEs || '', (v) => updateHero('sloganTitleEs', v))}
              {renderField('Slogan Description (EN)', hero.sloganBodyEn || '', (v) => updateHero('sloganBodyEn', v), { multiline: true })}
              {renderField('Slogan Description (ES)', hero.sloganBodyEs || '', (v) => updateHero('sloganBodyEs', v), { multiline: true })}
              {renderField('Shop Catalog Button (EN)', hero.shopButtonEn || '', (v) => updateHero('shopButtonEn', v))}
              {renderField('Shop Catalog Button (ES)', hero.shopButtonEs || '', (v) => updateHero('shopButtonEs', v))}
              {renderField('Quote Button Label (EN)', hero.quoteButtonEn || '', (v) => updateHero('quoteButtonEn', v))}
              {renderField('Quote Button Label (ES)', hero.quoteButtonEs || '', (v) => updateHero('quoteButtonEs', v))}
              {renderField('Photo Overlay Role Title (EN)', hero.photoTitleEn || '', (v) => updateHero('photoTitleEn', v))}
              {renderField('Photo Overlay Role Title (ES)', hero.photoTitleEs || '', (v) => updateHero('photoTitleEs', v))}
              {renderField('Photo Overlay Caption (EN)', hero.photoCaptionEn || '', (v) => updateHero('photoCaptionEn', v))}
              {renderField('Photo Overlay Caption (ES)', hero.photoCaptionEs || '', (v) => updateHero('photoCaptionEs', v))}
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-5 space-y-4">
            <h4 className="font-display text-base font-bold text-[#141518]">
              Bottom Hero 4-Column Stat Strip
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderField('Stat 1 Title (EN)', hero.stripStat1TitleEn || '', (v) => updateHero('stripStat1TitleEn', v))}
              {renderField('Stat 1 Title (ES)', hero.stripStat1TitleEs || '', (v) => updateHero('stripStat1TitleEs', v))}
              {renderField('Stat 1 Subtitle (EN)', hero.stripStat1BodyEn || '', (v) => updateHero('stripStat1BodyEn', v))}
              {renderField('Stat 1 Subtitle (ES)', hero.stripStat1BodyEs || '', (v) => updateHero('stripStat1BodyEs', v))}
              {renderField('Stat 2 Count Label (EN)', hero.stripStat2LabelEn || '', (v) => updateHero('stripStat2LabelEn', v))}
              {renderField('Stat 2 Count Label (ES)', hero.stripStat2LabelEs || '', (v) => updateHero('stripStat2LabelEs', v))}
              {renderField('Stat 2 Description (EN)', hero.stripStat2BodyEn || '', (v) => updateHero('stripStat2BodyEn', v))}
              {renderField('Stat 2 Description (ES)', hero.stripStat2BodyEs || '', (v) => updateHero('stripStat2BodyEs', v))}
              {renderField('Stat 3 Care Plan Note (EN)', hero.stripStat3BodyEn || '', (v) => updateHero('stripStat3BodyEn', v))}
              {renderField('Stat 3 Care Plan Note (ES)', hero.stripStat3BodyEs || '', (v) => updateHero('stripStat3BodyEs', v))}
              {renderField('Stat 4 Hourly Note (EN)', hero.stripStat4BodyEn || '', (v) => updateHero('stripStat4BodyEn', v))}
              {renderField('Stat 4 Hourly Note (ES)', hero.stripStat4BodyEs || '', (v) => updateHero('stripStat4BodyEs', v))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: GEAR CATALOG COPY */}
      {subTab === 'gear' && (
        <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-5 space-y-4">
          <h4 className="font-display text-base font-bold text-[#141518]">
            Pro Gear Storefront Headings, Slogan Banner &amp; Sourcing Bar
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {renderField('Gear Eyebrow (EN)', pageCopy.gearEyebrowEn, (v) => updateCopy('gearEyebrowEn', v))}
            {renderField('Gear Eyebrow (ES)', pageCopy.gearEyebrowEs, (v) => updateCopy('gearEyebrowEs', v))}
            {renderField('Catalog Main Heading (EN)', pageCopy.gearHeadingEn, (v) => updateCopy('gearHeadingEn', v))}
            {renderField('Catalog Main Heading (ES)', pageCopy.gearHeadingEs, (v) => updateCopy('gearHeadingEs', v))}
            {renderField('Catalog Subtitle (EN)', pageCopy.gearSubtitleEn, (v) => updateCopy('gearSubtitleEn', v), { multiline: true })}
            {renderField('Catalog Subtitle (ES)', pageCopy.gearSubtitleEs, (v) => updateCopy('gearSubtitleEs', v), { multiline: true })}
            {renderField('Black Friday Banner Title (EN)', pageCopy.gearBannerTitleEn, (v) => updateCopy('gearBannerTitleEn', v))}
            {renderField('Black Friday Banner Title (ES)', pageCopy.gearBannerTitleEs, (v) => updateCopy('gearBannerTitleEs', v))}
            {renderField('Black Friday Banner Body (EN)', pageCopy.gearBannerBodyEn, (v) => updateCopy('gearBannerBodyEn', v), { multiline: true })}
            {renderField('Black Friday Banner Body (ES)', pageCopy.gearBannerBodyEs, (v) => updateCopy('gearBannerBodyEs', v), { multiline: true })}
            {renderField('Bottom Sourcing Box Title (EN)', pageCopy.gearSourcingTitleEn, (v) => updateCopy('gearSourcingTitleEn', v))}
            {renderField('Bottom Sourcing Box Title (ES)', pageCopy.gearSourcingTitleEs, (v) => updateCopy('gearSourcingTitleEs', v))}
            {renderField('Bottom Sourcing Box Body (EN)', pageCopy.gearSourcingBodyEn, (v) => updateCopy('gearSourcingBodyEn', v), { multiline: true })}
            {renderField('Bottom Sourcing Box Body (ES)', pageCopy.gearSourcingBodyEs, (v) => updateCopy('gearSourcingBodyEs', v), { multiline: true })}
            {renderField('Bottom Sourcing Button (EN)', pageCopy.gearSourcingCtaEn, (v) => updateCopy('gearSourcingCtaEn', v))}
            {renderField('Bottom Sourcing Button (ES)', pageCopy.gearSourcingCtaEs, (v) => updateCopy('gearSourcingCtaEs', v))}
          </div>
        </div>
      )}

      {/* SUBTAB: CARE PLAN & RATES */}
      {subTab === 'pricing' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-5 space-y-4">
            <h4 className="font-display text-base font-bold text-[#141518]">
              Care Plan Numbers &amp; Section Headings
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label htmlFor="rate-weekly" className="block text-xs font-semibold text-stone-700 mb-1">
                  Weekly Rate ($)
                </label>
                <input
                  id="rate-weekly"
                  type="number"
                  min={1}
                  value={pricing.weeklyRate}
                  onChange={(e) => {
                    const weeklyRate = Number(e.target.value) || 0;
                    setPricing({ ...pricing, weeklyRate, monthlyEquivalent: weeklyRate * 4 });
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label htmlFor="rate-hourly" className="block text-xs font-semibold text-stone-700 mb-1">
                  Hourly Rate ($)
                </label>
                <input
                  id="rate-hourly"
                  type="number"
                  min={1}
                  value={pricing.standaloneHourlyRate}
                  onChange={(e) =>
                    setPricing({ ...pricing, standaloneHourlyRate: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label htmlFor="rate-minhrs" className="block text-xs font-semibold text-stone-700 mb-1">
                  Min Hours
                </label>
                <input
                  id="rate-minhrs"
                  type="number"
                  min={1}
                  value={pricing.standaloneMinHours}
                  onChange={(e) =>
                    setPricing({ ...pricing, standaloneMinHours: Number(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label htmlFor="rate-reeq" className="block text-xs font-semibold text-stone-700 mb-1">
                  Re-EQ Months
                </label>
                <input
                  id="rate-reeq"
                  type="number"
                  min={1}
                  value={pricing.reEqIntervalMonths}
                  onChange={(e) =>
                    setPricing({ ...pricing, reEqIntervalMonths: Number(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label htmlFor="rate-followup" className="block text-xs font-semibold text-stone-700 mb-1">
                  Free Follow-Up EQ/Yr
                </label>
                <input
                  id="rate-followup"
                  type="number"
                  min={0}
                  value={pricing.freeFollowUpEqPerYear}
                  onChange={(e) =>
                    setPricing({ ...pricing, freeFollowUpEqPerYear: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderField('Plan Card Title (EN)', pricing.planNameEn, (v) =>
                setPricing({ ...pricing, planNameEn: v })
              )}
              {renderField('Plan Card Title (ES)', pricing.planNameEs, (v) =>
                setPricing({ ...pricing, planNameEs: v })
              )}
              {renderField('Section Eyebrow (EN)', pageCopy.pricingEyebrowEn, (v) => updateCopy('pricingEyebrowEn', v))}
              {renderField('Section Eyebrow (ES)', pageCopy.pricingEyebrowEs, (v) => updateCopy('pricingEyebrowEs', v))}
              {renderField('Section Heading (EN)', pageCopy.pricingHeadingEn, (v) => updateCopy('pricingHeadingEn', v))}
              {renderField('Section Heading (ES)', pageCopy.pricingHeadingEs, (v) => updateCopy('pricingHeadingEs', v))}
              {renderField('Care Plan CTA Button (EN)', pageCopy.pricingCardCtaEn, (v) => updateCopy('pricingCardCtaEn', v))}
              {renderField('Care Plan CTA Button (ES)', pageCopy.pricingCardCtaEs, (v) => updateCopy('pricingCardCtaEs', v))}
              {renderField('Standalone Card Title (EN)', pageCopy.pricingStandaloneTitleEn, (v) => updateCopy('pricingStandaloneTitleEn', v))}
              {renderField('Standalone Card Title (ES)', pageCopy.pricingStandaloneTitleEs, (v) => updateCopy('pricingStandaloneTitleEs', v))}
              {renderField('Standalone Button (EN)', pageCopy.pricingStandaloneCtaEn, (v) => updateCopy('pricingStandaloneCtaEn', v))}
              {renderField('Standalone Button (ES)', pageCopy.pricingStandaloneCtaEs, (v) => updateCopy('pricingStandaloneCtaEs', v))}
            </div>
          </div>

          {/* Care Plan Inclusion Bullet Points */}
          <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-base font-bold text-[#141518]">
                Care Plan Inclusion Bullets (English &amp; Spanish)
              </h4>
              <button
                type="button"
                onClick={() =>
                  setPricing({
                    ...pricing,
                    inclusionsEn: [...pricing.inclusionsEn, 'New care plan benefit'],
                    inclusionsEs: [...pricing.inclusionsEs, 'Nuevo beneficio del plan'],
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-white border border-stone-300 text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Bullet
              </button>
            </div>
            <div className="space-y-2.5">
              {pricing.inclusionsEn.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    aria-label={`Inclusion bullet ${idx + 1} English`}
                    value={item}
                    onChange={(e) => {
                      const next = [...pricing.inclusionsEn];
                      next[idx] = e.target.value;
                      setPricing({ ...pricing, inclusionsEn: next });
                    }}
                    className="sm:col-span-6 px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                  />
                  <input
                    type="text"
                    aria-label={`Inclusion bullet ${idx + 1} Spanish`}
                    value={pricing.inclusionsEs[idx] || ''}
                    onChange={(e) => {
                      const next = [...pricing.inclusionsEs];
                      next[idx] = e.target.value;
                      setPricing({ ...pricing, inclusionsEs: next });
                    }}
                    className="sm:col-span-5 px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                  />
                  <button
                    type="button"
                    aria-label={`Remove bullet ${idx + 1}`}
                    onClick={() =>
                      setPricing({
                        ...pricing,
                        inclusionsEn: pricing.inclusionsEn.filter((_, i) => i !== idx),
                        inclusionsEs: pricing.inclusionsEs.filter((_, i) => i !== idx),
                      })
                    }
                    className="sm:col-span-1 p-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 flex justify-center cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 4 Value Prop Cards */}
          <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-5 space-y-4">
            <h4 className="font-display text-base font-bold text-[#141518]">
              Care Plan Value Proposition Cards (4 Pillars)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pricing.valueProps.map((vp, idx) => (
                <div key={vp.id} className="rounded-lg border border-stone-200 bg-white p-3.5 space-y-2">
                  <p className="text-[11px] font-bold uppercase text-[#9A6315]">Card #{idx + 1}</p>
                  {renderField(`Title (EN) #${idx + 1}`, vp.titleEn, (v) => {
                    const next = pricing.valueProps.map((item, i) =>
                      i === idx ? { ...item, titleEn: v } : item
                    );
                    setPricing({ ...pricing, valueProps: next });
                  })}
                  {renderField(`Title (ES) #${idx + 1}`, vp.titleEs, (v) => {
                    const next = pricing.valueProps.map((item, i) =>
                      i === idx ? { ...item, titleEs: v } : item
                    );
                    setPricing({ ...pricing, valueProps: next });
                  })}
                  {renderField(`Body (EN) #${idx + 1}`, vp.bodyEn, (v) => {
                    const next = pricing.valueProps.map((item, i) =>
                      i === idx ? { ...item, bodyEn: v } : item
                    );
                    setPricing({ ...pricing, valueProps: next });
                  }, { multiline: true })}
                  {renderField(`Body (ES) #${idx + 1}`, vp.bodyEs, (v) => {
                    const next = pricing.valueProps.map((item, i) =>
                      i === idx ? { ...item, bodyEs: v } : item
                    );
                    setPricing({ ...pricing, valueProps: next });
                  }, { multiline: true })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: VOLUNTEER TRAINING */}
      {subTab === 'training' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-5 space-y-4">
            <h4 className="font-display text-base font-bold text-[#141518]">
              Volunteer Training Section Text &amp; Photo
            </h4>
            <AdminImagePicker
              label="Training Photo"
              value={pageCopy.trainingImageUrl}
              onChange={(url) => updateCopy('trainingImageUrl', url)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderField('Training Eyebrow (EN)', pageCopy.trainingEyebrowEn, (v) => updateCopy('trainingEyebrowEn', v))}
              {renderField('Training Eyebrow (ES)', pageCopy.trainingEyebrowEs, (v) => updateCopy('trainingEyebrowEs', v))}
              {renderField('Training Heading (EN)', pageCopy.trainingHeadingEn, (v) => updateCopy('trainingHeadingEn', v))}
              {renderField('Training Heading (ES)', pageCopy.trainingHeadingEs, (v) => updateCopy('trainingHeadingEs', v))}
              {renderField('Training Subtitle (EN)', pageCopy.trainingSubtitleEn, (v) => updateCopy('trainingSubtitleEn', v), { multiline: true })}
              {renderField('Training Subtitle (ES)', pageCopy.trainingSubtitleEs, (v) => updateCopy('trainingSubtitleEs', v), { multiline: true })}
              {renderField('Training CTA Button (EN)', pageCopy.trainingCtaEn, (v) => updateCopy('trainingCtaEn', v))}
              {renderField('Training CTA Button (ES)', pageCopy.trainingCtaEs, (v) => updateCopy('trainingCtaEs', v))}
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-5 space-y-4">
            <h4 className="font-display text-base font-bold text-[#141518]">
              Training Module Cards
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pageCopy.trainingModules.map((mod, idx) => (
                <div key={mod.id} className="rounded-lg border border-stone-200 bg-white p-3.5 space-y-2">
                  <p className="text-[11px] font-bold uppercase text-[#9A6315]">Module #{idx + 1}</p>
                  {renderField(`Module ${idx + 1} Title (EN)`, mod.titleEn, (v) => {
                    const next = pageCopy.trainingModules.map((m, i) =>
                      i === idx ? { ...m, titleEn: v } : m
                    );
                    updateCopy('trainingModules', next);
                  })}
                  {renderField(`Module ${idx + 1} Title (ES)`, mod.titleEs, (v) => {
                    const next = pageCopy.trainingModules.map((m, i) =>
                      i === idx ? { ...m, titleEs: v } : m
                    );
                    updateCopy('trainingModules', next);
                  })}
                  {renderField(`Module ${idx + 1} Desc (EN)`, mod.descEn, (v) => {
                    const next = pageCopy.trainingModules.map((m, i) =>
                      i === idx ? { ...m, descEn: v } : m
                    );
                    updateCopy('trainingModules', next);
                  }, { multiline: true })}
                  {renderField(`Module ${idx + 1} Desc (ES)`, mod.descEs, (v) => {
                    const next = pageCopy.trainingModules.map((m, i) =>
                      i === idx ? { ...m, descEs: v } : m
                    );
                    updateCopy('trainingModules', next);
                  }, { multiline: true })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: SERVICES & REVIEWS HEADERS */}
      {subTab === 'services-reviews' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-5 space-y-4">
            <h4 className="font-display text-base font-bold text-[#141518]">
              Services Section Headers &amp; CTA
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderField('Services Eyebrow (EN)', pageCopy.servicesEyebrowEn, (v) => updateCopy('servicesEyebrowEn', v))}
              {renderField('Services Eyebrow (ES)', pageCopy.servicesEyebrowEs, (v) => updateCopy('servicesEyebrowEs', v))}
              {renderField('Services Heading (EN)', pageCopy.servicesHeadingEn, (v) => updateCopy('servicesHeadingEn', v))}
              {renderField('Services Heading (ES)', pageCopy.servicesHeadingEs, (v) => updateCopy('servicesHeadingEs', v))}
              {renderField('Services Walkthrough CTA (EN)', pageCopy.servicesWalkthroughCtaEn, (v) => updateCopy('servicesWalkthroughCtaEn', v))}
              {renderField('Services Walkthrough CTA (ES)', pageCopy.servicesWalkthroughCtaEs, (v) => updateCopy('servicesWalkthroughCtaEs', v))}
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-5 space-y-4">
            <h4 className="font-display text-base font-bold text-[#141518]">
              Testimonials &amp; Bottom Call-To-Action Box
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderField('Reviews Eyebrow (EN)', pageCopy.reviewsEyebrowEn, (v) => updateCopy('reviewsEyebrowEn', v))}
              {renderField('Reviews Eyebrow (ES)', pageCopy.reviewsEyebrowEs, (v) => updateCopy('reviewsEyebrowEs', v))}
              {renderField('Reviews Heading (EN)', pageCopy.reviewsHeadingEn, (v) => updateCopy('reviewsHeadingEn', v))}
              {renderField('Reviews Heading (ES)', pageCopy.reviewsHeadingEs, (v) => updateCopy('reviewsHeadingEs', v))}
              {renderField('CTA Banner Title (EN)', pageCopy.reviewsCtaTitleEn, (v) => updateCopy('reviewsCtaTitleEn', v))}
              {renderField('CTA Banner Title (ES)', pageCopy.reviewsCtaTitleEs, (v) => updateCopy('reviewsCtaTitleEs', v))}
              {renderField('CTA Banner Body (EN)', pageCopy.reviewsCtaBodyEn, (v) => updateCopy('reviewsCtaBodyEn', v), { multiline: true })}
              {renderField('CTA Banner Body (ES)', pageCopy.reviewsCtaBodyEs, (v) => updateCopy('reviewsCtaBodyEs', v), { multiline: true })}
              {renderField('CTA Button Text (EN)', pageCopy.reviewsCtaBtnEn, (v) => updateCopy('reviewsCtaBtnEn', v))}
              {renderField('CTA Button Text (ES)', pageCopy.reviewsCtaBtnEs, (v) => updateCopy('reviewsCtaBtnEs', v))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: AUDIO DIAGNOSTIC */}
      {subTab === 'diagnostic' && (
        <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-5 space-y-4">
          <h4 className="font-display text-base font-bold text-[#141518]">
            Sanctuary Audio Diagnostic Tool Copy
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {renderField('Diagnostic Eyebrow (EN)', pageCopy.diagnosticEyebrowEn, (v) => updateCopy('diagnosticEyebrowEn', v))}
            {renderField('Diagnostic Eyebrow (ES)', pageCopy.diagnosticEyebrowEs, (v) => updateCopy('diagnosticEyebrowEs', v))}
            {renderField('Diagnostic Heading (EN)', pageCopy.diagnosticHeadingEn, (v) => updateCopy('diagnosticHeadingEn', v))}
            {renderField('Diagnostic Heading (ES)', pageCopy.diagnosticHeadingEs, (v) => updateCopy('diagnosticHeadingEs', v))}
            {renderField('Action Plan Label (EN)', pageCopy.diagnosticResultBadgeEn, (v) => updateCopy('diagnosticResultBadgeEn', v))}
            {renderField('Action Plan Label (ES)', pageCopy.diagnosticResultBadgeEs, (v) => updateCopy('diagnosticResultBadgeEs', v))}
            {renderField('Diagnostic Button (EN)', pageCopy.diagnosticCtaEn, (v) => updateCopy('diagnosticCtaEn', v))}
            {renderField('Diagnostic Button (ES)', pageCopy.diagnosticCtaEs, (v) => updateCopy('diagnosticCtaEs', v))}
          </div>
        </div>
      )}

      {/* SUBTAB: FOOTER */}
      {subTab === 'footer' && (
        <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-5 space-y-4">
          <h4 className="font-display text-base font-bold text-[#141518]">
            Footer Labels &amp; Copyright Text
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {renderField('Contact Column Heading (EN)', pageCopy.footerContactTitleEn, (v) => updateCopy('footerContactTitleEn', v))}
            {renderField('Contact Column Heading (ES)', pageCopy.footerContactTitleEs, (v) => updateCopy('footerContactTitleEs', v))}
            {renderField('Quick Links Heading (EN)', pageCopy.footerLinksTitleEn, (v) => updateCopy('footerLinksTitleEn', v))}
            {renderField('Quick Links Heading (ES)', pageCopy.footerLinksTitleEs, (v) => updateCopy('footerLinksTitleEs', v))}
            {renderField('Footer Quote Link (EN)', pageCopy.footerQuoteLinkEn, (v) => updateCopy('footerQuoteLinkEn', v))}
            {renderField('Footer Quote Link (ES)', pageCopy.footerQuoteLinkEs, (v) => updateCopy('footerQuoteLinkEs', v))}
            {renderField('Copyright Suffix (EN)', pageCopy.footerCopyrightEn, (v) => updateCopy('footerCopyrightEn', v))}
            {renderField('Copyright Suffix (ES)', pageCopy.footerCopyrightEs, (v) => updateCopy('footerCopyrightEs', v))}
          </div>
        </div>
      )}

      {/* SUBTAB: VIP MEMBER PRICING */}
      {subTab === 'member-pricing' && (
        <div className="rounded-xl border border-stone-200 bg-[#F8F8F6] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-display text-base font-bold text-[#141518]">
                Exclusive VIP Member Discounts &amp; Labels
              </h4>
              <p className="text-xs text-stone-600">
                Public visitors only see MAP pricing. Active logged-in customers unlock these tier discounts automatically.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-bold text-[#141518] cursor-pointer">
              <input
                type="checkbox"
                checked={memberPricing.enabled}
                onChange={(e) =>
                  setMemberPricing({ ...memberPricing, enabled: e.target.checked })
                }
              />
              <span>Enable Member Pricing Unlock</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="mp-vip" className="block text-xs font-semibold text-stone-700 mb-1">
                VIP Member Discount (% off MAP)
              </label>
              <input
                id="mp-vip"
                type="number"
                min={0}
                max={90}
                step="0.5"
                value={memberPricing.defaultDiscountPercent}
                onChange={(e) =>
                  setMemberPricing({
                    ...memberPricing,
                    defaultDiscountPercent: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label htmlFor="mp-church" className="block text-xs font-semibold text-stone-700 mb-1">
                Church Partner Discount (% off MAP)
              </label>
              <input
                id="mp-church"
                type="number"
                min={0}
                max={90}
                step="0.5"
                value={memberPricing.churchPartnerDiscountPercent}
                onChange={(e) =>
                  setMemberPricing({
                    ...memberPricing,
                    churchPartnerDiscountPercent: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label htmlFor="mp-dealer" className="block text-xs font-semibold text-stone-700 mb-1">
                Dealer Pro Discount (% off MAP)
              </label>
              <input
                id="mp-dealer"
                type="number"
                min={0}
                max={90}
                step="0.5"
                value={memberPricing.dealerProDiscountPercent}
                onChange={(e) =>
                  setMemberPricing({
                    ...memberPricing,
                    dealerProDiscountPercent: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {renderField('Price Card Badge (EN)', memberPricing.badgeLabelEn, (v) =>
              setMemberPricing({ ...memberPricing, badgeLabelEn: v })
            )}
            {renderField('Price Card Badge (ES)', memberPricing.badgeLabelEs, (v) =>
              setMemberPricing({ ...memberPricing, badgeLabelEs: v })
            )}
            {renderField('Login Button Text (EN)', memberPricing.loginPromptEn, (v) =>
              setMemberPricing({ ...memberPricing, loginPromptEn: v })
            )}
            {renderField('Login Button Text (ES)', memberPricing.loginPromptEs, (v) =>
              setMemberPricing({ ...memberPricing, loginPromptEs: v })
            )}
            {renderField('Unlocked Banner Text (EN)', memberPricing.bannerUnlockedEn, (v) =>
              setMemberPricing({ ...memberPricing, bannerUnlockedEn: v })
            )}
            {renderField('Unlocked Banner Text (ES)', memberPricing.bannerUnlockedEs, (v) =>
              setMemberPricing({ ...memberPricing, bannerUnlockedEs: v })
            )}
          </div>
        </div>
      )}

      {/* Bottom Save & Reset Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200">
        <button
          type="button"
          onClick={() => {
            setBrand(DEFAULT_SITE_CONTENT.brand);
            setHero(DEFAULT_SITE_CONTENT.hero);
            setPageCopy(DEFAULT_PAGE_COPY);
            setMemberPricing(DEFAULT_MEMBER_PRICING);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset Text Fields to Default</span>
        </button>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
        >
          <Save className="w-4 h-4" aria-hidden="true" />
          <span>{saving ? 'Saving Changes...' : 'Save & Publish All Changes'}</span>
        </button>
      </div>
    </form>
  );
}
