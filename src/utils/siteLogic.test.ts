import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addItemToCart,
  buildDefaultCoverLetter,
  calculateCarePlanSavings,
  calculateCartMemberSummary,
  calculateCartSummary,
  calculateCustomerOrderTotals,
  calculateEstimateTotals,
  calculateMemberPrice,
  compareVendorQuotes,
  extractCustomerProjectNotes,
  filterProducts,
  formatCustomerOrdersToCsv,
  formatCustomersToCsv,
  formatQuotesToCsv,
  formatQuotesToTsv,
  formatVendorMasterToCsv,
  generateOrderCode,
  generateRefCode,
  getCustomerEffectiveDiscountPercent,
  getUniqueBrands,
  mergeHeroConfig,
  mergeMemberPricing,
  mergePageCopy,
  moveItemInArray,
  parseEstimateItemsFromNotes,
  prepareQuoteForPdf,
  promoteGearCatalogSection,
  reconcileProductsWithDefaults,
  reconcileServicesWithDefaults,
  removeCartItem,
  runSanctuaryDiagnostic,
  selectFeaturedCatalogPreview,
  sortProducts,
  updateCartItemQty,
  validateQuoteInput,
} from './siteLogic';
import { DEALER_MAP_PRODUCTS } from '../data/dealerMapCatalog';
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

test('dealerMapCatalog and DEFAULT_SITE_CONTENT include 356 authentic products across 8 departments (including RCF & FBT) with verified photos', () => {
  assert.equal(DEALER_MAP_PRODUCTS.length, 348);
  const mapPriced = DEALER_MAP_PRODUCTS.filter(
    (item) => typeof item.mapPrice === 'number' && item.mapPrice > 0
  );
  assert.equal(mapPriced.length, 347);

  assert.equal(DEFAULT_SITE_CONTENT.products.length, 356);
  const uniqueIds = new Set(DEFAULT_SITE_CONTENT.products.map((item) => item.id));
  assert.equal(uniqueIds.size, DEFAULT_SITE_CONTENT.products.length);

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

