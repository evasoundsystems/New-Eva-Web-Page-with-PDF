import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { DEFAULT_SITE_CONTENT } from '../data/defaultContent';
import type {
  CustomerAccount,
  CustomerOrderRecord,
  CustomerOrderStatus,
  CustomerPricingTier,
  EstimateLineItem,
  GearProduct,
  OrderLineSourcing,
  QuoteRecord,
  QuoteStatus,
  QuoteSubmissionInput,
  QuoteUpdateInput,
  SiteContent,
  VendorCallLogEntry,
  VendorMasterEntry,
  VendorQuoteOption,
} from '../types/site';
import {
  generateRefCode,
  mergeHeroConfig,
  mergeMemberPricing,
  mergePageCopy,
  promoteGearCatalogSection,
  reconcileProductsWithDefaults,
  reconcileServicesWithDefaults,
} from '../utils/siteLogic';
import {
  OperationType,
  auth,
  db,
  handleFirestoreError,
  isFirebaseAdminUser,
  signInCustomerWithGoogle,
  signOutFirebase,
} from './firebase';

const LOCAL_CONTENT_KEY = 'eva_site_content_v6';
const LOCAL_QUOTES_KEY = 'eva_quotes_v1';
const LOCAL_VENDOR_MASTER_KEY = 'eva_vendor_master_v1';
const LOCAL_CUSTOMER_ORDERS_KEY = 'eva_customer_orders_v1';
const LOCAL_CUSTOMERS_KEY = 'eva_customer_accounts_v1';
const LOCAL_CUSTOMER_SESSION_KEY = 'eva_customer_session_v1';
const LOCAL_PASSCODE_KEY = 'eva_admin_passcode_session';

// Cache serialized Firestore product snapshots so saving a copy change doesn't rewrite 350+ docs unnecessarily
let lastSyncedFirestoreProducts: Map<string, string> | null = null;

export function getStoredAdminPasscode(): string {
  try {
    return sessionStorage.getItem(LOCAL_PASSCODE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredAdminPasscode(passcode: string): void {
  try {
    if (passcode) {
      sessionStorage.setItem(LOCAL_PASSCODE_KEY, passcode);
    } else {
      sessionStorage.removeItem(LOCAL_PASSCODE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function canUseExpressApi(): boolean {
  if (typeof window === 'undefined') return false;
  return !/\.github\.io$/i.test(window.location.hostname);
}

export async function verifyAdminPasscode(passcode: string): Promise<boolean> {
  if (canUseExpressApi()) {
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        const data = (await res.json()) as { authenticated?: boolean };
        return Boolean(data.authenticated);
      }
      if (res.status === 401) {
        return false;
      }
    } catch {
      // Fallback for static hosting
    }
  }
  return passcode.trim() === '21232123';
}

function sanitizeId(raw: string, fallbackPrefix: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 120);
  return cleaned || `${fallbackPrefix}-${Date.now()}`;
}

function buildProductSignature(product: GearProduct, sortOrder: number): string {
  return JSON.stringify({
    id: sanitizeId(product.id, 'gear'),
    itemNumber: product.itemNumber?.trim().slice(0, 80) || '',
    name: product.name.trim().slice(0, 160),
    brand: (product.brand.trim() || 'Pro Audio').slice(0, 100),
    category: product.category,
    mapPrice:
      typeof product.mapPrice === 'number' && Number.isFinite(product.mapPrice) && product.mapPrice >= 0
        ? Math.round(product.mapPrice * 100) / 100
        : null,
    priceLabel: (product.priceLabel.trim() || 'Best Price Quote').slice(0, 80),
    priceNote: product.priceNote.trim().slice(0, 140),
    descriptionEn: product.descriptionEn.trim().slice(0, 1200),
    descriptionEs: product.descriptionEs.trim().slice(0, 1200),
    specs: product.specs.slice(0, 12).map((s) => String(s).slice(0, 80)),
    imageUrl: (product.imageUrl || 'asset:console').slice(0, 350000),
    inStock: Boolean(product.inStock),
    sortOrder,
  });
}

function sanitizeProductForFirestore(product: GearProduct, sortOrder: number) {
  return {
    id: sanitizeId(product.id, 'gear'),
    ...(product.itemNumber ? { itemNumber: product.itemNumber.trim().slice(0, 80) } : {}),
    name: product.name.trim().slice(0, 160),
    brand: (product.brand.trim() || 'Pro Audio').slice(0, 100),
    category: product.category,
    ...(typeof product.mapPrice === 'number' && Number.isFinite(product.mapPrice) && product.mapPrice >= 0
      ? { mapPrice: Math.round(product.mapPrice * 100) / 100 }
      : {}),
    priceLabel: (product.priceLabel.trim() || 'Best Price Quote').slice(0, 80),
    priceNote: product.priceNote.trim().slice(0, 140),
    descriptionEn: product.descriptionEn.trim().slice(0, 1200),
    descriptionEs: product.descriptionEs.trim().slice(0, 1200),
    specs: product.specs.slice(0, 12).map((s) => String(s).slice(0, 80)),
    imageUrl: (product.imageUrl || 'asset:console').slice(0, 350000),
    inStock: Boolean(product.inStock),
    sortOrder,
    updatedAt: serverTimestamp(),
  };
}

function hydrateSiteContent(
  raw: Partial<SiteContent> | null | undefined,
  productsOverride?: GearProduct[] | null
): SiteContent {
  const finalProducts = reconcileProductsWithDefaults(
    productsOverride ?? raw?.products,
    DEFAULT_SITE_CONTENT.products
  );
  return {
    ...DEFAULT_SITE_CONTENT,
    ...(raw?.brand ? { brand: { ...DEFAULT_SITE_CONTENT.brand, ...raw.brand } } : {}),
    hero: mergeHeroConfig(raw?.hero),
    pageCopy: mergePageCopy(raw?.pageCopy),
    memberPricing: mergeMemberPricing(raw?.memberPricing),
    sectionOrder: promoteGearCatalogSection(raw?.sectionOrder),
    ...(Array.isArray(raw?.hiddenSections)
      ? { hiddenSections: raw.hiddenSections }
      : {}),
    ...(Array.isArray(raw?.services) && raw.services.length > 0
      ? { services: reconcileServicesWithDefaults(raw.services, DEFAULT_SITE_CONTENT.services) }
      : {}),
    ...(raw?.pricing ? { pricing: { ...DEFAULT_SITE_CONTENT.pricing, ...raw.pricing } } : {}),
    ...(Array.isArray(raw?.testimonials) && raw.testimonials.length > 0
      ? { testimonials: raw.testimonials }
      : {}),
    products: finalProducts,
  };
}

export async function loadSiteContent(): Promise<SiteContent> {
  let firestoreContent: Partial<SiteContent> | null = null;
  let firestoreProducts: GearProduct[] | null = null;
  let firestoreSavedAtMs = 0;

  try {
    const siteSnap = await getDoc(doc(db, 'site_content', 'main'));
    if (siteSnap.exists()) {
      const data = siteSnap.data() as Record<string, unknown>;
      firestoreContent = data as Partial<SiteContent>;
      const ts = data.updatedAt;
      if (ts instanceof Timestamp) {
        firestoreSavedAtMs = ts.toMillis();
      }
    }
  } catch (err) {
    console.warn('Firestore site_content read fallback:', err);
  }

  try {
    const prodSnap = await getDocs(
      query(collection(db, 'products'), orderBy('sortOrder', 'asc'))
    );
    if (!prodSnap.empty) {
      const cache = new Map<string, string>();
      firestoreProducts = prodSnap.docs.map((d, idx) => {
        const data = d.data();
        const item: GearProduct = {
          id: String(data.id || d.id),
          ...(typeof data.itemNumber === 'string' && data.itemNumber ? { itemNumber: data.itemNumber } : {}),
          name: String(data.name || ''),
          brand: String(data.brand || ''),
          category: (data.category || 'consoles') as GearProduct['category'],
          ...(typeof data.mapPrice === 'number' ? { mapPrice: data.mapPrice } : {}),
          priceLabel: String(data.priceLabel || 'Best Price Quote'),
          priceNote: String(data.priceNote || ''),
          descriptionEn: String(data.descriptionEn || ''),
          descriptionEs: String(data.descriptionEs || ''),
          specs: Array.isArray(data.specs) ? data.specs.map(String) : [],
          imageUrl: String(data.imageUrl || 'asset:console'),
          inStock: Boolean(data.inStock ?? true),
        };
        cache.set(sanitizeId(item.id, 'gear'), buildProductSignature(item, typeof data.sortOrder === 'number' ? data.sortOrder : idx));
        return item;
      });
      lastSyncedFirestoreProducts = cache;
    }
  } catch (err) {
    console.warn('Firestore products read fallback:', err);
  }

  let expressContent: (Partial<SiteContent> & { _savedAtMs?: number }) | null = null;
  let expressSavedAtMs = 0;

  if (canUseExpressApi()) {
    try {
      const res = await fetch('/api/content');
      if (res.ok) {
        const data = (await res.json()) as {
          content?: (Partial<SiteContent> & { _savedAtMs?: number }) | null;
        };
        if (data.content) {
          expressContent = data.content;
          expressSavedAtMs =
            typeof data.content._savedAtMs === 'number' ? data.content._savedAtMs : 1;
        }
      }
    } catch {
      // Static hosting fallback
    }
  }

  // Prefer Express content if it was explicitly saved more recently than Firestore (e.g. local passcode session)
  if (expressContent && (!firestoreContent || expressSavedAtMs > firestoreSavedAtMs)) {
    const merged = hydrateSiteContent(expressContent);
    try {
      localStorage.setItem(LOCAL_CONTENT_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }
    return merged;
  }

  if (firestoreContent || firestoreProducts) {
    const merged = hydrateSiteContent(firestoreContent, firestoreProducts);
    try {
      localStorage.setItem(LOCAL_CONTENT_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }
    return merged;
  }

  try {
    const raw = localStorage.getItem(LOCAL_CONTENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SiteContent>;
      return hydrateSiteContent(parsed);
    }
  } catch {
    // ignore
  }

  return hydrateSiteContent(DEFAULT_SITE_CONTENT);
}

export interface SaveSiteContentResult {
  savedToFirebase: boolean;
  savedToServer: boolean;
  savedLocally: boolean;
  error?: string;
}

export async function saveSiteContent(
  content: SiteContent,
  passcode: string
): Promise<SaveSiteContentResult> {
  const normalizedContent: SiteContent = {
    ...content,
    hero: mergeHeroConfig(content.hero),
    pageCopy: mergePageCopy(content.pageCopy),
    memberPricing: mergeMemberPricing(content.memberPricing),
  };

  let savedLocally = false;
  try {
    localStorage.setItem(LOCAL_CONTENT_KEY, JSON.stringify(normalizedContent));
    savedLocally = true;
  } catch {
    // ignore quota errors
  }

  let savedToFirebase = false;
  let savedToServer = false;
  const errors: string[] = [];

  if (isFirebaseAdminUser(auth.currentUser)) {
    try {
      // 1. Write site_content/main atomically as a single doc (never blocked by product batch size)
      await setDoc(doc(db, 'site_content', 'main'), {
        brand: normalizedContent.brand,
        hero: normalizedContent.hero,
        pageCopy: normalizedContent.pageCopy,
        memberPricing: normalizedContent.memberPricing,
        sectionOrder: normalizedContent.sectionOrder.slice(0, 10),
        hiddenSections: normalizedContent.hiddenSections.slice(0, 10),
        services: normalizedContent.services.slice(0, 20),
        pricing: normalizedContent.pricing,
        testimonials: normalizedContent.testimonials.slice(0, 30),
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'admin',
      });

      // 2. Diff products against cached/existing Firestore state & chunk into <= 350 ops per batch
      let knownMap = lastSyncedFirestoreProducts;
      if (!knownMap) {
        knownMap = new Map<string, string>();
        const existingSnap = await getDocs(collection(db, 'products'));
        existingSnap.docs.forEach((docSnap) => {
          knownMap!.set(docSnap.id, '__existing__');
        });
      }

      const nextMap = new Map<string, string>();
      const ops: Array<
        | { type: 'set'; id: string; payload: ReturnType<typeof sanitizeProductForFirestore> }
        | { type: 'delete'; id: string }
      > = [];

      normalizedContent.products.forEach((product, idx) => {
        const cleanId = sanitizeId(product.id, 'gear');
        const sig = buildProductSignature({ ...product, id: cleanId }, idx);
        nextMap.set(cleanId, sig);
        if (knownMap!.get(cleanId) !== sig) {
          ops.push({
            type: 'set',
            id: cleanId,
            payload: sanitizeProductForFirestore({ ...product, id: cleanId }, idx),
          });
        }
      });

      for (const oldId of knownMap.keys()) {
        if (!nextMap.has(oldId)) {
          ops.push({ type: 'delete', id: oldId });
        }
      }

      const CHUNK_SIZE = 350;
      for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
        const batch = writeBatch(db);
        const chunk = ops.slice(i, i + CHUNK_SIZE);
        for (const op of chunk) {
          const ref = doc(db, 'products', op.id);
          if (op.type === 'delete') {
            batch.delete(ref);
          } else {
            batch.set(ref, op.payload);
          }
        }
        await batch.commit();
      }

      lastSyncedFirestoreProducts = nextMap;
      savedToFirebase = true;
    } catch (error) {
      console.error('Firestore saveSiteContent error:', error);
      errors.push(
        error instanceof Error
          ? `Firestore sync failed: ${error.message}`
          : 'Firestore sync failed.'
      );
    }
  }

  if (passcode && canUseExpressApi()) {
    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passcode': passcode,
        },
        body: JSON.stringify({
          content: {
            ...normalizedContent,
            _savedAtMs: Date.now(),
          },
        }),
      });
      if (res.ok) {
        savedToServer = true;
      } else {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        errors.push(errBody.error || `Server returned status ${res.status}`);
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Server save failed.');
    }
  }

  return {
    savedToFirebase,
    savedToServer,
    savedLocally,
    ...(errors.length > 0 ? { error: errors.join(' | ') } : {}),
  };
}

export async function submitQuote(input: QuoteSubmissionInput): Promise<QuoteRecord> {
  const refCode = generateRefCode();
  const docId = `quote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const sanitizedForFirestore = {
    refCode,
    createdAt: serverTimestamp(),
    status: 'new' as const,
    organization: input.organization.trim().slice(0, 160),
    contactName: input.contactName.trim().slice(0, 120),
    phone: input.phone.trim().slice(0, 40),
    email: input.email.trim().slice(0, 160),
    serviceRequested: input.serviceRequested.trim().slice(0, 320),
    soundboardModel: input.soundboardModel.trim().slice(0, 120),
    roomCapacity: input.roomCapacity.trim().slice(0, 80),
    timeline: input.timeline.trim().slice(0, 120),
    notes: input.notes.trim().slice(0, 5000),
    engineerNotes: '',
  };

  let savedToFirestore = false;
  try {
    await setDoc(doc(db, 'quotes', docId), sanitizedForFirestore);
    savedToFirestore = true;
  } catch (error) {
    console.warn('Firestore quote write fallback:', error);
  }

  if (canUseExpressApi()) {
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, refCode }),
      });
      if (res.ok) {
        const data = (await res.json()) as { quote: QuoteRecord };
        return data.quote;
      }
    } catch {
      // Static hosting fallback
    }
  }

  const record: QuoteRecord = {
    id: docId,
    refCode,
    createdAt: new Date().toISOString(),
    status: 'new',
    organization: sanitizedForFirestore.organization,
    contactName: sanitizedForFirestore.contactName,
    phone: sanitizedForFirestore.phone,
    email: sanitizedForFirestore.email,
    serviceRequested: sanitizedForFirestore.serviceRequested,
    soundboardModel: sanitizedForFirestore.soundboardModel,
    roomCapacity: sanitizedForFirestore.roomCapacity,
    timeline: sanitizedForFirestore.timeline,
    notes: sanitizedForFirestore.notes,
    engineerNotes: '',
  };

  if (!savedToFirestore) {
    try {
      const existingRaw = localStorage.getItem(LOCAL_QUOTES_KEY);
      const existing = existingRaw ? (JSON.parse(existingRaw) as QuoteRecord[]) : [];
      localStorage.setItem(LOCAL_QUOTES_KEY, JSON.stringify([record, ...existing]));
    } catch {
      // ignore
    }
  }

  return record;
}

function sanitizeEstimateItems(items: readonly EstimateLineItem[] | undefined): EstimateLineItem[] {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 40).map((item, idx) => ({
    id: String(item.id || `item-${idx}-${Date.now()}`).slice(0, 80),
    ...(item.productId ? { productId: String(item.productId).slice(0, 120) } : {}),
    itemNumber: String(item.itemNumber || 'Item').trim().slice(0, 80),
    brand: String(item.brand || '').trim().slice(0, 80),
    description: String(item.description || '').trim().slice(0, 400),
    qty: Math.max(1, Math.min(999, Math.round(Number(item.qty) || 1))),
    unitPrice: Math.max(0, Math.round((Number(item.unitPrice) || 0) * 100) / 100),
  }));
}

function sanitizeEstimateUpdate(updates: QuoteUpdateInput): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  if (updates.status) clean.status = updates.status;
  if (updates.organization !== undefined) clean.organization = updates.organization.trim().slice(0, 160);
  if (updates.contactName !== undefined) {
    const trimmed = updates.contactName.trim().slice(0, 120);
    if (trimmed) clean.contactName = trimmed;
  }
  if (updates.phone !== undefined) {
    const trimmed = updates.phone.trim().slice(0, 40);
    if (trimmed.length >= 7) clean.phone = trimmed;
  }
  if (updates.email !== undefined) clean.email = updates.email.trim().slice(0, 160);
  if (updates.serviceRequested !== undefined) {
    const trimmed = updates.serviceRequested.trim().slice(0, 320);
    if (trimmed) clean.serviceRequested = trimmed;
  }
  if (updates.soundboardModel !== undefined) clean.soundboardModel = updates.soundboardModel.trim().slice(0, 120);
  if (updates.roomCapacity !== undefined) clean.roomCapacity = updates.roomCapacity.trim().slice(0, 80);
  if (updates.timeline !== undefined) clean.timeline = updates.timeline.trim().slice(0, 120);
  if (updates.notes !== undefined) clean.notes = updates.notes.trim().slice(0, 5000);
  if (updates.engineerNotes !== undefined) clean.engineerNotes = updates.engineerNotes.slice(0, 2000);
  if (updates.estimateItems !== undefined) clean.estimateItems = sanitizeEstimateItems(updates.estimateItems);
  if (typeof updates.discount === 'number' && Number.isFinite(updates.discount)) {
    clean.discount = Math.max(0, Math.min(1000000, Math.round(updates.discount * 100) / 100));
  }
  if (typeof updates.shippingFee === 'number' && Number.isFinite(updates.shippingFee)) {
    clean.shippingFee = Math.max(0, Math.min(100000, Math.round(updates.shippingFee * 100) / 100));
  }
  if (typeof updates.taxRate === 'number' && Number.isFinite(updates.taxRate)) {
    clean.taxRate = Math.max(0, Math.min(30, Math.round(updates.taxRate * 100) / 100));
  }
  if (updates.coverLetter !== undefined) clean.coverLetter = updates.coverLetter.slice(0, 8000);
  if (updates.estimateUpdatedAt !== undefined) clean.estimateUpdatedAt = updates.estimateUpdatedAt.slice(0, 64);
  return clean;
}

function mapFirestoreQuoteDoc(id: string, data: Record<string, unknown>): QuoteRecord {
  const createdVal = data.createdAt;
  const createdAt =
    createdVal instanceof Timestamp
      ? createdVal.toDate().toISOString()
      : typeof createdVal === 'string'
        ? createdVal
        : new Date().toISOString();

  return {
    id,
    refCode: String(data.refCode || 'EVA-000000'),
    createdAt,
    status: (data.status as QuoteStatus) || 'new',
    organization: String(data.organization || ''),
    contactName: String(data.contactName || ''),
    phone: String(data.phone || ''),
    email: String(data.email || ''),
    serviceRequested: String(data.serviceRequested || ''),
    soundboardModel: String(data.soundboardModel || ''),
    roomCapacity: String(data.roomCapacity || ''),
    timeline: String(data.timeline || ''),
    notes: String(data.notes || ''),
    engineerNotes: String(data.engineerNotes || ''),
    ...(Array.isArray(data.estimateItems)
      ? { estimateItems: sanitizeEstimateItems(data.estimateItems as EstimateLineItem[]) }
      : {}),
    ...(typeof data.discount === 'number' ? { discount: data.discount } : {}),
    ...(typeof data.shippingFee === 'number' ? { shippingFee: data.shippingFee } : {}),
    ...(typeof data.taxRate === 'number' ? { taxRate: data.taxRate } : {}),
    ...(typeof data.coverLetter === 'string' ? { coverLetter: data.coverLetter } : {}),
    ...(typeof data.estimateUpdatedAt === 'string'
      ? { estimateUpdatedAt: data.estimateUpdatedAt }
      : {}),
  };
}

export function subscribeAdminQuotes(
  onUpdate: (quotes: QuoteRecord[]) => void
): Unsubscribe | null {
  if (!isFirebaseAdminUser(auth.currentUser)) {
    return null;
  }

  const q = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => mapFirestoreQuoteDoc(d.id, d.data()));
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'quotes');
    }
  );
}

export async function fetchQuotes(passcode: string): Promise<QuoteRecord[]> {
  if (isFirebaseAdminUser(auth.currentUser)) {
    try {
      const snap = await getDocs(
        query(collection(db, 'quotes'), orderBy('createdAt', 'desc'))
      );
      return snap.docs.map((d) => mapFirestoreQuoteDoc(d.id, d.data()));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'quotes');
    }
  }

  if (canUseExpressApi()) {
    try {
      const res = await fetch('/api/quotes', {
        headers: { 'x-admin-passcode': passcode },
      });
      if (res.ok) {
        const data = (await res.json()) as { quotes: QuoteRecord[] };
        return data.quotes;
      }
    } catch {
      // Static hosting fallback
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_QUOTES_KEY);
    return raw ? (JSON.parse(raw) as QuoteRecord[]) : [];
  } catch {
    return [];
  }
}

export async function createAdminEstimate(
  input: QuoteSubmissionInput & QuoteUpdateInput,
  passcode: string
): Promise<QuoteRecord> {
  const refCode = generateRefCode();
  const docId = `quote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const nowIso = new Date().toISOString();
  const sanitizedExtras = sanitizeEstimateUpdate({
    ...input,
    estimateUpdatedAt: input.estimateUpdatedAt || nowIso,
  });

  const baseFields = {
    refCode,
    status: (input.status || 'new') as QuoteStatus,
    organization: input.organization.trim().slice(0, 160),
    contactName: (input.contactName.trim() || 'Valued Client').slice(0, 120),
    phone: (input.phone.trim() || '414-554-4388').slice(0, 40),
    email: input.email.trim().slice(0, 160),
    serviceRequested: (input.serviceRequested.trim() || 'Custom Estimate').slice(0, 320),
    soundboardModel: input.soundboardModel.trim().slice(0, 120),
    roomCapacity: input.roomCapacity.trim().slice(0, 80),
    timeline: input.timeline.trim().slice(0, 120),
    notes: input.notes.trim().slice(0, 5000),
    engineerNotes: (input.engineerNotes || '').slice(0, 2000),
    ...sanitizedExtras,
  };

  if (isFirebaseAdminUser(auth.currentUser)) {
    try {
      await setDoc(doc(db, 'quotes', docId), {
        ...baseFields,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `quotes/${docId}`);
    }
  }

  if (passcode && canUseExpressApi()) {
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passcode': passcode,
        },
        body: JSON.stringify({ ...baseFields, id: docId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { quote: QuoteRecord };
        return data.quote;
      }
    } catch {
      // Static hosting fallback
    }
  }

  const record: QuoteRecord = {
    id: docId,
    createdAt: nowIso,
    ...baseFields,
  };

  try {
    const raw = localStorage.getItem(LOCAL_QUOTES_KEY);
    const list = raw ? (JSON.parse(raw) as QuoteRecord[]) : [];
    localStorage.setItem(LOCAL_QUOTES_KEY, JSON.stringify([record, ...list]));
  } catch {
    // ignore
  }

  return record;
}

export async function updateQuote(
  id: string,
  updates: QuoteUpdateInput,
  passcode: string
): Promise<QuoteRecord | null> {
  const cleanUpdates = sanitizeEstimateUpdate({
    ...updates,
    estimateUpdatedAt: updates.estimateUpdatedAt || new Date().toISOString(),
  });

  if (isFirebaseAdminUser(auth.currentUser)) {
    try {
      await updateDoc(doc(db, 'quotes', id), cleanUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `quotes/${id}`);
    }
  }

  if (passcode && canUseExpressApi()) {
    try {
      const res = await fetch(`/api/quotes/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passcode': passcode,
        },
        body: JSON.stringify(cleanUpdates),
      });
      if (res.ok) {
        const data = (await res.json()) as { quote: QuoteRecord };
        return data.quote;
      }
    } catch {
      // Static hosting fallback
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_QUOTES_KEY);
    const list = raw ? (JSON.parse(raw) as QuoteRecord[]) : [];
    let updatedItem: QuoteRecord | null = null;
    const next = list.map((q) => {
      if (q.id !== id) return q;
      updatedItem = { ...q, ...(cleanUpdates as Partial<QuoteRecord>) };
      return updatedItem;
    });
    localStorage.setItem(LOCAL_QUOTES_KEY, JSON.stringify(next));
    return updatedItem;
  } catch {
    return null;
  }
}

export async function deleteQuoteRecord(id: string, passcode: string): Promise<void> {
  if (isFirebaseAdminUser(auth.currentUser)) {
    try {
      await deleteDoc(doc(db, 'quotes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `quotes/${id}`);
    }
  }

  if (passcode && canUseExpressApi()) {
    try {
      await fetch(`/api/quotes/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-passcode': passcode },
      });
    } catch {
      // ignore
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_QUOTES_KEY);
    const list = raw ? (JSON.parse(raw) as QuoteRecord[]) : [];
    localStorage.setItem(LOCAL_QUOTES_KEY, JSON.stringify(list.filter((q) => q.id !== id)));
  } catch {
    // ignore
  }
}

export function compressImageFileToDataUrl(file: File, maxDimension = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function sanitizeVendorQuotes(quotes: readonly VendorQuoteOption[] | undefined): VendorQuoteOption[] {
  if (!Array.isArray(quotes)) return [];
  return quotes.slice(0, 8).map((q, idx) => ({
    id: sanitizeId(String(q.id || `vq-${idx}-${Date.now()}`), 'vq'),
    vendorName: String(q.vendorName || '').trim().slice(0, 120),
    repName: String(q.repName || '').trim().slice(0, 120),
    email: String(q.email || '').trim().slice(0, 160),
    phone: String(q.phone || '').trim().slice(0, 40),
    unitCost: Math.max(0, Math.round((Number(q.unitCost) || 0) * 100) / 100),
    shippingCost: Math.max(0, Math.round((Number(q.shippingCost) || 0) * 100) / 100),
    leadTime: String(q.leadTime || '').trim().slice(0, 80),
    skuOrPartNo: String(q.skuOrPartNo || '').trim().slice(0, 80),
    notes: String(q.notes || '').trim().slice(0, 400),
    lastQuotedAt: String(q.lastQuotedAt || new Date().toISOString().slice(0, 10)).slice(0, 32),
  }));
}

function mapVendorMasterDoc(id: string, data: Record<string, unknown>): VendorMasterEntry {
  const updatedVal = data.updatedAt;
  const updatedAt =
    updatedVal instanceof Timestamp
      ? updatedVal.toDate().toISOString()
      : typeof updatedVal === 'string'
        ? updatedVal
        : new Date().toISOString();

  return {
    id,
    ...(typeof data.productId === 'string' && data.productId ? { productId: data.productId } : {}),
    productName: String(data.productName || ''),
    itemNumber: String(data.itemNumber || ''),
    brand: String(data.brand || ''),
    ...(typeof data.mapPrice === 'number' ? { mapPrice: data.mapPrice } : {}),
    preferredVendor: String(data.preferredVendor || ''),
    notes: String(data.notes || ''),
    quotes: sanitizeVendorQuotes(data.quotes as VendorQuoteOption[]),
    updatedAt,
  };
}

export function subscribeVendorMaster(
  onUpdate: (entries: VendorMasterEntry[]) => void
): Unsubscribe | null {
  if (!isFirebaseAdminUser(auth.currentUser)) {
    return null;
  }
  const q = query(collection(db, 'vendor_master'), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      onUpdate(snapshot.docs.map((d) => mapVendorMasterDoc(d.id, d.data())));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'vendor_master');
    }
  );
}

export async function fetchVendorMaster(passcode: string): Promise<VendorMasterEntry[]> {
  if (isFirebaseAdminUser(auth.currentUser)) {
    try {
      const snap = await getDocs(
        query(collection(db, 'vendor_master'), orderBy('updatedAt', 'desc'))
      );
      return snap.docs.map((d) => mapVendorMasterDoc(d.id, d.data()));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'vendor_master');
    }
  }

  if (passcode && canUseExpressApi()) {
    try {
      const res = await fetch('/api/admin/vendor-master', {
        headers: { 'x-admin-passcode': passcode },
      });
      if (res.ok) {
        const data = (await res.json()) as { entries: VendorMasterEntry[] };
        if (Array.isArray(data.entries)) {
          try {
            localStorage.setItem(LOCAL_VENDOR_MASTER_KEY, JSON.stringify(data.entries));
          } catch {
            // ignore
          }
          return data.entries;
        }
      }
    } catch {
      // Static fallback
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_VENDOR_MASTER_KEY);
    return raw ? (JSON.parse(raw) as VendorMasterEntry[]) : [];
  } catch {
    return [];
  }
}

export async function saveVendorMasterEntry(
  entry: VendorMasterEntry,
  passcode: string
): Promise<VendorMasterEntry> {
  const cleanId = sanitizeId(entry.id || `vm-${Date.now()}`, 'vm');
  const nowIso = new Date().toISOString();
  const normalized: VendorMasterEntry = {
    id: cleanId,
    ...(entry.productId ? { productId: entry.productId.slice(0, 128) } : {}),
    productName: (entry.productName.trim() || 'Unnamed Product').slice(0, 180),
    itemNumber: entry.itemNumber.trim().slice(0, 80),
    brand: entry.brand.trim().slice(0, 100),
    ...(typeof entry.mapPrice === 'number' && Number.isFinite(entry.mapPrice) && entry.mapPrice >= 0
      ? { mapPrice: Math.round(entry.mapPrice * 100) / 100 }
      : {}),
    preferredVendor: entry.preferredVendor.trim().slice(0, 120),
    notes: entry.notes.trim().slice(0, 2000),
    quotes: sanitizeVendorQuotes(entry.quotes),
    updatedAt: nowIso,
  };

  if (isFirebaseAdminUser(auth.currentUser)) {
    try {
      await setDoc(doc(db, 'vendor_master', cleanId), {
        id: normalized.id,
        ...(normalized.productId ? { productId: normalized.productId } : {}),
        productName: normalized.productName,
        itemNumber: normalized.itemNumber,
        brand: normalized.brand,
        ...(normalized.mapPrice !== undefined ? { mapPrice: normalized.mapPrice } : {}),
        preferredVendor: normalized.preferredVendor,
        notes: normalized.notes,
        quotes: normalized.quotes,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `vendor_master/${cleanId}`);
    }
  }

  if (passcode && canUseExpressApi()) {
    try {
      const res = await fetch(`/api/admin/vendor-master/${encodeURIComponent(cleanId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passcode': passcode,
        },
        body: JSON.stringify({ entry: normalized }),
      });
      if (res.ok) {
        const data = (await res.json()) as { entry: VendorMasterEntry };
        if (data.entry) {
          try {
            const raw = localStorage.getItem(LOCAL_VENDOR_MASTER_KEY);
            const list = raw ? (JSON.parse(raw) as VendorMasterEntry[]) : [];
            const next = [data.entry, ...list.filter((e) => e.id !== cleanId)];
            localStorage.setItem(LOCAL_VENDOR_MASTER_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return data.entry;
        }
      }
    } catch {
      // Static fallback
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_VENDOR_MASTER_KEY);
    const list = raw ? (JSON.parse(raw) as VendorMasterEntry[]) : [];
    const next = [normalized, ...list.filter((e) => e.id !== cleanId)];
    localStorage.setItem(LOCAL_VENDOR_MASTER_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }

  return normalized;
}

export async function deleteVendorMasterEntry(id: string, passcode: string): Promise<void> {
  const cleanId = sanitizeId(id, 'vm');
  if (isFirebaseAdminUser(auth.currentUser)) {
    try {
      await deleteDoc(doc(db, 'vendor_master', cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `vendor_master/${cleanId}`);
    }
  }

  if (passcode && canUseExpressApi()) {
    try {
      await fetch(`/api/admin/vendor-master/${encodeURIComponent(cleanId)}`, {
        method: 'DELETE',
        headers: { 'x-admin-passcode': passcode },
      });
    } catch {
      // ignore
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_VENDOR_MASTER_KEY);
    const list = raw ? (JSON.parse(raw) as VendorMasterEntry[]) : [];
    localStorage.setItem(LOCAL_VENDOR_MASTER_KEY, JSON.stringify(list.filter((e) => e.id !== cleanId)));
  } catch {
    // ignore
  }
}

function sanitizeOrderLines(lines: readonly OrderLineSourcing[] | undefined): OrderLineSourcing[] {
  if (!Array.isArray(lines)) return [];
  return lines.slice(0, 60).map((line, idx) => ({
    id: sanitizeId(String(line.id || `line-${idx}-${Date.now()}`), 'line'),
    ...(line.productId ? { productId: String(line.productId).slice(0, 128) } : {}),
    productName: String(line.productName || 'Equipment Item').trim().slice(0, 180),
    itemNumber: String(line.itemNumber || '').trim().slice(0, 80),
    qty: Math.max(1, Math.min(999, Math.round(Number(line.qty) || 1))),
    chosenVendor: String(line.chosenVendor || '').trim().slice(0, 120),
    contactedRepName: String(line.contactedRepName || '').trim().slice(0, 120),
    vendorPhone: String(line.vendorPhone || '').trim().slice(0, 40),
    vendorEmail: String(line.vendorEmail || '').trim().slice(0, 160),
    contactMethod: (line.contactMethod || 'phone') as OrderLineSourcing['contactMethod'],
    contactedDate: String(line.contactedDate || '').trim().slice(0, 32),
    vendorQuoteRef: String(line.vendorQuoteRef || '').trim().slice(0, 80),
    quotedUnitCost: Math.max(0, Math.round((Number(line.quotedUnitCost) || 0) * 100) / 100),
    shippingCost: Math.max(0, Math.round((Number(line.shippingCost) || 0) * 100) / 100),
    lineStatus: (line.lineStatus || 'need_to_call') as OrderLineSourcing['lineStatus'],
    lineNotes: String(line.lineNotes || '').trim().slice(0, 600),
  }));
}

function sanitizeCallLogs(logs: readonly VendorCallLogEntry[] | undefined): VendorCallLogEntry[] {
  if (!Array.isArray(logs)) return [];
  return logs.slice(0, 60).map((log, idx) => ({
    id: sanitizeId(String(log.id || `call-${idx}-${Date.now()}`), 'call'),
    vendorName: String(log.vendorName || '').trim().slice(0, 120),
    repName: String(log.repName || '').trim().slice(0, 120),
    phone: String(log.phone || '').trim().slice(0, 40),
    email: String(log.email || '').trim().slice(0, 160),
    method: (log.method || 'phone') as VendorCallLogEntry['method'],
    contactedAt: String(log.contactedAt || '').trim().slice(0, 32),
    quoteNumber: String(log.quoteNumber || '').trim().slice(0, 80),
    quotedTotal: Math.max(0, Math.round((Number(log.quotedTotal) || 0) * 100) / 100),
    notes: String(log.notes || '').trim().slice(0, 600),
  }));
}

function mapCustomerOrderDoc(id: string, data: Record<string, unknown>): CustomerOrderRecord {
  const createdVal = data.createdAt;
  const updatedVal = data.updatedAt;
  const createdAt =
    createdVal instanceof Timestamp
      ? createdVal.toDate().toISOString()
      : typeof createdVal === 'string'
        ? createdVal
        : new Date().toISOString();
  const updatedAt =
    updatedVal instanceof Timestamp
      ? updatedVal.toDate().toISOString()
      : typeof updatedVal === 'string'
        ? updatedVal
        : createdAt;

  return {
    id,
    orderCode: String(data.orderCode || 'ORD-000000'),
    ...(typeof data.linkedQuoteRef === 'string' && data.linkedQuoteRef
      ? { linkedQuoteRef: data.linkedQuoteRef }
      : {}),
    customerName: String(data.customerName || ''),
    organization: String(data.organization || ''),
    customerPhone: String(data.customerPhone || ''),
    customerEmail: String(data.customerEmail || ''),
    status: (data.status as CustomerOrderStatus) || 'sourcing',
    ...(typeof data.customerQuotedTotal === 'number'
      ? { customerQuotedTotal: data.customerQuotedTotal }
      : {}),
    targetDate: String(data.targetDate || ''),
    generalNotes: String(data.generalNotes || ''),
    items: sanitizeOrderLines(data.items as OrderLineSourcing[]),
    callLogs: sanitizeCallLogs(data.callLogs as VendorCallLogEntry[]),
    createdAt,
    updatedAt,
  };
}

export function subscribeCustomerOrders(
  onUpdate: (orders: CustomerOrderRecord[]) => void
): Unsubscribe | null {
  if (!isFirebaseAdminUser(auth.currentUser)) {
    return null;
  }
  const q = query(collection(db, 'customer_orders'), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      onUpdate(snapshot.docs.map((d) => mapCustomerOrderDoc(d.id, d.data())));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'customer_orders');
    }
  );
}

export async function fetchCustomerOrders(passcode: string): Promise<CustomerOrderRecord[]> {
  if (isFirebaseAdminUser(auth.currentUser)) {
    try {
      const snap = await getDocs(
        query(collection(db, 'customer_orders'), orderBy('updatedAt', 'desc'))
      );
      return snap.docs.map((d) => mapCustomerOrderDoc(d.id, d.data()));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'customer_orders');
    }
  }

  if (passcode && canUseExpressApi()) {
    try {
      const res = await fetch('/api/admin/customer-orders', {
        headers: { 'x-admin-passcode': passcode },
      });
      if (res.ok) {
        const data = (await res.json()) as { orders: CustomerOrderRecord[] };
        if (Array.isArray(data.orders)) {
          try {
            localStorage.setItem(LOCAL_CUSTOMER_ORDERS_KEY, JSON.stringify(data.orders));
          } catch {
            // ignore
          }
          return data.orders;
        }
      }
    } catch {
      // Static fallback
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_CUSTOMER_ORDERS_KEY);
    return raw ? (JSON.parse(raw) as CustomerOrderRecord[]) : [];
  } catch {
    return [];
  }
}

export async function saveCustomerOrder(
  order: CustomerOrderRecord,
  passcode: string,
  isExistingInFirestore = false
): Promise<CustomerOrderRecord> {
  const cleanId = sanitizeId(order.id || `ord-${Date.now()}`, 'ord');
  const nowIso = new Date().toISOString();
  const normalized: CustomerOrderRecord = {
    id: cleanId,
    orderCode: (order.orderCode.trim() || `ORD-${Date.now().toString().slice(-6)}`).slice(0, 32),
    ...(order.linkedQuoteRef?.trim()
      ? { linkedQuoteRef: order.linkedQuoteRef.trim().slice(0, 32) }
      : {}),
    customerName: (order.customerName.trim() || 'Customer Order').slice(0, 140),
    organization: order.organization.trim().slice(0, 160),
    customerPhone: order.customerPhone.trim().slice(0, 40),
    customerEmail: order.customerEmail.trim().slice(0, 160),
    status: order.status || 'sourcing',
    ...(typeof order.customerQuotedTotal === 'number' &&
    Number.isFinite(order.customerQuotedTotal) &&
    order.customerQuotedTotal >= 0
      ? { customerQuotedTotal: Math.round(order.customerQuotedTotal * 100) / 100 }
      : {}),
    targetDate: order.targetDate.trim().slice(0, 64),
    generalNotes: order.generalNotes.trim().slice(0, 4000),
    items: sanitizeOrderLines(order.items),
    callLogs: sanitizeCallLogs(order.callLogs),
    createdAt: order.createdAt || nowIso,
    updatedAt: nowIso,
  };

  if (isFirebaseAdminUser(auth.currentUser)) {
    try {
      const ref = doc(db, 'customer_orders', cleanId);
      const baseFirestore = {
        id: normalized.id,
        orderCode: normalized.orderCode,
        ...(normalized.linkedQuoteRef ? { linkedQuoteRef: normalized.linkedQuoteRef } : {}),
        customerName: normalized.customerName,
        organization: normalized.organization,
        customerPhone: normalized.customerPhone,
        customerEmail: normalized.customerEmail,
        status: normalized.status,
        ...(normalized.customerQuotedTotal !== undefined
          ? { customerQuotedTotal: normalized.customerQuotedTotal }
          : {}),
        targetDate: normalized.targetDate,
        generalNotes: normalized.generalNotes,
        items: normalized.items,
        callLogs: normalized.callLogs,
        updatedAt: serverTimestamp(),
      };
      if (isExistingInFirestore) {
        await updateDoc(ref, baseFirestore);
      } else {
        await setDoc(ref, {
          ...baseFirestore,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `customer_orders/${cleanId}`);
    }
  }

  if (passcode && canUseExpressApi()) {
    try {
      const res = await fetch(`/api/admin/customer-orders/${encodeURIComponent(cleanId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passcode': passcode,
        },
        body: JSON.stringify({ order: normalized }),
      });
      if (res.ok) {
        const data = (await res.json()) as { order: CustomerOrderRecord };
        if (data.order) {
          try {
            const raw = localStorage.getItem(LOCAL_CUSTOMER_ORDERS_KEY);
            const list = raw ? (JSON.parse(raw) as CustomerOrderRecord[]) : [];
            const next = [data.order, ...list.filter((o) => o.id !== cleanId)];
            localStorage.setItem(LOCAL_CUSTOMER_ORDERS_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return data.order;
        }
      }
    } catch {
      // Static fallback
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_CUSTOMER_ORDERS_KEY);
    const list = raw ? (JSON.parse(raw) as CustomerOrderRecord[]) : [];
    const next = [normalized, ...list.filter((o) => o.id !== cleanId)];
    localStorage.setItem(LOCAL_CUSTOMER_ORDERS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }

  return normalized;
}

export async function deleteCustomerOrder(id: string, passcode: string): Promise<void> {
  const cleanId = sanitizeId(id, 'ord');
  if (isFirebaseAdminUser(auth.currentUser)) {
    try {
      await deleteDoc(doc(db, 'customer_orders', cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customer_orders/${cleanId}`);
    }
  }

  if (passcode && canUseExpressApi()) {
    try {
      await fetch(`/api/admin/customer-orders/${encodeURIComponent(cleanId)}`, {
        method: 'DELETE',
        headers: { 'x-admin-passcode': passcode },
      });
    } catch {
      // ignore
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_CUSTOMER_ORDERS_KEY);
    const list = raw ? (JSON.parse(raw) as CustomerOrderRecord[]) : [];
    localStorage.setItem(LOCAL_CUSTOMER_ORDERS_KEY, JSON.stringify(list.filter((o) => o.id !== cleanId)));
  } catch {
    // ignore
  }
}

// =========================================================================
// CUSTOMER VIP LOGIN, REGISTRATION & ADMIN CUSTOMER DIRECTORY
// =========================================================================

type StoredLocalCustomer = CustomerAccount & { passwordHash?: string };

export async function hashCustomerPassword(password: string): Promise<string> {
  const input = `eva-vip-salt:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const encoded = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // fall through to deterministic hash
    }
  }
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

function stripPasswordHash(rec: StoredLocalCustomer): CustomerAccount {
  const { passwordHash: _ignored, ...safe } = rec;
  return safe;
}

export function getStoredCustomerSession(): CustomerAccount | null {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOMER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomerAccount;
    return parsed && parsed.email ? parsed : null;
  } catch {
    return null;
  }
}

export function setStoredCustomerSession(customer: CustomerAccount | null): void {
  try {
    if (customer) {
      localStorage.setItem(LOCAL_CUSTOMER_SESSION_KEY, JSON.stringify(customer));
    } else {
      localStorage.removeItem(LOCAL_CUSTOMER_SESSION_KEY);
    }
  } catch {
    // ignore
  }
}

function upsertLocalCustomerList(rec: StoredLocalCustomer) {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOMERS_KEY);
    const list = raw ? (JSON.parse(raw) as StoredLocalCustomer[]) : [];
    const next = [rec, ...list.filter((c) => c.id !== rec.id)];
    localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function mapFirestoreCustomerDoc(id: string, data: Record<string, unknown>): CustomerAccount {
  const createdVal = data.createdAt;
  const lastLoginVal = data.lastLoginAt;
  const createdAt =
    createdVal instanceof Timestamp
      ? createdVal.toDate().toISOString()
      : typeof createdVal === 'string'
        ? createdVal
        : new Date().toISOString();
  const lastLoginAt =
    lastLoginVal instanceof Timestamp
      ? lastLoginVal.toDate().toISOString()
      : typeof lastLoginVal === 'string'
        ? lastLoginVal
        : createdAt;

  return {
    id,
    ...(typeof data.uid === 'string' && data.uid ? { uid: data.uid } : {}),
    authProvider: data.authProvider === 'google' ? 'google' : 'email',
    fullName: String(data.fullName || ''),
    organization: String(data.organization || ''),
    phone: String(data.phone || ''),
    email: String(data.email || ''),
    status: (data.status as CustomerAccount['status']) || 'active',
    pricingTier: (data.pricingTier as CustomerPricingTier) || 'vip',
    ...(typeof data.customDiscountPercent === 'number'
      ? { customDiscountPercent: data.customDiscountPercent }
      : {}),
    notes: String(data.notes || ''),
    createdAt,
    lastLoginAt,
    loginCount: Math.max(0, Number(data.loginCount) || 1),
  };
}

export async function registerCustomerWithEmail(input: {
  fullName: string;
  organization: string;
  phone: string;
  email: string;
  password: string;
}): Promise<CustomerAccount> {
  const fullName = input.fullName.trim().slice(0, 140);
  const organization = input.organization.trim().slice(0, 160);
  const phone = input.phone.trim().slice(0, 40);
  const email = input.email.trim().toLowerCase().slice(0, 160);

  if (!fullName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Full name and a valid email address are required.');
  }
  if (!input.password || input.password.length < 4) {
    throw new Error('Please choose a password with at least 4 characters.');
  }

  const passwordHash = await hashCustomerPassword(input.password);

  if (canUseExpressApi()) {
    const res = await fetch('/api/customers/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authProvider: 'email',
        fullName,
        organization,
        phone,
        email,
        passwordHash,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      customer?: CustomerAccount;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error || 'Unable to register customer account.');
    }
    if (data.customer) {
      upsertLocalCustomerList({ ...data.customer, passwordHash });
      setStoredCustomerSession(data.customer);
      return data.customer;
    }
  }

  // Static-host fallback
  const nowIso = new Date().toISOString();
  const raw = localStorage.getItem(LOCAL_CUSTOMERS_KEY);
  const list = raw ? (JSON.parse(raw) as StoredLocalCustomer[]) : [];
  const existing = list.find((c) => c.email.toLowerCase() === email);
  if (existing) {
    if (existing.passwordHash && existing.passwordHash !== passwordHash) {
      throw new Error('An account with this email already exists. Please sign in.');
    }
    const updated: StoredLocalCustomer = {
      ...existing,
      fullName: fullName || existing.fullName,
      organization: organization || existing.organization,
      phone: phone || existing.phone,
      passwordHash,
      lastLoginAt: nowIso,
      loginCount: (existing.loginCount || 0) + 1,
    };
    upsertLocalCustomerList(updated);
    const safe = stripPasswordHash(updated);
    setStoredCustomerSession(safe);
    return safe;
  }

  const created: StoredLocalCustomer = {
    id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    authProvider: 'email',
    fullName,
    organization,
    phone,
    email,
    passwordHash,
    status: 'active',
    pricingTier: 'vip',
    notes: '',
    createdAt: nowIso,
    lastLoginAt: nowIso,
    loginCount: 1,
  };
  upsertLocalCustomerList(created);
  const safe = stripPasswordHash(created);
  setStoredCustomerSession(safe);
  return safe;
}

export async function loginCustomerWithEmail(input: {
  email: string;
  password: string;
}): Promise<CustomerAccount> {
  const email = input.email.trim().toLowerCase().slice(0, 160);
  if (!email || !input.password) {
    throw new Error('Email and password are required.');
  }
  const passwordHash = await hashCustomerPassword(input.password);

  if (canUseExpressApi()) {
    const res = await fetch('/api/customers/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authProvider: 'email',
        email,
        passwordHash,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      customer?: CustomerAccount;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error || 'Invalid email or password.');
    }
    if (data.customer) {
      upsertLocalCustomerList({ ...data.customer, passwordHash });
      setStoredCustomerSession(data.customer);
      return data.customer;
    }
  }

  const raw = localStorage.getItem(LOCAL_CUSTOMERS_KEY);
  const list = raw ? (JSON.parse(raw) as StoredLocalCustomer[]) : [];
  const existing = list.find((c) => c.email.toLowerCase() === email);
  if (!existing) {
    throw new Error('No customer account found with that email. Please create an account first.');
  }
  if (!existing.passwordHash || existing.passwordHash !== passwordHash) {
    throw new Error('Incorrect password for this customer account.');
  }
  const updated: StoredLocalCustomer = {
    ...existing,
    lastLoginAt: new Date().toISOString(),
    loginCount: (existing.loginCount || 0) + 1,
  };
  upsertLocalCustomerList(updated);
  const safe = stripPasswordHash(updated);
  setStoredCustomerSession(safe);
  return safe;
}

export async function loginOrRegisterGoogleCustomer(details?: {
  organization?: string;
  phone?: string;
}): Promise<CustomerAccount> {
  const user = await signInCustomerWithGoogle();
  const email = (user.email || '').trim().toLowerCase().slice(0, 160);
  if (!email) {
    throw new Error('Google account does not have a valid email address.');
  }
  const fullName = (user.displayName || email.split('@')[0] || 'VIP Customer').trim().slice(0, 140);
  const organization = (details?.organization || '').trim().slice(0, 160);
  const phone = (details?.phone || user.phoneNumber || '').trim().slice(0, 40);
  const uid = sanitizeId(user.uid, 'cust');
  const nowIso = new Date().toISOString();

  let syncedCustomer: CustomerAccount | null = null;

  if (user.emailVerified) {
    try {
      const ref = doc(db, 'customer_accounts', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const existingData = snap.data() as Record<string, unknown>;
        const nextOrg = organization || String(existingData.organization || '');
        const nextPhone = phone || String(existingData.phone || '');
        const nextCount = Math.max(0, Number(existingData.loginCount) || 0) + 1;
        await updateDoc(ref, {
          fullName: fullName || String(existingData.fullName || ''),
          organization: nextOrg,
          phone: nextPhone,
          email,
          lastLoginAt: serverTimestamp(),
          loginCount: nextCount,
        });
        syncedCustomer = {
          ...mapFirestoreCustomerDoc(uid, existingData),
          fullName: fullName || String(existingData.fullName || ''),
          organization: nextOrg,
          phone: nextPhone,
          email,
          lastLoginAt: nowIso,
          loginCount: nextCount,
        };
      } else {
        await setDoc(ref, {
          id: uid,
          uid,
          authProvider: 'google',
          fullName,
          organization,
          phone,
          email,
          status: 'active',
          pricingTier: 'vip',
          notes: '',
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          loginCount: 1,
        });
        syncedCustomer = {
          id: uid,
          uid,
          authProvider: 'google',
          fullName,
          organization,
          phone,
          email,
          status: 'active',
          pricingTier: 'vip',
          notes: '',
          createdAt: nowIso,
          lastLoginAt: nowIso,
          loginCount: 1,
        };
      }
    } catch (err) {
      console.warn('Firestore customer_accounts Google sync fallback:', err);
    }
  }

  if (canUseExpressApi()) {
    try {
      const res = await fetch('/api/customers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authProvider: 'google',
          uid,
          fullName,
          organization,
          phone,
          email,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { customer?: CustomerAccount };
        if (data.customer && !syncedCustomer) {
          syncedCustomer = data.customer;
        }
      }
    } catch {
      // ignore Express fallback error when static
    }
  }

  const finalCustomer: CustomerAccount = syncedCustomer || {
    id: uid,
    uid,
    authProvider: 'google',
    fullName,
    organization,
    phone,
    email,
    status: 'active',
    pricingTier: 'vip',
    notes: '',
    createdAt: nowIso,
    lastLoginAt: nowIso,
    loginCount: 1,
  };

  upsertLocalCustomerList(finalCustomer);
  setStoredCustomerSession(finalCustomer);
  return finalCustomer;
}

export async function signOutCustomer(): Promise<void> {
  setStoredCustomerSession(null);
  if (auth.currentUser && !isFirebaseAdminUser(auth.currentUser)) {
    try {
      await signOutFirebase();
    } catch {
      // ignore sign-out error
    }
  }
}

export function subscribeCustomerAccounts(
  onUpdate: (customers: CustomerAccount[]) => void
): Unsubscribe | null {
  if (!isFirebaseAdminUser(auth.currentUser)) {
    return null;
  }
  const q = query(collection(db, 'customer_accounts'), orderBy('lastLoginAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      onUpdate(snapshot.docs.map((d) => mapFirestoreCustomerDoc(d.id, d.data())));
    },
    (error) => {
      console.warn('Firestore customer_accounts listener warning:', error);
    }
  );
}

export async function fetchCustomerAccounts(passcode: string): Promise<CustomerAccount[]> {
  const mergedMap = new Map<string, CustomerAccount>();

  if (isFirebaseAdminUser(auth.currentUser)) {
    try {
      const snap = await getDocs(
        query(collection(db, 'customer_accounts'), orderBy('lastLoginAt', 'desc'))
      );
      snap.docs.forEach((d) => {
        const mapped = mapFirestoreCustomerDoc(d.id, d.data());
        mergedMap.set(mapped.id, mapped);
      });
    } catch (error) {
      console.warn('Firestore fetchCustomerAccounts fallback:', error);
    }
  }

  if (passcode && canUseExpressApi()) {
    try {
      const res = await fetch('/api/customers', {
        headers: { 'x-admin-passcode': passcode },
      });
      if (res.ok) {
        const data = (await res.json()) as { customers?: CustomerAccount[] };
        if (Array.isArray(data.customers)) {
          for (const c of data.customers) {
            if (!mergedMap.has(c.id)) {
              mergedMap.set(c.id, c);
            }
          }
        }
      }
    } catch {
      // Static fallback
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_CUSTOMERS_KEY);
    if (raw) {
      const localList = JSON.parse(raw) as StoredLocalCustomer[];
      for (const c of localList) {
        const clean = stripPasswordHash(c);
        if (!mergedMap.has(clean.id)) {
          mergedMap.set(clean.id, clean);
        }
      }
    }
  } catch {
    // ignore
  }

  return Array.from(mergedMap.values()).sort((a, b) =>
    (b.lastLoginAt || '').localeCompare(a.lastLoginAt || '')
  );
}

export async function saveCustomerAccountAdmin(
  customer: CustomerAccount,
  passcode: string,
  isExistingInFirestore = false
): Promise<CustomerAccount> {
  const cleanId = sanitizeId(customer.id || `cust-${Date.now()}`, 'cust');
  const nowIso = new Date().toISOString();
  const normalized: CustomerAccount = {
    id: cleanId,
    ...(customer.uid ? { uid: customer.uid.slice(0, 128) } : {}),
    authProvider: customer.authProvider === 'google' ? 'google' : 'email',
    fullName: (customer.fullName.trim() || 'VIP Customer').slice(0, 140),
    organization: customer.organization.trim().slice(0, 160),
    phone: customer.phone.trim().slice(0, 40),
    email: customer.email.trim().toLowerCase().slice(0, 160),
    status: customer.status || 'active',
    pricingTier: customer.pricingTier || 'vip',
    ...(typeof customer.customDiscountPercent === 'number' &&
    Number.isFinite(customer.customDiscountPercent) &&
    customer.customDiscountPercent >= 0 &&
    customer.customDiscountPercent <= 90
      ? { customDiscountPercent: Math.round(customer.customDiscountPercent * 100) / 100 }
      : {}),
    notes: customer.notes.trim().slice(0, 2000),
    createdAt: customer.createdAt || nowIso,
    lastLoginAt: customer.lastLoginAt || nowIso,
    loginCount: Math.max(0, Math.round(Number(customer.loginCount) || 1)),
  };

  if (isFirebaseAdminUser(auth.currentUser)) {
    try {
      const ref = doc(db, 'customer_accounts', cleanId);
      const firestorePayload: Record<string, unknown> = {
        id: normalized.id,
        ...(normalized.uid ? { uid: normalized.uid } : {}),
        authProvider: normalized.authProvider,
        fullName: normalized.fullName,
        organization: normalized.organization,
        phone: normalized.phone,
        email: normalized.email,
        status: normalized.status,
        pricingTier: normalized.pricingTier,
        ...(normalized.customDiscountPercent !== undefined
          ? { customDiscountPercent: normalized.customDiscountPercent }
          : {}),
        notes: normalized.notes,
        lastLoginAt: serverTimestamp(),
        loginCount: normalized.loginCount,
      };
      if (isExistingInFirestore) {
        const existingSnap = await getDoc(ref);
        if (existingSnap.exists()) {
          await setDoc(ref, {
            ...firestorePayload,
            createdAt: existingSnap.data().createdAt || serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            ...firestorePayload,
            createdAt: serverTimestamp(),
          });
        }
      } else {
        await setDoc(ref, {
          ...firestorePayload,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.warn('Firestore saveCustomerAccountAdmin fallback:', error);
    }
  }

  if (passcode && canUseExpressApi()) {
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(cleanId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passcode': passcode,
        },
        body: JSON.stringify({ customer: normalized }),
      });
      if (res.ok) {
        const data = (await res.json()) as { customer?: CustomerAccount };
        if (data.customer) {
          upsertLocalCustomerList(data.customer);
          return data.customer;
        }
      }
    } catch {
      // Static fallback
    }
  }

  upsertLocalCustomerList(normalized);
  return normalized;
}

export async function deleteCustomerAccountAdmin(id: string, passcode: string): Promise<void> {
  const cleanId = sanitizeId(id, 'cust');
  if (isFirebaseAdminUser(auth.currentUser)) {
    try {
      await deleteDoc(doc(db, 'customer_accounts', cleanId));
    } catch (error) {
      console.warn('Firestore deleteCustomerAccountAdmin fallback:', error);
    }
  }

  if (passcode && canUseExpressApi()) {
    try {
      await fetch(`/api/customers/${encodeURIComponent(cleanId)}`, {
        method: 'DELETE',
        headers: { 'x-admin-passcode': passcode },
      });
    } catch {
      // ignore
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_CUSTOMERS_KEY);
    const list = raw ? (JSON.parse(raw) as StoredLocalCustomer[]) : [];
    localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(list.filter((c) => c.id !== cleanId)));
  } catch {
    // ignore
  }
}


