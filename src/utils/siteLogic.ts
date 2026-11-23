import {
  DEFAULT_MEMBER_PRICING,
  DEFAULT_PAGE_COPY,
  DEFAULT_SITE_CONTENT,
  DEFAULT_VIDEO_MEETING,
} from '../data/defaultContent';
import type {
  BrandConfig,
  CartItem,
  CustomerAccount,
  CustomerOrderRecord,
  EstimateLineItem,
  GearCategory,
  GearProduct,
  GearSortOption,
  HeroConfig,
  MemberPricingConfig,
  OrderLineSourcing,
  PageCopyConfig,
  PriceRangeFilter,
  QuoteRecord,
  QuoteSubmissionInput,
  QuoteUpdateInput,
  SectionId,
  VendorMasterEntry,
  VendorQuoteOption,
  VideoMeetingConfig,
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
      item.availability ?? '',
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
  'cases',
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

  const orderedCategories: Array<Exclude<GearCategory, 'all'>> = [...FEATURED_MIX_ORDER];
  const buckets = new Map<Exclude<GearCategory, 'all'>, GearProduct[]>();
  for (const cat of orderedCategories) {
    buckets.set(cat, []);
  }
  for (const item of products) {
    let list = buckets.get(item.category);
    if (!list) {
      list = [];
      buckets.set(item.category, list);
      orderedCategories.push(item.category);
    }
    list.push(item);
  }

  const picked: GearProduct[] = [];
  const seenIds = new Set<string>();
  let round = 0;

  while (picked.length < limit) {
    let addedInRound = false;
    for (const cat of orderedCategories) {
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

export interface LineItemPricingSummary {
  qty: number;
  mapUnit: number;
  hasMap: boolean;
  effectiveUnitPrice: number;
  isOverridden: boolean;
  unitDiscount: number;
  lineDiscount: number;
  discountPercent: number;
  lineMapTotal: number;
  lineCustomerTotal: number;
  dealerCostUnit: number | null;
  lineDealerCost: number | null;
  unitProfit: number | null;
  lineProfit: number | null;
  marginPercent: number | null;
}

export function calculateLineItemPricing(item: {
  qty: number;
  mapPrice?: number;
  unitPrice?: number;
  dealerCost?: number;
}): LineItemPricingSummary {
  const qty = Math.max(1, Math.round(Number(item.qty) || 1));
  const hasMap =
    typeof item.mapPrice === 'number' && Number.isFinite(item.mapPrice) && item.mapPrice > 0;
  const mapUnit = hasMap ? Math.round(item.mapPrice! * 100) / 100 : 0;

  const hasExplicitUnit =
    typeof item.unitPrice === 'number' && Number.isFinite(item.unitPrice) && item.unitPrice >= 0;
  const effectiveUnitPrice = hasExplicitUnit
    ? Math.round(item.unitPrice! * 100) / 100
    : mapUnit;

  const isOverridden = hasMap && Math.abs(effectiveUnitPrice - mapUnit) > 0.005;
  const unitDiscount = hasMap ? Math.round((mapUnit - effectiveUnitPrice) * 100) / 100 : 0;
  const lineDiscount = hasMap ? Math.round(unitDiscount * qty * 100) / 100 : 0;
  const discountPercent =
    hasMap && mapUnit > 0 ? Math.round((unitDiscount / mapUnit) * 1000) / 10 : 0;

  const lineMapTotal = Math.round(mapUnit * qty * 100) / 100;
  const lineCustomerTotal = Math.round(effectiveUnitPrice * qty * 100) / 100;

  const hasDealerCost =
    typeof item.dealerCost === 'number' && Number.isFinite(item.dealerCost) && item.dealerCost > 0;
  const dealerCostUnit = hasDealerCost ? Math.round(item.dealerCost! * 100) / 100 : null;
  const lineDealerCost =
    dealerCostUnit !== null ? Math.round(dealerCostUnit * qty * 100) / 100 : null;
  const unitProfit =
    dealerCostUnit !== null ? Math.round((effectiveUnitPrice - dealerCostUnit) * 100) / 100 : null;
  const lineProfit =
    lineDealerCost !== null ? Math.round((lineCustomerTotal - lineDealerCost) * 100) / 100 : null;
  const marginPercent =
    lineProfit !== null && lineCustomerTotal > 0
      ? Math.round((lineProfit / lineCustomerTotal) * 1000) / 10
      : null;

  return {
    qty,
    mapUnit,
    hasMap,
    effectiveUnitPrice,
    isOverridden,
    unitDiscount,
    lineDiscount,
    discountPercent,
    lineMapTotal,
    lineCustomerTotal,
    dealerCostUnit,
    lineDealerCost,
    unitProfit,
    lineProfit,
    marginPercent,
  };
}

export interface EstimateTotals {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxAmount: number;
  itemsShippingTotal: number;
  extraShippingFee: number;
  shippingFee: number;
  totalShipping: number;
  processingFeeRate: number;
  processingFeeAmount: number;
  total: number;
  mapTotal: number;
  productOverrideSavings: number;
  savingsVsMap: number;
  savingsPercentVsMap: number;
  totalDealerCost: number;
  totalLandedCost: number;
  hasCostBasis: boolean;
  netGainProfit: number | null;
  grossMarginPercent: number | null;
}

export function calculateEstimateTotals(
  items: readonly EstimateLineItem[],
  discount = 0,
  shippingFee = 0,
  taxRate = 0,
  processingFeeRate = 0
): EstimateTotals {
  let rawSubtotal = 0;
  let rawMapTotal = 0;
  let rawDealerCost = 0;
  let rawItemsShipping = 0;
  let rawFeeEligibleSubtotal = 0;
  let rawFeeEligibleShipping = 0;
  let hasCostBasis = false;

  for (const item of items) {
    const q = Number.isFinite(item.qty) && item.qty > 0 ? item.qty : 0;
    const p = Number.isFinite(item.unitPrice) && item.unitPrice >= 0 ? item.unitPrice : 0;
    const itemShip =
      typeof item.shippingCost === 'number' && Number.isFinite(item.shippingCost) && item.shippingCost > 0
        ? item.shippingCost
        : 0;
    const mapUnit =
      typeof item.mapPrice === 'number' && Number.isFinite(item.mapPrice) && item.mapPrice > 0
        ? item.mapPrice
        : p;
    const lineExt = q * p;
    rawSubtotal += lineExt;
    rawMapTotal += q * mapUnit;
    rawItemsShipping += itemShip;
    if (item.applyProcessingFee !== false) {
      rawFeeEligibleSubtotal += lineExt;
      rawFeeEligibleShipping += itemShip;
    }
    if (typeof item.dealerCost === 'number' && Number.isFinite(item.dealerCost) && item.dealerCost > 0) {
      hasCostBasis = true;
      rawDealerCost += q * item.dealerCost;
    }
  }

  const subtotal = Math.round(rawSubtotal * 100) / 100;
  const mapTotal = Math.round(rawMapTotal * 100) / 100;
  const safeDiscount = Math.max(0, Math.min(subtotal, Number.isFinite(discount) ? discount : 0));
  const taxableAmount = Math.round((subtotal - safeDiscount) * 100) / 100;
  const safeTaxRate = Math.max(0, Math.min(30, Number.isFinite(taxRate) ? taxRate : 0));
  const taxAmount = Math.round(taxableAmount * (safeTaxRate / 100) * 100) / 100;

  const itemsShippingTotal = Math.round(rawItemsShipping * 100) / 100;
  const extraShippingFee = Math.max(0, Math.round((Number.isFinite(shippingFee) ? shippingFee : 0) * 100) / 100);
  const totalShipping = Math.round((itemsShippingTotal + extraShippingFee) * 100) / 100;

  const safeFeeRate = Math.max(0, Math.min(15, Number.isFinite(processingFeeRate) ? processingFeeRate : 0));
  const eligibleRatio =
    rawSubtotal > 0 ? Math.max(0, Math.min(1, rawFeeEligibleSubtotal / rawSubtotal)) : 1;
  const allEligible = items.length === 0 || items.every((item) => item.applyProcessingFee !== false);
  const eligibleExtraShipping = allEligible || eligibleRatio > 0 ? extraShippingFee : 0;
  const feeBase =
    taxableAmount * eligibleRatio +
    taxAmount * eligibleRatio +
    rawFeeEligibleShipping +
    eligibleExtraShipping;
  const processingFeeAmount =
    safeFeeRate > 0 ? Math.round(feeBase * (safeFeeRate / 100) * 100) / 100 : 0;

  const total = Math.round((taxableAmount + taxAmount + totalShipping + processingFeeAmount) * 100) / 100;

  const productOverrideSavings = Math.round((mapTotal - subtotal) * 100) / 100;
  const savingsVsMap = Math.round((mapTotal - taxableAmount) * 100) / 100;
  const savingsPercentVsMap =
    mapTotal > 0 ? Math.round((savingsVsMap / mapTotal) * 1000) / 10 : 0;

  const totalDealerCost = Math.round(rawDealerCost * 100) / 100;
  const totalLandedCost = Math.round((totalDealerCost + totalShipping) * 100) / 100;
  const netGainProfit = hasCostBasis
    ? Math.round((taxableAmount - totalDealerCost) * 100) / 100
    : null;
  const grossMarginPercent =
    netGainProfit !== null && taxableAmount > 0
      ? Math.round((netGainProfit / taxableAmount) * 1000) / 10
      : null;

  return {
    subtotal,
    discount: Math.round(safeDiscount * 100) / 100,
    taxableAmount,
    taxAmount,
    itemsShippingTotal,
    extraShippingFee,
    shippingFee: totalShipping,
    totalShipping,
    processingFeeRate: safeFeeRate,
    processingFeeAmount,
    total,
    mapTotal,
    productOverrideSavings,
    savingsVsMap,
    savingsPercentVsMap,
    totalDealerCost,
    totalLandedCost,
    hasCostBasis,
    netGainProfit,
    grossMarginPercent,
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

    const mapVal =
      typeof catalogMatch?.mapPrice === 'number' && catalogMatch.mapPrice > 0
        ? catalogMatch.mapPrice
        : undefined;

    items.push({
      id: `est-item-${i}-${Date.now()}`,
      ...(catalogMatch ? { productId: catalogMatch.id } : {}),
      itemNumber,
      brand: catalogMatch?.brand || brand,
      description: catalogMatch?.descriptionEn || `${brand} ${itemNumber}`,
      qty,
      unitPrice: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : mapVal || 0,
      ...(mapVal !== undefined ? { mapPrice: mapVal } : {}),
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

  const savingsClause =
    totals.savingsVsMap > 0.005
      ? ` (saving you ${formatUsd(totals.savingsVsMap)} / ${totals.savingsPercentVsMap}% off standard MAP pricing)`
      : '';

  return [
    `Dear ${greetingName}${orgLine},`,
    '',
    `Thank you for contacting ${brand.name} (${brand.companyFull}) regarding ${serviceLine}. Below is your customized official estimate (${quote.refCode}) prepared by ${brand.leadEngineer}.`,
    '',
    `Your estimated project total is ${formatUsd(totals.total)}${savingsClause}. As an authorized pro audio dealer, all quoted equipment includes full manufacturer warranty, personalized gain-staging advice, and access to our optional $50/week Priority Care & Quarterly Re-EQ Plan.`,
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
  const baseItems =
    quote.estimateItems && quote.estimateItems.length > 0
      ? quote.estimateItems
      : quote.notes
        ? parseEstimateItemsFromNotes(quote.notes, catalog)
        : [];

  const resolvedItems = baseItems.map((item) => {
    if (typeof item.mapPrice === 'number' && item.mapPrice > 0) {
      return item;
    }
    const skuLower = (item.itemNumber || '').trim().toLowerCase();
    const catalogMatch = catalog.find(
      (p) =>
        (item.productId && p.id === item.productId) ||
        (skuLower && (p.itemNumber || p.name).toLowerCase() === skuLower)
    );
    if (catalogMatch?.mapPrice && catalogMatch.mapPrice > 0) {
      return { ...item, mapPrice: catalogMatch.mapPrice };
    }
    return item;
  });

  const totals = calculateEstimateTotals(
    resolvedItems,
    quote.discount ?? 0,
    quote.shippingFee ?? 0,
    quote.taxRate ?? 0,
    quote.processingFeeRate ?? 0
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

export const MAX_FIRESTORE_IMAGE_URL_CHARS = 350000;
export const TARGET_UPLOADED_IMAGE_MAX_CHARS = 280000;

export function sanitizeImageUrlForCloud(
  imageUrl: string | undefined,
  fallback = 'asset:console'
): string {
  const trimmed = (imageUrl || '').trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('data:image/')) {
    // Never slice a base64 data URL mid-stream (slicing corrupts the image bytes).
    if (trimmed.length <= MAX_FIRESTORE_IMAGE_URL_CHARS && trimmed.includes(';base64,')) {
      return trimmed;
    }
    return fallback;
  }
  return trimmed.slice(0, MAX_FIRESTORE_IMAGE_URL_CHARS);
}

export function estimateDataUrlKilobytes(dataUrl: string): number {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return 0;
  const commaIdx = dataUrl.indexOf(',');
  const payloadLength = commaIdx >= 0 ? dataUrl.length - commaIdx - 1 : dataUrl.length;
  // Base64 encodes 3 bytes per 4 chars
  return Math.max(1, Math.round(((payloadLength * 3) / 4) / 1024));
}

export function shouldPreferLocalPendingContent(
  pendingLocalSavedAtMs: number,
  remoteSavedAtMs: number
): boolean {
  return (
    Number.isFinite(pendingLocalSavedAtMs) &&
    pendingLocalSavedAtMs > 0 &&
    pendingLocalSavedAtMs >= (Number.isFinite(remoteSavedAtMs) ? remoteSavedAtMs : 0)
  );
}

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

      // Upgrade legacy default 'cables' case/rackmount items to the new built-in 'cases' department
      // while preserving any other admin category reassignment.
      const upgradedCategory =
        p.category === 'cables' && def.category === 'cases' ? 'cases' : p.category;

      return {
        ...p,
        category: upgradedCategory,
        brand: (p.brand || '').trim() || def.brand,
        imageUrl: isPlaceholderOrStub ? def.imageUrl : currentUrl,
        ...(p.mapPrice === undefined && def.mapPrice !== undefined
          ? { mapPrice: def.mapPrice }
          : {}),
        ...(!p.availability && def.availability
          ? { availability: def.availability }
          : {}),
      };
    });

  const existingIds = new Set(enriched.map((p) => p.id));
  const missingDefaults = defaultProducts.filter((def) => !existingIds.has(def.id));
  return [...missingDefaults, ...enriched];
}

export function reconcileVendorMasterWithDefaults(
  storedEntries: readonly VendorMasterEntry[] | null | undefined,
  defaultEntries: readonly VendorMasterEntry[],
  deletedIds?: ReadonlySet<string>
): VendorMasterEntry[] {
  const safeStored = (storedEntries || []).filter((e) => !deletedIds?.has(e.id));
  const seenIds = new Set<string>();
  const seenProductIds = new Set<string>();
  const seenSkus = new Set<string>();

  for (const e of safeStored) {
    seenIds.add(e.id);
    if (e.productId) seenProductIds.add(e.productId);
    const skuKey = (e.itemNumber || e.productName || '').trim().toLowerCase();
    if (skuKey) seenSkus.add(skuKey);
  }

  const missingDefaults = defaultEntries.filter((def) => {
    if (deletedIds?.has(def.id)) return false;
    if (seenIds.has(def.id)) return false;
    if (def.productId && seenProductIds.has(def.productId)) return false;
    const skuKey = (def.itemNumber || def.productName || '').trim().toLowerCase();
    if (skuKey && seenSkus.has(skuKey)) return false;
    return true;
  });

  return [...safeStored, ...missingDefaults];
}

export interface ProductAvailabilityBadge {
  inStock: boolean;
  label: string;
  tone: 'in_stock' | 'wait_time' | 'call';
}

export function getProductAvailabilityDisplay(
  product: Pick<GearProduct, 'inStock' | 'availability'>,
  lang: 'en' | 'es' = 'en'
): ProductAvailabilityBadge {
  const raw = (product.availability || '').trim();
  const isCall = /call for availability|call for eta|call our sales/i.test(raw);
  if (isCall) {
    return {
      inStock: false,
      label: lang === 'en' ? raw : 'Llamar para Disponibilidad / ETA',
      tone: 'call',
    };
  }
  if (product.inStock && (!raw || /^in stock$/i.test(raw))) {
    return {
      inStock: true,
      label: lang === 'en' ? 'In Stock' : 'En Existencia',
      tone: 'in_stock',
    };
  }
  if (raw) {
    const esLabel = raw
      .replace(/^Preorder\s*·\s*Ships in/i, 'Preventa · Envío en')
      .replace(/^More on Order\s*·\s*Ships in/i, 'En Pedido · Envío en')
      .replace(/^Ships in/i, 'Envío en')
      .replace(/Business Days/gi, 'Días Hábiles')
      .replace(/^On Order\s*·\s*Reserve Today/i, 'En Pedido · Reserve Hoy')
      .replace(/^High Demand\s*·\s*Backorder/i, 'Alta Demanda · Sobre Pedido');
    return {
      inStock: false,
      label: lang === 'en' ? raw : esLabel,
      tone: 'wait_time',
    };
  }
  return {
    inStock: false,
    label: lang === 'en' ? 'Call for Availability & ETA' : 'Llamar para Disponibilidad',
    tone: 'call',
  };
}

export function reconcileServicesWithDefaults<
  T extends { id: string; imageUrl: string }
>(savedServices: readonly T[] | null | undefined, defaultServices: readonly T[]): T[] {
  if (!Array.isArray(savedServices) || savedServices.length === 0) {
    return [...defaultServices];
  }
  const byId = new Map<string, T>(defaultServices.map((s) => [s.id, s]));
  return savedServices.map((svc) => {
    const def = byId.get(svc.id);
    if (!def) return svc;
    const shouldUpgradeLegacyAsset =
      (svc.id === 'svc-installs' && svc.imageUrl === 'asset:console') ||
      (svc.id === 'svc-recall-safe' && svc.imageUrl === 'asset:iem');
    if (shouldUpgradeLegacyAsset && def.imageUrl !== svc.imageUrl) {
      return { ...svc, imageUrl: def.imageUrl };
    }
    return svc;
  });
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
  itemsShippingTotal: number;
  extraShippingFee: number;
  totalShipping: number;
  totalLandedCost: number;
  totalMapValue: number;
  totalCustomerEstimateValue: number;
  taxRate: number;
  taxAmount: number;
  processingFeeRate: number;
  processingFeeAmount: number;
  effectiveCustomerTotal: number;
  customerSavingsVsMap: number | null;
  estimatedProfit: number | null;
  marginPercent: number | null;
  unquotedLineCount: number;
}

export interface CustomerOrderTaxAndFeeOptions {
  shippingFee?: number;
  taxRate?: number;
  processingFeeRate?: number;
}

export function calculateCustomerOrderTotals(
  items: readonly OrderLineSourcing[],
  customerQuotedTotal?: number,
  products: readonly GearProduct[] = [],
  vendorEntries: readonly VendorMasterEntry[] = [],
  options?: CustomerOrderTaxAndFeeOptions
): CustomerOrderTotals {
  let totalQty = 0;
  let totalVendorSubtotal = 0;
  let rawItemsShipping = 0;
  let totalMapValue = 0;
  let totalCustomerEstimateValue = 0;
  let rawFeeEligibleCustomerValue = 0;
  let rawFeeEligibleShipping = 0;
  let unquotedLineCount = 0;

  for (const line of items) {
    const qty = Math.max(1, Math.round(Number(line.qty) || 1));
    const unit = Number.isFinite(line.quotedUnitCost) && line.quotedUnitCost > 0 ? line.quotedUnitCost : 0;
    const ship = Number.isFinite(line.shippingCost) && line.shippingCost > 0 ? line.shippingCost : 0;
    totalQty += qty;
    totalVendorSubtotal += qty * unit;
    rawItemsShipping += ship;

    let resolvedMap =
      typeof line.mapPrice === 'number' && Number.isFinite(line.mapPrice) && line.mapPrice > 0
        ? line.mapPrice
        : 0;
    if (resolvedMap <= 0 && (products.length > 0 || vendorEntries.length > 0)) {
      const skuLower = (line.itemNumber || '').trim().toLowerCase();
      const nameLower = (line.productName || '').trim().toLowerCase();
      const prodMatch = products.find(
        (p) =>
          (line.productId && p.id === line.productId) ||
          (skuLower && (p.itemNumber || p.name).toLowerCase() === skuLower) ||
          (nameLower && p.name.toLowerCase() === nameLower)
      );
      if (prodMatch?.mapPrice && prodMatch.mapPrice > 0) {
        resolvedMap = prodMatch.mapPrice;
      } else {
        const vmMatch = vendorEntries.find(
          (vm) =>
            (line.productId && vm.productId === line.productId) ||
            (skuLower && vm.itemNumber.toLowerCase() === skuLower) ||
            (nameLower && vm.productName.toLowerCase() === nameLower)
        );
        if (vmMatch?.mapPrice && vmMatch.mapPrice > 0) {
          resolvedMap = vmMatch.mapPrice;
        }
      }
    }
    if (resolvedMap > 0) {
      totalMapValue += qty * resolvedMap;
    }

    let lineCustExt = 0;
    const hasExplicitCustomerUnit =
      typeof line.customerUnitPrice === 'number' &&
      Number.isFinite(line.customerUnitPrice) &&
      line.customerUnitPrice >= 0;
    const effectiveCustUnit = hasExplicitCustomerUnit
      ? line.customerUnitPrice!
      : resolvedMap > 0
        ? resolvedMap
        : 0;
    if (effectiveCustUnit > 0) {
      lineCustExt = qty * effectiveCustUnit;
      totalCustomerEstimateValue += lineCustExt;
    }

    if (line.applyProcessingFee !== false) {
      rawFeeEligibleCustomerValue += lineCustExt;
      rawFeeEligibleShipping += ship;
    }

    if (line.lineStatus === 'need_to_call' || unit <= 0 || !line.chosenVendor.trim()) {
      unquotedLineCount += 1;
    }
  }

  const roundedSub = Math.round(totalVendorSubtotal * 100) / 100;
  const itemsShippingTotal = Math.round(rawItemsShipping * 100) / 100;
  const extraShippingFee = Math.max(
    0,
    Math.round((Number.isFinite(options?.shippingFee) ? Number(options?.shippingFee) : 0) * 100) / 100
  );
  const roundedShip = Math.round((itemsShippingTotal + extraShippingFee) * 100) / 100;
  const totalLandedCost = Math.round((roundedSub + roundedShip) * 100) / 100;
  const roundedMapTotal = Math.round(totalMapValue * 100) / 100;
  const roundedCustEstTotal = Math.round(totalCustomerEstimateValue * 100) / 100;

  const customerEquipmentTotal =
    typeof customerQuotedTotal === 'number' && Number.isFinite(customerQuotedTotal) && customerQuotedTotal > 0
      ? Math.round(customerQuotedTotal * 100) / 100
      : roundedCustEstTotal;

  const safeTaxRate = Math.max(
    0,
    Math.min(30, Number.isFinite(options?.taxRate) ? Number(options?.taxRate) : 0)
  );
  const taxAmount = Math.round(customerEquipmentTotal * (safeTaxRate / 100) * 100) / 100;

  const safeFeeRate = Math.max(
    0,
    Math.min(15, Number.isFinite(options?.processingFeeRate) ? Number(options?.processingFeeRate) : 0)
  );

  const allEligible = items.length === 0 || items.every((line) => line.applyProcessingFee !== false);
  const feeRatio =
    allEligible
      ? 1
      : totalCustomerEstimateValue > 0
        ? Math.max(0, Math.min(1, rawFeeEligibleCustomerValue / totalCustomerEstimateValue))
        : items.filter((l) => l.applyProcessingFee !== false).length / Math.max(1, items.length);

  const eligibleExtraShipping = allEligible || feeRatio > 0 ? extraShippingFee : 0;
  const feeBase =
    customerEquipmentTotal * feeRatio +
    taxAmount * feeRatio +
    eligibleExtraShipping +
    (extraShippingFee > 0 ? 0 : rawFeeEligibleShipping * 0);
  const processingFeeAmount =
    safeFeeRate > 0 ? Math.round(feeBase * (safeFeeRate / 100) * 100) / 100 : 0;

  const effectiveCustomerTotal =
    Math.round((customerEquipmentTotal + extraShippingFee + taxAmount + processingFeeAmount) * 100) / 100;

  const estimatedProfit =
    customerEquipmentTotal > 0
      ? Math.round((customerEquipmentTotal + extraShippingFee - totalLandedCost) * 100) / 100
      : null;

  const marginPercent =
    estimatedProfit !== null && customerEquipmentTotal + extraShippingFee > 0
      ? Math.round((estimatedProfit / (customerEquipmentTotal + extraShippingFee)) * 1000) / 10
      : null;

  const customerSavingsVsMap =
    roundedMapTotal > 0 && customerEquipmentTotal > 0
      ? Math.round((roundedMapTotal - customerEquipmentTotal) * 100) / 100
      : null;

  return {
    totalQty,
    totalVendorSubtotal: roundedSub,
    itemsShippingTotal,
    extraShippingFee,
    totalShipping: roundedShip,
    totalLandedCost,
    totalMapValue: roundedMapTotal,
    totalCustomerEstimateValue: roundedCustEstTotal,
    taxRate: safeTaxRate,
    taxAmount,
    processingFeeRate: safeFeeRate,
    processingFeeAmount,
    effectiveCustomerTotal,
    customerSavingsVsMap,
    estimatedProfit,
    marginPercent,
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

export function buildEstimateUpdateFromWorkOrder(
  order: CustomerOrderRecord,
  existingQuote: QuoteRecord | null,
  products: readonly GearProduct[],
  brand: BrandConfig
): {
  payload: QuoteSubmissionInput & QuoteUpdateInput;
  estimateItems: EstimateLineItem[];
  totals: EstimateTotals;
  previewQuote: QuoteRecord;
} {
  const estimateItems: EstimateLineItem[] = order.items
    .filter((line) => line.productName.trim() || line.itemNumber.trim())
    .map((line, idx) => {
      const skuLower = (line.itemNumber || '').trim().toLowerCase();
      const nameLower = (line.productName || '').trim().toLowerCase();
      const prodMatch = products.find(
        (p) =>
          (line.productId && p.id === line.productId) ||
          (skuLower && (p.itemNumber || p.name).toLowerCase() === skuLower) ||
          (nameLower && p.name.toLowerCase() === nameLower)
      );
      const existingEstItem = existingQuote?.estimateItems?.find(
        (it) =>
          (line.productId && it.productId === line.productId) ||
          (skuLower && it.itemNumber.toLowerCase() === skuLower)
      );

      const resolvedMap =
        typeof line.mapPrice === 'number' && Number.isFinite(line.mapPrice) && line.mapPrice > 0
          ? Math.round(line.mapPrice * 100) / 100
          : prodMatch?.mapPrice && prodMatch.mapPrice > 0
            ? prodMatch.mapPrice
            : existingEstItem?.mapPrice;

      const hasOverride =
        typeof line.customerUnitPrice === 'number' &&
        Number.isFinite(line.customerUnitPrice) &&
        line.customerUnitPrice >= 0;
      const unitPrice = hasOverride
        ? Math.round(line.customerUnitPrice! * 100) / 100
        : resolvedMap ?? existingEstItem?.unitPrice ?? 0;

      const dealerCost =
        Number.isFinite(line.quotedUnitCost) && line.quotedUnitCost > 0
          ? Math.round(line.quotedUnitCost * 100) / 100
          : existingEstItem?.dealerCost;

      const vendorName = line.chosenVendor.trim() || existingEstItem?.vendorName || '';

      return {
        id: existingEstItem?.id || `est-${line.id || idx}`,
        ...(line.productId || prodMatch?.id ? { productId: line.productId || prodMatch?.id } : {}),
        itemNumber: line.itemNumber.trim() || prodMatch?.itemNumber || line.productName.trim() || `Item-${idx + 1}`,
        brand: prodMatch?.brand || existingEstItem?.brand || '',
        description: line.productName.trim() || prodMatch?.descriptionEn || line.itemNumber.trim() || 'Pro Audio Equipment',
        qty: Math.max(1, Math.round(Number(line.qty) || 1)),
        unitPrice,
        ...(resolvedMap !== undefined && resolvedMap > 0 ? { mapPrice: resolvedMap } : {}),
        ...(dealerCost !== undefined && dealerCost > 0 ? { dealerCost } : {}),
        ...(vendorName ? { vendorName } : {}),
        ...(line.shippingCost > 0 ? { shippingCost: Math.round(line.shippingCost * 100) / 100 } : {}),
        ...(line.applyProcessingFee !== undefined
          ? { applyProcessingFee: line.applyProcessingFee }
          : {}),
      };
    });

  const discount = existingQuote?.discount ?? 0;
  const shippingFee = order.shippingFee ?? existingQuote?.shippingFee ?? 0;
  const taxRate = order.taxRate ?? existingQuote?.taxRate ?? 0;
  const processingFeeRate = order.processingFeeRate ?? existingQuote?.processingFeeRate ?? 0;
  const paymentMethod = order.paymentMethod || existingQuote?.paymentMethod || 'none';

  const totals = calculateEstimateTotals(
    estimateItems,
    discount,
    shippingFee,
    taxRate,
    processingFeeRate
  );

  const refCode = existingQuote?.refCode || order.linkedQuoteRef?.trim() || generateRefCode();
  const contactName = order.customerName.trim() || existingQuote?.contactName || 'Valued Client';
  const organization = order.organization.trim() || existingQuote?.organization || '';
  const phone = order.customerPhone.trim() || existingQuote?.phone || brand.phoneDisplay;
  const email = order.customerEmail.trim() || existingQuote?.email || '';
  const serviceRequested =
    existingQuote?.serviceRequested ||
    (organization
      ? `${organization} — Pro Audio Equipment Package`
      : 'Pro Audio Equipment & Installation Estimate');
  const nowIso = new Date().toISOString();

  const existingCover = existingQuote?.coverLetter?.trim() || '';
  const isAutoGeneratedCover =
    !existingCover ||
    (existingCover.includes('Thank you for contacting ') &&
      existingCover.includes('Your estimated project total is $'));

  const coverLetter = isAutoGeneratedCover
    ? buildDefaultCoverLetter(
        {
          contactName,
          organization,
          refCode,
          serviceRequested,
        },
        brand,
        totals
      )
    : existingCover;

  const payload: QuoteSubmissionInput & QuoteUpdateInput = {
    organization,
    contactName,
    phone,
    email,
    serviceRequested,
    soundboardModel: existingQuote?.soundboardModel || '',
    roomCapacity: existingQuote?.roomCapacity || '',
    timeline: order.targetDate.trim() || existingQuote?.timeline || '',
    notes: existingQuote?.notes || '',
    engineerNotes: order.generalNotes.trim() || existingQuote?.engineerNotes || '',
    status: existingQuote?.status || 'contacted',
    estimateItems,
    discount,
    shippingFee,
    taxRate,
    processingFeeRate,
    paymentMethod,
    coverLetter,
    estimateUpdatedAt: nowIso,
  };

  const previewQuote: QuoteRecord = {
    id: existingQuote?.id || `preview-${order.id}`,
    refCode,
    createdAt: existingQuote?.createdAt || order.createdAt || nowIso,
    status: payload.status || 'contacted',
    organization: payload.organization,
    contactName: payload.contactName,
    phone: payload.phone,
    email: payload.email,
    serviceRequested: payload.serviceRequested,
    soundboardModel: payload.soundboardModel,
    roomCapacity: payload.roomCapacity,
    timeline: payload.timeline,
    notes: payload.notes,
    engineerNotes: payload.engineerNotes || '',
    estimateItems,
    discount,
    shippingFee,
    taxRate,
    processingFeeRate,
    paymentMethod,
    coverLetter,
    estimateUpdatedAt: nowIso,
  };

  return { payload, estimateItems, totals, previewQuote };
}

export function buildWorkOrderItemsFromEstimate(
  quote: QuoteRecord,
  existingItems: readonly OrderLineSourcing[],
  products: readonly GearProduct[],
  vendorEntries: readonly VendorMasterEntry[]
): OrderLineSourcing[] {
  const { resolvedQuote } = prepareQuoteForPdf(quote, products);
  const today = new Date().toISOString().slice(0, 10);

  return (resolvedQuote.estimateItems || []).map((est, idx) => {
    const skuLower = (est.itemNumber || '').trim().toLowerCase();
    const prev = existingItems.find(
      (line) =>
        (est.productId && line.productId === est.productId) ||
        (skuLower && line.itemNumber.trim().toLowerCase() === skuLower)
    );
    const vm = vendorEntries.find(
      (entry) =>
        (est.productId && entry.productId === est.productId) ||
        (skuLower &&
          (entry.itemNumber.toLowerCase() === skuLower ||
            entry.productName.toLowerCase() === skuLower))
    );
    const best = vm ? compareVendorQuotes(vm.quotes, vm.mapPrice).bestQuote : null;
    const prodMatch = products.find(
      (p) =>
        (est.productId && p.id === est.productId) ||
        (skuLower && (p.itemNumber || p.name).toLowerCase() === skuLower)
    );
    const resolvedMap = est.mapPrice ?? prev?.mapPrice ?? prodMatch?.mapPrice ?? vm?.mapPrice;
    const resolvedUnitCost =
      est.dealerCost && est.dealerCost > 0
        ? est.dealerCost
        : prev?.quotedUnitCost && prev.quotedUnitCost > 0
          ? prev.quotedUnitCost
          : best?.unitCost || 0;
    const resolvedVendor = est.vendorName?.trim() || prev?.chosenVendor || best?.vendorName || '';

    return {
      id: prev?.id || `line-${idx}-${Date.now()}`,
      ...(est.productId || prev?.productId ? { productId: est.productId || prev?.productId } : {}),
      productName: est.description || prev?.productName || est.itemNumber,
      itemNumber: est.itemNumber || prev?.itemNumber || '',
      qty: Math.max(1, Math.round(Number(est.qty) || 1)),
      ...(resolvedMap && resolvedMap > 0 ? { mapPrice: resolvedMap } : {}),
      ...(Number.isFinite(est.unitPrice) && est.unitPrice >= 0
        ? { customerUnitPrice: est.unitPrice }
        : {}),
      chosenVendor: resolvedVendor,
      contactedRepName: prev?.contactedRepName || best?.repName || '',
      vendorPhone: prev?.vendorPhone || best?.phone || '',
      vendorEmail: prev?.vendorEmail || best?.email || '',
      contactMethod: prev?.contactMethod || 'phone',
      contactedDate: prev?.contactedDate || today,
      vendorQuoteRef: prev?.vendorQuoteRef || best?.skuOrPartNo || '',
      quotedUnitCost: resolvedUnitCost,
      shippingCost:
        typeof est.shippingCost === 'number' && est.shippingCost > 0
          ? est.shippingCost
          : prev?.shippingCost ?? best?.shippingCost ?? 0,
      applyProcessingFee: est.applyProcessingFee ?? prev?.applyProcessingFee ?? true,
      lineStatus:
        prev?.lineStatus || (resolvedUnitCost > 0 && resolvedVendor ? 'quoted' : 'need_to_call'),
      lineNotes: prev?.lineNotes || '',
    };
  });
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
    'Product Cost',
    'Total Shipping',
    'Tax Rate %',
    'Tax Amount',
    'Processing Fee %',
    'Processing Fee Amount',
    'Total Cost',
    'Est. Margin',
    'Vendors & Reps Contacted',
    'Line Items Summary',
    'Target Date',
    'Updated',
  ];

  const rows = orders.map((order) => {
    const totals = calculateCustomerOrderTotals(order.items, order.customerQuotedTotal, [], [], {
      shippingFee: order.shippingFee,
      taxRate: order.taxRate,
      processingFeeRate: order.processingFeeRate,
    });
    const repsSummary = [
      ...order.items
        .filter((l) => l.chosenVendor || l.contactedRepName)
        .map((l) => `${l.chosenVendor || 'TBD'} (${l.contactedRepName || '-'} ${l.vendorPhone || ''}) Ref:${l.vendorQuoteRef || '-'}`),
      ...order.callLogs.map((c) => `${c.vendorName} (${c.repName} ${c.phone}) Quote:${c.quoteNumber || '-'}`),
    ].join(' ; ');
    const itemsSummary = order.items
      .map((l) => `${l.qty}x ${l.itemNumber || l.productName} [${l.lineStatus}] @ $${l.quotedUnitCost.toFixed(2)} (Ship $${(l.shippingCost || 0).toFixed(2)})`)
      .join(' ; ');

    return [
      order.orderCode,
      order.status,
      order.linkedQuoteRef || '',
      order.customerName,
      order.organization,
      order.customerPhone,
      totals.effectiveCustomerTotal > 0 ? totals.effectiveCustomerTotal.toFixed(2) : '',
      totals.totalVendorSubtotal.toFixed(2),
      totals.totalShipping.toFixed(2),
      totals.taxRate > 0 ? totals.taxRate.toFixed(2) : '0',
      totals.taxAmount.toFixed(2),
      totals.processingFeeRate > 0 ? totals.processingFeeRate.toFixed(2) : '0',
      totals.processingFeeAmount.toFixed(2),
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

export function mergeHeroConfig(partial?: Partial<HeroConfig> | null): HeroConfig {
  return {
    ...DEFAULT_SITE_CONTENT.hero,
    ...(partial || {}),
  };
}

export function mergePageCopy(partial?: Partial<PageCopyConfig> | null): PageCopyConfig {
  const modules =
    Array.isArray(partial?.trainingModules) && partial.trainingModules.length > 0
      ? partial.trainingModules
      : DEFAULT_PAGE_COPY.trainingModules;
  return {
    ...DEFAULT_PAGE_COPY,
    ...(partial || {}),
    trainingModules: modules,
  };
}

export function mergeMemberPricing(
  partial?: Partial<MemberPricingConfig> | null
): MemberPricingConfig {
  return {
    ...DEFAULT_MEMBER_PRICING,
    ...(partial || {}),
  };
}

export function getCustomerEffectiveDiscountPercent(
  customer: CustomerAccount | null | undefined,
  config?: MemberPricingConfig | null
): number {
  const merged = mergeMemberPricing(config);
  if (!merged.enabled || !customer || customer.status !== 'active') {
    return 0;
  }
  if (
    typeof customer.customDiscountPercent === 'number' &&
    Number.isFinite(customer.customDiscountPercent) &&
    customer.customDiscountPercent >= 0 &&
    customer.customDiscountPercent <= 90
  ) {
    return Math.round(customer.customDiscountPercent * 100) / 100;
  }
  switch (customer.pricingTier) {
    case 'dealer_pro':
      return Math.max(0, Math.min(90, merged.dealerProDiscountPercent));
    case 'church_partner':
      return Math.max(0, Math.min(90, merged.churchPartnerDiscountPercent));
    case 'vip':
    default:
      return Math.max(0, Math.min(90, merged.defaultDiscountPercent));
  }
}

export function calculateMemberPrice(
  mapPrice: number | undefined,
  discountPercent: number
): number | undefined {
  if (typeof mapPrice !== 'number' || !Number.isFinite(mapPrice) || mapPrice <= 0) {
    return undefined;
  }
  if (!Number.isFinite(discountPercent) || discountPercent <= 0) {
    return Math.round(mapPrice * 100) / 100;
  }
  const safeDiscount = Math.min(90, Math.max(0, discountPercent));
  return Math.round(mapPrice * (1 - safeDiscount / 100) * 100) / 100;
}

export interface CartMemberSummary extends CartSummary {
  memberDiscountPercent: number;
  estimatedMemberTotal: number;
  totalSavings: number;
}

export function calculateCartMemberSummary(
  cart: readonly CartItem[],
  discountPercent: number
): CartMemberSummary {
  const base = calculateCartSummary(cart);
  const safeDiscount = Number.isFinite(discountPercent) ? Math.min(90, Math.max(0, discountPercent)) : 0;
  if (safeDiscount <= 0) {
    return {
      ...base,
      memberDiscountPercent: 0,
      estimatedMemberTotal: base.estimatedMapTotal,
      totalSavings: 0,
    };
  }
  let estimatedMemberTotal = 0;
  for (const item of cart) {
    const qty = Math.max(1, item.quantity);
    const memberUnit = calculateMemberPrice(item.mapPrice, safeDiscount);
    if (memberUnit !== undefined) {
      estimatedMemberTotal += memberUnit * qty;
    }
  }
  const roundedMember = Math.round(estimatedMemberTotal * 100) / 100;
  const totalSavings = Math.max(0, Math.round((base.estimatedMapTotal - roundedMember) * 100) / 100);
  return {
    ...base,
    memberDiscountPercent: safeDiscount,
    estimatedMemberTotal: roundedMember,
    totalSavings,
  };
}

export function formatCustomersToCsv(customers: readonly CustomerAccount[]): string {
  const headers = [
    'Customer ID',
    'Full Name',
    'Church / Organization',
    'Email',
    'Phone',
    'Sign-In Method',
    'Status',
    'Pricing Tier',
    'Custom Discount %',
    'Login Count',
    'Last Login',
    'Joined Date',
    'Admin Notes',
  ];

  const rows = customers.map((c) =>
    [
      c.id,
      c.fullName,
      c.organization,
      c.email,
      c.phone,
      c.authProvider,
      c.status,
      c.pricingTier,
      c.customDiscountPercent !== undefined ? String(c.customDiscountPercent) : '',
      String(c.loginCount ?? 1),
      c.lastLoginAt,
      c.createdAt.slice(0, 10),
      c.notes,
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\n');
}

export function mergeVideoMeetingConfig(
  partial?: Partial<VideoMeetingConfig> | null
): VideoMeetingConfig {
  const recentRooms = Array.isArray(partial?.recentRooms)
    ? partial.recentRooms.slice(0, 20)
    : DEFAULT_VIDEO_MEETING.recentRooms || [];
  return {
    ...DEFAULT_VIDEO_MEETING,
    ...(partial || {}),
    recentRooms,
  };
}

/**
 * Validates and normalizes a Google Meet link or room code (e.g. "abc-defg-hij" -> "https://meet.google.com/abc-defg-hij").
 * Strictly rejects non-Google-Meet domains or unsafe schemes like javascript:.
 */
export function normalizeGoogleMeetUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Bare Meet code like "abc-defg-hij"
  if (/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(trimmed)) {
    return `https://meet.google.com/${trimmed.toLowerCase()}`;
  }

  let candidate = trimmed;
  if (/^meet\.google\.com\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.hostname.toLowerCase() !== 'meet.google.com') return null;
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    if (!cleanPath || cleanPath === '/') return null;
    return `https://meet.google.com${cleanPath}`;
  } catch {
    return null;
  }
}

export function extractGoogleMeetCode(urlOrCode: string): string {
  const normalized = normalizeGoogleMeetUrl(urlOrCode);
  if (!normalized) return '';
  const segment = normalized.replace(/^https:\/\/meet\.google\.com\//i, '').split(/[/?#]/)[0] || '';
  return segment.trim();
}

export interface VideoMeetingRequestForm {
  contactName: string;
  organization: string;
  phone: string;
  email: string;
  topic: string;
  preferredDate: string;
  preferredTime: string;
  notes: string;
  meetingLink?: string;
}

export function buildVideoMeetingRequestInput(
  form: VideoMeetingRequestForm
): QuoteSubmissionInput {
  const timelineParts = [form.preferredDate.trim(), form.preferredTime.trim()].filter(Boolean);
  const noteLines: string[] = [
    'Requested Free Google Meet Video Consultation',
    `Topic: ${form.topic.trim() || 'Sanctuary Sound / Equipment Walkthrough'}`,
  ];
  if (timelineParts.length > 0) {
    noteLines.push(`Preferred Slot: ${timelineParts.join(' · ')}`);
  }
  if (form.meetingLink?.trim()) {
    noteLines.push(`Google Meet Link: ${form.meetingLink.trim()}`);
  }
  if (form.notes.trim()) {
    noteLines.push(`Customer Notes: ${form.notes.trim()}`);
  }

  return {
    organization: form.organization.trim(),
    contactName: form.contactName.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    serviceRequested: `Google Meet Video Consultation — ${form.topic.trim() || 'Sanctuary & Gear Walkthrough'}`,
    soundboardModel: '',
    roomCapacity: '',
    timeline: timelineParts.join(' · ') || 'Flexible / Next Available',
    notes: noteLines.join('\n'),
  };
}

export interface SanitizedQuoteFirestoreFields {
  refCode: string;
  status: 'new';
  organization: string;
  contactName: string;
  phone: string;
  email: string;
  serviceRequested: string;
  soundboardModel: string;
  roomCapacity: string;
  timeline: string;
  notes: string;
  engineerNotes: '';
}

const VALID_QUOTE_REF_CODE_REGEX = /^EVA-([0-9]{6}|[0-9]{6}-[0-9]{4})$/;

/**
 * Normalizes a customer quote submission so every field strictly satisfies
 * firestore.rules `isValidQuote()` and unauthenticated `allow create` checks.
 */
export function buildSanitizedQuoteForFirestore(
  input: QuoteSubmissionInput,
  refCode?: string
): SanitizedQuoteFirestoreFields {
  const safeRefCode =
    refCode && VALID_QUOTE_REF_CODE_REGEX.test(refCode.trim())
      ? refCode.trim()
      : generateRefCode();

  const cleanContactName = String(input.contactName || '').trim().slice(0, 120) || 'Customer';
  const rawPhone = String(input.phone || '').trim().slice(0, 40);
  const cleanPhone = rawPhone.length >= 7 ? rawPhone : '000-0000';
  const cleanService =
    String(input.serviceRequested || '').trim().slice(0, 320) || 'Pro Audio Quote Request';

  return {
    refCode: safeRefCode,
    status: 'new',
    organization: String(input.organization || '').trim().slice(0, 160),
    contactName: cleanContactName,
    phone: cleanPhone,
    email: String(input.email || '').trim().slice(0, 160),
    serviceRequested: cleanService,
    soundboardModel: String(input.soundboardModel || '').trim().slice(0, 120),
    roomCapacity: String(input.roomCapacity || '').trim().slice(0, 80),
    timeline: String(input.timeline || '').trim().slice(0, 120),
    notes: String(input.notes || '').trim().slice(0, 5000),
    engineerNotes: '',
  };
}
