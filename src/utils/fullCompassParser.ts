import type {
  CatalogCategoryConfig,
  GearCategory,
  GearProduct,
  VendorMasterEntry,
  VendorQuoteOption,
} from '../types/site';
import {
  BUILT_IN_CATALOG_CATEGORIES,
  getAllCatalogCategories,
  getCatalogCategoryLabel,
} from './catalogCategories';

export type BulkImportSupplierSource = 'sweetwater' | 'fullcompass';

export type FullCompassTargetCategory = 'auto' | Exclude<GearCategory, 'all'>;

export interface FullCompassCategoryOption {
  id: Exclude<GearCategory, 'all'>;
  label: string;
  shortLabel: string;
  hint: string;
  builtIn?: boolean;
}

export const FULL_COMPASS_CATEGORY_OPTIONS: readonly FullCompassCategoryOption[] =
  BUILT_IN_CATALOG_CATEGORIES.map((cat) => ({
    id: cat.id,
    label: cat.labelEn,
    shortLabel: cat.shortLabel || cat.labelEn,
    hint: cat.hint || cat.labelEn,
    builtIn: true,
  }));

export function getBulkCategoryOptions(
  customCategories?: readonly CatalogCategoryConfig[] | null
): FullCompassCategoryOption[] {
  return getAllCatalogCategories(customCategories).map((cat) => ({
    id: cat.id,
    label: cat.labelEn,
    shortLabel: cat.shortLabel || cat.labelEn,
    hint: cat.hint || cat.labelEn,
    builtIn: cat.builtIn,
  }));
}

export function getGearCategoryLabel(
  category: Exclude<GearCategory, 'all'>,
  customCategories?: readonly CatalogCategoryConfig[] | null
): string {
  return getCatalogCategoryLabel(category, customCategories, 'en');
}

export interface ParsedFullCompassItem {
  itemNumber: string;
  brand: string;
  modelName: string;
  description: string;
  category: Exclude<GearCategory, 'all'>;
  dealerCost?: number;
  listPrice?: number;
  mapPrice?: number;
  inStock: boolean;
  availability: string;
  leadTimeShort: string;
  isPreorder?: boolean;
}

const KNOWN_BRANDS: readonly string[] = [
  'Audio-Technica',
  'Electro-Voice',
  'High End Systems',
  'Interactive Technologies',
  'Listen Technologies',
  'Look Solutions',
  'Obsidian Control Systems',
  'City Theatrical',
  'DB Technologies',
  'Eliminator Lighting',
  'Hear Technologies',
  'JMAZ Professional',
  'JMAZ Lighting',
  'Martin Audio',
  'Renkus-Heinz',
  'Alto Professional',
  'Apex Electronics',
  'Chauvet Pro',
  'Chauvet DJ',
  'Galaxy Audio',
  'MA Lighting',
  'Nexus Lights',
  'Pioneer DJ',
  'Point Source',
  'Technical Pro',
  'Williams AV',
  'Allen & Heath',
  'AlphaTheta',
  'Beyerdynamic',
  'CAD Audio',
  'Clear-Com',
  'DAS Audio',
  'HK Audio',
  'Lectrosonics',
  'Lightronics',
  'MEGA-LITE',
  'RF Venue',
  'Sennheiser',
  'Sensaphonics',
  'Phase DJ',
  'PreSonus',
  'BASSBOSS',
  'Behringer',
  'Blizzard',
  'ChamSys',
  'Elation',
  'Grundorf',
  'Mackie',
  'Numark',
  'Peavey',
  'Philmore',
  'Pro Co',
  'Samson',
  'VocoPro',
  'Wisycom',
  'Yamaha',
  'Yorkville',
  'Altman',
  'Anchor',
  'Audix',
  'Bag End',
  'Bogen',
  'Gemini',
  'Lycian',
  'MIPRO',
  'ProX',
  'Rolls',
  'Shure',
  'SKAA',
  'Bose Professional',
  'Trulli Audio',
  'K-Array',
  'Genelec',
  'Neumann',
  'McCauley',
  'Biamp',
  'ADJ',
  'AKG',
  'EAW',
  'ETC',
  'FBT',
  'JBL',
  'QSC',
  'RCF',
  'Rane',
  'RTS',
  'TOA',
];

const SORTED_BRANDS = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length);

export function detectBrandAndModel(rawSkuLine: string): {
  brand: string;
  itemNumber: string;
} {
  const clean = rawSkuLine.replace(/\s+/g, ' ').trim();
  for (const brand of SORTED_BRANDS) {
    if (clean.toLowerCase().startsWith(brand.toLowerCase() + ' ')) {
      const rest = clean.slice(brand.length).trim();
      // Fix duplicate brand prefixes like "Rane Rane ONE MKII" or "PreSonus PreSonus CDL12P"
      const dedupedRest = rest.toLowerCase().startsWith(brand.toLowerCase() + ' ')
        ? rest.slice(brand.length).trim()
        : rest;
      return {
        brand,
        itemNumber: `${brand} ${dedupedRest}`.trim(),
      };
    }
  }
  const firstWord = clean.split(' ')[0] || 'Pro Audio';
  return { brand: firstWord, itemNumber: clean };
}

export function normalizeAvailability(rawLine: string, isPreorder = false): {
  inStock: boolean;
  availability: string;
  leadTimeShort: string;
} {
  const t = rawLine.replace(/\s+/g, ' ').trim();
  if (isPreorder) {
    const daysMatch = t.match(/(\d+\s*-\s*\d+\s*Business\s*Days?)/i);
    if (daysMatch) {
      const days = daysMatch[1].replace(/business\s*days?/i, 'Business Days');
      return {
        inStock: false,
        availability: `Preorder · Ships in ${days}`,
        leadTimeShort: `Preorder (${days})`,
      };
    }
    return {
      inStock: false,
      availability: 'Preorder · Call for ETA',
      leadTimeShort: 'Preorder',
    };
  }

  if (/^In Stock$/i.test(t)) {
    return {
      inStock: true,
      availability: 'In Stock',
      leadTimeShort: 'In Stock',
    };
  }

  const daysMatch = t.match(/(\d+\s*-\s*\d+)\s*Business\s*Days?/i);
  if (/More on Order/i.test(t)) {
    if (daysMatch) {
      return {
        inStock: false,
        availability: `More on Order · Ships in ${daysMatch[1]} Business Days`,
        leadTimeShort: `${daysMatch[1]} Business Days`,
      };
    }
    return {
      inStock: false,
      availability: 'High Demand · Backorder (Call for ETA)',
      leadTimeShort: 'High Demand / Backorder',
    };
  }

  if (/We're Ordering More/i.test(t)) {
    return {
      inStock: false,
      availability: 'On Order · Reserve Today',
      leadTimeShort: 'On Order',
    };
  }

  if (daysMatch) {
    return {
      inStock: false,
      availability: `Ships in ${daysMatch[1]} Business Days`,
      leadTimeShort: `${daysMatch[1]} Business Days`,
    };
  }

  if (/Call our Sales Pros/i.test(t)) {
    return {
      inStock: false,
      availability: 'Call for Availability & ETA',
      leadTimeShort: 'Call for ETA',
    };
  }

  return {
    inStock: true,
    availability: t || 'In Stock',
    leadTimeShort: t || 'In Stock',
  };
}

export function classifyFullCompassCategory(
  brand: string,
  itemNumber: string,
  description: string
): Exclude<GearCategory, 'all'> {
  const text = `${brand} ${itemNumber} ${description}`.toLowerCase();

  // Cases, flight cases, rackmount kits, rack ears, rack cases, bags & dust covers
  if (
    /\bcase for\b|\bcover for\b|\broad case\b|\bflight case\b|\brack case\b|\brackmount kit\b|\brack mount kit\b|\brack kit\b|\brack ear|\brack drawer\b|\brack shelf\b|\brolling rack\b|\bshockmount rack\b|\bmolded rack\b|\bata case\b|\bdust cover\b|\bpadded cover\b|\bspeaker cover\b|\bsubwoofer cover\b|\bcarry bag\b|\bgig bag\b|\btransport bag\b|\bmixer bag\b|\bbackpack for\b|\bshoulder bag\b/.test(
      text
    ) ||
    (/\b(gator|skb|odyssey|pelican|grundorf|prox)\b/.test(brand.toLowerCase()) &&
      /\bcase\b|\brack\b|\bbag\b|\bcover\b/.test(text) &&
      !/cable|snake|xlr|speakon|dmx|stand|pole|subwoofer|speaker|monitor/.test(text))
  ) {
    if (!/freedom flex|6-pack|fixtures/.test(text)) {
      return 'cases';
    }
  }

  // RF Combiners, Splitters, Antenna Distribution & RF over Fiber
  if (
    brand === 'RF Venue' ||
    /\bantenna\b|\bcombiner\b|\bsplitter\b|\bdistro\b|\bmulticoupler\b|\bfrequency manager\b|\brf over fiber\b|\brfof\b|\boptical multiplexer\b|\buhfads\b|\bads48\b|\bwd-5800\b|\bua844\b|\bua845\b|\bua221\b|\bpa411\b|\bpa421\b|\bpa821\b|\bad8c|\bad221\b|\basa 3000\b|\bew-d-asa\b|\basp 212\b|\basp 113\b|\baca-3\b|\bac 41\b|\bac 3200\b|\bsl-pasc\b|\baps4\b|\batw-da49|\batw-sc410|\bre3-acc-|\bg4iemdirkit|\bg4omnikit|\bm2c-l\b/.test(
      text
    )
  ) {
    // Keep RF-PA speaker kits in speakers!
    if (!/-rf-pa-k\b|wireless rf.*pa kit|wireless pa kit/i.test(text)) {
      return 'combiners';
    }
  }

  // Lighting, Consoles (DMX), Moving Heads, Wash, Bars, Dimmer, Hazer, Uplight
  if (
    [
      'ETC',
      'MA Lighting',
      'Chauvet Pro',
      'Chauvet DJ',
      'Elation',
      'Blizzard',
      'High End Systems',
      'Obsidian Control Systems',
      'City Theatrical',
      'Nexus Lights',
      'JMAZ Professional',
      'JMAZ Lighting',
      'ChamSys',
      'MEGA-LITE',
      'Lightronics',
      'Look Solutions',
      'Interactive Technologies',
      'Eliminator Lighting',
      'Altman',
      'ADJ',
      'Lycian',
    ].includes(brand) ||
    /\bdmx\b|\bmoving head\b|\bmoving-head\b|\buplight\b|\bfollow spot\b|\bhazer\b|\bhaze machine\b|\bdimmer\b|\bellipsoidal\b|\bfresnel\b|\bcyc wash\b|\bcyc fixture\b|\bcyc light\b|\bpar fixture\b|\bled strip\b|\bstrip light\b|\bwash light\b|\bbatten\b|\bgrandma3\b|\bsource 4wrd\b|\bcolorsource\b|\blighting console\b|\blighting control\b/.test(
      text
    )
  ) {
    return 'lighting';
  }

  // DJ Players, DJ Mixers, DJ Controllers, Karaoke Mixers -> consoles
  if (
    ['AlphaTheta', 'Pioneer DJ', 'Rane', 'Numark', 'Phase DJ'].includes(brand) &&
    !/speaker|loudspeaker|xprs|wave-eight/.test(text)
  ) {
    return 'consoles';
  }
  if (/\bkaraoke mixer\b|\bdj mixer\b|\bdj controller\b|\bdj multi-player\b|\bdj player\b|\bdj system\b|\bdj effector\b/.test(text)) {
    return 'consoles';
  }

  // In-Ear Monitors, Earphones, Earbuds, IEM Bodypacks/Transmitters, IFB Earsets
  if (
    /\bin-ear\b|\bin ear\b|\biem\b|\bpsm\s*300\b|\bpsm\s*900\b|\baxient digital psm\b|\bse215\b|\bse425\b|\bse535\b|\bse846\b|\bearphones?\b|\bearbuds?\b|\bear bud\b|\bearset\b|\bear speaker\b|\bifb\b|\bbodypack\b|\bdt 30 ie\b|\bdt 7[0-3] ie\b|\bverio 200\b|\bath-e[457]0\b|\bath-twx|\bath-ckd|\bmp-120|\bmp-220|\bmp-240|\bmp-320|\bmp-360|\bmp-460|\bie 4\b|\bie 40|\bie100|\btelethin\b|\bover ear monitor\b|\bover-ear hook\b|\bpersonal monitor\b|\bpersonal monitoring\b|\bas-1400|\bas-1406|\bas-1410|\bas-1200|\bas-1206|\bas-950|\bas-900|\bas-4400|\bas-4100|\bas-4000|\basd-700|\bgxliem|\biembp\b|\bswer100|\bswea100|\bfreedom-back|\bwiems\b|\bsingandhear|\bm2t\b|\bm2tnd\b|\bm2ra\b|\bmpr52|\bmpr60|\bmtk982|\b3dme\b|\byp-e5000\b|\bcm-i5\b|\bintercom headset\b|\beb-6\b|\beb-10\b|\beb4\b|\beb77\b|\bprotective noise isolating\b|\bprotective ear buds\b|\bmini earbuds\b|\bisolation earphones\b/.test(
      text
    )
  ) {
    return 'iem';
  }

  // Cases, covers, bags, totes, rack kits, stageboxes, AVB/Dante bridges & switches -> cables
  if (
    /\bstagebox\b|\bstage box\b|\bxlr cable\b|\bsnake cable\b|\bspeaker cable\b|\bavb switch\b|\bavb to dante\b|\brackmount kit\b|\brack kit\b|\brack ear\b|\brack mount kit\b|\bdust cover\b|\bcarry bag\b|\bcarry tote\b|\bsoft tote\b|\bshoulder bag\b|\bbackpack for\b|\bcover for\b|\bisolation pads\b/.test(
      text
    )
  ) {
    return 'cables';
  }

  // Headphone amplifiers & studio headphones -> iem
  if (/\bheadphone amplifier\b|\bmonitoring headphones\b|\bprofessional headphones\b|\bearmix\b/.test(text)) {
    return 'iem';
  }

  // Wireless & wired microphones (and mic bundles / shock mounts)
  if (
    /\bmovemic\b|\bwireless mic\b|\bmicrophone\b|\bmicrohone\b|\bhandheld\b|\blavalier\b|\bheadset mic\b|\bcondenser mic\b|\bdynamic mic\b|\bshock mount\b|\bsm58\b|\bsm57\b|\bbeta\s*58|\bbeta\s*87|\bksm\d|\bslxd\d|\bqlxd\d|\bulxd\d|\baxient digital\b|\bew-d\b|\bew-dx\b/.test(
      text
    ) &&
    !/speaker|pa system|megavox|go getter|minivox|traveler|expedition|antenna|combiner|splitter|distro|psm/.test(
      text
    )
  ) {
    return 'mics';
  }

  // Truss, mounts & rigging hardware
  if (
    /\btruss\b|\brigging\b|\bflybar\b|\bfly frame\b|\byoke\b|\bwall mount\b|\bceiling mount\b|\bbeam clamp\b|\bcrank stand\b|\bmounting kit\b/.test(
      text
    )
  ) {
    return 'rigging';
  }

  // Mixers, digital consoles, audio interfaces, preamps, control surfaces & studio controllers
  if (
    /\bmixing console\b|\bdigital console\b|\bdigital mixer\b|\bdigital rackmount mixer\b|\banalog mixer\b|\bsoundboard\b|\blive mixer\b|\bcontrol surface\b|\baudio interface\b|\bmonitor controller\b|\bcontrol center\b|\bcentral station\b|\bchannel strip\b|\btube preamp\b|\bmidi\b|\bdaw\b/.test(
      text
    )
  ) {
    return 'consoles';
  }

  // Default to speakers for PA speakers, subs, line arrays, column arrays, studio monitors, portable PA
  return 'speakers';
}

function parseDollar(str: string): number | undefined {
  const m = str.match(/\$([\d,]+(?:\.\d{1,2})?)/);
  if (!m) return undefined;
  const val = Number.parseFloat(m[1].replace(/,/g, ''));
  return Number.isFinite(val) && val > 0 ? Math.round(val * 100) / 100 : undefined;
}

function parseBarePrice(str: string): number | undefined {
  const trimmed = str.trim();
  if (!/^[\d,]+\.\d{2}$/.test(trimmed)) return undefined;
  const val = Number.parseFloat(trimmed.replace(/,/g, ''));
  return Number.isFinite(val) && val > 0 ? Math.round(val * 100) / 100 : undefined;
}

function isAvailabilityLine(line: string): boolean {
  return /^(In Stock|Item usually available|More on Order|More On Order|Call our Sales Pros|We're Ordering More|Expect to receive|This item cannot be purchased online)/i.test(
    line
  );
}

function isPriceLine(line: string): boolean {
  return (
    /^(As Low As:\s*)?\$[\d,]+\.\d{2}$/i.test(line) ||
    /^Call for (price|info|details)!?$/i.test(line) ||
    /^This item cannot be purchased online$/i.test(line)
  );
}

function isNoiseLine(line: string): boolean {
  return (
    !line ||
    /^List View/i.test(line) ||
    /^Showing \d+/i.test(line) ||
    /^Page\b/i.test(line) ||
    /^1$/.test(line) ||
    /^Add to Cart$/i.test(line) ||
    /^View Options$/i.test(line) ||
    /^Download This Item/i.test(line) ||
    /^New$/i.test(line) ||
    /^\.\.\.$/.test(line)
  );
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

/**
 * Parses Full Compass copy-pasted catalog list text into structured product & vendor items.
 * Handles:
 *  - Standard 3-line header (Full Title / Brand+SKU / Description)
 *  - Dealer cost ("$548.03" or "As Low As: $4,038.58" or "Call for price!")
 *  - List Price ("List Price: $829.00")
 *  - Optional MAP line ("699.00") — falls back to List Price only if no MAP line is listed? Wait:
 *    When MAP is explicitly given on the line after List Price, use it as mapPrice.
 *    When no separate MAP line is given (e.g. non-MAP brands like RTS, Listen Tech, Look Solutions, ETC Ion 12K),
 *    use listPrice as the public catalog price (or leave undefined when "Call for price!").
 *  - Availability / wait time ("In Stock", "Item usually available to ship in 5-9 Business Days.", etc.)
 */
export function parseFullCompassList(
  rawText: string,
  targetCategory: FullCompassTargetCategory = 'auto'
): ParsedFullCompassItem[] {
  // Decode HTML entities and split concatenated "...List View" or "...Brand" markers cleanly
  const preprocessed = decodeHtmlEntities(rawText)
    .replace(/\.\.\.(?=[A-Z])/g, '\n')
    .replace(/List ViewShowing[^\n]*/g, '\n')
    .replace(/Showing \d+\s*-\s*\d+\s*of\s*[\d,]+Page[^\n]*/g, '\n');

  const lines = preprocessed
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim());

  const results: ParsedFullCompassItem[] = [];
  const seenKeys = new Set<string>();

  let i = 0;
  let pendingPreorder = false;

  while (i < lines.length) {
    const line = lines[i];

    if (/^Preorder$/i.test(line)) {
      pendingPreorder = true;
      i += 1;
      continue;
    }

    if (isNoiseLine(line)) {
      i += 1;
      continue;
    }

    // Look ahead for a price line within the next 1..4 lines
    let priceIdx = -1;
    for (let look = 1; look <= 4 && i + look < lines.length; look += 1) {
      if (isPriceLine(lines[i + look])) {
        priceIdx = i + look;
        break;
      }
      // Stop if we hit an availability or noise delimiter before a price
      if (isAvailabilityLine(lines[i + look]) || /^Add to Cart$/i.test(lines[i + look])) {
        break;
      }
    }

    if (priceIdx === -1) {
      i += 1;
      continue;
    }

    const headerLines = lines
      .slice(i, priceIdx)
      .filter((l) => !isNoiseLine(l) && !/^Preorder$/i.test(l));

    if (headerLines.length < 2) {
      // Truncated fragment (no SKU/brand header)
      i = priceIdx + 1;
      pendingPreorder = false;
      continue;
    }

    // In Full Compass list view:
    // headerLines[0] = "Brand Model Description..." (combined link text)
    // headerLines[1] = "Brand Model" (short SKU line)
    // headerLines[2] = "Description..." (clean description)
    let skuLine: string;
    let descLine: string;

    if (headerLines.length >= 3) {
      skuLine = headerLines[1];
      descLine = headerLines.slice(2).join(' ');
    } else {
      skuLine = headerLines[0];
      descLine = headerLines[1];
    }

    // Clean stray leading quotes from Full Compass copy
    descLine = descLine.replace(/^"+/, '').trim();

    const priceLine = lines[priceIdx];
    const dealerCost = parseDollar(priceLine);
    let listPrice: number | undefined;
    let mapPrice: number | undefined;
    let availLine = '';

    let cursor = priceIdx + 1;
    while (cursor < lines.length) {
      const next = lines[cursor];
      if (!next) {
        cursor += 1;
        continue;
      }
      if (/^List Price:/i.test(next)) {
        listPrice = parseDollar(next);
        cursor += 1;
        continue;
      }
      if (mapPrice === undefined && parseBarePrice(next) !== undefined) {
        mapPrice = parseBarePrice(next);
        cursor += 1;
        continue;
      }
      if (isAvailabilityLine(next)) {
        availLine = next;
        cursor += 1;
        // Consume trailing "1", "Add to Cart", "View Options"
        while (
          cursor < lines.length &&
          (/^1$/.test(lines[cursor]) ||
            /^Add to Cart$/i.test(lines[cursor]) ||
            /^View Options$/i.test(lines[cursor]) ||
            !lines[cursor])
        ) {
          cursor += 1;
        }
        break;
      }
      if (/^1$/.test(next) || /^Add to Cart$/i.test(next) || /^View Options$/i.test(next)) {
        cursor += 1;
        continue;
      }
      // Next product started
      break;
    }

    const { brand, itemNumber } = detectBrandAndModel(skuLine);
    const effectiveMap =
      mapPrice !== undefined
        ? mapPrice
        : listPrice !== undefined && dealerCost !== undefined
          ? listPrice
          : undefined;

    const { inStock, availability, leadTimeShort } = normalizeAvailability(
      availLine,
      pendingPreorder
    );
    pendingPreorder = false;

    const category =
      targetCategory !== 'auto'
        ? targetCategory
        : classifyFullCompassCategory(brand, itemNumber, descLine);

    // Build deduplication key: distinguish genuinely different variants (e.g., ETC Source 4WRD Color II Black vs Black/Edison vs Black/Stage Pin)
    const variantSuffix =
      /\(([^)]+)\)\s*$/.exec(descLine)?.[1] ||
      /\bw\/\s*([A-Za-z ]+)\s*$/i.exec(descLine)?.[1] ||
      '';
    const baseKey = itemNumber.toLowerCase().replace(/[^a-z0-9]+/g, '');
    let finalItemNumber = itemNumber;
    let dedupeKey = baseKey;

    // If same exact SKU appears with a different connector/variant (e.g. Black/Edison vs Black/Stage Pin), keep both with clear label
    if (seenKeys.has(dedupeKey) && variantSuffix) {
      const variantTag = variantSuffix.trim();
      const candidateKey = `${baseKey}-${variantTag.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
      if (!seenKeys.has(candidateKey)) {
        finalItemNumber = `${itemNumber} (${variantTag})`;
        dedupeKey = candidateKey;
      }
    }

    if (!seenKeys.has(dedupeKey) && finalItemNumber.length >= 3) {
      seenKeys.add(dedupeKey);
      results.push({
        itemNumber: finalItemNumber,
        brand,
        modelName: finalItemNumber,
        description: descLine || finalItemNumber,
        category,
        ...(dealerCost !== undefined ? { dealerCost } : {}),
        ...(listPrice !== undefined ? { listPrice } : {}),
        ...(effectiveMap !== undefined ? { mapPrice: effectiveMap } : {}),
        inStock,
        availability,
        leadTimeShort,
      });
    }

    i = cursor;
  }

  return results;
}

function isSweetwaterNoiseLine(line: string): boolean {
  return (
    !line ||
    /^\([\d,]+\)$/.test(line) ||
    /^\d+(\.\d+)?\s*(out of 5|stars?)/i.test(line) ||
    /^(Add to Cart|Add to Wish ?List|Compare|View Details|Learn More|Shop Now|Quick View|View Options|Free Shipping|Free Tech Support|Free 2-?Year Warranty|Certified Fit|Sweetwater Exclusive|New!?|Top Rated|Best Seller|On Sale|Special Financing|Bonus Financing|Financing Available|Demo Available|Save\b|Instant Savings|Bundle & Save|Price Drop)/i.test(
      line
    ) ||
    /^Or\s+\$[\d,]+(?:\.\d{2})?\s*\/\s*mo/i.test(line) ||
    /\$[\d,]+(?:\.\d{2})?\s*\/\s*(mo|month)/i.test(line) ||
    /^Demo\s*(Price|Unit|Available)?[:\s]*\$[\d,]/i.test(line) ||
    /^https?:\/\//i.test(line) ||
    /^Showing \d+/i.test(line) ||
    /^Page\s+\d+/i.test(line) ||
    /^Sort by/i.test(line) ||
    /^\d+$/.test(line)
  );
}

function isSweetwaterAvailabilityLine(line: string): boolean {
  return /^(In[- ]Stock!?|In[- ]Stock\b|More on the way|Arriving\b|Expected\b|Usually ships|Backorder|Pre-?Order|Out of Stock|Special Order|Ships in\b|Call (your )?Sales Engineer|Notify Me)/i.test(
    line
  );
}

function normalizeSweetwaterAvailability(rawLine: string): {
  inStock: boolean;
  availability: string;
  leadTimeShort: string;
} {
  const t = rawLine.replace(/\s+/g, ' ').trim();
  if (!t || /^In[- ]Stock!?$/i.test(t) || /^In[- ]Stock\b/i.test(t)) {
    return {
      inStock: true,
      availability: 'In Stock',
      leadTimeShort: 'In Stock',
    };
  }
  if (/Pre-?Order/i.test(t)) {
    return {
      inStock: false,
      availability: 'Preorder · Reserve Today',
      leadTimeShort: 'Preorder',
    };
  }
  const etaMatch = t.match(/((?:Arriving|Ships|Usually ships)[^.!]*)/i);
  if (etaMatch) {
    const clean = etaMatch[1].trim();
    return {
      inStock: false,
      availability: clean,
      leadTimeShort: clean.slice(0, 40),
    };
  }
  if (/More on the way|Backorder/i.test(t)) {
    return {
      inStock: false,
      availability: 'More on Order · Reserve Today',
      leadTimeShort: 'More on Order',
    };
  }
  if (/Special Order|Call/i.test(t)) {
    return {
      inStock: false,
      availability: 'Special Order · Call for ETA',
      leadTimeShort: 'Special Order',
    };
  }
  return {
    inStock: false,
    availability: t.slice(0, 80),
    leadTimeShort: t.slice(0, 40),
  };
}

function isSweetwaterPrimaryPriceLine(line: string): boolean {
  if (/\/\s*(mo|month)|save\b|demo\b|rebate\b|msrp\b|list price\b|retail\b/i.test(line)) {
    return false;
  }
  return (
    /^(Starting at\s+|From\s+|MAP[:\s]+|Price[:\s]+|Your Price[:\s]+|Cost[:\s]+|Dealer Cost[:\s]+)?\$[\d,]+(?:\.\d{2})?$/i.test(
      line
    ) || /^Call for price!?$/i.test(line)
  );
}

function extractInlinePriceFromLine(line: string): {
  cleanedText: string;
  prices: number[];
} {
  const prices: number[] = [];
  const cleaned = line
    .replace(/\$([\d,]+(?:\.\d{2})?)/g, (_m, num) => {
      const val = Number.parseFloat(String(num).replace(/,/g, ''));
      if (Number.isFinite(val) && val > 0) {
        prices.push(Math.round(val * 100) / 100);
      }
      return ' ';
    })
    .replace(/[\s\-–—|:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { cleanedText: cleaned, prices };
}

/**
 * Parses copy-pasted Sweetwater.com catalog listings, Sweetwater Pro quotes,
 * or tab/pipe-delimited spreadsheets into structured product + Supplier #1 records.
 *
 * Pricing rules:
 *  - Public Sweetwater page listings contain a single retail/MAP price -> stored as `mapPrice` (public) with `dealerCost` left undefined.
 *  - Sweetwater Pro quote or spreadsheet rows with explicit Cost + MAP (or two distinct non-MSRP prices where one is labeled Cost/Your Price)
 *    store the lower dealer cost privately in `dealerCost` (Supplier #1) and the public MAP in `mapPrice`.
 *  - Automatically ignores financing lines ("Or $38/month"), savings ("Save $100"), demo prices, review counts, and UI buttons.
 */
export function parseSweetwaterList(
  rawText: string,
  targetCategory: FullCompassTargetCategory = 'auto'
): ParsedFullCompassItem[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/\u00A0/g, ' ').trim());

  const results: ParsedFullCompassItem[] = [];
  const seenKeys = new Set<string>();

  const pushItem = (params: {
    skuLine: string;
    descLine: string;
    dealerCost?: number;
    listPrice?: number;
    mapPrice?: number;
    availLine: string;
  }) => {
    const cleanSku = params.skuLine.replace(/^"+|"+$/g, '').trim();
    if (cleanSku.length < 3) return;
    const { brand, itemNumber } = detectBrandAndModel(cleanSku);
    const descLine = (params.descLine || itemNumber).replace(/^"+|"+$/g, '').trim();
    const { inStock, availability, leadTimeShort } = normalizeSweetwaterAvailability(
      params.availLine
    );
    const category =
      targetCategory !== 'auto'
        ? targetCategory
        : classifyFullCompassCategory(brand, itemNumber, descLine);

    const dedupeKey = itemNumber.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (!dedupeKey || seenKeys.has(dedupeKey)) return;
    seenKeys.add(dedupeKey);

    results.push({
      itemNumber,
      brand,
      modelName: itemNumber,
      description: descLine,
      category,
      ...(params.dealerCost !== undefined ? { dealerCost: params.dealerCost } : {}),
      ...(params.listPrice !== undefined ? { listPrice: params.listPrice } : {}),
      ...(params.mapPrice !== undefined ? { mapPrice: params.mapPrice } : {}),
      inStock,
      availability,
      leadTimeShort,
    });
  };

  // Pass 1: Detect tab-delimited or pipe-delimited rows (Sweetwater Pro spreadsheets / quotes)
  const rawNonEmpty = lines.filter(Boolean);
  const delimitedRows = rawNonEmpty.filter((l) => l.includes('\t') || l.includes(' | '));
  if (delimitedRows.length > 0 && delimitedRows.length >= Math.ceil(rawNonEmpty.length * 0.5)) {
    for (const row of delimitedRows) {
      const cols = (row.includes('\t') ? row.split('\t') : row.split(/\s*\|\s*/))
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      if (cols.length < 2) continue;
      // Skip header row
      if (/^(sku|item|model|brand|product|part)/i.test(cols[0]) && /(price|map|cost|desc)/i.test(row)) {
        continue;
      }

      const textCols: string[] = [];
      let dealerCost: number | undefined;
      let listPrice: number | undefined;
      let mapPrice: number | undefined;
      let availLine = '';
      const unlabeledPrices: number[] = [];

      for (const col of cols) {
        if (isSweetwaterAvailabilityLine(col)) {
          availLine = col;
          continue;
        }
        if (/^(msrp|list)\b/i.test(col)) {
          const p = parseDollar(col) ?? parseBarePrice(col.replace(/[^0-9.,]/g, ''));
          if (p !== undefined) listPrice = p;
          continue;
        }
        if (/^(cost|your price|dealer|net|wholesale)\b/i.test(col)) {
          const p = parseDollar(col) ?? parseBarePrice(col.replace(/[^0-9.,]/g, ''));
          if (p !== undefined) dealerCost = p;
          continue;
        }
        if (/^(map|retail|street)\b/i.test(col)) {
          const p = parseDollar(col) ?? parseBarePrice(col.replace(/[^0-9.,]/g, ''));
          if (p !== undefined) mapPrice = p;
          continue;
        }
        const bareOrDollar =
          /^\$[\d,]+(?:\.\d{2})?$/.test(col)
            ? parseDollar(col)
            : parseBarePrice(col);
        if (bareOrDollar !== undefined) {
          unlabeledPrices.push(bareOrDollar);
          continue;
        }
        textCols.push(col);
      }

      if (unlabeledPrices.length === 1 && mapPrice === undefined && dealerCost === undefined) {
        mapPrice = unlabeledPrices[0];
      } else if (unlabeledPrices.length >= 2) {
        const sorted = [...unlabeledPrices].sort((a, b) => a - b);
        if (dealerCost === undefined) dealerCost = sorted[0];
        if (mapPrice === undefined) mapPrice = sorted[sorted.length - 1];
      }

      if (textCols.length === 0) continue;
      // Combine Brand + SKU if first column is a known standalone brand
      let skuLine = textCols[0];
      let descLine = textCols.slice(1).join(' — ');
      if (
        textCols.length >= 2 &&
        SORTED_BRANDS.some((b) => b.toLowerCase() === textCols[0].toLowerCase())
      ) {
        skuLine = `${textCols[0]} ${textCols[1]}`.trim();
        descLine = textCols.slice(2).join(' — ') || skuLine;
      }

      pushItem({ skuLine, descLine, dealerCost, listPrice, mapPrice, availLine });
    }
    if (results.length > 0) return results;
  }

  // Pass 2: Standard Sweetwater.com multi-line card paste OR single-line "Model - $Price" paste
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isSweetwaterNoiseLine(line)) {
      i += 1;
      continue;
    }

    // Check for single-line "Shure SM58-LC - $99.00 - In Stock" format
    if (
      /\$[\d,]+(?:\.\d{2})?/.test(line) &&
      !isSweetwaterPrimaryPriceLine(line) &&
      !/^(MSRP|List Price|Retail)/i.test(line)
    ) {
      const hasStockInline = /(In Stock|More on the way|Arriving[^$]*|Pre-?Order|Backorder)/i.exec(
        line
      );
      const availLine = hasStockInline ? hasStockInline[1] : '';
      const withoutAvail = hasStockInline ? line.replace(hasStockInline[0], ' ') : line;
      const { cleanedText, prices } = extractInlinePriceFromLine(withoutAvail);
      if (cleanedText.length >= 3 && prices.length > 0) {
        const sorted = [...prices].sort((a, b) => a - b);
        pushItem({
          skuLine: cleanedText,
          descLine: cleanedText,
          ...(sorted.length >= 2
            ? { dealerCost: sorted[0], mapPrice: sorted[sorted.length - 1] }
            : { mapPrice: sorted[0] }),
          availLine,
        });
        i += 1;
        continue;
      }
    }

    // Look ahead 1..5 lines for a Sweetwater price line
    let priceIdx = -1;
    for (let look = 1; look <= 5 && i + look < lines.length; look += 1) {
      const candidate = lines[i + look];
      if (isSweetwaterPrimaryPriceLine(candidate)) {
        priceIdx = i + look;
        break;
      }
      if (isSweetwaterAvailabilityLine(candidate) && look > 1) {
        break;
      }
    }

    if (priceIdx === -1) {
      i += 1;
      continue;
    }

    const headerLines = lines
      .slice(i, priceIdx)
      .filter((l) => !isSweetwaterNoiseLine(l) && !/^(MSRP|List Price|Retail)[:\s]/i.test(l));

    if (headerLines.length === 0) {
      i = priceIdx + 1;
      continue;
    }

    const skuLine = headerLines[0];
    const descLine = headerLines.length >= 2 ? headerLines.slice(1).join(' ') : headerLines[0];

    let dealerCost: number | undefined;
    let listPrice: number | undefined;
    let mapPrice: number | undefined;
    let availLine = '';

    // Inspect any MSRP line that appeared right before priceIdx
    for (let k = i; k < priceIdx; k += 1) {
      if (/^(MSRP|List Price)[:\s]/i.test(lines[k])) {
        listPrice = parseDollar(lines[k]);
      }
    }

    const firstPriceLine = lines[priceIdx];
    const firstVal = parseDollar(firstPriceLine);
    if (/^(Your Price|Cost|Dealer Cost)[:\s]/i.test(firstPriceLine)) {
      dealerCost = firstVal;
    } else if (firstVal !== undefined) {
      mapPrice = firstVal;
    }

    let cursor = priceIdx + 1;
    while (cursor < lines.length) {
      const next = lines[cursor];
      if (!next) {
        cursor += 1;
        continue;
      }
      if (/^(MSRP|List Price)[:\s]/i.test(next)) {
        listPrice = parseDollar(next);
        cursor += 1;
        continue;
      }
      if (/^(Your Price|Cost|Dealer Cost)[:\s]/i.test(next)) {
        dealerCost = parseDollar(next);
        cursor += 1;
        continue;
      }
      if (/^(MAP|Street|Retail)[:\s]/i.test(next)) {
        const v = parseDollar(next) ?? parseBarePrice(next.replace(/[^0-9.,]/g, ''));
        if (v !== undefined) mapPrice = v;
        cursor += 1;
        continue;
      }
      if (isSweetwaterAvailabilityLine(next)) {
        availLine = next;
        cursor += 1;
        // Consume trailing UI buttons/badges belonging to this card
        while (cursor < lines.length && isSweetwaterNoiseLine(lines[cursor])) {
          cursor += 1;
        }
        break;
      }
      if (isSweetwaterNoiseLine(next)) {
        cursor += 1;
        continue;
      }
      // Next product started
      break;
    }

    // If a Sweetwater Pro paste listed Your Price first and bare MAP right after
    if (dealerCost !== undefined && mapPrice === undefined && listPrice !== undefined) {
      mapPrice = listPrice;
    }

    pushItem({ skuLine, descLine, dealerCost, listPrice, mapPrice, availLine });
    i = cursor;
  }

  return results;
}

export function parseSupplierBulkList(
  rawText: string,
  source: BulkImportSupplierSource,
  targetCategory: FullCompassTargetCategory = 'auto'
): ParsedFullCompassItem[] {
  return source === 'sweetwater'
    ? parseSweetwaterList(rawText, targetCategory)
    : parseFullCompassList(rawText, targetCategory);
}

export function applyFullCompassCategoryOverrides(
  items: readonly ParsedFullCompassItem[],
  overrides: Readonly<Record<string, Exclude<GearCategory, 'all'>>>
): ParsedFullCompassItem[] {
  if (!overrides || Object.keys(overrides).length === 0) {
    return [...items];
  }
  return items.map((item) => {
    const nextCat = overrides[item.itemNumber];
    return nextCat && nextCat !== item.category ? { ...item, category: nextCat } : item;
  });
}

export function slugifyCatalogId(itemNumber: string): string {
  return (
    'map-' +
    itemNumber
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 110)
  );
}

export function buildVendorEntryFromSupplierImport(
  item: ParsedFullCompassItem,
  productId: string,
  source: BulkImportSupplierSource,
  quotedDate = '2026-11-22'
): VendorMasterEntry {
  const notesParts: string[] = [];
  if (typeof item.listPrice === 'number' && item.listPrice > 0) {
    notesParts.push(
      `List Price: $${item.listPrice.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    );
  }
  if (typeof item.mapPrice === 'number' && item.mapPrice > 0) {
    notesParts.push(
      `MAP: $${item.mapPrice.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    );
  }
  notesParts.push(`Availability: ${item.availability}`);
  const summaryNote = notesParts.join(' · ');

  const isSweetwater = source === 'sweetwater';
  const supplierLabel = isSweetwater ? 'Sweetwater Pro' : 'Full Compass';

  const quotes: VendorQuoteOption[] = [
    {
      id: `vq-sw-${productId}`,
      vendorName: 'Sweetwater Pro',
      repName: isSweetwater ? 'Sweetwater Sales Engineer' : '',
      email: isSweetwater ? 'sales@sweetwater.com' : '',
      phone: isSweetwater ? '(800) 222-4700' : '',
      unitCost: isSweetwater ? (item.dealerCost ?? 0) : 0,
      shippingCost: 0,
      leadTime: isSweetwater ? item.leadTimeShort : '',
      skuOrPartNo: isSweetwater ? item.itemNumber : '',
      notes: isSweetwater ? summaryNote : '',
      lastQuotedAt: quotedDate,
    },
    {
      id: `vq-fc-${productId}`,
      vendorName: 'Full Compass',
      repName: !isSweetwater ? 'Full Compass Pro Sales' : '',
      email: !isSweetwater ? 'sales@fullcompass.com' : '',
      phone: !isSweetwater ? '(800) 356-5844' : '',
      unitCost: !isSweetwater ? (item.dealerCost ?? 0) : 0,
      shippingCost: 0,
      leadTime: !isSweetwater ? item.leadTimeShort : '',
      skuOrPartNo: !isSweetwater ? item.itemNumber : '',
      notes: !isSweetwater ? summaryNote : '',
      lastQuotedAt: quotedDate,
    },
    {
      id: `vq-adi-${productId}`,
      vendorName: 'ADI / Distributor #3',
      repName: '',
      email: '',
      phone: '',
      unitCost: 0,
      shippingCost: 0,
      leadTime: '',
      skuOrPartNo: '',
      notes: '',
      lastQuotedAt: quotedDate,
    },
  ];

  return {
    id: `vm-${productId}`,
    productId,
    productName: item.itemNumber,
    itemNumber: item.itemNumber,
    brand: item.brand,
    ...(item.mapPrice !== undefined ? { mapPrice: item.mapPrice } : {}),
    preferredVendor: item.dealerCost && item.dealerCost > 0 ? supplierLabel : '',
    notes: `${supplierLabel} ${isSweetwater ? 'Supplier #1' : 'Supplier #2'} imported · ${summaryNote}`,
    quotes,
    updatedAt: `${quotedDate}T12:00:00.000Z`,
  };
}

export function buildVendorEntryFromFullCompass(
  item: ParsedFullCompassItem,
  productId: string,
  quotedDate = '2026-11-22'
): VendorMasterEntry {
  return buildVendorEntryFromSupplierImport(item, productId, 'fullcompass', quotedDate);
}

/**
 * Merges a newly imported supplier item into an existing VendorMasterEntry without
 * overwriting the other supplier slots (Slot 0 = Sweetwater Pro, Slot 1 = Full Compass, Slot 2 = ADI).
 */
export function mergeVendorEntryWithSupplierImport(
  existingVm: VendorMasterEntry | undefined,
  item: ParsedFullCompassItem,
  productId: string,
  source: BulkImportSupplierSource,
  quotedDate = '2026-11-22'
): VendorMasterEntry {
  const freshVm = buildVendorEntryFromSupplierImport(item, productId, source, quotedDate);
  if (!existingVm) {
    return freshVm;
  }

  const slotIndex = source === 'sweetwater' ? 0 : 1;
  const supplierTag = source === 'sweetwater' ? 'Sweetwater Pro' : 'Full Compass';

  const nextQuotes = [...existingVm.quotes];
  while (nextQuotes.length < 3) {
    nextQuotes.push(freshVm.quotes[nextQuotes.length]);
  }

  const existingSlot = nextQuotes[slotIndex];
  const incomingSlot = freshVm.quotes[slotIndex];
  nextQuotes[slotIndex] = {
    ...existingSlot,
    ...incomingSlot,
    id: existingSlot?.id || incomingSlot.id,
    unitCost:
      incomingSlot.unitCost > 0
        ? incomingSlot.unitCost
        : existingSlot?.unitCost ?? 0,
  };

  // Pick the lowest priced supplier across all slots when costs are present
  const pricedQuotes = nextQuotes
    .filter((q) => q.vendorName.trim() && q.unitCost > 0)
    .sort((a, b) => a.unitCost + a.shippingCost - (b.unitCost + b.shippingCost));
  const preferredVendor =
    pricedQuotes[0]?.vendorName || existingVm.preferredVendor || freshVm.preferredVendor;

  const existingSegments = (existingVm.notes || '')
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s && !s.includes(supplierTag));
  const mergedNotes = [...existingSegments, freshVm.notes].join(' | ');

  return {
    ...existingVm,
    productId,
    ...(item.mapPrice !== undefined ? { mapPrice: item.mapPrice } : {}),
    preferredVendor,
    notes: mergedNotes,
    quotes: nextQuotes,
    updatedAt: `${quotedDate}T12:00:00.000Z`,
  };
}

export function buildGearProductFromFullCompass(
  item: ParsedFullCompassItem,
  imageUrl: string,
  productId?: string
): GearProduct {
  const id = productId || slugifyCatalogId(item.itemNumber);
  const hasMap = typeof item.mapPrice === 'number' && item.mapPrice > 0;
  const specMap: Record<string, string> = {
    consoles: 'Mixing & DJ Console',
    lighting: 'Stage Lighting & DMX',
    rigging: 'Truss, Beam & Ceiling Rigging',
    cables: 'Stageboxes, XLR & Power',
    cases: 'Cases & Rackmount',
    mics: 'Wireless & Wired Mics',
    iem: 'In-Ear Monitoring',
    combiners: 'RF Antennas & Combiners',
    speakers: 'Pro Sound Reinforcement',
  };

  return {
    id,
    itemNumber: item.itemNumber,
    name: item.itemNumber,
    brand: item.brand,
    category: item.category,
    ...(hasMap ? { mapPrice: item.mapPrice } : {}),
    priceLabel: hasMap
      ? `$${item.mapPrice!.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} MAP`
      : 'Best Price Quote',
    priceNote: hasMap
      ? `${item.availability} · Authorized Dealer MAP`
      : `${item.availability} · Call for Dealer Quote`,
    descriptionEn: item.description,
    descriptionEs: item.description,
    specs: [
      item.brand,
      specMap[item.category] || getCatalogCategoryLabel(item.category),
      item.leadTimeShort,
    ],
    imageUrl,
    inStock: item.inStock,
    availability: item.availability,
  };
}
