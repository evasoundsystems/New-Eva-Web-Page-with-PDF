import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addItemToCart,
  buildDefaultCoverLetter,
  buildSanitizedQuoteForFirestore,
  buildVideoMeetingRequestInput,
  calculateCarePlanSavings,
  calculateCartMemberSummary,
  calculateCartSummary,
  calculateCustomerOrderTotals,
  calculateEstimateTotals,
  calculateMemberPrice,
  compareVendorQuotes,
  estimateDataUrlKilobytes,
  extractCustomerProjectNotes,
  extractGoogleMeetCode,
  filterProducts,
  formatCustomerOrdersToCsv,
  formatCustomersToCsv,
  formatQuotesToCsv,
  formatQuotesToTsv,
  formatVendorMasterToCsv,
  generateOrderCode,
  generateRefCode,
  getCustomerEffectiveDiscountPercent,
  getProductAvailabilityDisplay,
  getUniqueBrands,
  MAX_FIRESTORE_IMAGE_URL_CHARS,
  mergeHeroConfig,
  mergeMemberPricing,
  mergePageCopy,
  mergeVideoMeetingConfig,
  moveItemInArray,
  normalizeGoogleMeetUrl,
  parseEstimateItemsFromNotes,
  prepareQuoteForPdf,
  promoteGearCatalogSection,
  reconcileProductsWithDefaults,
  reconcileServicesWithDefaults,
  reconcileVendorMasterWithDefaults,
  removeCartItem,
  runSanctuaryDiagnostic,
  sanitizeImageUrlForCloud,
  selectFeaturedCatalogPreview,
  shouldPreferLocalPendingContent,
  sortProducts,
  updateCartItemQty,
  validateQuoteInput,
} from './siteLogic';
import {
  applyFullCompassCategoryOverrides,
  buildGearProductFromFullCompass,
  buildVendorEntryFromFullCompass,
  buildVendorEntryFromSupplierImport,
  classifyFullCompassCategory,
  getBulkCategoryOptions,
  getGearCategoryLabel,
  mergeVendorEntryWithSupplierImport,
  parseFullCompassList,
  parseSupplierBulkList,
  parseSweetwaterList,
} from './fullCompassParser';
import {
  BUILT_IN_CATALOG_CATEGORIES,
  SUGGESTED_CUSTOM_CATEGORIES,
  createCustomCategoryEntry,
  getAllCatalogCategories,
  getCatalogCategoryLabel,
  reassignProductsOnCategoryDelete,
  sanitizeCustomCategories,
  sanitizeProductCategoryId,
  slugifyCategoryId,
} from './catalogCategories';
import { DEALER_MAP_PRODUCTS } from '../data/dealerMapCatalog';
import {
  DEFAULT_FULL_COMPASS_VENDOR_ENTRIES,
  FULL_COMPASS_PRODUCT_ADDITIONS,
} from '../data/fullCompassCatalog';
import { DEFAULT_SITE_CONTENT } from '../data/defaultContent';
import type {
  CustomerAccount,
  CustomerOrderRecord,
  GearProduct,
  MemberPricingConfig,
  QuoteRecord,
  VendorMasterEntry,
} from '../types/site';

test('calculateCarePlanSavings accurately computes $50/wk vs $120/hr 4-hr min', () => {
  const result = calculateCarePlanSavings(2, 4, 50, 120, 4);
  assert.equal(result.standalonePerVisit, 480);
  assert.equal(result.standaloneAnnualCost, 2880);
  assert.equal(result.carePlanAnnualCost, 2600);
  assert.equal(result.annualSavings, 280);
  assert.equal(result.savesMoney, true);
});

test('moveItemInArray swaps items up and down without mutating original array', () => {
  const original = ['services', 'pricing', 'gear'];
  const movedUp = moveItemInArray(original, 2, 'up');
  assert.deepEqual(movedUp, ['services', 'gear', 'pricing']);
  assert.deepEqual(original, ['services', 'pricing', 'gear']);

  const movedOutOfBounds = moveItemInArray(original, 0, 'up');
  assert.deepEqual(movedOutOfBounds, ['services', 'pricing', 'gear']);

  const movedDown = moveItemInArray(original, 0, 'down');
  assert.deepEqual(movedDown, ['pricing', 'services', 'gear']);
});

test('filterProducts matches category, brand, price range, and search keywords', () => {
  const sample: GearProduct[] = [
    {
      id: '1',
      itemNumber: 'QSC K12.2',
      name: 'QSC K12.2',
      brand: 'QSC',
      category: 'speakers',
      mapPrice: 999.99,
      priceLabel: '$999.99 MAP',
      priceNote: 'Authorized Dealer MAP',
      descriptionEn: '12" 2-Way Powered Speaker, 2000W',
      descriptionEs: '12" 2-Way Powered Speaker, 2000W',
      specs: ['QSC', 'Pro Sound Reinforcement'],
      imageUrl: 'asset:hero',
      inStock: true,
    },
    {
      id: '2',
      itemNumber: 'Anchor MEGA-DP2-HH',
      name: 'Anchor MEGA-DP2-HH',
      brand: 'Anchor',
      category: 'mics',
      mapPrice: 2676.45,
      priceLabel: '$2,676.45 MAP',
      priceNote: 'Authorized Dealer MAP',
      descriptionEn: 'MEGA2 System, 2 Wireless Mics',
      descriptionEs: 'MEGA2 System, 2 Wireless Mics',
      specs: ['Anchor', 'Wireless Mics'],
      imageUrl: 'asset:iem',
      inStock: true,
    },
    {
      id: '3',
      name: 'Behringer WING 48-Channel Console',
      brand: 'Behringer',
      category: 'consoles',
      priceLabel: 'Best Price Quote',
      priceNote: 'Call for Best Price',
      descriptionEn: 'Flagship touchscreen console',
      descriptionEs: 'Consola táctil profesional',
      specs: ['48 channels'],
      imageUrl: 'asset:console',
      inStock: true,
    },
  ];

  assert.equal(filterProducts(sample, 'all', 'k12.2').length, 1);
  assert.equal(filterProducts(sample, 'speakers', '', 'QSC', '500to1000').length, 1);
  assert.equal(filterProducts(sample, 'mics', '', 'all', 'over2000').length, 1);
  assert.equal(filterProducts(sample, 'all', '', 'all', 'quoteOnly').length, 1);
  assert.deepEqual(getUniqueBrands(sample), ['Anchor', 'Behringer', 'QSC']);
});

test('dealerMapCatalog and DEFAULT_SITE_CONTENT include 690+ authentic products across 8 departments (including RCF, FBT, Full Compass RF, PreSonus Mixers/Gear & Pro Subwoofers) with verified photos', () => {
  assert.equal(FULL_COMPASS_PRODUCT_ADDITIONS.length, 373);
  assert.equal(DEFAULT_FULL_COMPASS_VENDOR_ENTRIES.length, 373);
  assert.ok(DEALER_MAP_PRODUCTS.length >= 680);
  const mapPriced = DEALER_MAP_PRODUCTS.filter(
    (item) => typeof item.mapPrice === 'number' && item.mapPrice > 0
  );
  assert.ok(mapPriced.length >= 650);

  assert.ok(DEFAULT_SITE_CONTENT.products.length >= 690);
  const uniqueIds = new Set(DEFAULT_SITE_CONTENT.products.map((item) => item.id));
  assert.equal(uniqueIds.size, DEFAULT_SITE_CONTENT.products.length);

  // Verify key new FDW PreSonus mixers/gear & pro subwoofers are present on storefront
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.itemNumber === 'PreSonus STUDIOLIVE-SE-32' && item.mapPrice === 3499.99));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.itemNumber === 'PreSonus HP4' && item.mapPrice === 149.99));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.itemNumber === 'PreSonus AIR-XD-SUB-18' && item.mapPrice === 1099.99));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.itemNumber === 'Alto Professional TX12S' && item.mapPrice === 399.0));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.itemNumber === 'BASSBOSS DJ18S-MK3' && item.mapPrice === 3495.0));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.itemNumber === 'Electro-Voice EVOLVE70-KB' && item.mapPrice === 2999.0));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.itemNumber === 'DAS Audio HQ-218DX'));

  // Verify Luis's private Full Compass dealer costs NEVER appear on public storefront products
  const se32Public = DEALER_MAP_PRODUCTS.find((item) => item.itemNumber === 'PreSonus STUDIOLIVE-SE-32')!;
  assert.equal(JSON.stringify(se32Public).includes('2578'), false);
  assert.equal(JSON.stringify(se32Public).includes('Full Compass'), false);

  // Verify private Full Compass Supplier #2 holds exact dealer costs
  const se32Vendor = DEFAULT_FULL_COMPASS_VENDOR_ENTRIES.find((e) => e.itemNumber === 'PreSonus STUDIOLIVE-SE-32')!;
  assert.ok(se32Vendor);
  assert.equal(se32Vendor.quotes[1].vendorName, 'Full Compass');
  assert.equal(se32Vendor.quotes[1].unitCost, 2578.0);

  const unresolvedAssets = DEFAULT_SITE_CONTENT.products.filter(
    (item) => !item.imageUrl.startsWith('https://')
  );
  assert.deepEqual(unresolvedAssets, []);

  const blockedOrWatermarked = DEFAULT_SITE_CONTENT.products.filter(
    (item) =>
      item.imageUrl.includes('products.shureweb.eu') ||
      item.imageUrl.includes('thomann.de/thumb/opengraph') ||
      item.imageUrl.includes('500216.jpg') ||
      item.imageUrl.includes('464134.jpg')
  );
  assert.deepEqual(blockedOrWatermarked, []);

  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.brand === 'Shure' && item.itemNumber === 'Shure MX418D/C'));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.brand === 'Shure' && item.itemNumber === 'Shure SM58-LC'));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.brand === 'Sennheiser' && item.itemNumber === 'Sennheiser EW-D ME3 SET'));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.brand === 'Behringer' && item.category === 'cables' && item.itemNumber === 'Behringer S32'));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.brand === 'Midas' && item.category === 'cables' && item.itemNumber === 'Midas DL32'));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.brand === 'Pro Co' && item.category === 'cables'));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.brand === 'Allen & Heath' && item.itemNumber === 'Allen & Heath CQ-18T'));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.brand === 'Soundcraft' && item.itemNumber === 'Soundcraft Ui24R'));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.brand === 'Chauvet DJ' && item.category === 'lighting' && item.itemNumber === 'Chauvet DJ GigBAR Move + ILS'));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.category === 'lighting' && /Intimidator Spot 375ZX|Focus Spot 5Z/i.test(item.name)));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.brand === 'QSC' && item.category === 'rigging' && item.itemNumber === 'QSC K12.2-YOKE'));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.brand === 'Electro-Voice' && item.category === 'rigging' && item.itemNumber === 'Electro-Voice ZLX-G2-BRKT'));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.category === 'rigging' && /Wood Beam|BC-W7-12-9/i.test(item.name)));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.category === 'rigging' && /I-Beam|Screwlok/i.test(item.name)));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.category === 'rigging' && /Ceiling|Gimbal|MTC-SB2C/i.test(item.name)));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.brand === 'QSC' && item.itemNumber === 'QSC KS118'));
  assert.ok(DEALER_MAP_PRODUCTS.some((item) => item.brand === 'Electro-Voice' && item.itemNumber === 'Electro-Voice ELX200-18SP'));

  // RCF & FBT Speakers, Subwoofers, and Line Arrays
  const rcfItems = DEALER_MAP_PRODUCTS.filter((item) => item.brand === 'RCF');
  const fbtItems = DEALER_MAP_PRODUCTS.filter((item) => item.brand === 'FBT');
  assert.ok(rcfItems.length >= 50);
  assert.ok(fbtItems.length >= 35);
  assert.ok(rcfItems.some((item) => item.itemNumber === 'RCF HDL 20-A'));
  assert.ok(rcfItems.some((item) => /SUB/i.test(item.itemNumber || item.name)));
  assert.ok(fbtItems.some((item) => item.itemNumber === 'FBT MITUS 212 FSA'));
  assert.ok(fbtItems.some((item) => item.itemNumber === 'FBT X-Sub 118SA'));

  const riggingCount = filterProducts(DEFAULT_SITE_CONTENT.products, 'rigging', '').length;
  assert.ok(riggingCount >= 45);
  const lightingCount = filterProducts(DEFAULT_SITE_CONTENT.products, 'lighting', '').length;
  assert.ok(lightingCount >= 25);
  const cablesCount = filterProducts(DEFAULT_SITE_CONTENT.products, 'cables', '').length;
  assert.ok(cablesCount >= 20);
  const micsCount = filterProducts(DEFAULT_SITE_CONTENT.products, 'mics', '').length;
  assert.ok(micsCount >= 35);

  for (const item of DEALER_MAP_PRODUCTS) {
    assert.ok(item.itemNumber);
  }
});

test('selectFeaturedCatalogPreview surfaces diverse products across all departments within 12 cards', () => {
  const preview = selectFeaturedCatalogPreview(DEFAULT_SITE_CONTENT.products, 12);
  assert.equal(preview.length, 12);
  const representedCategories = new Set(preview.map((p) => p.category));
  for (const requiredCat of ['consoles', 'speakers', 'lighting', 'rigging', 'cables', 'mics', 'iem', 'combiners']) {
    assert.ok(representedCategories.has(requiredCat as GearProduct['category']), `Missing ${requiredCat} in preview`);
  }
});

test('sortProducts orders by priceAsc, priceDesc, and nameAsc cleanly', () => {
  const sample = [
    DEALER_MAP_PRODUCTS.find((p) => p.itemNumber === 'Behringer WING')!,
    DEALER_MAP_PRODUCTS.find((p) => p.itemNumber === 'Behringer Xenyx 802S')!,
    DEALER_MAP_PRODUCTS.find((p) => p.itemNumber === 'Shure SLXD24/SM58')!,
  ];

  const asc = sortProducts(sample, 'priceAsc');
  assert.equal(asc[0].itemNumber, 'Behringer Xenyx 802S');
  assert.equal(asc[asc.length - 1].itemNumber, 'Behringer WING');

  const desc = sortProducts(sample, 'priceDesc');
  assert.equal(desc[0].itemNumber, 'Behringer WING');
  assert.equal(desc[desc.length - 1].itemNumber, 'Behringer Xenyx 802S');

  const byName = sortProducts(sample, 'nameAsc');
  assert.equal(byName[0].itemNumber, 'Behringer WING');
});

test('quote cart state helpers add, increment, remove, and compute MAP totals', () => {
  const qsc = DEALER_MAP_PRODUCTS.find((p) => p.itemNumber === 'QSC K12.2')!;
  const jbl = DEALER_MAP_PRODUCTS.find((p) => p.itemNumber === 'JBL SRX912M')!;

  let cart = addItemToCart([], qsc);
  cart = addItemToCart(cart, qsc);
  cart = addItemToCart(cart, jbl);

  let summary = calculateCartSummary(cart);
  assert.equal(summary.totalCount, 3);
  assert.equal(summary.estimatedMapTotal, 3798.98);

  cart = updateCartItemQty(cart, qsc.id, -1);
  summary = calculateCartSummary(cart);
  assert.equal(summary.totalCount, 2);
  assert.equal(summary.estimatedMapTotal, 2798.99);

  cart = removeCartItem(cart, jbl.id);
  summary = calculateCartSummary(cart);
  assert.equal(summary.totalCount, 1);
  assert.equal(summary.estimatedMapTotal, 999.99);
});

test('validateQuoteInput rejects invalid phone/email and passes valid inquiry', () => {
  const bad = validateQuoteInput(
    {
      organization: 'Grace Church',
      contactName: '',
      phone: '123',
      email: '',
      serviceRequested: '',
      soundboardModel: '',
      roomCapacity: '',
      timeline: '',
      notes: '',
    },
    true
  );
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.contactName);
  assert.ok(bad.errors.phone);
  assert.ok(bad.errors.email);
  assert.ok(bad.errors.serviceRequested);

  const good = validateQuoteInput({
    organization: 'Grace Church',
    contactName: 'Pastor Marcos',
    phone: '(414) 555-0199',
    email: 'pastor@grace.org',
    serviceRequested: '$50/wk Care Plan',
    soundboardModel: 'Behringer X32',
    roomCapacity: '300',
    timeline: 'Morning (8am – 12pm)',
    notes: 'Need quarterly EQ',
  });
  assert.equal(good.valid, true);
});

test('formatQuotesToCsv and formatQuotesToTsv properly format quote rows', () => {
  const quotes: QuoteRecord[] = [
    {
      id: 'q1',
      refCode: 'EVA-261119-1630',
      createdAt: '2026-11-19T12:00:00.000Z',
      status: 'new',
      organization: 'Iglesia Vida, Inc.',
      contactName: 'Carlos',
      phone: '414-555-0100',
      email: 'carlos@vida.org',
      serviceRequested: 'X32 Quote',
      soundboardModel: 'Behringer X32',
      roomCapacity: '250',
      timeline: 'Urgent',
      notes: 'Line 1\nLine 2',
      engineerNotes: 'Call back',
    },
  ];

  const csv = formatQuotesToCsv(quotes);
  assert.ok(csv.includes('"Iglesia Vida, Inc."'));
  assert.ok(csv.includes('Line 1 Line 2'));

  const tsv = formatQuotesToTsv(quotes);
  assert.ok(tsv.includes('EVA-261119-1630\t2026-11-19\tnew\tIglesia Vida, Inc.'));
});

test('generateRefCode uses EVA-YYMMDD-HHMM format and runSanctuaryDiagnostic returns structured output', () => {
  const sampleDate = new Date(2026, 10, 19, 16, 45, 0);
  const ref = generateRefCode(sampleDate);
  assert.equal(ref, 'EVA-261119-1645');
  assert.match(ref, /^EVA-\d{6}-\d{4}$/);

  const diag = runSanctuaryDiagnostic({
    symptom: 'feedback',
    roomSize: 'medium',
    consoleType: 'x32_m32',
  });
  assert.ok(diag.stepsEn.length >= 3);
  assert.ok(diag.recommendedService.includes('$50/wk'));
});

test('estimate calculations, cart-note parsing, and cover letter builder work end-to-end', () => {
  const notes = [
    'Quote Cart Items (Estimated MAP Total: $2,997.98):',
    '- 2x QSC K12.2 (QSC) @ $999.99 MAP',
    '- 1x Behringer Xenyx 1202SFX (Behringer) @ $129.00 MAP',
    'Estimated Total (at MAP): $2,128.98',
  ].join('\n');

  const parsed = parseEstimateItemsFromNotes(notes, DEFAULT_SITE_CONTENT.products);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].qty, 2);
  assert.equal(parsed[0].itemNumber, 'QSC K12.2');
  assert.equal(parsed[0].unitPrice, 999.99);
  assert.equal(parsed[1].itemNumber, 'Behringer Xenyx 1202SFX');

  const totals = calculateEstimateTotals(parsed, 128.98, 50, 5.5);
  assert.equal(totals.subtotal, 2128.98);
  assert.equal(totals.discount, 128.98);
  assert.equal(totals.taxableAmount, 2000);
  assert.equal(totals.taxAmount, 110);
  assert.equal(totals.shippingFee, 50);
  assert.equal(totals.total, 2160);

  const letter = buildDefaultCoverLetter(
    {
      contactName: 'Pastor Mateo',
      organization: 'Iglesia Nueva Vida',
      refCode: 'EVA-261119-1700',
      serviceRequested: 'Sanctuary PA Upgrade',
    },
    DEFAULT_SITE_CONTENT.brand,
    totals
  );
  assert.ok(letter.includes('Dear Pastor Mateo (Iglesia Nueva Vida),'));
  assert.ok(letter.includes('$2,160.00'));
  assert.ok(letter.includes('EVA-261119-1700'));
});

test('prepareQuoteForPdf auto-parses incoming cart quotes and preserves manual estimate items', () => {
  const rawCartQuote: QuoteRecord = {
    id: 'q-raw',
    refCode: 'EVA-261120-0915',
    createdAt: '2026-11-20T09:15:00.000Z',
    status: 'new',
    organization: 'Bethel Chapel',
    contactName: 'Pastor Elena',
    phone: '414-555-0200',
    email: 'elena@bethel.org',
    serviceRequested: 'Equipment Quote Cart (2 items)',
    soundboardModel: '',
    roomCapacity: '',
    timeline: 'Afternoon',
    notes: [
      'Quote Cart Items (Estimated MAP Total: $1,999.98):',
      '- 2x QSC K12.2 (QSC) @ $999.99 MAP',
      'Estimated Total (at MAP): $1,999.98',
      'Event / Project Notes: Need delivery before Christmas Eve.',
    ].join('\n'),
    engineerNotes: '',
  };

  const rawPrep = prepareQuoteForPdf(rawCartQuote, DEFAULT_SITE_CONTENT.products);
  assert.equal(rawPrep.resolvedQuote.estimateItems?.length, 1);
  assert.equal(rawPrep.totals.total, 1999.98);
  assert.equal(
    extractCustomerProjectNotes(rawCartQuote.notes, true),
    'Need delivery before Christmas Eve.'
  );

  const manualQuote: QuoteRecord = {
    ...rawCartQuote,
    id: 'q-manual',
    estimateItems: [
      {
        id: 'm1',
        itemNumber: 'QSC K12.2',
        brand: 'QSC',
        description: 'Custom Dealer Price',
        qty: 2,
        unitPrice: 910,
      },
      {
        id: 'm2',
        itemNumber: 'Sanctuary Installation & Tuning',
        brand: 'Install Labor',
        description: 'Rigging, cabling, and full RTA room EQ',
        qty: 1,
        unitPrice: 650,
      },
    ],
    discount: 70,
    shippingFee: 45,
    taxRate: 5,
  };

  const manualPrep = prepareQuoteForPdf(manualQuote, DEFAULT_SITE_CONTENT.products);
  assert.equal(manualPrep.resolvedQuote.estimateItems?.length, 2);
  assert.equal(manualPrep.totals.subtotal, 2470);
  assert.equal(manualPrep.totals.taxableAmount, 2400);
  assert.equal(manualPrep.totals.taxAmount, 120);
  assert.equal(manualPrep.totals.total, 2565);
});

test('reconcileProductsWithDefaults upgrades legacy asset placeholders, CORP-blocked URLs, and watermarked thumbs', () => {
  const wingDef = DEFAULT_SITE_CONTENT.products.find((p) => p.itemNumber === 'Behringer WING')!;
  const psmDef = DEFAULT_SITE_CONTENT.products.find((p) => p.id === 'gear-shure-psm')!;
  const pa421Def = DEFAULT_SITE_CONTENT.products.find((p) => p.id === 'gear-pa421b')!;
  const p16mDef = DEFAULT_SITE_CONTENT.products.find((p) => p.id === 'gear-p16m')!;
  const k12Def = DEFAULT_SITE_CONTENT.products.find((p) => p.itemNumber === 'QSC K12.2')!;

  const legacySaved: GearProduct[] = [
    { ...wingDef, imageUrl: 'asset:wing-mixer' },
    { ...psmDef, imageUrl: 'asset:iem' },
    { ...pa421Def, imageUrl: 'https://products.shureweb.eu/shure_product_db/old.jpeg' },
    { ...p16mDef, imageUrl: 'https://www.thomann.de/thumb/opengraph/pics/prod/259403.jpg' },
    { ...k12Def, imageUrl: 'https://custom-admin-upload.example.com/k12-custom.jpg' },
  ];

  const reconciled = reconcileProductsWithDefaults(legacySaved, DEFAULT_SITE_CONTENT.products);
  assert.equal(reconciled.length, DEFAULT_SITE_CONTENT.products.length);

  const reconciledWing = reconciled.find((p) => p.id === wingDef.id)!;
  const reconciledPsm = reconciled.find((p) => p.id === psmDef.id)!;
  const reconciledPa421 = reconciled.find((p) => p.id === pa421Def.id)!;
  const reconciledP16m = reconciled.find((p) => p.id === p16mDef.id)!;
  const reconciledK12 = reconciled.find((p) => p.id === k12Def.id)!;

  assert.equal(reconciledWing.imageUrl, wingDef.imageUrl);
  assert.equal(reconciledPsm.imageUrl, psmDef.imageUrl);
  assert.equal(reconciledPa421.imageUrl, pa421Def.imageUrl);
  assert.equal(reconciledP16m.imageUrl, p16mDef.imageUrl);
  assert.equal(reconciledK12.imageUrl, 'https://custom-admin-upload.example.com/k12-custom.jpg');
});

test('promoteGearCatalogSection puts Pro Gear first on default or legacy order and keeps custom orders', () => {
  assert.equal(DEFAULT_SITE_CONTENT.sectionOrder[0], 'gear');

  assert.deepEqual(
    promoteGearCatalogSection(['services', 'pricing', 'gear', 'training', 'diagnostic', 'testimonials']),
    ['gear', 'services', 'pricing', 'training', 'diagnostic', 'testimonials']
  );

  assert.deepEqual(
    promoteGearCatalogSection(undefined),
    ['gear', 'services', 'pricing', 'training', 'diagnostic', 'testimonials']
  );

  assert.deepEqual(
    promoteGearCatalogSection(['pricing', 'gear', 'services', 'training', 'diagnostic', 'testimonials']),
    ['pricing', 'gear', 'services', 'training', 'diagnostic', 'testimonials']
  );
});

test('compareVendorQuotes finds lowest landed cost across 3 distributors and calculates spread savings & MAP margin', () => {
  const result = compareVendorQuotes(
    [
      {
        id: 'v1',
        vendorName: 'Sweetwater Pro',
        repName: 'Sam',
        email: 'sam@sweetwater.com',
        phone: '800-222-4700',
        unitCost: 780,
        shippingCost: 0,
        leadTime: 'In Stock',
        skuOrPartNo: 'SW-K122',
        notes: '',
        lastQuotedAt: '2026-11-20',
      },
      {
        id: 'v2',
        vendorName: 'Full Compass',
        repName: 'Elena',
        email: 'elena@fullcompass.com',
        phone: '800-356-5844',
        unitCost: 745,
        shippingCost: 20,
        leadTime: '2 days',
        skuOrPartNo: 'FC-K122',
        notes: '',
        lastQuotedAt: '2026-11-20',
      },
      {
        id: 'v3',
        vendorName: 'ADI',
        repName: 'Mike',
        email: 'mike@adi.com',
        phone: '800-233-6261',
        unitCost: 810,
        shippingCost: 15,
        leadTime: '5 days',
        skuOrPartNo: 'ADI-K122',
        notes: '',
        lastQuotedAt: '2026-11-20',
      },
    ],
    999.99
  );

  assert.equal(result.bestQuote?.vendorName, 'Full Compass');
  assert.equal(result.bestLandedCost, 765);
  assert.equal(result.highestLandedCost, 825);
  assert.equal(result.spreadSavings, 60);
  assert.equal(result.estimatedMarginAtMap, 234.99);
});

test('calculateCustomerOrderTotals, generateOrderCode, and CSV exports handle vendor call logs and sourcing lines', () => {
  const code = generateOrderCode(new Date(2026, 10, 20, 14, 30, 0));
  assert.equal(code, 'ORD-261120-1430');

  const totals = calculateCustomerOrderTotals(
    [
      {
        id: 'l1',
        productName: 'QSC K12.2',
        itemNumber: 'K12.2',
        qty: 2,
        chosenVendor: 'Full Compass',
        contactedRepName: 'Elena',
        vendorPhone: '800-356-5844',
        vendorEmail: 'elena@fullcompass.com',
        contactMethod: 'phone',
        contactedDate: '2026-11-20',
        vendorQuoteRef: 'FC-9912',
        quotedUnitCost: 745,
        shippingCost: 30,
        lineStatus: 'quoted',
        lineNotes: 'Confirmed in stock',
      },
      {
        id: 'l2',
        productName: 'Pro Co EXM-50 XLR',
        itemNumber: 'EXM-50',
        qty: 4,
        chosenVendor: '',
        contactedRepName: '',
        vendorPhone: '',
        vendorEmail: '',
        contactMethod: 'phone',
        contactedDate: '2026-11-20',
        vendorQuoteRef: '',
        quotedUnitCost: 0,
        shippingCost: 0,
        lineStatus: 'need_to_call',
        lineNotes: '',
      },
    ],
    2100
  );

  assert.equal(totals.totalQty, 6);
  assert.equal(totals.totalVendorSubtotal, 1490);
  assert.equal(totals.totalShipping, 30);
  assert.equal(totals.totalLandedCost, 1520);
  assert.equal(totals.estimatedProfit, 580);
  assert.equal(totals.unquotedLineCount, 1);

  const vmEntry: VendorMasterEntry = {
    id: 'vm-1',
    productName: 'QSC K12.2',
    itemNumber: 'K12.2',
    brand: 'QSC',
    mapPrice: 999.99,
    preferredVendor: 'Full Compass',
    notes: 'Call Elena for pair discount',
    quotes: [
      {
        id: 'vq1',
        vendorName: 'Full Compass',
        repName: 'Elena',
        email: 'elena@fullcompass.com',
        phone: '800-356-5844',
        unitCost: 745,
        shippingCost: 20,
        leadTime: '2 days',
        skuOrPartNo: 'FC-K122',
        notes: '',
        lastQuotedAt: '2026-11-20',
      },
    ],
    updatedAt: '2026-11-20T12:00:00.000Z',
  };
  const vmCsv = formatVendorMasterToCsv([vmEntry]);
  assert.ok(vmCsv.includes('QSC K12.2'));
  assert.ok(vmCsv.includes('Full Compass'));
  assert.ok(vmCsv.includes('elena@fullcompass.com'));

  const orderRec: CustomerOrderRecord = {
    id: 'ord-1',
    orderCode: 'ORD-261120-1430',
    linkedQuoteRef: 'EVA-261120-1100',
    customerName: 'Pastor Mateo',
    organization: 'Iglesia Vida',
    customerPhone: '414-555-0199',
    customerEmail: 'pastor@vida.org',
    status: 'sourcing',
    customerQuotedTotal: 2100,
    targetDate: 'Dec 1',
    generalNotes: 'Hold dock delivery',
    items: [
      {
        id: 'l1',
        productName: 'QSC K12.2',
        itemNumber: 'K12.2',
        qty: 2,
        chosenVendor: 'Full Compass',
        contactedRepName: 'Elena',
        vendorPhone: '800-356-5844',
        vendorEmail: 'elena@fullcompass.com',
        contactMethod: 'phone',
        contactedDate: '2026-11-20',
        vendorQuoteRef: 'FC-9912',
        quotedUnitCost: 745,
        shippingCost: 30,
        lineStatus: 'quoted',
        lineNotes: '',
      },
    ],
    callLogs: [
      {
        id: 'c1',
        vendorName: 'Sweetwater Pro',
        repName: 'Sam',
        phone: '800-222-4700',
        email: 'sam@sweetwater.com',
        method: 'phone',
        contactedAt: '2026-11-20',
        quoteNumber: 'SW-5501',
        quotedTotal: 1560,
        notes: 'Full Compass beat this quote by $40',
      },
    ],
    createdAt: '2026-11-20T14:30:00.000Z',
    updatedAt: '2026-11-20T14:35:00.000Z',
  };
  const orderCsv = formatCustomerOrdersToCsv([orderRec]);
  assert.ok(orderCsv.includes('ORD-261120-1430'));
  assert.ok(orderCsv.includes('Full Compass (Elena 800-356-5844) Ref:FC-9912'));
  assert.ok(orderCsv.includes('Sweetwater Pro (Sam 800-222-4700) Quote:SW-5501'));
});

test('VIP customer pricing tier discount, cart member savings, and customer CSV export work cleanly', () => {
  const memberConfig: MemberPricingConfig = {
    enabled: true,
    defaultDiscountPercent: 8,
    churchPartnerDiscountPercent: 12,
    dealerProDiscountPercent: 15,
    badgeLabelEn: 'VIP Member Price',
    badgeLabelEs: 'Precio Miembro VIP',
    loginPromptEn: 'Member Login — Unlock Lower Pricing',
    loginPromptEs: 'Iniciar Sesión — Ver Precios VIP',
    bannerUnlockedEn: 'VIP Member Pricing Unlocked',
    bannerUnlockedEs: 'Precios VIP Desbloqueados',
  };

  const vipCustomer: CustomerAccount = {
    id: 'cust-1',
    authProvider: 'email',
    fullName: 'Pastor Daniel',
    organization: 'Calvary Grace',
    phone: '414-555-0888',
    email: 'daniel@calvary.org',
    status: 'active',
    pricingTier: 'vip',
    notes: 'Regular PA buyer',
    createdAt: '2026-11-21T00:00:00.000Z',
    lastLoginAt: '2026-11-21T12:00:00.000Z',
    loginCount: 3,
  };

  const churchPartner: CustomerAccount = { ...vipCustomer, pricingTier: 'church_partner' };
  const customOverride: CustomerAccount = { ...vipCustomer, customDiscountPercent: 18 };
  const pausedAccount: CustomerAccount = { ...vipCustomer, status: 'paused' };

  assert.equal(getCustomerEffectiveDiscountPercent(null, memberConfig), 0);
  assert.equal(getCustomerEffectiveDiscountPercent(vipCustomer, memberConfig), 8);
  assert.equal(getCustomerEffectiveDiscountPercent(churchPartner, memberConfig), 12);
  assert.equal(getCustomerEffectiveDiscountPercent(customOverride, memberConfig), 18);
  assert.equal(getCustomerEffectiveDiscountPercent(pausedAccount, memberConfig), 0);
  assert.equal(getCustomerEffectiveDiscountPercent(vipCustomer, { ...memberConfig, enabled: false }), 0);

  assert.equal(calculateMemberPrice(1000, 12), 880);
  assert.equal(calculateMemberPrice(999.99, 10), 899.99);
  assert.equal(calculateMemberPrice(undefined, 10), undefined);

  const qsc = DEALER_MAP_PRODUCTS.find((p) => p.itemNumber === 'QSC K12.2')!;
  const cart = addItemToCart([], qsc);
  const memberSummary = calculateCartMemberSummary(cart, 10);
  assert.equal(memberSummary.estimatedMapTotal, 999.99);
  assert.equal(memberSummary.estimatedMemberTotal, 899.99);
  assert.equal(memberSummary.totalSavings, 100);

  const custCsv = formatCustomersToCsv([vipCustomer, customOverride]);
  assert.ok(custCsv.includes('Pastor Daniel'));
  assert.ok(custCsv.includes('Calvary Grace'));
  assert.ok(custCsv.includes('daniel@calvary.org'));
  assert.ok(custCsv.includes('18'));
});

test('mergeHeroConfig, mergePageCopy, and mergeMemberPricing preserve defaults while applying partial overrides', () => {
  const mergedHero = mergeHeroConfig({ headlineEn: 'Custom Worship Sound' });
  assert.equal(mergedHero.headlineEn, 'Custom Worship Sound');
  assert.ok((mergedHero.sloganTitleEn || '').length > 0);
  assert.ok((mergedHero.searchPlaceholderEn || '').length > 0);

  const mergedCopy = mergePageCopy({
    navGearEn: 'Store Gear',
    footerCopyrightEn: 'Custom Copyright',
  });
  assert.equal(mergedCopy.navGearEn, 'Store Gear');
  assert.equal(mergedCopy.footerCopyrightEn, 'Custom Copyright');
  assert.ok(mergedCopy.trainingModules.length >= 3);
  assert.ok(mergedCopy.gearHeadingEn.length > 0);

  const mergedPricing = mergeMemberPricing({ defaultDiscountPercent: 9 });
  assert.equal(mergedPricing.defaultDiscountPercent, 9);
  assert.equal(mergedPricing.enabled, true);
});

test('reconcileServicesWithDefaults upgrades legacy asset placeholders while preserving custom uploads', () => {
  const saved = [
    { id: 'svc-live-sound', imageUrl: 'asset:hero' },
    { id: 'svc-installs', imageUrl: 'asset:console' },
    { id: 'svc-recall-safe', imageUrl: 'asset:iem' },
    { id: 'svc-events', imageUrl: 'https://custom.example.com/my-lighting.jpg' },
  ];
  const reconciled = reconcileServicesWithDefaults(saved, DEFAULT_SITE_CONTENT.services);
  assert.equal(reconciled.find((s) => s.id === 'svc-installs')?.imageUrl, 'asset:luis-rigging');
  assert.equal(reconciled.find((s) => s.id === 'svc-recall-safe')?.imageUrl, 'asset:luis-rack');
  assert.equal(
    reconciled.find((s) => s.id === 'svc-events')?.imageUrl,
    'https://custom.example.com/my-lighting.jpg'
  );
});

test('estimate and customer order totals calculate MAP vs Customer Estimate difference and private engineer net gain', () => {
  const estTotals = calculateEstimateTotals(
    [
      {
        id: 'est-1',
        itemNumber: 'QSC K12.2',
        brand: 'QSC',
        description: 'Powered 12" PA',
        qty: 2,
        mapPrice: 999.99,
        unitPrice: 880,
        dealerCost: 690,
      },
      {
        id: 'est-2',
        itemNumber: 'Install Labor',
        brand: 'Service',
        description: 'Tuning & Rigging',
        qty: 1,
        mapPrice: 400,
        unitPrice: 400,
      },
    ],
    60,
    0,
    5
  );

  // Equipment & labor subtotal = 2*880 + 400 = 2160; MAP total = 2*999.99 + 400 = 2399.98
  assert.equal(estTotals.subtotal, 2160);
  assert.equal(estTotals.taxableAmount, 2100);
  assert.equal(estTotals.mapTotal, 2399.98);
  assert.equal(estTotals.savingsVsMap, 299.98);
  assert.equal(estTotals.hasCostBasis, true);
  assert.equal(estTotals.totalDealerCost, 1380);
  assert.equal(estTotals.netGainProfit, 720);
  assert.ok((estTotals.grossMarginPercent || 0) > 34);

  const ordTotals = calculateCustomerOrderTotals(
    [
      {
        id: 'ord-l1',
        productName: 'QSC K12.2',
        itemNumber: 'QSC K12.2',
        qty: 2,
        mapPrice: 999.99,
        customerUnitPrice: 880,
        chosenVendor: 'Full Compass',
        contactedRepName: 'Elena',
        vendorPhone: '800-356-5844',
        vendorEmail: 'elena@fullcompass.com',
        contactMethod: 'phone',
        contactedDate: '2026-11-22',
        vendorQuoteRef: 'FC-101',
        quotedUnitCost: 685,
        shippingCost: 30,
        lineStatus: 'quoted',
        lineNotes: '',
      },
    ],
    undefined,
    DEFAULT_SITE_CONTENT.products
  );

  assert.equal(ordTotals.totalMapValue, 1999.98);
  assert.equal(ordTotals.totalCustomerEstimateValue, 1760);
  assert.equal(ordTotals.effectiveCustomerTotal, 1760);
  assert.equal(ordTotals.totalLandedCost, 1400);
  assert.equal(ordTotals.customerSavingsVsMap, 239.98);
  assert.equal(ordTotals.estimatedProfit, 360);
});

test('estimate and customer orders sum per-item shipping underneath, keep Product Cost separate from Total Cost, and compute adjustable tax & Bluevine/Stripe processing fees', () => {
  const estTotals = calculateEstimateTotals(
    [
      {
        id: 'ship-1',
        itemNumber: 'QSC K12.2',
        brand: 'QSC',
        description: 'Powered 12" PA',
        qty: 2,
        mapPrice: 999.99,
        unitPrice: 900,
        dealerCost: 680,
        shippingCost: 45,
        applyProcessingFee: true,
      },
      {
        id: 'ship-2',
        itemNumber: 'Cash Labor',
        brand: 'Service',
        description: 'Sanctuary Installation (No Card Fee)',
        qty: 1,
        mapPrice: 500,
        unitPrice: 500,
        dealerCost: 0,
        shippingCost: 0,
        applyProcessingFee: false,
      },
    ],
    0,
    25, // extra freight
    5.5, // adjustable sales tax %
    3.0 // Bluevine/Card 3.0% processing fee
  );

  // Product subtotal = 2*900 + 500 = 2300
  assert.equal(estTotals.subtotal, 2300);
  // Private Product Cost stays separate from shipping
  assert.equal(estTotals.totalDealerCost, 1360);
  // Under-item shipping ($45) + extra freight ($25) = $70 Total Shipping
  assert.equal(estTotals.itemsShippingTotal, 45);
  assert.equal(estTotals.extraShippingFee, 25);
  assert.equal(estTotals.totalShipping, 70);
  assert.equal(estTotals.shippingFee, 70);
  // Private Total Cost = Product Cost ($1360) + Total Shipping ($70) = $1430
  assert.equal(estTotals.totalLandedCost, 1430);
  // Tax = 5.5% of $2300 = $126.50
  assert.equal(estTotals.taxAmount, 126.5);
  // Fee applies only to fee-eligible product share (1800/2300 of subtotal+tax) + 45 item shipping + 25 extra freight = 1800 + 99 + 70 = 1969 * 3% = 59.07
  assert.equal(estTotals.processingFeeAmount, 59.07);
  assert.equal(estTotals.total, 2555.57);

  const ordTotals = calculateCustomerOrderTotals(
    [
      {
        id: 'o-ship-1',
        productName: 'QSC K12.2',
        itemNumber: 'QSC K12.2',
        qty: 2,
        mapPrice: 999.99,
        customerUnitPrice: 900,
        chosenVendor: 'Full Compass',
        contactedRepName: 'Elena',
        vendorPhone: '800-356-5844',
        vendorEmail: 'elena@fullcompass.com',
        contactMethod: 'phone',
        contactedDate: '2026-11-22',
        vendorQuoteRef: 'FC-500',
        quotedUnitCost: 680,
        shippingCost: 45,
        applyProcessingFee: true,
        lineStatus: 'quoted',
        lineNotes: '',
      },
      {
        id: 'o-ship-2',
        productName: 'Behringer X32',
        itemNumber: 'X32',
        qty: 1,
        mapPrice: 2499,
        customerUnitPrice: 2200,
        chosenVendor: 'ADI',
        contactedRepName: 'Mike',
        vendorPhone: '800-233-6261',
        vendorEmail: 'mike@adi.com',
        contactMethod: 'email',
        contactedDate: '2026-11-22',
        vendorQuoteRef: 'ADI-80',
        quotedUnitCost: 1700,
        shippingCost: 35,
        applyProcessingFee: true,
        lineStatus: 'quoted',
        lineNotes: '',
      },
    ],
    undefined,
    DEFAULT_SITE_CONTENT.products,
    [],
    { shippingFee: 20, taxRate: 5.5, processingFeeRate: 2.9 }
  );

  // Product Cost ONLY = 2*680 + 1700 = 3060
  assert.equal(ordTotals.totalVendorSubtotal, 3060);
  // Total Shipping = 45 + 35 (per-item) + 20 (freight) = 100
  assert.equal(ordTotals.itemsShippingTotal, 80);
  assert.equal(ordTotals.extraShippingFee, 20);
  assert.equal(ordTotals.totalShipping, 100);
  // Total Cost = 3060 + 100 = 3160
  assert.equal(ordTotals.totalLandedCost, 3160);
  // Customer equipment total = 1800 + 2200 = 4000; Tax = 5.5% of 4000 = 220
  assert.equal(ordTotals.taxAmount, 220);
  // Stripe 2.9% fee on (4000 + 220 + 20) = 4240 * 0.029 = 122.96
  assert.equal(ordTotals.processingFeeAmount, 122.96);
  // Effective customer total = 4000 + 20 + 220 + 122.96 = 4362.96
  assert.equal(ordTotals.effectiveCustomerTotal, 4362.96);
});

test('parseFullCompassList parses dealer cost, list price, MAP, In Stock, wait times, Preorder, and places Full Compass privately in Supplier #2', () => {
  const samplePaste = `
List ViewShowing 1 - 100 of 118Page 1 2 Next »
Sennheiser EW-D-ASA (Q-R-S) Active Antenna Splitter for EW-D Receivers
Sennheiser EW-D-ASA (Q-R-S)
Active Antenna Splitter for EW-D Receivers
$548.03
List Price: $829.00
699.00
In Stock
1
Add to Cart
Shure AD4D Digital Two-Channel Wireless Receiver
Shure AD4D
Digital Two-Channel Wireless Receiver
As Low As: $2,115.50
List Price: $3,200.00
2,599.00
Item usually available to ship in 5-9 Business Days.
1
Add to Cart
Preorder
RF Venue DISTRO9 HDR 9-Channel Antenna Distribution System
RF Venue DISTRO9 HDR
9-Channel Antenna Distribution System
$1,666.83
List Price: $2,039.00
2,039.00
Item usually available to ship in 2-4 Business Days.
1
Add to Cart
QSC PL380 PowerLight 3 Amplifier
QSC PL380
PowerLight 3 8000W Amplifier
Call for price!
Call our Sales Pros for availability.
1
Add to Cart
`;

  const parsed = parseFullCompassList(samplePaste);
  assert.equal(parsed.length, 4);

  const ewd = parsed[0];
  assert.equal(ewd.brand, 'Sennheiser');
  assert.equal(ewd.itemNumber, 'Sennheiser EW-D-ASA (Q-R-S)');
  assert.equal(ewd.dealerCost, 548.03);
  assert.equal(ewd.listPrice, 829.0);
  assert.equal(ewd.mapPrice, 699.0);
  assert.equal(ewd.inStock, true);
  assert.equal(ewd.availability, 'In Stock');
  assert.equal(ewd.category, 'combiners');

  const ad4d = parsed[1];
  assert.equal(ad4d.dealerCost, 2115.5);
  assert.equal(ad4d.mapPrice, 2599.0);
  assert.equal(ad4d.inStock, false);
  assert.equal(ad4d.availability, 'Ships in 5-9 Business Days');

  const distro9 = parsed[2];
  assert.equal(distro9.inStock, false);
  assert.equal(distro9.availability, 'Preorder · Ships in 2-4 Business Days');

  const pl380 = parsed[3];
  assert.equal(pl380.dealerCost, undefined);
  assert.equal(pl380.mapPrice, undefined);
  assert.equal(pl380.inStock, false);
  assert.equal(pl380.availability, 'Call for Availability & ETA');

  // Verify Supplier #2 placement in VendorMasterEntry & strict MAP-only privacy on GearProduct
  const vendorEntry = buildVendorEntryFromFullCompass(ewd, 'map-sennheiser-ew-d-asa-q-r-s');
  assert.equal(vendorEntry.quotes.length, 3);
  assert.equal(vendorEntry.quotes[0].vendorName, 'Sweetwater Pro');
  assert.equal(vendorEntry.quotes[0].unitCost, 0);
  assert.equal(vendorEntry.quotes[1].vendorName, 'Full Compass');
  assert.equal(vendorEntry.quotes[1].unitCost, 548.03);
  assert.equal(vendorEntry.quotes[1].leadTime, 'In Stock');
  assert.equal(vendorEntry.preferredVendor, 'Full Compass');

  const best = compareVendorQuotes(vendorEntry.quotes, vendorEntry.mapPrice);
  assert.equal(best.bestQuote?.vendorName, 'Full Compass');
  assert.equal(best.bestLandedCost, 548.03);
  assert.equal(best.estimatedMarginAtMap, 150.97);

  const publicProduct = buildGearProductFromFullCompass(
    ewd,
    'https://cdn.shopify.com/example.jpg',
    'map-sennheiser-ew-d-asa-q-r-s'
  );
  assert.equal(publicProduct.mapPrice, 699.0);
  assert.equal(publicProduct.priceLabel, '$699.00 MAP');
  assert.equal(publicProduct.availability, 'In Stock');
  const serializedPublic = JSON.stringify(publicProduct);
  assert.equal(serializedPublic.includes('548.03'), false);
  assert.equal(serializedPublic.includes('Full Compass'), false);

  // Explicit category picker assigns every pasted item to the chosen department
  const forcedMics = parseFullCompassList(samplePaste, 'mics');
  assert.equal(forcedMics.length, 4);
  assert.equal(forcedMics.every((item) => item.category === 'mics'), true);

  const forcedSpeakers = parseFullCompassList(samplePaste, 'speakers');
  assert.equal(forcedSpeakers.every((item) => item.category === 'speakers'), true);

  // Per-row override updates only the targeted SKU without touching others
  const overridden = applyFullCompassCategoryOverrides(forcedMics, {
    [forcedMics[3].itemNumber]: 'speakers',
  });
  assert.equal(overridden[0].category, 'mics');
  assert.equal(overridden[3].category, 'speakers');
  assert.equal(getGearCategoryLabel('mics'), 'Wireless & Wired Mics');
  assert.equal(getGearCategoryLabel('speakers'), 'Speakers & Subs');
});

test('reconcileVendorMasterWithDefaults merges Full Compass defaults, preserves admin edits, and respects deleted IDs', () => {
  const firstDefault = DEFAULT_FULL_COMPASS_VENDOR_ENTRIES[0];
  const secondDefault = DEFAULT_FULL_COMPASS_VENDOR_ENTRIES[1];

  const customOverride: VendorMasterEntry = {
    ...firstDefault,
    quotes: firstDefault.quotes.map((q, idx) =>
      idx === 1 ? { ...q, unitCost: 525.0 } : q
    ),
  };

  const deleted = new Set<string>([secondDefault.id]);
  const merged = reconcileVendorMasterWithDefaults(
    [customOverride],
    DEFAULT_FULL_COMPASS_VENDOR_ENTRIES,
    deleted
  );

  assert.equal(merged.length, DEFAULT_FULL_COMPASS_VENDOR_ENTRIES.length - 1);
  const foundOverride = merged.find((e) => e.id === firstDefault.id)!;
  assert.equal(foundOverride.quotes[1].unitCost, 525.0);
  assert.equal(merged.some((e) => e.id === secondDefault.id), false);
});

test('getProductAvailabilityDisplay and reconcileProductsWithDefaults handle bilingual stock/wait-time badges cleanly', () => {
  const inStockEn = getProductAvailabilityDisplay({ inStock: true, availability: 'In Stock' }, 'en');
  assert.equal(inStockEn.tone, 'in_stock');
  assert.equal(inStockEn.label, 'In Stock');

  const inStockEs = getProductAvailabilityDisplay({ inStock: true, availability: 'In Stock' }, 'es');
  assert.equal(inStockEs.tone, 'in_stock');
  assert.equal(inStockEs.label, 'En Existencia');

  const waitEn = getProductAvailabilityDisplay(
    { inStock: false, availability: 'Ships in 5-9 Business Days' },
    'en'
  );
  assert.equal(waitEn.tone, 'wait_time');
  assert.equal(waitEn.label, 'Ships in 5-9 Business Days');

  const waitEs = getProductAvailabilityDisplay(
    { inStock: false, availability: 'Ships in 5-9 Business Days' },
    'es'
  );
  assert.equal(waitEs.tone, 'wait_time');
  assert.equal(waitEs.label, 'Envío en 5-9 Días Hábiles');

  const callEn = getProductAvailabilityDisplay(
    { inStock: false, availability: 'Call for Availability & ETA' },
    'en'
  );
  assert.equal(callEn.tone, 'call');

  // Ensure reconcileProductsWithDefaults hydrates missing availability from default catalog
  const ewdDef = DEFAULT_SITE_CONTENT.products.find(
    (p) => p.itemNumber === 'Sennheiser EW-D-ASA (Q-R-S)'
  )!;
  const legacySavedWithoutAvail: GearProduct = { ...ewdDef, availability: undefined };
  const hydrated = reconcileProductsWithDefaults([legacySavedWithoutAvail], DEFAULT_SITE_CONTENT.products);
  const hydratedEwd = hydrated.find((p) => p.id === ewdDef.id)!;
  assert.equal(hydratedEwd.availability, 'In Stock');
});

test('Google Meet helpers normalize valid Meet URLs/codes, block unsafe URLs, merge config, and format consultation requests', () => {
  assert.equal(
    normalizeGoogleMeetUrl('abc-defg-hij'),
    'https://meet.google.com/abc-defg-hij'
  );
  assert.equal(
    normalizeGoogleMeetUrl('meet.google.com/xyz-mnop-qrs/'),
    'https://meet.google.com/xyz-mnop-qrs'
  );
  assert.equal(
    normalizeGoogleMeetUrl('https://meet.google.com/eva-sound-123'),
    'https://meet.google.com/eva-sound-123'
  );
  assert.equal(normalizeGoogleMeetUrl('javascript:alert(1)'), null);
  assert.equal(normalizeGoogleMeetUrl('https://evil.example.com/abc-defg-hij'), null);
  assert.equal(extractGoogleMeetCode('https://meet.google.com/abc-defg-hij'), 'abc-defg-hij');

  const merged = mergeVideoMeetingConfig({
    isLiveNow: true,
    activeMeetingUri: 'https://meet.google.com/abc-defg-hij',
    activeMeetingCode: 'abc-defg-hij',
  });
  assert.equal(merged.enabled, true);
  assert.equal(merged.isLiveNow, true);
  assert.ok(merged.welcomeNoteEn.length > 0);
  assert.ok(merged.availabilityHoursEs.length > 0);

  const reqPayload = buildVideoMeetingRequestInput({
    contactName: 'Pastor David',
    organization: 'Grace Worship',
    phone: '414-555-0188',
    email: 'david@grace.org',
    topic: 'Sanctuary Sound Check',
    preferredDate: '2026-11-25',
    preferredTime: 'Morning (9:00 AM – 12:00 PM CST)',
    notes: 'Want to show you our X32 routing',
    meetingLink: 'https://meet.google.com/abc-defg-hij',
  });
  assert.equal(validateQuoteInput(reqPayload, true).valid, true);
  assert.ok(reqPayload.serviceRequested.includes('Google Meet'));
  assert.ok(reqPayload.notes.includes('https://meet.google.com/abc-defg-hij'));
});

test('parseSweetwaterList handles Sweetwater.com cards, Pro tab quotes, category targeting, and non-destructive Supplier #1 + #2 merge', () => {
  const sweetwaterCardPaste = [
    'QSC K12.2 2000W 12-inch Powered Speaker',
    '2000W 12" Active PA Speaker with DSP',
    '(412)',
    '$999.99',
    'Or $42/month for 24 months',
    'Save $100',
    'In Stock!',
    'Free Shipping',
    'Add to Cart',
    'Compare',
    '',
    'Electro-Voice EKX-18SP 18-inch Powered Subwoofer',
    '1300W 18" Powered Subwoofer with QuickSmartDSP',
    '(128)',
    '$1,099.00',
    'Or $46/month for 24 months',
    'Arriving in 1-2 weeks',
    'Add to Cart',
  ].join('\n');

  const parsedCards = parseSweetwaterList(sweetwaterCardPaste, 'speakers');
  assert.equal(parsedCards.length, 2);

  const k12 = parsedCards[0];
  assert.equal(k12.brand, 'QSC');
  assert.equal(k12.category, 'speakers');
  assert.equal(k12.mapPrice, 999.99);
  assert.equal(k12.dealerCost, undefined);
  assert.equal(k12.inStock, true);
  assert.equal(k12.availability, 'In Stock');

  const ekx = parsedCards[1];
  assert.equal(ekx.brand, 'Electro-Voice');
  assert.equal(ekx.category, 'speakers');
  assert.equal(ekx.mapPrice, 1099.0);
  assert.equal(ekx.inStock, false);
  assert.equal(ekx.availability, 'Arriving in 1-2 weeks');

  // Sweetwater Pro tab-delimited quote with both Cost & MAP
  const proQuoteTsv = [
    'SKU\tDescription\tYour Price\tMAP\tAvailability',
    'Shure SM58-LC\tCardioid Dynamic Vocal Microphone\tCost: $74.00\tMAP: $99.00\tIn Stock',
    'Shure\tSLXD24/B58\tDigital Wireless Handheld System\t$549.00\t$749.00\tMore on the way',
  ].join('\n');

  const parsedPro = parseSupplierBulkList(proQuoteTsv, 'sweetwater', 'mics');
  assert.equal(parsedPro.length, 2);
  assert.equal(parsedPro[0].itemNumber, 'Shure SM58-LC');
  assert.equal(parsedPro[0].dealerCost, 74.0);
  assert.equal(parsedPro[0].mapPrice, 99.0);
  assert.equal(parsedPro[0].category, 'mics');
  assert.equal(parsedPro[0].inStock, true);

  assert.equal(parsedPro[1].itemNumber, 'Shure SLXD24/B58');
  assert.equal(parsedPro[1].dealerCost, 549.0);
  assert.equal(parsedPro[1].mapPrice, 749.0);
  assert.equal(parsedPro[1].inStock, false);

  // Build Supplier #1 (Sweetwater Pro) entry and verify Slot 0 populated & Slot 1 untouched
  const swEntry = buildVendorEntryFromSupplierImport(
    parsedPro[0],
    'map-shure-sm58-lc',
    'sweetwater',
    '2026-11-22'
  );
  assert.equal(swEntry.quotes[0].vendorName, 'Sweetwater Pro');
  assert.equal(swEntry.quotes[0].unitCost, 74.0);
  assert.equal(swEntry.quotes[1].vendorName, 'Full Compass');
  assert.equal(swEntry.quotes[1].unitCost, 0);
  assert.equal(swEntry.preferredVendor, 'Sweetwater Pro');

  // Now merge a Full Compass (Supplier #2) quote into the same item — Slot 0 must remain intact!
  const mergedBoth = mergeVendorEntryWithSupplierImport(
    swEntry,
    {
      ...parsedPro[0],
      dealerCost: 71.5,
      mapPrice: 99.0,
      availability: 'In Stock',
      leadTimeShort: 'In Stock',
    },
    'map-shure-sm58-lc',
    'fullcompass',
    '2026-11-22'
  );
  assert.equal(mergedBoth.quotes[0].vendorName, 'Sweetwater Pro');
  assert.equal(mergedBoth.quotes[0].unitCost, 74.0);
  assert.equal(mergedBoth.quotes[1].vendorName, 'Full Compass');
  assert.equal(mergedBoth.quotes[1].unitCost, 71.5);
  assert.equal(mergedBoth.preferredVendor, 'Full Compass');
  assert.ok(mergedBoth.notes.includes('Sweetwater Pro'));
  assert.ok(mergedBoth.notes.includes('Full Compass'));

  // Re-importing a MAP-only Sweetwater web card must NOT erase the saved $74.00 Sweetwater Pro dealer cost
  const mergedMapOnly = mergeVendorEntryWithSupplierImport(
    mergedBoth,
    {
      ...parsedPro[0],
      dealerCost: undefined,
      mapPrice: 99.0,
      availability: 'In Stock',
      leadTimeShort: 'In Stock',
    },
    'map-shure-sm58-lc',
    'sweetwater',
    '2026-11-22'
  );
  assert.equal(mergedMapOnly.quotes[0].unitCost, 74.0);
  assert.equal(mergedMapOnly.quotes[1].unitCost, 71.5);
});

test('sanitizeImageUrlForCloud preserves valid uploaded photos, prevents mid-base64 corruption, and reconcileProductsWithDefaults keeps custom brand & uploaded photo', () => {
  const validUpload = 'data:image/jpeg;base64,' + 'A'.repeat(24000);
  assert.equal(sanitizeImageUrlForCloud(validUpload), validUpload);
  assert.equal(estimateDataUrlKilobytes(validUpload) > 15, true);

  // Oversized base64 data URL must fall back cleanly rather than slicing mid-base64
  const oversizedUpload = 'data:image/jpeg;base64,' + 'B'.repeat(MAX_FIRESTORE_IMAGE_URL_CHARS + 5000);
  assert.equal(sanitizeImageUrlForCloud(oversizedUpload, 'asset:console'), 'asset:console');

  // Normal https URL passes through untouched
  assert.equal(
    sanitizeImageUrlForCloud('https://cdn.shopify.com/product.jpg'),
    'https://cdn.shopify.com/product.jpg'
  );

  // Pending local edits take precedence over equal or older cloud snapshots until synced
  assert.equal(shouldPreferLocalPendingContent(1000, 2000), false);
  assert.equal(shouldPreferLocalPendingContent(0, 5000), false);
  assert.equal(shouldPreferLocalPendingContent(1000, 1000), true);
  assert.equal(shouldPreferLocalPendingContent(6000, 5000), true);
  assert.equal(shouldPreferLocalPendingContent(6000, 0), true);

  // Admin-edited brand + uploaded photo + custom newly added product survive reconciliation
  const k12Def = DEFAULT_SITE_CONTENT.products.find((p) => p.itemNumber === 'QSC K12.2')!;
  const customAddedProduct: GearProduct = {
    id: 'gear-custom-test-speaker',
    itemNumber: 'EVA-CUSTOM-15',
    name: 'EVA Custom Sanctuary Monitor 15"',
    brand: 'Elevation Voice Audio',
    category: 'speakers',
    mapPrice: 849.0,
    priceLabel: '$849.00 MAP',
    priceNote: 'In Stock · Authorized Dealer MAP',
    descriptionEn: 'Custom uploaded product with uploaded photo',
    descriptionEs: 'Producto personalizado con foto cargada',
    specs: ['Elevation Voice Audio', 'In Stock'],
    imageUrl: validUpload,
    inStock: true,
    availability: 'In Stock',
  };

  const editedK12: GearProduct = {
    ...k12Def,
    brand: 'QSC Audio Pro',
    imageUrl: validUpload,
  };

  const reconciled = reconcileProductsWithDefaults(
    [customAddedProduct, editedK12],
    DEFAULT_SITE_CONTENT.products
  );

  const foundCustom = reconciled.find((p) => p.id === 'gear-custom-test-speaker')!;
  assert.ok(foundCustom);
  assert.equal(foundCustom.imageUrl, validUpload);
  assert.equal(foundCustom.brand, 'Elevation Voice Audio');

  const foundK12 = reconciled.find((p) => p.id === k12Def.id)!;
  assert.equal(foundK12.brand, 'QSC Audio Pro');
  assert.equal(foundK12.imageUrl, validUpload);
});

test('Cases & Rackmount built-in category and custom category manager work across catalog, bulk parser, and reconciliation', () => {
  // 1. Built-in Cases & Rackmount department exists with 16 pre-assigned items
  assert.ok(BUILT_IN_CATALOG_CATEGORIES.some((c) => c.id === 'cases' && c.labelEn === 'Cases & Rackmount'));
  assert.ok(SUGGESTED_CUSTOM_CATEGORIES.some((c) => c.id === 'subwoofer-mounts'));
  assert.ok(SUGGESTED_CUSTOM_CATEGORIES.some((c) => c.id === 'hardware'));
  assert.ok(SUGGESTED_CUSTOM_CATEGORIES.some((c) => c.id === 'drum-mics'));
  assert.ok(SUGGESTED_CUSTOM_CATEGORIES.some((c) => c.id === 'mic-capsules'));

  const casesProducts = DEALER_MAP_PRODUCTS.filter((p) => p.category === 'cases');
  assert.ok(casesProducts.length >= 16, `Expected >= 16 cases/rackmount items, got ${casesProducts.length}`);
  assert.ok(casesProducts.some((p) => p.itemNumber === 'Gator G-PRO-6U-19 Rack Case'));
  assert.ok(casesProducts.some((p) => p.itemNumber === 'PreSonus SLMAD-RACK'));
  assert.ok(casesProducts.some((p) => p.itemNumber === 'PreSonus CDL Sub18 Cover'));

  // 2. Auto-classifier routes cases, rackmount kits, and covers to 'cases'
  assert.equal(
    classifyFullCompassCategory('Gator', 'Gator GR-6L', '6U Standard Molded Rack Case'),
    'cases'
  );
  assert.equal(
    classifyFullCompassCategory('SKB', 'SKB 1SKB-R4U', '4U Roto-Molded Rackmount Case'),
    'cases'
  );
  assert.equal(
    classifyFullCompassCategory('PreSonus', 'SLMAD-RACK', 'StudioLive Series III Rackmount Kit'),
    'cases'
  );
  assert.equal(
    classifyFullCompassCategory('QSC', 'K12.2 Tote', 'Padded Cover for K12.2 Speaker'),
    'cases'
  );

  // 3. Slugification, validation, creation, deduplication, and bulk options
  assert.equal(slugifyCategoryId('Subwoofer Mounts & Poles'), 'subwoofer-mounts-and-poles');
  assert.equal(slugifyCategoryId('all'), '');
  assert.equal(slugifyCategoryId('auto'), '');
  assert.equal(sanitizeProductCategoryId('subwoofer-mounts'), 'subwoofer-mounts');
  assert.equal(sanitizeProductCategoryId('INVALID SLUG!!'), 'invalid-slug');
  assert.equal(sanitizeProductCategoryId('all', 'cases'), 'cases');

  const created1 = createCustomCategoryEntry(
    { labelEn: 'Subwoofer Mounts & Poles', hint: 'Sub poles & M20 mounts' },
    []
  );
  assert.ok(created1.category);
  assert.equal(created1.category.id, 'subwoofer-mounts-and-poles');

  // Duplicate label blocked cleanly
  const dupAttempt = createCustomCategoryEntry(
    { labelEn: 'Subwoofer Mounts & Poles' },
    [created1.category]
  );
  assert.equal(dupAttempt.category, null);
  assert.ok(dupAttempt.error?.includes('already exists'));

  // Duplicate against built-in blocked cleanly
  const builtInDup = createCustomCategoryEntry({ labelEn: 'Cases & Rackmount', id: 'cases' }, []);
  assert.equal(builtInDup.category, null);

  const customList = sanitizeCustomCategories([
    created1.category,
    { id: 'hardware', labelEn: 'Mounting Hardware', labelEs: 'Herrajes' },
    { id: 'cases', labelEn: 'Fake Override', labelEs: 'Fake' },
  ]);
  assert.equal(customList.length, 2);
  const allCats = getAllCatalogCategories(customList);
  assert.equal(allCats.length, BUILT_IN_CATALOG_CATEGORIES.length + 2);
  assert.equal(getCatalogCategoryLabel('cases', customList, 'en'), 'Cases & Rackmount');
  assert.equal(getCatalogCategoryLabel('hardware', customList, 'en'), 'Mounting Hardware');
  assert.equal(getCatalogCategoryLabel('hardware', customList, 'es'), 'Herrajes');

  // Bulk parser & bulk category options include custom categories
  const bulkOpts = getBulkCategoryOptions(customList);
  assert.ok(bulkOpts.some((o) => o.id === 'cases'));
  assert.ok(bulkOpts.some((o) => o.id === 'hardware'));
  assert.equal(getGearCategoryLabel('hardware', customList), 'Mounting Hardware');

  const bulkPasted = parseSupplierBulkList(
    'K&M 21367\tM20 Threaded Subwoofer Pole\tCost: $62.00\tMAP: $89.99\tIn Stock',
    'sweetwater',
    created1.category.id
  );
  assert.equal(bulkPasted.length, 1);
  assert.equal(bulkPasted[0].category, created1.category.id);

  // 4. Safe reassignment on delete + legacy default cables->cases upgrade on reconcile
  const sampleSubMount: GearProduct = {
    id: 'gear-km-sub-pole',
    itemNumber: 'K&M 21367',
    name: 'K&M 21367',
    brand: 'K&M',
    category: 'hardware',
    mapPrice: 89.99,
    priceLabel: '$89.99 MAP',
    priceNote: 'In Stock',
    descriptionEn: 'M20 sub pole',
    descriptionEs: 'Poste M20',
    specs: ['K&M'],
    imageUrl: 'asset:rack-wiring',
    inStock: true,
  };
  const reassigned = reassignProductsOnCategoryDelete([sampleSubMount], 'hardware', 'rigging');
  assert.equal(reassigned[0].category, 'rigging');

  const gatorDef = DEFAULT_SITE_CONTENT.products.find(
    (p) => p.itemNumber === 'Gator G-PRO-6U-19 Rack Case'
  )!;
  const legacyGatorAsCables: GearProduct = { ...gatorDef, category: 'cables' };
  const reconciled = reconcileProductsWithDefaults(
    [legacyGatorAsCables, sampleSubMount],
    DEFAULT_SITE_CONTENT.products
  );
  assert.equal(reconciled.find((p) => p.id === gatorDef.id)!.category, 'cases');
  assert.equal(reconciled.find((p) => p.id === sampleSubMount.id)!.category, 'hardware');
  assert.equal(filterProducts(reconciled, 'hardware', '').length, 1);
  assert.ok(filterProducts(reconciled, 'cases', '').length >= 16);
});

test('buildSanitizedQuoteForFirestore guarantees every firestore.rules isValidQuote and guest create constraint', () => {
  const ALLOWED_GUEST_KEYS = new Set([
    'refCode',
    'status',
    'organization',
    'contactName',
    'phone',
    'email',
    'serviceRequested',
    'soundboardModel',
    'roomCapacity',
    'timeline',
    'notes',
    'engineerNotes',
  ]);
  const DISALLOWED_GUEST_KEYS = [
    'estimateItems',
    'discount',
    'shippingFee',
    'taxRate',
    'processingFeeRate',
    'paymentMethod',
    'coverLetter',
    'estimateUpdatedAt',
  ];

  // Normal cart quote submission
  const normal = buildSanitizedQuoteForFirestore(
    {
      organization: '  Grace Worship Center  ',
      contactName: '  Pastor Carlos  ',
      phone: '  (414) 555-0199  ',
      email: '  carlos@grace.org  ',
      serviceRequested: 'Quote Cart (3 items · Est. MAP $2,999.97)',
      soundboardModel: 'Behringer X32',
      roomCapacity: '300 seats',
      timeline: 'Best time to call: Morning',
      notes: 'Quote Cart Items:\n- 2x QSC K12.2 (QSC) @ $999.99 MAP',
    },
    'EVA-261123-0815'
  );

  assert.equal(normal.refCode, 'EVA-261123-0815');
  assert.match(normal.refCode, /^EVA-([0-9]{6}|[0-9]{6}-[0-9]{4})$/);
  assert.equal(normal.status, 'new');
  assert.equal(normal.contactName, 'Pastor Carlos');
  assert.equal(normal.organization, 'Grace Worship Center');
  assert.equal(normal.phone, '(414) 555-0199');
  assert.equal(normal.email, 'carlos@grace.org');
  assert.equal(normal.engineerNotes, '');
  for (const key of Object.keys(normal)) {
    assert.ok(ALLOWED_GUEST_KEYS.has(key), `Unexpected key: ${key}`);
  }
  for (const forbidden of DISALLOWED_GUEST_KEYS) {
    assert.equal(forbidden in normal, false, `Disallowed guest key present: ${forbidden}`);
  }

  // Adversarial / oversized / blank edge-case inputs still pass every Firestore rule limit
  const edge = buildSanitizedQuoteForFirestore(
    {
      organization: 'O'.repeat(300),
      contactName: '   ',
      phone: '123',
      email: 'E'.repeat(300),
      serviceRequested: '   ',
      soundboardModel: 'S'.repeat(300),
      roomCapacity: 'R'.repeat(300),
      timeline: 'T'.repeat(300),
      notes: 'N'.repeat(9000),
    },
    'BAD-REF'
  );

  assert.match(edge.refCode, /^EVA-([0-9]{6}|[0-9]{6}-[0-9]{4})$/);
  assert.equal(edge.status, 'new');
  assert.equal(edge.contactName.length >= 1 && edge.contactName.length <= 120, true);
  assert.equal(edge.phone.length >= 7 && edge.phone.length <= 40, true);
  assert.equal(edge.serviceRequested.length >= 1 && edge.serviceRequested.length <= 320, true);
  assert.equal(edge.organization.length, 160);
  assert.equal(edge.email.length, 160);
  assert.equal(edge.soundboardModel.length, 120);
  assert.equal(edge.roomCapacity.length, 80);
  assert.equal(edge.timeline.length, 120);
  assert.equal(edge.notes.length, 5000);
  assert.equal(edge.engineerNotes, '');
});








