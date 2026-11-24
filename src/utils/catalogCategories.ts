import type {
  BuiltInGearCategory,
  CatalogCategoryConfig,
  GearProduct,
  Language,
} from '../types/site';

export const CATEGORY_ID_REGEX = /^[a-z0-9][a-z0-9_-]{1,47}$/;
export const MAX_CUSTOM_CATEGORIES = 40;

export const BUILT_IN_CATALOG_CATEGORIES: readonly CatalogCategoryConfig[] = [
  {
    id: 'speakers',
    labelEn: 'Speakers & Subs',
    labelEs: 'Parlantes y Subwoofers',
    shortLabel: 'Speakers & Subs',
    hint: 'PA speakers, subwoofers, line arrays & monitors',
    builtIn: true,
  },
  {
    id: 'consoles',
    labelEn: 'Mixers & Consoles',
    labelEs: 'Mezcladoras y Consolas',
    shortLabel: 'Mixers & Consoles',
    hint: 'Digital mixers, soundboards, rackmount mixers & studio interfaces',
    builtIn: true,
  },
  {
    id: 'dj',
    labelEn: 'DJ Controllers & Mixers',
    labelEs: 'Controladores y Mezcladoras DJ',
    shortLabel: 'DJ Controllers',
    hint: 'DJ controllers, standalone DJ systems, DJ mixers, CDJ/XDJ players & DVS interfaces',
    builtIn: true,
  },
  {
    id: 'mics',
    labelEn: 'Wireless & Wired Mics',
    labelEs: 'Micrófonos',
    shortLabel: 'Mics',
    hint: 'Wireless, wired, drum mics, mic capsules & stands',
    builtIn: true,
  },
  {
    id: 'cases',
    labelEn: 'Cases & Rackmount',
    labelEs: 'Estuches y Rack',
    shortLabel: 'Cases & Rack',
    hint: 'Flight cases, rack cases, rackmount kits, rack ears, bags & dust covers',
    builtIn: true,
  },
  {
    id: 'cables',
    labelEn: 'Stageboxes, XLR & Power',
    labelEs: 'Cajas, XLR y Corriente',
    shortLabel: 'Stageboxes & XLR',
    hint: 'Digital snakes, XLR/Speakon/DMX cables, DI boxes & power conditioners',
    builtIn: true,
  },
  {
    id: 'lighting',
    labelEn: 'Moving Lights & Wash',
    labelEs: 'Luces Móviles y DMX',
    shortLabel: 'Lighting',
    hint: 'Moving heads, wash bars, DMX controllers & hazers',
    builtIn: true,
  },
  {
    id: 'rigging',
    labelEn: 'Truss, Beam & Ceiling Rigs',
    labelEs: 'Truss, Vigas y Techo',
    shortLabel: 'Truss & Rigging',
    hint: 'Truss, speaker stands, yokes, clamps & flying hardware',
    builtIn: true,
  },
  {
    id: 'iem',
    labelEn: 'In-Ear Monitors',
    labelEs: 'Monitores IEM',
    shortLabel: 'In-Ear Monitors',
    hint: 'IEM transmitters, bodypacks & earphones',
    builtIn: true,
  },
  {
    id: 'combiners',
    labelEn: 'RF Combiners & Antennas',
    labelEs: 'Antenas y Combinadores RF',
    shortLabel: 'RF Combiners',
    hint: 'Antenna splitters, combiners & RF distribution',
    builtIn: true,
  },
];

export const BUILT_IN_CATEGORY_ID_SET: ReadonlySet<string> = new Set(
  BUILT_IN_CATALOG_CATEGORIES.map((c) => c.id)
);

export const SUGGESTED_CUSTOM_CATEGORIES: readonly CatalogCategoryConfig[] = [
  {
    id: 'subwoofer-mounts',
    labelEn: 'Subwoofer Mounts & Poles',
    labelEs: 'Soportes y Postes de Sub',
    shortLabel: 'Sub Mounts',
    hint: 'Subwoofer poles, M20 threaded rods, speaker-over-sub mounts & casters',
  },
  {
    id: 'hardware',
    labelEn: 'Mounting Hardware & Clamps',
    labelEs: 'Herrajes y Abrazaderas',
    shortLabel: 'Hardware',
    hint: 'O-clamps, couplers, eyebolts, wall brackets, safety cables & rack screws',
  },
  {
    id: 'drum-mics',
    labelEn: 'Drum Mics & Kits',
    labelEs: 'Micrófonos de Batería',
    shortLabel: 'Drum Mics',
    hint: 'Kick, snare, tom & overhead drum mic packs and rim clips',
  },
  {
    id: 'mic-capsules',
    labelEn: 'Mic Capsules & Accessories',
    labelEs: 'Cápsulas y Accesorios Mic',
    shortLabel: 'Mic Capsules',
    hint: 'Interchangeable wireless capsules, windscreens, shockmounts & clips',
  },
  {
    id: 'amplifiers',
    labelEn: 'Power Amps & DSP',
    labelEs: 'Amplificadores y DSP',
    shortLabel: 'Amps & DSP',
    hint: 'Touring amplifiers, rack DSP processors, crossovers & speaker management',
  },
  {
    id: 'studio-interfaces',
    labelEn: 'Audio Interfaces & Studio',
    labelEs: 'Interfaces y Estudio',
    shortLabel: 'Studio & I/O',
    hint: 'USB/Dante audio interfaces, headphone amps, studio monitors & recorders',
  },
];

const RESERVED_CATEGORY_IDS = new Set(['all', 'auto']);

export function slugifyCategoryId(raw: string): string {
  const base = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');

  if (!base || base.length < 2 || RESERVED_CATEGORY_IDS.has(base)) {
    return base && !RESERVED_CATEGORY_IDS.has(base) ? `cat-${base}` : '';
  }
  return base;
}

export function sanitizeProductCategoryId(
  raw: unknown,
  fallback: BuiltInGearCategory = 'consoles'
): string {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim().toLowerCase();
  if (CATEGORY_ID_REGEX.test(trimmed) && !RESERVED_CATEGORY_IDS.has(trimmed)) {
    return trimmed;
  }
  const slug = slugifyCategoryId(trimmed);
  if (slug && CATEGORY_ID_REGEX.test(slug)) {
    return slug;
  }
  return fallback;
}

export const LEGACY_PROMOTED_DJ_CATEGORY_IDS: ReadonlySet<string> = new Set([
  'dj-controls',
  'dj-control',
  'dj-controller',
  'dj-controllers',
  'dj-mixer',
  'dj-mixers',
  'dj-controllers-and-mixers',
]);

export function sanitizeCustomCategories(raw: unknown): CatalogCategoryConfig[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>([
    ...BUILT_IN_CATEGORY_ID_SET,
    ...LEGACY_PROMOTED_DJ_CATEGORY_IDS,
  ]);
  const result: CatalogCategoryConfig[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Partial<CatalogCategoryConfig>;
    const labelEn = typeof obj.labelEn === 'string' ? obj.labelEn.trim().slice(0, 60) : '';
    if (!labelEn) continue;

    const rawId = typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim().toLowerCase() : labelEn;
    const id = CATEGORY_ID_REGEX.test(rawId) && !RESERVED_CATEGORY_IDS.has(rawId)
      ? rawId
      : slugifyCategoryId(rawId || labelEn);

    if (!id || !CATEGORY_ID_REGEX.test(id) || seen.has(id)) continue;
    seen.add(id);

    const labelEs =
      typeof obj.labelEs === 'string' && obj.labelEs.trim()
        ? obj.labelEs.trim().slice(0, 60)
        : labelEn;
    const shortLabel =
      typeof obj.shortLabel === 'string' && obj.shortLabel.trim()
        ? obj.shortLabel.trim().slice(0, 32)
        : labelEn.slice(0, 32);
    const hint =
      typeof obj.hint === 'string' && obj.hint.trim()
        ? obj.hint.trim().slice(0, 140)
        : `Custom storefront department: ${labelEn}`;

    result.push({
      id,
      labelEn,
      labelEs,
      shortLabel,
      hint,
      builtIn: false,
    });

    if (result.length >= MAX_CUSTOM_CATEGORIES) break;
  }

  return result;
}

export function getAllCatalogCategories(
  customCategories?: readonly CatalogCategoryConfig[] | null
): CatalogCategoryConfig[] {
  const sanitized = sanitizeCustomCategories(customCategories);
  return [...BUILT_IN_CATALOG_CATEGORIES, ...sanitized];
}

export function getCatalogCategoryLabel(
  categoryId: string,
  customCategories?: readonly CatalogCategoryConfig[] | null,
  lang: Language = 'en'
): string {
  if (categoryId === 'all') {
    return lang === 'es' ? 'Todos' : 'All Gear';
  }
  const all = getAllCatalogCategories(customCategories);
  const match = all.find((c) => c.id === categoryId);
  if (match) {
    return lang === 'es' ? match.labelEs : match.labelEn;
  }
  return categoryId
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function createCustomCategoryEntry(
  input: {
    labelEn: string;
    labelEs?: string;
    hint?: string;
    id?: string;
  },
  existingCustomCategories?: readonly CatalogCategoryConfig[] | null
): { category: CatalogCategoryConfig | null; error?: string } {
  const labelEn = input.labelEn.trim().slice(0, 60);
  if (labelEn.length < 2) {
    return { category: null, error: 'Enter a category name (at least 2 characters).' };
  }

  const existingCustom = sanitizeCustomCategories(existingCustomCategories);
  if (existingCustom.length >= MAX_CUSTOM_CATEGORIES) {
    return {
      category: null,
      error: `You reached the maximum of ${MAX_CUSTOM_CATEGORIES} custom categories.`,
    };
  }

  const allIds = new Set([
    ...BUILT_IN_CATEGORY_ID_SET,
    ...existingCustom.map((c) => c.id),
  ]);

  let id = slugifyCategoryId(input.id?.trim() || labelEn);
  if (!id || !CATEGORY_ID_REGEX.test(id)) {
    return { category: null, error: 'Use letters or numbers in the category name.' };
  }

  if (allIds.has(id)) {
    // Check if an identical label already exists
    const existingMatch = getAllCatalogCategories(existingCustom).find(
      (c) => c.id === id || c.labelEn.toLowerCase() === labelEn.toLowerCase()
    );
    if (existingMatch) {
      return {
        category: null,
        error: `Category "${existingMatch.labelEn}" already exists.`,
      };
    }
    // Disambiguate slug cleanly
    let suffix = 2;
    while (allIds.has(`${id.slice(0, 44)}-${suffix}`)) {
      suffix += 1;
    }
    id = `${id.slice(0, 44)}-${suffix}`;
  }

  const labelEs = (input.labelEs || '').trim().slice(0, 60) || labelEn;
  const hint =
    (input.hint || '').trim().slice(0, 140) ||
    `Custom storefront category for ${labelEn}`;

  return {
    category: {
      id,
      labelEn,
      labelEs,
      shortLabel: labelEn.slice(0, 32),
      hint,
      builtIn: false,
    },
  };
}

export function reassignProductsOnCategoryDelete(
  products: readonly GearProduct[],
  deletedCategoryId: string,
  fallbackCategoryId: string = 'cables'
): GearProduct[] {
  const safeFallback = sanitizeProductCategoryId(fallbackCategoryId, 'cables');
  return products.map((product) =>
    product.category === deletedCategoryId
      ? { ...product, category: safeFallback }
      : product
  );
}
