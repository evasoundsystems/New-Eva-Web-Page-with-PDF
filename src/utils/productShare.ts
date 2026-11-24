import type { BrandConfig, GearProduct, Language } from '../types/site';
import { formatUsd } from './siteLogic';

export interface ProductSharePayload {
  title: string;
  text: string;
  url: string;
  copyText: string;
  smsHref: string;
  whatsappHref: string;
  emailHref: string;
}

const DEFAULT_PUBLIC_ORIGIN = 'https://www.evasoundsystems.com/';

function normalizeBaseUrl(originAndPath?: string): string {
  const raw = (originAndPath || '').trim();
  if (!raw) {
    return DEFAULT_PUBLIC_ORIGIN;
  }
  try {
    const parsed = new URL(raw);
    return `${parsed.origin}${parsed.pathname || '/'}`;
  } catch {
    const withoutHash = raw.split('#')[0] || '';
    const withoutQuery = withoutHash.split('?')[0] || '';
    return withoutQuery || DEFAULT_PUBLIC_ORIGIN;
  }
}

export function buildProductShareUrl(
  product: Pick<GearProduct, 'id' | 'itemNumber' | 'name'>,
  originAndPath?: string
): string {
  const base = normalizeBaseUrl(originAndPath);
  const identifier = (product.id || product.itemNumber || product.name || '').trim();
  if (!identifier) {
    return `${base}#gear`;
  }
  return `${base}?product=${encodeURIComponent(identifier)}#gear`;
}

export function buildProductSharePayload(
  product: Pick<GearProduct, 'id' | 'itemNumber' | 'name' | 'brand' | 'mapPrice' | 'priceLabel'>,
  brand: Pick<BrandConfig, 'name' | 'phoneDisplay'>,
  lang: Language = 'en',
  originAndPath?: string
): ProductSharePayload {
  const model = (product.itemNumber || product.name || '').trim();
  const displayName =
    product.brand && !model.toLowerCase().startsWith(product.brand.trim().toLowerCase())
      ? `${product.brand.trim()} ${model}`.trim()
      : model;
  const hasMap = typeof product.mapPrice === 'number' && Number.isFinite(product.mapPrice) && product.mapPrice > 0;
  const priceText = hasMap
    ? `${formatUsd(product.mapPrice!)} MAP`
    : lang === 'en'
      ? 'Call for Best Price'
      : 'Llame para Mejor Precio';

  const url = buildProductShareUrl(product, originAndPath);
  const title = `${displayName} — ${brand.name}`;
  const text =
    lang === 'en'
      ? `Check out the ${displayName} (${priceText}) at ${brand.name}. Call ${brand.phoneDisplay} for best price:`
      : `Mira el ${displayName} (${priceText}) en ${brand.name}. Llama al ${brand.phoneDisplay} para mejor precio:`;
  const copyText = `${text}\n${url}`;

  return {
    title,
    text,
    url,
    copyText,
    smsHref: `sms:?&body=${encodeURIComponent(`${text} ${url}`)}`,
    whatsappHref: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
    emailHref: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
  };
}

export function parseSharedProductParam(search: string): string | null {
  if (!search) return null;
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const value = (params.get('product') || params.get('sku') || '').trim();
  return value.length > 0 ? value : null;
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function findProductByShareParam(
  products: readonly GearProduct[],
  param: string | null | undefined
): GearProduct | null {
  const trimmed = (param || '').trim();
  if (!trimmed) return null;

  const exactId = products.find((p) => p.id === trimmed);
  if (exactId) return exactId;

  const lower = trimmed.toLowerCase();
  const ciMatch = products.find(
    (p) =>
      p.id.toLowerCase() === lower ||
      (p.itemNumber || '').trim().toLowerCase() === lower ||
      p.name.trim().toLowerCase() === lower
  );
  if (ciMatch) return ciMatch;

  const normalized = normalizeLookupKey(trimmed);
  if (!normalized) return null;

  return (
    products.find(
      (p) =>
        normalizeLookupKey(p.id) === normalized ||
        normalizeLookupKey(p.itemNumber || '') === normalized ||
        normalizeLookupKey(p.name) === normalized
    ) || null
  );
}

export function stripSharedProductParamFromUrl(currentHref: string): string | null {
  try {
    const parsed = new URL(currentHref);
    if (!parsed.searchParams.has('product') && !parsed.searchParams.has('sku')) {
      return null;
    }
    parsed.searchParams.delete('product');
    parsed.searchParams.delete('sku');
    const remainingSearch = parsed.searchParams.toString();
    return `${parsed.pathname}${remainingSearch ? `?${remainingSearch}` : ''}${parsed.hash}`;
  } catch {
    return null;
  }
}
