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
  CustomerOrderRecord,
  CustomerOrderStatus,
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
import { generateRefCode, promoteGearCatalogSection, reconcileProductsWithDefaults } from '../utils/siteLogic';
import {
  OperationType,
  auth,
  db,
  handleFirestoreError,
  isFirebaseAdminUser,
} from './firebase';

const LOCAL_CONTENT_KEY = 'eva_site_content_v6';
const LOCAL_QUOTES_KEY = 'eva_quotes_v1';
const LOCAL_VENDOR_MASTER_KEY = 'eva_vendor_master_v1';
const LOCAL_CUSTOMER_ORDERS_KEY = 'eva_customer_orders_v1';
const LOCAL_PASSCODE_KEY = 'eva_admin_passcode_session';

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

export async function verifyAdminPasscode(passcode: string): Promise<boolean> {
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
  return passcode.trim() === '21232123';
}

function sanitizeId(raw: string, fallbackPrefix: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 120);
  return cleaned || `${fallbackPrefix}-${Date.now()}`;
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

export async function loadSiteContent(): Promise<SiteContent> {
  let firestoreContent: Partial<SiteContent> | null = null;
  let firestoreProducts: GearProduct[] | null = null;

  try {
    const siteSnap = await getDoc(doc(db, 'site_content', 'main'));
    if (siteSnap.exists()) {
      firestoreContent = siteSnap.data() as Partial<SiteContent>;
    }
  } catch (err) {
    console.warn('Firestore site_content read fallback:', err);
  }

  try {
    const prodSnap = await getDocs(
      query(collection(db, 'products'), orderBy('sortOrder', 'asc'))
    );
    if (!prodSnap.empty) {
      firestoreProducts = prodSnap.docs.map((d) => {
        const data = d.data();
        return {
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
      });
    }
  } catch (err) {
    console.warn('Firestore products read fallback:', err);
  }

  if (firestoreContent || firestoreProducts) {
    const finalProducts = reconcileProductsWithDefaults(
      firestoreProducts,
      DEFAULT_SITE_CONTENT.products
    );
    const merged: SiteContent = {
      ...DEFAULT_SITE_CONTENT,
      ...(firestoreContent?.brand ? { brand: firestoreContent.brand } : {}),
      ...(firestoreContent?.hero ? { hero: firestoreContent.hero } : {}),
      sectionOrder: promoteGearCatalogSection(firestoreContent?.sectionOrder),
      ...(Array.isArray(firestoreContent?.hiddenSections)
        ? { hiddenSections: firestoreContent.hiddenSections }
        : {}),
      ...(Array.isArray(firestoreContent?.services)
        ? { services: firestoreContent.services }
        : {}),
      ...(firestoreContent?.pricing ? { pricing: firestoreContent.pricing } : {}),
      ...(Array.isArray(firestoreContent?.testimonials)
        ? { testimonials: firestoreContent.testimonials }
        : {}),
      products: finalProducts,
    };
    try {
      localStorage.setItem(LOCAL_CONTENT_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }
    return merged;
  }

  try {
    const res = await fetch('/api/content');
    if (res.ok) {
      const data = (await res.json()) as { content?: SiteContent | null };
      if (data.content) {
        const reconciled: SiteContent = {
          ...DEFAULT_SITE_CONTENT,
          ...data.content,
          sectionOrder: promoteGearCatalogSection(data.content.sectionOrder),
          products: reconcileProductsWithDefaults(
            data.content.products,
            DEFAULT_SITE_CONTENT.products
          ),
        };
        try {
          localStorage.setItem(LOCAL_CONTENT_KEY, JSON.stringify(reconciled));
        } catch {
          // ignore
        }
        return reconciled;
      }
    }
  } catch {
    // Static hosting fallback
  }

  try {
    const raw = localStorage.getItem(LOCAL_CONTENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SiteContent;
      return {
        ...DEFAULT_SITE_CONTENT,
        ...parsed,
        sectionOrder: promoteGearCatalogSection(parsed.sectionOrder),
        products: reconcileProductsWithDefaults(
          parsed.products,
          DEFAULT_SITE_CONTENT.products
        ),
      };
    }
  } catch {
    // ignore
  }

  return DEFAULT_SITE_CONTENT;
}

export async function saveSiteContent(
  content: SiteContent,
  passcode: string
): Promise<{ savedToFirebase: boolean; savedToServer: boolean }> {
  try {
    localStorage.setItem(LOCAL_CONTENT_KEY, JSON.stringify(content));
  } catch {
    // ignore quota errors
  }

  let savedToFirebase = false;
  let savedToServer = false;

  if (isFirebaseAdminUser(auth.currentUser)) {
    try {
      const batch = writeBatch(db);
      const siteRef = doc(db, 'site_content', 'main');
      batch.set(siteRef, {
        brand: content.brand,
        hero: content.hero,
        sectionOrder: content.sectionOrder.slice(0, 10),
        hiddenSections: content.hiddenSections.slice(0, 10),
        services: content.services.slice(0, 20),
        pricing: content.pricing,
        testimonials: content.testimonials.slice(0, 30),
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'admin',
      });

      const existingSnap = await getDocs(collection(db, 'products'));
      const currentIds = new Set(content.products.map((p) => sanitizeId(p.id, 'gear')));
      existingSnap.docs.forEach((docSnap) => {
        if (!currentIds.has(docSnap.id)) {
          batch.delete(docSnap.ref);
        }
      });

      content.products.forEach((product, idx) => {
        const cleanId = sanitizeId(product.id, 'gear');
        batch.set(
          doc(db, 'products', cleanId),
          sanitizeProductForFirestore({ ...product, id: cleanId }, idx)
        );
      });

      await batch.commit();
      savedToFirebase = true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'site_content/main & products');
    }
  }

  if (passcode) {
    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passcode': passcode,
        },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        savedToServer = true;
      }
    } catch {
      // Static hosting fallback
    }
  }

  return { savedToFirebase, savedToServer };
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

  if (passcode) {
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

  if (passcode) {
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

  if (passcode) {
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

  if (passcode) {
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

  if (passcode) {
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

  if (passcode) {
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

  if (passcode) {
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

  if (passcode) {
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

  if (passcode) {
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

