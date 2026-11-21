import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { AdminFloatingBar } from './components/AdminFloatingBar';
import { AdminPortalModal, type AdminTabId } from './components/AdminPortalModal';
import { AudioHealthCheckTool } from './components/AudioHealthCheckTool';
import { Footer } from './components/Footer';
import { GearSalesSection } from './components/GearSalesSection';
import { Hero } from './components/Hero';
import { Navbar } from './components/Navbar';
import { QuoteCartDrawer } from './components/QuoteCartDrawer';
import { QuoteModal } from './components/QuoteModal';
import { SectionWrapper } from './components/SectionWrapper';
import { ServicesSection } from './components/ServicesSection';
import { SubscriptionPricing } from './components/SubscriptionPricing';
import { TestimonialsSection } from './components/TestimonialsSection';
import { VolunteerTrainingSection } from './components/VolunteerTrainingSection';
import { DEFAULT_SITE_CONTENT } from './data/defaultContent';
import {
  createAdminEstimate,
  deleteCustomerOrder,
  deleteQuoteRecord,
  deleteVendorMasterEntry,
  fetchCustomerOrders,
  fetchQuotes,
  fetchVendorMaster,
  getStoredAdminPasscode,
  loadSiteContent,
  saveCustomerOrder,
  saveSiteContent,
  saveVendorMasterEntry,
  setStoredAdminPasscode,
  subscribeAdminQuotes,
  subscribeCustomerOrders,
  subscribeVendorMaster,
  updateQuote,
  verifyAdminPasscode,
} from './services/apiClient';
import {
  auth,
  isFirebaseAdminUser,
  signInAdminWithGoogle,
  signOutFirebase,
  testFirestoreConnection,
} from './services/firebase';
import type {
  CartItem,
  CustomerOrderRecord,
  GearCategory,
  GearProduct,
  Language,
  QuoteRecord,
  QuoteSubmissionInput,
  QuoteUpdateInput,
  SectionId,
  ServiceItem,
  SiteContent,
  TestimonialItem,
  VendorMasterEntry,
} from './types/site';
import {
  addItemToCart,
  calculateCartSummary,
  moveItemInArray,
  removeCartItem,
  updateCartItemQty,
} from './utils/siteLogic';

const QUOTE_CART_STORAGE_KEY = 'eva_quote_cart_v1';

function loadInitialCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(QUOTE_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

const SECTION_TITLES: Record<SectionId, { en: string; es: string }> = {
  services: { en: 'Services & Installs', es: 'Servicios e Instalaciones' },
  pricing: { en: '$50/wk Care Plan', es: 'Plan $50/sem' },
  gear: { en: 'Pro Audio Gear', es: 'Equipos Pro Audio' },
  training: { en: 'Volunteer Training', es: 'Capacitación' },
  diagnostic: { en: 'Audio Diagnostic', es: 'Diagnóstico' },
  testimonials: { en: 'Testimonials', es: 'Testimonios' },
};

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);

  // Quote modal & Quote Cart state
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteInitialService, setQuoteInitialService] = useState<string | undefined>(undefined);
  const [cart, setCart] = useState<CartItem[]>(loadInitialCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [gearCategory, setGearCategory] = useState<GearCategory>('all');
  const [gearSearchQuery, setGearSearchQuery] = useState('');

  function handleHeroGearSearch(queryText: string, nextCategory?: GearCategory) {
    setGearSearchQuery(queryText);
    if (nextCategory !== undefined) {
      setGearCategory(nextCategory);
    }
    const target = document.getElementById('gear');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(QUOTE_CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart]);

  // Admin auth & CMS studio state
  const [adminPasscode, setAdminPasscode] = useState<string>('');
  const [passcodeAuthed, setPasscodeAuthed] = useState(false);
  const [firebaseAdminEmail, setFirebaseAdminEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [adminEditMode, setAdminEditMode] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [portalInitialTab, setPortalInitialTab] = useState<AdminTabId>('products');
  const [productToEdit, setProductToEdit] = useState<GearProduct | null>(null);
  const [serviceToEdit, setServiceToEdit] = useState<ServiceItem | null>(null);
  const [testimonialToEdit, setTestimonialToEdit] = useState<TestimonialItem | null>(null);
  const [saveNotice, setSaveNotice] = useState('');

  // Customer leads state
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Admin-only Master Vendor Sheet & Customer Working Orders state
  const [vendorEntries, setVendorEntries] = useState<VendorMasterEntry[]>([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const isAdmin = Boolean(firebaseAdminEmail) || passcodeAuthed;

  const refreshAdminWorkspace = useCallback(async (passcode: string) => {
    setQuotesLoading(true);
    setVendorLoading(true);
    setOrdersLoading(true);
    try {
      const [quoteList, vendorList, orderList] = await Promise.all([
        fetchQuotes(passcode),
        fetchVendorMaster(passcode),
        fetchCustomerOrders(passcode),
      ]);
      setQuotes(quoteList);
      setVendorEntries(vendorList);
      setCustomerOrders(orderList);
    } finally {
      setQuotesLoading(false);
      setVendorLoading(false);
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    testFirestoreConnection();
    loadSiteContent().then((loaded) => setSiteContent(loaded));

    const stored = getStoredAdminPasscode();
    if (stored) {
      verifyAdminPasscode(stored).then((ok) => {
        if (ok) {
          setAdminPasscode(stored);
          setPasscodeAuthed(true);
          refreshAdminWorkspace(stored);
        } else {
          setStoredAdminPasscode('');
        }
      });
    }

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (isFirebaseAdminUser(user)) {
        setFirebaseAdminEmail(user?.email ?? null);
      } else {
        setFirebaseAdminEmail(null);
      }
      setAuthReady(true);
    });

    return () => unsubAuth();
  }, [refreshAdminWorkspace]);

  // Attach real-time Firestore listeners once auth is ready & admin is verified in Firebase
  useEffect(() => {
    if (!authReady || !firebaseAdminEmail) return;
    setQuotesLoading(true);
    setVendorLoading(true);
    setOrdersLoading(true);
    const unsubQuotes = subscribeAdminQuotes((liveQuotes) => {
      setQuotes(liveQuotes);
      setQuotesLoading(false);
    });
    const unsubVendors = subscribeVendorMaster((liveEntries) => {
      setVendorEntries(liveEntries);
      setVendorLoading(false);
    });
    const unsubOrders = subscribeCustomerOrders((liveOrders) => {
      setCustomerOrders(liveOrders);
      setOrdersLoading(false);
    });
    return () => {
      unsubQuotes?.();
      unsubVendors?.();
      unsubOrders?.();
    };
  }, [authReady, firebaseAdminEmail]);

  async function handleGoogleLogin(): Promise<{ ok: boolean; error?: string }> {
    try {
      const user = await signInAdminWithGoogle();
      if (!isFirebaseAdminUser(user)) {
        await signOutFirebase();
        return {
          ok: false,
          error: `Signed in as ${user.email || 'unknown'}, which is not an authorized admin account.`,
        };
      }
      setFirebaseAdminEmail(user.email || 'eva.sound.systems@gmail.com');
      setAdminEditMode(true);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Google sign-in was cancelled or blocked.',
      };
    }
  }

  async function handleAdminLogin(passcode: string): Promise<boolean> {
    const ok = await verifyAdminPasscode(passcode);
    if (!ok) return false;
    setStoredAdminPasscode(passcode);
    setAdminPasscode(passcode);
    setPasscodeAuthed(true);
    setAdminEditMode(true);
    refreshAdminWorkspace(passcode);
    return true;
  }

  async function handleAdminLogout() {
    setStoredAdminPasscode('');
    setAdminPasscode('');
    setPasscodeAuthed(false);
    if (firebaseAdminEmail) {
      await signOutFirebase();
      setFirebaseAdminEmail(null);
    }
    setVendorEntries([]);
    setCustomerOrders([]);
    setAdminEditMode(false);
    setPortalOpen(false);
  }

  async function handleContentUpdate(next: SiteContent) {
    setSiteContent(next);
    if (!isAdmin) return;
    const res = await saveSiteContent(next, adminPasscode);
    if (res.savedToFirebase) {
      setSaveNotice('Synced to Firestore');
    } else if (res.savedToServer) {
      setSaveNotice('Saved to Server');
    } else {
      setSaveNotice('Saved Locally');
    }
    setTimeout(() => setSaveNotice(''), 2400);
  }

  function openQuote(preselected?: string) {
    setQuoteInitialService(preselected);
    setQuoteModalOpen(true);
  }

  function openStudioTab(
    tab: AdminTabId,
    options?: {
      product?: GearProduct | null;
      service?: ServiceItem | null;
      testimonial?: TestimonialItem | null;
    }
  ) {
    setPortalInitialTab(tab);
    setProductToEdit(options?.product ?? null);
    setServiceToEdit(options?.service ?? null);
    setTestimonialToEdit(options?.testimonial ?? null);
    setPortalOpen(true);
  }

  async function handleCreateEstimate(
    payload: QuoteSubmissionInput & QuoteUpdateInput
  ): Promise<QuoteRecord | null> {
    if (!isAdmin) return null;
    const created = await createAdminEstimate(payload, adminPasscode);
    if (created) {
      setQuotes((prev) => [created, ...prev.filter((q) => q.id !== created.id)]);
    }
    return created;
  }

  async function handleUpdateQuote(
    id: string,
    updates: QuoteUpdateInput
  ): Promise<QuoteRecord | null> {
    if (!isAdmin) return null;
    const updated = await updateQuote(id, updates, adminPasscode);
    if (updated) {
      setQuotes((prev) => prev.map((q) => (q.id === id ? updated : q)));
    }
    return updated;
  }

  async function handleDeleteQuote(id: string) {
    if (!isAdmin) return;
    await deleteQuoteRecord(id, adminPasscode);
    setQuotes((prev) => prev.filter((q) => q.id !== id));
  }

  async function handleSaveVendorEntry(
    entry: VendorMasterEntry
  ): Promise<VendorMasterEntry | null> {
    if (!isAdmin) return null;
    const saved = await saveVendorMasterEntry(entry, adminPasscode);
    setVendorEntries((prev) => [saved, ...prev.filter((e) => e.id !== saved.id)]);
    return saved;
  }

  async function handleDeleteVendorEntry(id: string) {
    if (!isAdmin) return;
    await deleteVendorMasterEntry(id, adminPasscode);
    setVendorEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleSaveCustomerOrder(
    order: CustomerOrderRecord,
    isExisting: boolean
  ): Promise<CustomerOrderRecord | null> {
    if (!isAdmin) return null;
    const saved = await saveCustomerOrder(order, adminPasscode, isExisting);
    setCustomerOrders((prev) => [saved, ...prev.filter((o) => o.id !== saved.id)]);
    return saved;
  }

  async function handleDeleteCustomerOrder(id: string) {
    if (!isAdmin) return;
    await deleteCustomerOrder(id, adminPasscode);
    setCustomerOrders((prev) => prev.filter((o) => o.id !== id));
  }

  const visibleSectionOrder = siteContent.sectionOrder.filter(
    (id) => !siteContent.hiddenSections.includes(id)
  );

  function renderSection(sectionId: SectionId) {
    switch (sectionId) {
      case 'services':
        return (
          <ServicesSection
            services={siteContent.services}
            lang={lang}
            onOpenQuote={openQuote}
            isAdmin={isAdmin}
            adminEditMode={adminEditMode}
            onEditService={(svc) => openStudioTab('services', { service: svc })}
            onAddService={() =>
              openStudioTab('services', {
                service: {
                  id: `svc-${Date.now()}`,
                  titleEn: 'New AV Service',
                  titleEs: 'Nuevo Servicio AV',
                  descriptionEn: '',
                  descriptionEs: '',
                  deliverableEn: 'Custom Commissioning',
                  deliverableEs: 'Servicio Personalizado',
                  imageUrl: 'asset:console',
                },
              })
            }
            onDeleteService={(id) =>
              handleContentUpdate({
                ...siteContent,
                services: siteContent.services.filter((s) => s.id !== id),
              })
            }
            onMoveService={(index, dir) =>
              handleContentUpdate({
                ...siteContent,
                services: moveItemInArray(siteContent.services, index, dir),
              })
            }
          />
        );

      case 'pricing':
        return (
          <SubscriptionPricing
            pricing={siteContent.pricing}
            lang={lang}
            onOpenQuote={openQuote}
            isAdmin={isAdmin}
            adminEditMode={adminEditMode}
            onEditPricing={() => openStudioTab('hero-pricing')}
          />
        );

      case 'gear':
        return (
          <GearSalesSection
            products={siteContent.products}
            brand={siteContent.brand}
            lang={lang}
            cart={cart}
            category={gearCategory}
            onCategoryChange={setGearCategory}
            searchQuery={gearSearchQuery}
            onSearchQueryChange={setGearSearchQuery}
            onAddToCart={(product) => setCart((prev) => addItemToCart(prev, product))}
            onOpenCart={() => setCartOpen(true)}
            onOpenQuote={openQuote}
            isAdmin={isAdmin}
            adminEditMode={adminEditMode}
            onEditProduct={(product) => openStudioTab('products', { product })}
            onAddProduct={() =>
              openStudioTab('products', {
                product: {
                  id: `gear-${Date.now()}`,
                  itemNumber: '',
                  name: '',
                  brand: '',
                  category: 'speakers',
                  mapPrice: undefined,
                  priceLabel: 'Best Price Quote',
                  priceNote: 'MAP / Authorized Dealer Quote',
                  descriptionEn: '',
                  descriptionEs: '',
                  specs: [],
                  imageUrl: 'asset:console',
                  inStock: true,
                },
              })
            }
            onDeleteProduct={(id) =>
              handleContentUpdate({
                ...siteContent,
                products: siteContent.products.filter((p) => p.id !== id),
              })
            }
            onMoveProductById={(id, dir) => {
              const index = siteContent.products.findIndex((p) => p.id === id);
              if (index === -1) return;
              handleContentUpdate({
                ...siteContent,
                products: moveItemInArray(siteContent.products, index, dir),
              });
            }}
          />
        );

      case 'training':
        return <VolunteerTrainingSection lang={lang} onOpenQuote={openQuote} />;

      case 'diagnostic':
        return <AudioHealthCheckTool lang={lang} onOpenQuote={openQuote} />;

      case 'testimonials':
        return (
          <TestimonialsSection
            testimonials={siteContent.testimonials}
            brand={siteContent.brand}
            lang={lang}
            onOpenQuote={openQuote}
            isAdmin={isAdmin}
            adminEditMode={adminEditMode}
            onEditTestimonial={(item) => openStudioTab('testimonials', { testimonial: item })}
            onAddTestimonial={() =>
              openStudioTab('testimonials', {
                testimonial: {
                  id: `test-${Date.now()}`,
                  name: '',
                  roleEn: '',
                  roleEs: '',
                  organization: '',
                  category: 'church',
                  outcomeMetric: '',
                  gearContext: '',
                  quoteEn: '',
                  quoteEs: '',
                },
              })
            }
            onDeleteTestimonial={(id) =>
              handleContentUpdate({
                ...siteContent,
                testimonials: siteContent.testimonials.filter((t) => t.id !== id),
              })
            }
            onMoveTestimonial={(index, dir) =>
              handleContentUpdate({
                ...siteContent,
                testimonials: moveItemInArray(siteContent.testimonials, index, dir),
              })
            }
          />
        );
    }
  }

  return (
    <div className="min-h-screen w-full overflow-x-clip flex flex-col bg-[#F8F8F6] text-[#141518]">
      <Navbar
        brand={siteContent.brand}
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'en' ? 'es' : 'en'))}
        onOpenQuote={openQuote}
        onOpenPortal={() => openStudioTab('products')}
        isAdmin={isAdmin}
        hiddenSections={siteContent.hiddenSections}
        cartCount={calculateCartSummary(cart).totalCount}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="flex-1">
        <Hero
          brand={siteContent.brand}
          hero={siteContent.hero}
          pricing={siteContent.pricing}
          productCount={siteContent.products.length}
          lang={lang}
          onOpenQuote={openQuote}
          onSearchGear={handleHeroGearSearch}
          isAdmin={isAdmin}
          adminEditMode={adminEditMode}
          onEditHero={() => openStudioTab('hero-pricing')}
        />

        {visibleSectionOrder.map((secId, idx) => (
          <SectionWrapper
            key={secId}
            sectionId={secId}
            title={lang === 'en' ? SECTION_TITLES[secId].en : SECTION_TITLES[secId].es}
            index={idx}
            total={visibleSectionOrder.length}
            isAdmin={isAdmin}
            adminEditMode={adminEditMode}
            lang={lang}
            onMoveSection={(visibleIdx, dir) => {
              const targetVisibleId = visibleSectionOrder[visibleIdx];
              const fullIdx = siteContent.sectionOrder.indexOf(targetVisibleId);
              const neighborVisibleId =
                dir === 'up'
                  ? visibleSectionOrder[visibleIdx - 1]
                  : visibleSectionOrder[visibleIdx + 1];
              if (!neighborVisibleId) return;
              const neighborFullIdx = siteContent.sectionOrder.indexOf(neighborVisibleId);
              const nextOrder = [...siteContent.sectionOrder];
              [nextOrder[fullIdx], nextOrder[neighborFullIdx]] = [
                nextOrder[neighborFullIdx],
                nextOrder[fullIdx],
              ];
              handleContentUpdate({ ...siteContent, sectionOrder: nextOrder });
            }}
            onHideSection={(id) =>
              handleContentUpdate({
                ...siteContent,
                hiddenSections: [...siteContent.hiddenSections, id],
              })
            }
            onOpenSectionEditor={(id) => {
              if (id === 'gear') openStudioTab('products');
              else if (id === 'services') openStudioTab('services');
              else if (id === 'pricing') openStudioTab('hero-pricing');
              else if (id === 'testimonials') openStudioTab('testimonials');
              else openStudioTab('layout');
            }}
          >
            {renderSection(secId)}
          </SectionWrapper>
        ))}
      </main>

      <Footer
        brand={siteContent.brand}
        lang={lang}
        onOpenQuote={openQuote}
        onOpenPortal={() => openStudioTab('products')}
        isAdmin={isAdmin}
        hiddenSections={siteContent.hiddenSections}
      />

      {isAdmin && (
        <AdminFloatingBar
          lang={lang}
          adminEditMode={adminEditMode}
          onToggleEditMode={() => setAdminEditMode((prev) => !prev)}
          onOpenStudio={() => openStudioTab('products')}
          onLogout={handleAdminLogout}
          saveNotice={saveNotice}
        />
      )}

      <QuoteModal
        isOpen={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        brand={siteContent.brand}
        lang={lang}
        initialService={quoteInitialService}
        onQuoteSubmitted={(newQuote) => {
          setQuotes((prev) => [newQuote, ...prev]);
        }}
      />

      <QuoteCartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        brand={siteContent.brand}
        lang={lang}
        onUpdateQty={(productId, delta) =>
          setCart((prev) => updateCartItemQty(prev, productId, delta))
        }
        onRemoveItem={(productId) => setCart((prev) => removeCartItem(prev, productId))}
        onClearCart={() => setCart([])}
        onQuoteSubmitted={(newQuote) => {
          setQuotes((prev) => [newQuote, ...prev]);
        }}
      />

      <AdminPortalModal
        isOpen={portalOpen}
        onClose={() => setPortalOpen(false)}
        lang={lang}
        isAdmin={isAdmin}
        firebaseAdminEmail={firebaseAdminEmail}
        onGoogleLogin={handleGoogleLogin}
        onLogin={handleAdminLogin}
        onLogout={handleAdminLogout}
        adminEditMode={adminEditMode}
        onToggleEditMode={() => setAdminEditMode((prev) => !prev)}
        siteContent={siteContent}
        onChangeContent={handleContentUpdate}
        quotes={quotes}
        quotesLoading={quotesLoading}
        onCreateEstimate={handleCreateEstimate}
        onUpdateQuote={handleUpdateQuote}
        onDeleteQuote={handleDeleteQuote}
        vendorEntries={vendorEntries}
        vendorLoading={vendorLoading}
        onSaveVendorEntry={handleSaveVendorEntry}
        onDeleteVendorEntry={handleDeleteVendorEntry}
        customerOrders={customerOrders}
        ordersLoading={ordersLoading}
        onSaveCustomerOrder={handleSaveCustomerOrder}
        onDeleteCustomerOrder={handleDeleteCustomerOrder}
        initialTab={portalInitialTab}
        initialProductToEdit={productToEdit}
        initialServiceToEdit={serviceToEdit}
        initialTestimonialToEdit={testimonialToEdit}
      />
    </div>
  );
}
