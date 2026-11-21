import type {
  BrandConfig,
  CartItem,
  CustomerOrderRecord,
  EstimateLineItem,
  GearCategory,
  GearProduct,
  GearSortOption,
  OrderLineSourcing,
  PriceRangeFilter,
  QuoteRecord,
  QuoteSubmissionInput,
  SectionId,
  VendorMasterEntry,
  VendorQuoteOption,
} from '../types/site';

export interface SavingsBreakdown {
  standalonePerVisit: number;
  standaloneAnnualCost: number;
  carePlanAnnualCost: number;
  annualSavings: number;
  savesMoney: boolean;
}

export function calculateCarePlanSavings(
  emergencyCallsPerYear: number,
  reEqVisitsPerYear: number,
  weeklyPrice = 50,
  hourlyRate = 120,
  minHours = 4
): SavingsBreakdown {
  const safeEmergency = Math.max(0, Math.round(emergencyCallsPerYear));
  const safeReEq = Math.max(0, Math.round(reEqVisitsPerYear));
  const safeWeekly = Math.max(0, weeklyPrice);
  const safeHourly = Math.max(0, hourlyRate);
  const safeMinHours = Math.max(1, minHours);

  const standalonePerVisit = safeHourly * safeMinHours;
  const totalStandaloneVisits = safeEmergency + safeReEq;
  const standaloneAnnualCost = totalStandaloneVisits * standalonePerVisit;
  const carePlanAnnualCost = safeWeekly * 52;
  const annualSavings = standaloneAnnualCost - carePlanAnnualCost;

  return {
    standalonePerVisit,
    standaloneAnnualCost,
    carePlanAnnualCost,
    annualSavings,
    savesMoney: annualSavings > 0,
  };
}

export function moveItemInArray<T>(
  items: readonly T[],
  index: number,
  direction: 'up' | 'down'
): T[] {
  if (index < 0 || index >= items.length) {
    return [...items];
  }
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getUniqueBrands(products: readonly GearProduct[]): string[] {
  const seen = new Set<string>();
  for (const item of products) {
    const clean = item.brand.trim();
    if (clean) {
      seen.add(clean);
    }
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

export function matchesPriceRange(
  mapPrice: number | undefined,
  priceRange: PriceRangeFilter
): boolean {
  if (priceRange === 'all') {
    return true;
  }
  if (priceRange === 'quoteOnly') {
    return mapPrice === undefined || mapPrice <= 0;
  }
  if (mapPrice === undefined || mapPrice <= 0) {
    return false;
  }
  switch (priceRange) {
    case 'under500':
      return mapPrice < 500;
    case '500to1000':
      return mapPrice >= 500 && mapPrice <= 1000;
    case '1000to2000':
      return mapPrice > 1000 && mapPrice <= 2000;
    case 'over2000':
      return mapPrice > 2000;
    default:
      return true;
  }
}

export function filterProducts(
  products: readonly GearProduct[],
  category: GearCategory,
  searchQuery: string,
  brand = 'all',
  priceRange: PriceRangeFilter = 'all'
): GearProduct[] {
  const q = searchQuery.trim().toLowerCase();
  return products.filter((item) => {
    if (category !== 'all' && item.category !== category) {
      return false;
    }
    if (brand !== 'all' && item.brand !== brand) {
      return false;
    }
    if (!matchesPriceRange(item.mapPrice, priceRange)) {
      return false;
    }
    if (!q) {
      return true;
    }
    const haystack = [
      item.itemNumber ?? '',
      item.name,
      item.brand,
      item.category,
      item.priceLabel,
      item.descriptionEn,
      item.descriptionEs,
      ...item.specs,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function sortProducts(
  products: readonly GearProduct[],
  sortBy: GearSortOption
): GearProduct[] {
  if (sortBy === 'featured') {
    return [...products];
  }
  const copy = [...products];
  if (sortBy === 'nameAsc') {
    return copy.sort((a, b) =>
      (a.itemNumber || a.name).localeCompare(b.itemNumber || b.name)
    );
  }
  if (sortBy === 'priceAsc') {
    return copy.sort((a, b) => {
      const pa = typeof a.mapPrice === 'number' && a.mapPrice > 0 ? a.mapPrice : Number.POSITIVE_INFINITY;
      const pb = typeof b.mapPrice === 'number' && b.mapPrice > 0 ? b.mapPrice : Number.POSITIVE_INFINITY;
      return pa - pb;
    });
  }
  return copy.sort((a, b) => {
    const pa = typeof a.mapPrice === 'number' && a.mapPrice > 0 ? a.mapPrice : -1;
    const pb = typeof b.mapPrice === 'number' && b.mapPrice > 0 ? b.mapPrice : -1;
    return pb - pa;
  });
}

const FEATURED_MIX_ORDER: ReadonlyArray<Exclude<GearCategory, 'all'>> = [
  'consoles',
  'speakers',
  'lighting',
  'rigging',
  'cables',
  'mics',
  'iem',
  'combiners',
];

export function selectFeaturedCatalogPreview(
  products: readonly GearProduct[],
  limit = 12
): GearProduct[] {
  if (products.length <= limit) {
    return [...products];
  }

  const buckets = new Map<Exclude<GearCategory, 'all'>, GearProduct[]>();
  for (const cat of FEATURED_MIX_ORDER) {
    buckets.set(cat, []);
  }
  for (const item of products) {
    const list = buckets.get(item.category);
    if (list) {
      list.push(item);
    }
  }

  const picked: GearProduct[] = [];
  const seenIds = new Set<string>();
  let round = 0;

  while (picked.length < limit) {
    let addedInRound = false;
    for (const cat of FEATURED_MIX_ORDER) {
      if (picked.length >= limit) break;
      const list = buckets.get(cat);
      if (list && round < list.length) {
        const candidate = list[round];
        if (!seenIds.has(candidate.id)) {
          picked.push(candidate);
          seenIds.add(candidate.id);
          addedInRound = true;
        }
      }
    }
    if (!addedInRound) break;
    round += 1;
  }

  if (picked.length < limit) {
    for (const item of products) {
      if (picked.length >= limit) break;
      if (!seenIds.has(item.id)) {
        picked.push(item);
        seenIds.add(item.id);
      }
    }
  }

  return picked;
}

export function addItemToCart(
  cart: readonly CartItem[],
  product: GearProduct
): CartItem[] {
  const existing = cart.find((c) => c.productId === product.id);
  if (existing) {
    return cart.map((c) =>
      c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c
    );
  }
  return [
    ...cart,
    {
      productId: product.id,
      itemNumber: product.itemNumber || product.name,
      brand: product.brand,
      description: product.descriptionEn || product.name,
      mapPrice: product.mapPrice,
      imageUrl: product.imageUrl,
      quantity: 1,
    },
  ];
}

export function updateCartItemQty(
  cart: readonly CartItem[],
  productId: string,
  delta: number
): CartItem[] {
  return cart
    .map((item) =>
      item.productId === productId
        ? { ...item, quantity: item.quantity + delta }
        : item
    )
    .filter((item) => item.quantity > 0);
}

export function removeCartItem(
  cart: readonly CartItem[],
  productId: string
): CartItem[] {
  return cart.filter((item) => item.productId !== productId);
}

export interface CartSummary {
  totalCount: number;
  estimatedMapTotal: number;
  quoteOnlyCount: number;
}

export function calculateCartSummary(cart: readonly CartItem[]): CartSummary {
  let totalCount = 0;
  let estimatedMapTotal = 0;
  let quoteOnlyCount = 0;

  for (const item of cart) {
    const qty = Math.max(1, item.quantity);
    totalCount += qty;
    if (typeof item.mapPrice === 'number' && item.mapPrice > 0) {
      estimatedMapTotal += item.mapPrice * qty;
    } else {
      quoteOnlyCount += qty;
    }
  }

  return {
    totalCount,
    estimatedMapTotal: Math.round(estimatedMapTotal * 100) / 100,
    quoteOnlyCount,
  };
}

export interface QuoteValidationResult {
  valid: boolean;
  errors: Partial<Record<'contactName' | 'phone' | 'email' | 'serviceRequested', string>>;
}

export function validateQuoteInput(
  input: QuoteSubmissionInput,
  requireEmail = false
): QuoteValidationResult {
  const errors: QuoteValidationResult['errors'] = {};

  if (!input.contactName.trim()) {
    errors.contactName = 'Please enter your name.';
  }

  const digitsOnly = input.phone.replace(/\D/g, '');
  if (digitsOnly.length < 7) {
    errors.phone = 'Please enter a valid phone number.';
  }

  const trimmedEmail = input.email.trim();
  if (requireEmail && !trimmedEmail) {
    errors.email = 'Please enter your email address.';
  } else if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!input.serviceRequested.trim()) {
    errors.serviceRequested = 'Please choose a service or product.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function generateRefCode(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  return `EVA-${yy}${mm}${dd}-${hh}${min}`;
}

function escapeCsvCell(value: string): string {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ');
  if (/[",]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function formatQuotesToCsv(quotes: readonly QuoteRecord[]): string {
  const headers = [
    'Ref ID',
    'Date',
    'Status',
    'Church / Organization',
    'Contact Name',
    'Phone',
    'Email',
    'Service Requested',
    'Soundboard Model',
    'Room Capacity',
    'Timeline',
    'Customer Notes',
    'Engineer Notes',
  ];

  const rows = quotes.map((q) =>
    [
      q.refCode,
      q.createdAt.slice(0, 10),
      q.status,
      q.organization,
      q.contactName,
      q.phone,
      q.email,
      q.serviceRequested,
      q.soundboardModel,
      q.roomCapacity,
      q.timeline,
      q.notes,
      q.engineerNotes,
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\n');
}

export function formatQuotesToTsv(quotes: readonly QuoteRecord[]): string {
  const headers = [
    'Ref ID',
    'Date',
    'Status',
    'Church / Organization',
    'Contact Name',
    'Phone',
    'Email',
    'Service Requested',
    'Soundboard Model',
    'Room Capacity',
    'Timeline',
    'Customer Notes',
    'Engineer Notes',
  ];

  const clean = (val: string) => String(val ?? '').replace(/[\t\r\n]+/g, ' ');
  const rows = quotes.map((q) =>
    [
      q.refCode,
      q.createdAt.slice(0, 10),
      q.status,
      q.organization,
      q.contactName,
      q.phone,
      q.email,
      q.serviceRequested,
      q.soundboardModel,
      q.roomCapacity,
      q.timeline,
      q.notes,
      q.engineerNotes,
    ]
      .map(clean)
      .join('\t')
  );

  return [headers.join('\t'), ...rows].join('\n');
}

export interface DiagnosticInput {
  symptom: 'feedback' | 'muddy' | 'stageVolume' | 'volunteer';
  roomSize: 'small' | 'medium' | 'large';
  consoleType: 'x32_m32' | 'wing_sq' | 'analog' | 'unknown';
}

export interface DiagnosticRecommendation {
  titleEn: string;
  titleEs: string;
  summaryEn: string;
  summaryEs: string;
  stepsEn: string[];
  stepsEs: string[];
  recommendedService: string;
}

export function runSanctuaryDiagnostic(input: DiagnosticInput): DiagnosticRecommendation {
  const isAnalog = input.consoleType === 'analog';

  if (input.symptom === 'feedback') {
    return {
      titleEn: 'Pulpit & Handheld Feedback Elimination Plan',
      titleEs: 'Plan de Eliminación de Retroalimentación en Púlpito y Micrófonos',
      summaryEn:
        'Feedback squeals usually stem from un-notched room resonances (250Hz–4kHz), excessive gain staging, or stage wedges bleeding into open vocal mics.',
      summaryEs:
        'Los pitidos de feedback suelen venir de resonancias de sala sin atenuar (250Hz–4kHz), exceso de ganancia o monitores de piso entrando a los micrófonos.',
      stepsEn: [
        'Run a 31-band RTA room sweep to notch out primary ringing frequencies on main L/R and monitor buses.',
        'Apply high-pass filters (100–130Hz) on all vocal and lectern channels to clear low-mid buildup.',
        isAnalog
          ? 'Consider upgrading to a digital console (Behringer X32 or WING) with built-in parametric EQ and recall-safe scenes.'
          : 'Lock volunteer permission levels and save a verified Sunday morning baseline scene.',
      ],
      stepsEs: [
        'Realizar un barrido RTA de 31 bandas para cortar las frecuencias problemáticas en L/R y monitores.',
        'Aplicar filtros pasa-altos (100–130Hz) en todas las voces y el púlpito para limpiar frecuencias graves.',
        isAnalog
          ? 'Considere actualizar a una consola digital (Behringer X32 o WING) con EQ paramétrico y escenas protegidas.'
          : 'Bloquear permisos de voluntarios y guardar una escena base segura para los domingos.',
      ],
      recommendedService: '$50/wk Priority Care Plan (Quarterly Re-EQ Included)',
    };
  }

  if (input.symptom === 'muddy') {
    return {
      titleEn: 'Speech Intelligibility & Vocal Clarity Calibration',
      titleEs: 'Calibración de Claridad Vocal e Inteligibilidad del Mensaje',
      summaryEn:
        'Muddy sermon audio and buried worship vocals occur when subwoofers and mains are not time-aligned or acoustic reflections mask 2kHz–5kHz speech presence.',
      summaryEs:
        'El sermón opaco y las voces enterradas ocurren cuando los subwoofers y parlantes principales no están alineados en tiempo o las reflexiones cubren la presencia vocal.',
      stepsEn: [
        'Time-align main speakers, delay fills, and subwoofers using measurement microphones.',
        'Carve 220–400Hz mud from acoustic guitars, keys, and drums so the vocal pocket stays open.',
        'Schedule quarterly seasonal re-EQs as room temperature and congregation occupancy shift.',
      ],
      stepsEs: [
        'Alinear en tiempo los parlantes principales, refuerzos y subwoofers con micrófono de medición.',
        'Limpiar la zona de 220–400Hz en guitarras, teclados y batería para abrir espacio a la voz.',
        'Programar re-ecualizaciones trimestrales conforme cambia el clima y la asistencia.',
      ],
      recommendedService: 'Full Mixer Re-EQ & System Tuning',
    };
  }

  if (input.symptom === 'stageVolume') {
    return {
      titleEn: 'Stage Volume Control & In-Ear Monitor Transition',
      titleEs: 'Control de Volumen en Tarima y Transición a Monitores In-Ear',
      summaryEn:
        'Loud floor wedges and stage amps overpower small and medium sanctuaries, forcing FOH engineers to push vocals into feedback.',
      summaryEs:
        'Los monitores de piso y amplificadores fuertes saturan el santuario, obligando a subir las voces hasta causar feedback.',
      stepsEn: [
        'Transition musicians to wireless IEMs (Shure PSM 900/1000) or Behringer P16-M personal mixers.',
        'Deploy an active IEM antenna combiner (Shure PA421B) to eliminate RF dropouts across the stage.',
        'Balance drum and amp levels with clean stage isolation and calibrated FOH crossover.',
      ],
      stepsEs: [
        'Migrar a los músicos a sistemas inalámbricos IEM (Shure PSM) o mezcladores personales Behringer P16-M.',
        'Instalar un combinador activo de antenas IEM (Shure PA421B) para cero cortes de señal.',
        'Controlar batería y amplificadores para lograr una mezcla frontal limpia y sin saturación.',
      ],
      recommendedService: 'IEM System & RF Combiner Package Quote',
    };
  }

  return {
    titleEn: 'Recall-Safe Console Architecture & Bilingual Volunteer Training',
    titleEs: 'Arquitectura Segura en Consola y Capacitación Bilingüe para Voluntarios',
    summaryEn:
      'Rotating volunteers should never have to guess gain knobs or risk erasing Sunday morning settings during a Friday youth rehearsal.',
    summaryEs:
      'Los voluntarios nunca deberían adivinar niveles ni arriesgar borrar la configuración del domingo durante un ensayo entre semana.',
    stepsEn: [
      'Build separate Recall-Safe scenes for Sunday Worship, Youth Night, and Guest Speakers.',
      'Conduct hands-on bilingual (EN/ES) training covering gain staging, mute groups, and mic technique.',
      'Keep Luis Martinez on-call every weekend with the $50/wk Care Plan for instant remote or on-site backup.',
    ],
    stepsEs: [
      'Crear escenas protegidas (Recall-Safe) separadas para Domingo, Jóvenes e Invitados.',
      'Realizar capacitación práctica bilingüe (EN/ES) sobre ganancia, grupos de mute y técnica de micrófono.',
      'Contar con Luis Martinez en guardia cada fin de semana con el Plan de Cuidado de $50/semana.',
    ],
    recommendedService: 'Bilingual Volunteer Training + $50/wk Care Plan',
  };
}

export interface EstimateTotals {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxAmount: number;
  shippingFee: number;
  total: number;
}

export function calculateEstimateTotals(
  items: readonly EstimateLineItem[],
  discount = 0,
  shippingFee = 0,
  taxRate = 0
): EstimateTotals {
  const rawSubtotal = items.reduce((sum, item) => {
    const q = Number.isFinite(item.qty) && item.qty > 0 ? item.qty : 0;
    const p = Number.isFinite(item.unitPrice) && item.unitPrice >= 0 ? item.unitPrice : 0;
    return sum + q * p;
  }, 0);

  const subtotal = Math.round(rawSubtotal * 100) / 100;
  const safeDiscount = Math.max(0, Math.min(subtotal, Number.isFinite(discount) ? discount : 0));
  const taxableAmount = Math.round((subtotal - safeDiscount) * 100) / 100;
  const safeTaxRate = Math.max(0, Math.min(30, Number.isFinite(taxRate) ? taxRate : 0));
  const taxAmount = Math.round(taxableAmount * (safeTaxRate / 100) * 100) / 100;
  const safeShipping = Math.max(0, Number.isFinite(shippingFee) ? shippingFee : 0);
  const total = Math.round((taxableAmount + taxAmount + safeShipping) * 100) / 100;

  return {
    subtotal,
    discount: Math.round(safeDiscount * 100) / 100,
    taxableAmount,
    taxAmount,
    shippingFee: Math.round(safeShipping * 100) / 100,
    total,
  };
}

export function parseEstimateItemsFromNotes(
  notes: string,
  catalog: readonly GearProduct[]
): EstimateLineItem[] {
  if (!notes) return [];
  const lines = notes.split(/\r?\n/);
  const items: EstimateLineItem[] = [];
  const pattern = /^-\s*(\d+)x\s+(.+?)\s+\(([^)]+)\)\s+@\s+(.+)$/i;

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].trim().match(pattern);
    if (!match) continue;
    const qty = Math.max(1, Number.parseInt(match[1], 10) || 1);
    const itemNumber = match[2].trim();
    const brand = match[3].trim();
    const priceChunk = match[4].trim();
    const numericMatch = priceChunk.match(/\$([\d,]+\.\d{2}|\d+)/);
    const parsedPrice = numericMatch ? Number.parseFloat(numericMatch[1].replace(/,/g, '')) : 0;

    const catalogMatch = catalog.find(
      (p) => (p.itemNumber || p.name).toLowerCase() === itemNumber.toLowerCase()
    );

    items.push({
      id: `est-item-${i}-${Date.now()}`,
      ...(catalogMatch ? { productId: catalogMatch.id } : {}),
      itemNumber,
      brand: catalogMatch?.brand || brand,
      description: catalogMatch?.descriptionEn || `${brand} ${itemNumber}`,
      qty,
      unitPrice: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : catalogMatch?.mapPrice || 0,
    });
  }

  return items;
}

export function buildDefaultCoverLetter(
  quote: Pick<QuoteRecord, 'contactName' | 'organization' | 'refCode' | 'serviceRequested'>,
  brand: BrandConfig,
  totals: EstimateTotals
): string {
  const greetingName = quote.contactName.trim() || 'Valued Client';
  const orgLine = quote.organization.trim() ? ` (${quote.organization.trim()})` : '';
  const serviceLine = quote.serviceRequested.trim() || 'Pro Audio Equipment & Installation';

  return [
    `Dear ${greetingName}${orgLine},`,
    '',
    `Thank you for contacting ${brand.name} (${brand.companyFull}) regarding ${serviceLine}. Below is your customized official estimate (${quote.refCode}) prepared by ${brand.leadEngineer}.`,
    '',
    `Your estimated project total is ${formatUsd(totals.total)}. As an authorized pro audio dealer, all quoted equipment includes full manufacturer warranty, personalized gain-staging advice, and access to our optional $50/week Priority Care & Quarterly Re-EQ Plan.`,
    '',
    `Please call or text ${brand.phoneDisplay}, or reply to ${brand.email} with any questions or to lock in your pricing and delivery schedule.`,
    '',
    'Blessings,',
    `${brand.leadEngineer}`,
    `${brand.name} · ${brand.companyFull}`,
    `${brand.phoneDisplay} | ${brand.email}`,
  ].join('\n');
}

export function extractCustomerProjectNotes(notes: string, hasItems: boolean): string {
  const trimmed = (notes || '').trim();
  if (!trimmed) return '';
  if (!hasItems) return trimmed;

  const filtered = trimmed
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      if (!t) return false;
      if (/^Quote Cart Items/i.test(t)) return false;
      if (/^-\s*\d+x\s+.+?\([^)]+\)\s+@\s+.+$/i.test(t)) return false;
      if (/^Estimated Total \(at MAP\):/i.test(t)) return false;
      return true;
    })
    .map((line) => line.replace(/^Event \/ Project Notes:\s*/i, '').trim())
    .filter(Boolean);

  return filtered.join('\n');
}

export function prepareQuoteForPdf(
  quote: QuoteRecord,
  catalog: readonly GearProduct[]
): { resolvedQuote: QuoteRecord; totals: EstimateTotals } {
  const resolvedItems =
    quote.estimateItems && quote.estimateItems.length > 0
      ? quote.estimateItems
      : quote.notes
        ? parseEstimateItemsFromNotes(quote.notes, catalog)
        : [];

  const totals = calculateEstimateTotals(
    resolvedItems,
    quote.discount ?? 0,
    quote.shippingFee ?? 0,
    quote.taxRate ?? 0
  );

  return {
    resolvedQuote: {
      ...quote,
      estimateItems: resolvedItems,
    },
    totals,
  };
}

const LEGACY_OVERLAP_PRODUCT_IDS = new Set([
  'gear-behringer-wing',
  'gear-behringer-x32',
  'gear-midas-m32',
  'gear-qlxd',
  'gear-line-array',
]);

const REPLACED_STUB_IMAGE_MARKERS = [
  '500216.jpg',
  '464134.jpg',
  'products.shureweb.eu',
  'thomann.de/thumb/opengraph',
];

export function reconcileProductsWithDefaults(
  storedProducts: readonly GearProduct[] | null | undefined,
  defaultProducts: readonly GearProduct[]
): GearProduct[] {
  if (!storedProducts || storedProducts.length === 0) {
    return [...defaultProducts];
  }

  const defaultById = new Map(defaultProducts.map((p) => [p.id, p]));
  const enriched = storedProducts
    .filter((p) => !LEGACY_OVERLAP_PRODUCT_IDS.has(p.id))
    .map((p) => {
      const def = defaultById.get(p.id);
      if (!def) return p;

      const currentUrl = (p.imageUrl || '').trim();
      const isPlaceholderOrStub =
        !currentUrl ||
        currentUrl.startsWith('asset:') ||
        REPLACED_STUB_IMAGE_MARKERS.some((marker) => currentUrl.includes(marker));

      return {
        ...p,
        brand: def.brand,
        imageUrl: isPlaceholderOrStub ? def.imageUrl : currentUrl,
        ...(p.mapPrice === undefined && def.mapPrice !== undefined
          ? { mapPrice: def.mapPrice }
          : {}),
      };
    });

  const existingIds = new Set(enriched.map((p) => p.id));
  const missingDefaults = defaultProducts.filter((def) => !existingIds.has(def.id));
  return [...missingDefaults, ...enriched];
}

const LEGACY_DEFAULT_SECTION_ORDER: readonly SectionId[] = [
  'services',
  'pricing',
  'gear',
  'training',
  'diagnostic',
  'testimonials',
];

const RECOMMENDED_SECTION_ORDER: readonly SectionId[] = [
  'gear',
  'services',
  'pricing',
  'training',
  'diagnostic',
  'testimonials',
];

export function promoteGearCatalogSection(
  order: readonly SectionId[] | null | undefined
): SectionId[] {
  if (!order || order.length === 0) {
    return [...RECOMMENDED_SECTION_ORDER];
  }
  const matchesLegacyDefault =
    order.length === LEGACY_DEFAULT_SECTION_ORDER.length &&
    order.every((id, idx) => id === LEGACY_DEFAULT_SECTION_ORDER[idx]);
  if (matchesLegacyDefault) {
    return [...RECOMMENDED_SECTION_ORDER];
  }
  return [...order];
}

export interface VendorComparisonResult {
  bestQuote: VendorQuoteOption | null;
  bestLandedCost: number;
  highestLandedCost: number;
  spreadSavings: number;
  estimatedMarginAtMap: number | null;
  sortedQuotes: VendorQuoteOption[];
}

export function getVendorLandedCost(q: Pick<VendorQuoteOption, 'unitCost' | 'shippingCost'>): number {
  const unit = Number.isFinite(q.unitCost) && q.unitCost >= 0 ? q.unitCost : 0;
  const ship = Number.isFinite(q.shippingCost) && q.shippingCost >= 0 ? q.shippingCost : 0;
  return Math.round((unit + ship) * 100) / 100;
}

export function compareVendorQuotes(
  quotes: readonly VendorQuoteOption[],
  mapPrice?: number
): VendorComparisonResult {
  const priced = quotes.filter(
    (q) => q.vendorName.trim() && Number.isFinite(q.unitCost) && q.unitCost > 0
  );
  if (priced.length === 0) {
    return {
      bestQuote: null,
      bestLandedCost: 0,
      highestLandedCost: 0,
      spreadSavings: 0,
      estimatedMarginAtMap: null,
      sortedQuotes: [...quotes],
    };
  }

  const sortedQuotes = [...priced].sort(
    (a, b) => getVendorLandedCost(a) - getVendorLandedCost(b)
  );
  const bestQuote = sortedQuotes[0];
  const bestLandedCost = getVendorLandedCost(bestQuote);
  const highestLandedCost = getVendorLandedCost(sortedQuotes[sortedQuotes.length - 1]);
  const spreadSavings = Math.round((highestLandedCost - bestLandedCost) * 100) / 100;
  const estimatedMarginAtMap =
    typeof mapPrice === 'number' && mapPrice > 0
      ? Math.round((mapPrice - bestLandedCost) * 100) / 100
      : null;

  return {
    bestQuote,
    bestLandedCost,
    highestLandedCost,
    spreadSavings,
    estimatedMarginAtMap,
    sortedQuotes,
  };
}

export interface CustomerOrderTotals {
  totalQty: number;
  totalVendorSubtotal: number;
  totalShipping: number;
  totalLandedCost: number;
  estimatedProfit: number | null;
  unquotedLineCount: number;
}

export function calculateCustomerOrderTotals(
  items: readonly OrderLineSourcing[],
  customerQuotedTotal?: number
): CustomerOrderTotals {
  let totalQty = 0;
  let totalVendorSubtotal = 0;
  let totalShipping = 0;
  let unquotedLineCount = 0;

  for (const line of items) {
    const qty = Math.max(1, Math.round(Number(line.qty) || 1));
    const unit = Number.isFinite(line.quotedUnitCost) && line.quotedUnitCost > 0 ? line.quotedUnitCost : 0;
    const ship = Number.isFinite(line.shippingCost) && line.shippingCost > 0 ? line.shippingCost : 0;
    totalQty += qty;
    totalVendorSubtotal += qty * unit;
    totalShipping += ship;
    if (line.lineStatus === 'need_to_call' || unit <= 0 || !line.chosenVendor.trim()) {
      unquotedLineCount += 1;
    }
  }

  const roundedSub = Math.round(totalVendorSubtotal * 100) / 100;
  const roundedShip = Math.round(totalShipping * 100) / 100;
  const totalLandedCost = Math.round((roundedSub + roundedShip) * 100) / 100;
  const estimatedProfit =
    typeof customerQuotedTotal === 'number' && customerQuotedTotal > 0
      ? Math.round((customerQuotedTotal - totalLandedCost) * 100) / 100
      : null;

  return {
    totalQty,
    totalVendorSubtotal: roundedSub,
    totalShipping: roundedShip,
    totalLandedCost,
    estimatedProfit,
    unquotedLineCount,
  };
}

export function generateOrderCode(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  return `ORD-${yy}${mm}${dd}-${hh}${min}`;
}

export function formatVendorMasterToCsv(entries: readonly VendorMasterEntry[]): string {
  const headers = [
    'Product Name',
    'SKU / Model',
    'Brand',
    'MAP Price',
    'Best Vendor',
    'Best Landed Cost',
    'Vendor 1 (Name | Rep | Phone | Email | Cost)',
    'Vendor 2 (Name | Rep | Phone | Email | Cost)',
    'Vendor 3 (Name | Rep | Phone | Email | Cost)',
    'Notes',
  ];

  const formatSlot = (q?: VendorQuoteOption) => {
    if (!q || !q.vendorName.trim()) return '';
    return `${q.vendorName} | ${q.repName || '-'} | ${q.phone || '-'} | ${q.email || '-'} | $${getVendorLandedCost(q).toFixed(2)}`;
  };

  const rows = entries.map((entry) => {
    const cmp = compareVendorQuotes(entry.quotes, entry.mapPrice);
    return [
      entry.productName,
      entry.itemNumber,
      entry.brand,
      entry.mapPrice ? entry.mapPrice.toFixed(2) : '',
      cmp.bestQuote?.vendorName || entry.preferredVendor || '',
      cmp.bestQuote ? cmp.bestLandedCost.toFixed(2) : '',
      formatSlot(entry.quotes[0]),
      formatSlot(entry.quotes[1]),
      formatSlot(entry.quotes[2]),
      entry.notes,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\n');
}

export function formatCustomerOrdersToCsv(orders: readonly CustomerOrderRecord[]): string {
  const headers = [
    'Order Code',
    'Status',
    'Linked Estimate Ref',
    'Customer',
    'Organization',
    'Customer Phone',
    'Customer Quoted Total',
    'Total Vendor Cost',
    'Est. Margin',
    'Vendors & Reps Contacted',
    'Line Items Summary',
    'Target Date',
    'Updated',
  ];

  const rows = orders.map((order) => {
    const totals = calculateCustomerOrderTotals(order.items, order.customerQuotedTotal);
    const repsSummary = [
      ...order.items
        .filter((l) => l.chosenVendor || l.contactedRepName)
        .map((l) => `${l.chosenVendor || 'TBD'} (${l.contactedRepName || '-'} ${l.vendorPhone || ''}) Ref:${l.vendorQuoteRef || '-'}`),
      ...order.callLogs.map((c) => `${c.vendorName} (${c.repName} ${c.phone}) Quote:${c.quoteNumber || '-'}`),
    ].join(' ; ');
    const itemsSummary = order.items
      .map((l) => `${l.qty}x ${l.itemNumber || l.productName} [${l.lineStatus}] @ $${l.quotedUnitCost.toFixed(2)}`)
      .join(' ; ');

    return [
      order.orderCode,
      order.status,
      order.linkedQuoteRef || '',
      order.customerName,
      order.organization,
      order.customerPhone,
      order.customerQuotedTotal ? order.customerQuotedTotal.toFixed(2) : '',
      totals.totalLandedCost.toFixed(2),
      totals.estimatedProfit !== null ? totals.estimatedProfit.toFixed(2) : '',
      repsSummary,
      itemsSummary,
      order.targetDate,
      order.updatedAt.slice(0, 10),
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\n');
}

