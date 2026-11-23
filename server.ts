import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';

const ADMIN_PASSCODE = '21232123';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const QUOTES_FILE = path.join(DATA_DIR, 'quotes.json');
const CONTENT_FILE = path.join(DATA_DIR, 'site-content.json');
const VENDOR_MASTER_FILE = path.join(DATA_DIR, 'vendor-master.json');
const CUSTOMER_ORDERS_FILE = path.join(DATA_DIR, 'customer-orders.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath: string, data: unknown) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function isAdminAuthorized(req: express.Request): boolean {
  const code = req.header('x-admin-passcode');
  return code === ADMIN_PASSCODE;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/admin/verify', (req, res) => {
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (passcode === ADMIN_PASSCODE) {
      res.json({ authenticated: true });
      return;
    }
    res.status(401).json({ authenticated: false, error: 'Invalid security passcode.' });
  });

  app.get('/api/content', (_req, res) => {
    const content = readJsonFile<Record<string, unknown> | null>(CONTENT_FILE, null);
    res.json({ content });
  });

  app.put('/api/content', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!req.body?.content || typeof req.body.content !== 'object') {
      res.status(400).json({ error: 'Invalid site content payload.' });
      return;
    }
    writeJsonFile(CONTENT_FILE, req.body.content);
    res.json({ ok: true, content: req.body.content });
  });

  app.get('/api/quotes', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const quotes = readJsonFile<Array<Record<string, unknown>>>(QUOTES_FILE, []);
    res.json({ quotes });
  });

  app.post('/api/quotes', (req, res) => {
    const body = req.body ?? {};
    const contactName = typeof body.contactName === 'string' ? body.contactName.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const serviceRequested =
      typeof body.serviceRequested === 'string' ? body.serviceRequested.trim() : '';

    if (!contactName || phone.replace(/\D/g, '').length < 7 || !serviceRequested) {
      res.status(400).json({ error: 'Name, valid phone number, and service are required.' });
      return;
    }

    const existing = readJsonFile<Array<Record<string, unknown>>>(QUOTES_FILE, []);
    const refCode =
      typeof body.refCode === 'string' && body.refCode.startsWith('EVA-')
        ? body.refCode
        : `EVA-${Math.floor(100000 + Math.random() * 900000)}`;
    const adminAuthed = isAdminAuthorized(req);
    const allowedStatuses = new Set(['new', 'contacted', 'scheduled', 'completed']);

    const record: Record<string, unknown> = {
      id:
        typeof body.id === 'string' && body.id.trim()
          ? body.id.trim().slice(0, 120)
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      refCode,
      createdAt: new Date().toISOString(),
      status:
        adminAuthed && typeof body.status === 'string' && allowedStatuses.has(body.status)
          ? body.status
          : 'new',
      organization: typeof body.organization === 'string' ? body.organization.trim() : '',
      contactName,
      phone,
      email: typeof body.email === 'string' ? body.email.trim() : '',
      serviceRequested,
      soundboardModel:
        typeof body.soundboardModel === 'string' ? body.soundboardModel.trim() : '',
      roomCapacity: typeof body.roomCapacity === 'string' ? body.roomCapacity.trim() : '',
      timeline: typeof body.timeline === 'string' ? body.timeline.trim() : '',
      notes: typeof body.notes === 'string' ? body.notes.trim() : '',
      engineerNotes:
        adminAuthed && typeof body.engineerNotes === 'string' ? body.engineerNotes : '',
    };

    if (adminAuthed) {
      const allowedPaymentMethods = new Set(['none', 'bluevine', 'stripe', 'card', 'custom']);
      if (Array.isArray(body.estimateItems)) record.estimateItems = body.estimateItems.slice(0, 40);
      if (typeof body.discount === 'number' && Number.isFinite(body.discount)) record.discount = body.discount;
      if (typeof body.shippingFee === 'number' && Number.isFinite(body.shippingFee)) record.shippingFee = body.shippingFee;
      if (typeof body.taxRate === 'number' && Number.isFinite(body.taxRate)) record.taxRate = body.taxRate;
      if (typeof body.processingFeeRate === 'number' && Number.isFinite(body.processingFeeRate)) {
        record.processingFeeRate = Math.max(0, Math.min(15, Math.round(body.processingFeeRate * 100) / 100));
      }
      if (typeof body.paymentMethod === 'string' && allowedPaymentMethods.has(body.paymentMethod)) {
        record.paymentMethod = body.paymentMethod;
      }
      if (typeof body.coverLetter === 'string') record.coverLetter = body.coverLetter.slice(0, 8000);
      if (typeof body.estimateUpdatedAt === 'string') record.estimateUpdatedAt = body.estimateUpdatedAt.slice(0, 64);
    }

    const updated = [record, ...existing];
    writeJsonFile(QUOTES_FILE, updated);
    res.status(201).json({ quote: record });
  });

  app.patch('/api/quotes/:id', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { id } = req.params;
    const quotes = readJsonFile<Array<Record<string, unknown>>>(QUOTES_FILE, []);
    const idx = quotes.findIndex((q) => q.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Quote not found.' });
      return;
    }

    const body = req.body ?? {};
    const allowedStatuses = new Set(['new', 'contacted', 'scheduled', 'completed']);
    const next: Record<string, unknown> = { ...quotes[idx] };

    if (typeof body.status === 'string' && allowedStatuses.has(body.status)) {
      next.status = body.status;
    }
    const stringFields = [
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
      'coverLetter',
      'estimateUpdatedAt',
    ];
    for (const field of stringFields) {
      if (typeof body[field] === 'string') {
        next[field] = body[field];
      }
    }
    if (Array.isArray(body.estimateItems)) {
      next.estimateItems = body.estimateItems.slice(0, 40);
    }
    if (typeof body.discount === 'number' && Number.isFinite(body.discount)) {
      next.discount = body.discount;
    }
    if (typeof body.shippingFee === 'number' && Number.isFinite(body.shippingFee)) {
      next.shippingFee = body.shippingFee;
    }
    if (typeof body.taxRate === 'number' && Number.isFinite(body.taxRate)) {
      next.taxRate = body.taxRate;
    }
    if (typeof body.processingFeeRate === 'number' && Number.isFinite(body.processingFeeRate)) {
      next.processingFeeRate = Math.max(0, Math.min(15, Math.round(body.processingFeeRate * 100) / 100));
    }
    const allowedPaymentMethods = new Set(['none', 'bluevine', 'stripe', 'card', 'custom']);
    if (typeof body.paymentMethod === 'string' && allowedPaymentMethods.has(body.paymentMethod)) {
      next.paymentMethod = body.paymentMethod;
    }

    quotes[idx] = next;
    writeJsonFile(QUOTES_FILE, quotes);
    res.json({ quote: next });
  });

  app.delete('/api/quotes/:id', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { id } = req.params;
    const quotes = readJsonFile<Array<Record<string, unknown>>>(QUOTES_FILE, []);
    const filtered = quotes.filter((q) => q.id !== id);
    writeJsonFile(QUOTES_FILE, filtered);
    res.json({ ok: true });
  });

  // Admin-only Vendor Master Sheet endpoints
  app.get('/api/admin/vendor-master', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const entries = readJsonFile<Array<Record<string, unknown>>>(VENDOR_MASTER_FILE, []);
    res.json({ entries });
  });

  app.put('/api/admin/vendor-master/:id', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const entry = req.body?.entry;
    if (!entry || typeof entry !== 'object') {
      res.status(400).json({ error: 'Invalid vendor master entry payload.' });
      return;
    }
    const { id } = req.params;
    const entries = readJsonFile<Array<Record<string, unknown>>>(VENDOR_MASTER_FILE, []);
    const nextEntry = { ...entry, id, updatedAt: new Date().toISOString() };
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) {
      writeJsonFile(VENDOR_MASTER_FILE, [nextEntry, ...entries]);
    } else {
      entries[idx] = nextEntry;
      writeJsonFile(VENDOR_MASTER_FILE, entries);
    }
    res.json({ entry: nextEntry });
  });

  app.post('/api/admin/vendor-master/bulk', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const incoming = req.body?.entries;
    if (!Array.isArray(incoming)) {
      res.status(400).json({ error: 'Invalid bulk vendor master payload.' });
      return;
    }
    const existing = readJsonFile<Array<Record<string, unknown>>>(VENDOR_MASTER_FILE, []);
    const byId = new Map<string, Record<string, unknown>>();
    for (const row of existing) {
      if (typeof row.id === 'string' && row.id) {
        byId.set(row.id, row);
      }
    }
    const nowIso = new Date().toISOString();
    for (const raw of incoming.slice(0, 1500)) {
      if (!raw || typeof raw !== 'object') continue;
      const rec = raw as Record<string, unknown>;
      const id = typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim().slice(0, 128) : '';
      if (!id) continue;
      byId.set(id, { ...rec, id, updatedAt: nowIso });
    }
    const merged = Array.from(byId.values());
    writeJsonFile(VENDOR_MASTER_FILE, merged);
    res.json({ ok: true, count: incoming.length });
  });

  app.post('/api/admin/resolve-product-photos', async (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const rawItems = Array.isArray(req.body?.items) ? req.body.items.slice(0, 60) : [];
    const hosts = [
      'https://www.soundpro.com',
      'https://www.chucklevins.com',
      'https://www.pssl.com',
      'https://www.avnow.com',
    ];

    function tokenize(str: string): string[] {
      return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter((t) => t.length >= 2);
    }

    function scoreCandidate(brand: string, model: string, title: string): number {
      const tLower = title.toLowerCase();
      const brandLower = brand.toLowerCase().trim();
      const modelClean = model
        .toLowerCase()
        .replace(new RegExp(`^${brandLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`), '')
        .trim();
      const modelTokens = tokenize(modelClean);
      if (modelTokens.length === 0) return 0;

      const brandHit = brandLower && tLower.includes(brandLower.split(/\s+/)[0]) ? 1 : 0;
      let modelHits = 0;
      for (const tok of modelTokens) {
        if (tLower.includes(tok)) modelHits += 1;
      }
      const modelRatio = modelHits / modelTokens.length;
      if (modelRatio < 0.75) return 0;
      return modelRatio * 0.8 + brandHit * 0.2;
    }

    async function lookupSingle(brand: string, itemNumber: string): Promise<string | null> {
      const bareModel = itemNumber
        .replace(new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i'), '')
        .replace(/\([^)]*\)/g, '')
        .trim();
      const queries = Array.from(new Set([itemNumber.trim(), bareModel].filter(Boolean)));
      let best: { score: number; url: string } | null = null;

      for (const q of queries) {
        for (const host of hosts) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3500);
            const r = await fetch(
              `${host}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=5`,
              {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: controller.signal,
              }
            );
            clearTimeout(timer);
            if (!r.ok) continue;
            const json = (await r.json()) as {
              resources?: { results?: { products?: Array<{ title?: string; image?: string; featured_image?: { url?: string } }> } };
            };
            const prods = json?.resources?.results?.products || [];
            for (const p of prods) {
              const rawUrl = p.featured_image?.url || p.image || '';
              if (!rawUrl) continue;
              const sc = scoreCandidate(brand, itemNumber, p.title || '');
              if (sc >= 0.85 && (!best || sc > best.score)) {
                best = {
                  score: sc,
                  url: rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl,
                };
              }
            }
            if (best && best.score >= 0.98) {
              return best.url;
            }
          } catch {
            // try next host
          }
        }
        if (best && best.score >= 0.95) break;
      }
      return best?.url ?? null;
    }

    const photos: Record<string, string> = {};
    const CONCURRENCY = 6;
    for (let i = 0; i < rawItems.length; i += CONCURRENCY) {
      const batch = rawItems.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (entry: unknown) => {
          if (!entry || typeof entry !== 'object') return;
          const rec = entry as { key?: string; brand?: string; itemNumber?: string };
          const key = typeof rec.key === 'string' ? rec.key : '';
          const brand = typeof rec.brand === 'string' ? rec.brand : '';
          const itemNumber = typeof rec.itemNumber === 'string' ? rec.itemNumber : '';
          if (!key || !itemNumber) return;
          const found = await lookupSingle(brand, itemNumber);
          if (found) {
            photos[key] = found;
          }
        })
      );
    }

    res.json({ photos });
  });

  app.delete('/api/admin/vendor-master/:id', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { id } = req.params;
    const entries = readJsonFile<Array<Record<string, unknown>>>(VENDOR_MASTER_FILE, []);
    writeJsonFile(VENDOR_MASTER_FILE, entries.filter((e) => e.id !== id));
    res.json({ ok: true });
  });

  // Admin-only Customer Working Orders endpoints (separate from Estimates)
  app.get('/api/admin/customer-orders', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const orders = readJsonFile<Array<Record<string, unknown>>>(CUSTOMER_ORDERS_FILE, []);
    res.json({ orders });
  });

  app.put('/api/admin/customer-orders/:id', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const order = req.body?.order;
    if (!order || typeof order !== 'object') {
      res.status(400).json({ error: 'Invalid customer order payload.' });
      return;
    }
    const { id } = req.params;
    const orders = readJsonFile<Array<Record<string, unknown>>>(CUSTOMER_ORDERS_FILE, []);
    const nowIso = new Date().toISOString();
    const idx = orders.findIndex((o) => o.id === id);
    const nextOrder = {
      ...order,
      id,
      createdAt: idx >= 0 && typeof orders[idx].createdAt === 'string' ? orders[idx].createdAt : order.createdAt || nowIso,
      updatedAt: nowIso,
    };
    if (idx === -1) {
      writeJsonFile(CUSTOMER_ORDERS_FILE, [nextOrder, ...orders]);
    } else {
      orders[idx] = nextOrder;
      writeJsonFile(CUSTOMER_ORDERS_FILE, orders);
    }
    res.json({ order: nextOrder });
  });

  app.delete('/api/admin/customer-orders/:id', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { id } = req.params;
    const orders = readJsonFile<Array<Record<string, unknown>>>(CUSTOMER_ORDERS_FILE, []);
    writeJsonFile(CUSTOMER_ORDERS_FILE, orders.filter((o) => o.id !== id));
    res.json({ ok: true });
  });

  // Customer Login, Registration & Admin Directory endpoints
  type StoredCustomer = Record<string, unknown> & { passwordHash?: string };

  function stripCustomerSecrets(rec: StoredCustomer) {
    const { passwordHash: _ignored, ...safe } = rec;
    return safe;
  }

  app.post('/api/customers/register', (req, res) => {
    const body = req.body ?? {};
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 140) : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 160) : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : '';
    const organization = typeof body.organization === 'string' ? body.organization.trim().slice(0, 160) : '';
    const passwordHash = typeof body.passwordHash === 'string' ? body.passwordHash.trim() : '';
    const authProvider = body.authProvider === 'google' ? 'google' : 'email';
    const uid = typeof body.uid === 'string' ? body.uid.trim().slice(0, 128) : undefined;

    if (!fullName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Full name and a valid email address are required.' });
      return;
    }
    if (authProvider === 'email' && !passwordHash) {
      res.status(400).json({ error: 'Password is required for email registration.' });
      return;
    }

    const customers = readJsonFile<StoredCustomer[]>(CUSTOMERS_FILE, []);
    const existingIdx = customers.findIndex(
      (c) =>
        (uid && c.uid === uid) ||
        (typeof c.email === 'string' && c.email.toLowerCase() === email)
    );
    const nowIso = new Date().toISOString();

    if (existingIdx >= 0) {
      const existing = customers[existingIdx];
      if (authProvider === 'email' && existing.passwordHash && existing.passwordHash !== passwordHash) {
        res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
        return;
      }
      const next: StoredCustomer = {
        ...existing,
        ...(uid ? { uid } : {}),
        authProvider,
        fullName: fullName || existing.fullName,
        organization: organization || existing.organization || '',
        phone: phone || existing.phone || '',
        email,
        ...(passwordHash ? { passwordHash } : {}),
        lastLoginAt: nowIso,
        loginCount: (Number(existing.loginCount) || 0) + 1,
      };
      customers[existingIdx] = next;
      writeJsonFile(CUSTOMERS_FILE, customers);
      res.json({ customer: stripCustomerSecrets(next) });
      return;
    }

    const cleanId =
      uid && /^[a-zA-Z0-9_-]+$/.test(uid)
        ? uid.slice(0, 120)
        : `cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const created: StoredCustomer = {
      id: cleanId,
      ...(uid ? { uid } : {}),
      authProvider,
      fullName,
      organization,
      phone,
      email,
      ...(passwordHash ? { passwordHash } : {}),
      status: 'active',
      pricingTier: 'vip',
      notes: '',
      createdAt: nowIso,
      lastLoginAt: nowIso,
      loginCount: 1,
    };
    writeJsonFile(CUSTOMERS_FILE, [created, ...customers]);
    res.status(201).json({ customer: stripCustomerSecrets(created) });
  });

  app.post('/api/customers/login', (req, res) => {
    const body = req.body ?? {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 160) : '';
    const passwordHash = typeof body.passwordHash === 'string' ? body.passwordHash.trim() : '';
    const authProvider = body.authProvider === 'google' ? 'google' : 'email';
    const uid = typeof body.uid === 'string' ? body.uid.trim().slice(0, 128) : undefined;
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 140) : '';
    const organization = typeof body.organization === 'string' ? body.organization.trim().slice(0, 160) : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : '';

    const customers = readJsonFile<StoredCustomer[]>(CUSTOMERS_FILE, []);
    const idx = customers.findIndex(
      (c) =>
        (uid && c.uid === uid) ||
        (email && typeof c.email === 'string' && c.email.toLowerCase() === email)
    );
    const nowIso = new Date().toISOString();

    if (authProvider === 'google') {
      if (!email) {
        res.status(400).json({ error: 'Google account email missing.' });
        return;
      }
      if (idx >= 0) {
        const existing = customers[idx];
        const next: StoredCustomer = {
          ...existing,
          ...(uid ? { uid } : {}),
          fullName: fullName || existing.fullName,
          organization: organization || existing.organization || '',
          phone: phone || existing.phone || '',
          lastLoginAt: nowIso,
          loginCount: (Number(existing.loginCount) || 0) + 1,
        };
        customers[idx] = next;
        writeJsonFile(CUSTOMERS_FILE, customers);
        res.json({ customer: stripCustomerSecrets(next) });
        return;
      }
      const cleanId =
        uid && /^[a-zA-Z0-9_-]+$/.test(uid)
          ? uid.slice(0, 120)
          : `cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const created: StoredCustomer = {
        id: cleanId,
        ...(uid ? { uid } : {}),
        authProvider: 'google',
        fullName: fullName || email.split('@')[0],
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
      writeJsonFile(CUSTOMERS_FILE, [created, ...customers]);
      res.status(201).json({ customer: stripCustomerSecrets(created) });
      return;
    }

    if (idx === -1) {
      res.status(401).json({ error: 'No customer account found with that email. Please create an account first.' });
      return;
    }

    const existing = customers[idx];
    if (!existing.passwordHash || existing.passwordHash !== passwordHash) {
      res.status(401).json({ error: 'Incorrect password for this customer account.' });
      return;
    }

    const updated: StoredCustomer = {
      ...existing,
      lastLoginAt: nowIso,
      loginCount: (Number(existing.loginCount) || 0) + 1,
    };
    customers[idx] = updated;
    writeJsonFile(CUSTOMERS_FILE, customers);
    res.json({ customer: stripCustomerSecrets(updated) });
  });

  app.get('/api/customers', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const customers = readJsonFile<StoredCustomer[]>(CUSTOMERS_FILE, [])
      .map(stripCustomerSecrets)
      .sort((a, b) => String(b.lastLoginAt || '').localeCompare(String(a.lastLoginAt || '')));
    res.json({ customers });
  });

  app.put('/api/customers/:id', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const customer = req.body?.customer;
    if (!customer || typeof customer !== 'object') {
      res.status(400).json({ error: 'Invalid customer payload.' });
      return;
    }
    const { id } = req.params;
    const customers = readJsonFile<StoredCustomer[]>(CUSTOMERS_FILE, []);
    const nowIso = new Date().toISOString();
    const idx = customers.findIndex((c) => c.id === id);
    const existing = idx >= 0 ? customers[idx] : undefined;
    const nextCustomer: StoredCustomer = {
      ...(existing || {}),
      ...customer,
      id,
      createdAt: existing?.createdAt || customer.createdAt || nowIso,
      lastLoginAt: customer.lastLoginAt || existing?.lastLoginAt || nowIso,
      loginCount: Number(customer.loginCount ?? existing?.loginCount ?? 1),
    };
    if (idx === -1) {
      writeJsonFile(CUSTOMERS_FILE, [nextCustomer, ...customers]);
    } else {
      customers[idx] = nextCustomer;
      writeJsonFile(CUSTOMERS_FILE, customers);
    }
    res.json({ customer: stripCustomerSecrets(nextCustomer) });
  });

  app.delete('/api/customers/:id', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { id } = req.params;
    const customers = readJsonFile<StoredCustomer[]>(CUSTOMERS_FILE, []);
    writeJsonFile(CUSTOMERS_FILE, customers.filter((c) => c.id !== id));
    res.json({ ok: true });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    app.use((req, res, next) => {
      if (!req.path.startsWith('/node_modules/.vite/deps/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      }
      next();
    });
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        cors: true,
        hmr: !disableHmr,
        watch: disableHmr ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(
      express.static(distDir, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`E.V.A Worship Engineer server running on http://0.0.0.0:${port}`);
  });
}

startServer();
