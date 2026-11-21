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
  app.use(express.json({ limit: '15mb' }));

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
      if (Array.isArray(body.estimateItems)) record.estimateItems = body.estimateItems.slice(0, 40);
      if (typeof body.discount === 'number' && Number.isFinite(body.discount)) record.discount = body.discount;
      if (typeof body.shippingFee === 'number' && Number.isFinite(body.shippingFee)) record.shippingFee = body.shippingFee;
      if (typeof body.taxRate === 'number' && Number.isFinite(body.taxRate)) record.taxRate = body.taxRate;
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

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`E.V.A Worship Engineer server running on http://0.0.0.0:${port}`);
  });
}

startServer();
