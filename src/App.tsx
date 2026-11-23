import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { AdminFloatingBar } from './components/AdminFloatingBar';
import type { CopySubTab } from './components/AdminPageCopyTab';
import { AdminPortalModal, type AdminTabId } from './components/AdminPortalModal';
import { AudioHealthCheckTool } from './components/AudioHealthCheckTool';
import { CustomerLoginModal } from './components/CustomerLoginModal';
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
import { VideoMeetingModal } from './components/VideoMeetingModal';
import { VolunteerTrainingSection } from './components/VolunteerTrainingSection';
import { DEFAULT_SITE_CONTENT } from './data/defaultContent';
import {
  createAdminEstimate,
  deleteCustomerAccountAdmin,
  deleteCustomerOrder,
  deleteQuoteRecord,
  deleteVendorMasterEntry,
  fetchCustomerAccounts,
  fetchCustomerOrders,
  fetchQuotes,
  fetchVendorMaster,
  getStoredAdminPasscode,
  getStoredCustomerSession,
  hasPendingLocalContentSync,
  loadSiteContent,
  readCachedAdminWorkspace,
  saveCustomerAccountAdmin,
  saveCustomerOrder,
  saveSiteContent,
  saveVendorMasterBatch,
  saveVendorMasterEntry,
  setStoredAdminPasscode,
  subscribeAdminQuotes,
  subscribeCustomerAccounts,
  subscribeCustomerOrders,
  subscribeVendorMaster,
  syncLocalAdminRecordsToFirestore,
  updateQuote,
  verifyAdminPasscode,
} from './services/apiClient';
import {
  auth,
  formatFirebaseAuthError,
  isFirebaseAdminUser,
  signInAdminWithGoogle,
  signOutFirebase,
  testFirestoreConnection,
} from './services/firebase';
import type {
  CartItem,
  CustomerAccount,
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
  getCustomerEffectiveDiscountPercent,
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

  // Customer VIP login & member pricing state
  const [customer, setCustomer] = useState<CustomerAccount | null>(() =>
    getStoredCustomerSession()
  );
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  // Quote modal, Video Meeting modal & Quote Cart state
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [videoMeetModalOpen, setVideoMeetModalOpen] = useState(false);
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
  const [firestoreStatus, setFirestoreStatus] = useState<{ ok: boolean; error?: string } | null>(
    null
  );
  const [authReady, setAuthReady] = useState(false);

  const [adminEditMode, setAdminEditMode] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [portalInitialTab, setPortalInitialTab] = useState<AdminTabId>('products');
  const [copySubTab, setCopySubTab] = useState<CopySubTab>('hero');
  const [productToEdit, setProductToEdit] = useState<GearProduct | null>(null);
  const [serviceToEdit, setServiceToEdit] = useState<ServiceItem | null>(null);
  const [testimonialToEdit, setTestimonialToEdit] = useState<TestimonialItem | null>(null);
  const [saveNotice, setSaveNotice] = useState('');
  const [saveError, setSaveError] = useState('');
  const [hasPendingCloudSync, setHasPendingCloudSync] = useState<boolean>(() =>
    hasPendingLocalContentSync()
  );

  // Customer leads & directory state
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  // Admin-only Master Vendor Sheet & Customer Working Orders state
  const [vendorEntries, setVendorEntries] = useState<VendorMasterEntry[]>([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const isAdmin = Boolean(firebaseAdminEmail) || passcodeAuthed;
  const customerDiscountPercent = getCustomerEffectiveDiscountPercent(
    customer,
    siteContent.memberPricing
  );

  const refreshAdminWorkspace = useCallback(async (passcode: string) => {
    setQuotesLoading(true);
    setVendorLoading(true);
    setOrdersLoading(true);
    setCustomersLoading(true);
    try {
      const [quoteList, vendorList, orderList, customerList] = await Promise.all([
        fetchQuotes(passcode),
        fetchVendorMaster(passcode),
        fetchCustomerOrders(passcode),
        fetchCustomerAccounts(passcode),
      ]);
      setQuotes(quoteList);
      setVendorEntries(vendorList);
      setCustomerOrders(orderList);
      setCustomers(customerList);
    } finally {
      setQuotesLoading(false);
      setVendorLoading(false);
      setOrdersLoading(false);
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    testFirestoreConnection()
      .then((res) => setFirestoreStatus(res))
      .catch(() => setFirestoreStatus({ ok: false }));
    loadSiteContent()
      .then((loaded) => setSiteContent(loaded))
      .catch(() => {});

    const stored = getStoredAdminPasscode();
    if (stored) {
      // Immediately hydrate cached quotes/customers/vendors/orders so F5 refresh never flashes empty
      const cached = readCachedAdminWorkspace();
      setQuotes(cached.quotes);
      setVendorEntries(cached.vendorEntries);
      setCustomerOrders(cached.customerOrders);
      setCustomers(cached.customers);
      verifyAdminPasscode(stored)
        .then((ok) => {
          if (ok) {
            setAdminPasscode(stored);
            setPasscodeAuthed(true);
            refreshAdminWorkspace(stored);
          } else {
            setStoredAdminPasscode('');
          }
        })
        .catch(() => {});
    }

    let unsubAuth: (() => void) | undefined;
    try {
      unsubAuth = onAuthStateChanged(auth, (user) => {
        if (isFirebaseAdminUser(user)) {
          setFirebaseAdminEmail(user?.email ?? null);
        } else {
          setFirebaseAdminEmail(null);
        }
        setAuthReady(true);
      });
    } catch {
      setAuthReady(true);
    }

    return () => {
      unsubAuth?.();
    };
  }, [refreshAdminWorkspace]);

  // Attach real-time Firestore listeners once auth is ready & admin is verified in Firebase
  useEffect(() => {
    if (!authReady || !firebaseAdminEmail) return;
    setQuotesLoading(true);
    setVendorLoading(true);
    setOrdersLoading(true);
    setCustomersLoading(true);
    // Push any products, photos & records created locally / under passcode login into Firestore automatically
    syncLocalAdminRecordsToFirestore(siteContent)
      .then((summary) => {
        setHasPendingCloudSync(hasPendingLocalContentSync());
        if (summary.syncedContent) {
          setSaveError('');
          setSaveNotice(
            'Pending products & photos synced live to Firebase Cloud DB — visible to all customers!'
          );
          setTimeout(() => setSaveNotice(''), 6000);
        } else if (summary.error) {
          setSaveError(summary.error);
        }
      })
      .catch(() => {});
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
    const unsubCustomers = subscribeCustomerAccounts((liveCustomers) => {
      setCustomers(liveCustomers);
      setCustomersLoading(false);
    });
    return () => {
      unsubQuotes?.();
      unsubVendors?.();
      unsubOrders?.();
      unsubCustomers?.();
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
        error: formatFirebaseAuthError(err),
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
    setCustomers([]);
    setAdminEditMode(false);
    setPortalOpen(false);
  }

  async function handleContentUpdate(next: SiteContent): Promise<void> {
    setSiteContent(next);
    if (!isAdmin) return;
    setSaveError('');
    const res = await saveSiteContent(next, adminPasscode);
    setHasPendingCloudSync(res.pendingCloudSync);
    if (res.savedToFirebase) {
      setSaveNotice('Saved live to Firebase Cloud DB — visible to all customers!');
    } else if (res.savedToServer) {
      setSaveNotice(
        'Saved to Server & Browser — connect Firebase DB (Google) to publish live to all customers.'
      );
    } else if (res.savedLocally) {
      setSaveNotice(
        'Saved on this browser only — connect Firebase DB (Google) to publish live to all customers.'
      );
    } else {
      setSaveError(res.error || 'Could not save changes. Please retry.');
    }
    if (res.error) {
      setSaveError(res.error);
    }
    setTimeout(() => {
      setSaveNotice('');
    }, 6000);
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
      copySubTab?: CopySubTab;
    }
  ) {
    setPortalInitialTab(tab);
    setCopySubTab(options?.copySubTab ?? 'hero');
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

  async function handleSaveVendorBatch(entries: VendorMasterEntry[]): Promise<void> {
    if (!isAdmin || entries.length === 0) return;
    const savedList = await saveVendorMasterBatch(entries, adminPasscode);
    setVendorEntries((prev) => {
      const byId = new Map<string, VendorMasterEntry>();
      for (const item of prev) byId.set(item.id, item);
      for (const item of savedList) byId.set(item.id, item);
      return Array.from(byId.values()).sort((a, b) =>
        (b.updatedAt || '').localeCompare(a.updatedAt || '')
      );
    });
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

  async function handleSaveCustomerAdmin(
    cust: CustomerAccount,
    isExisting: boolean
  ): Promise<CustomerAccount | null> {
    if (!isAdmin) return null;
    const saved = await saveCustomerAccountAdmin(cust, adminPasscode, isExisting);
    setCustomers((prev) => [saved, ...prev.filter((c) => c.id !== saved.id)]);
    if (customer && (customer.id === saved.id || customer.email.toLowerCase() === saved.email.toLowerCase())) {
      setCustomer(saved);
    }
    return saved;
  }

  async function handleDeleteCustomerAdmin(id: string) {
    if (!isAdmin) return;
    await deleteCustomerAccountAdmin(id, adminPasscode);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }

  const visibleSectionOrder = (Array.isArray(siteContent.sectionOrder) ? siteContent.sectionOrder : []).filter(
    (id) =>
      Boolean(SECTION_TITLES[id]) &&
      !(Array.isArray(siteContent.hiddenSections) && siteContent.hiddenSections.includes(id))
  );

  function renderSection(sectionId: SectionId) {
    switch (sectionId) {
      case 'services':
        return (
          <ServicesSection
            services={siteContent.services}
            pageCopy={siteContent.pageCopy}
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
            onEditSectionCopy={() =>
              openStudioTab('page-copy', { copySubTab: 'services-reviews' })
            }
          />
        );

      case 'pricing':
        return (
          <SubscriptionPricing
            pricing={siteContent.pricing}
            pageCopy={siteContent.pageCopy}
            lang={lang}
            onOpenQuote={openQuote}
            isAdmin={isAdmin}
            adminEditMode={adminEditMode}
            onEditPricing={() => openStudioTab('page-copy', { copySubTab: 'pricing' })}
          />
        );

      case 'gear':
        return (
          <GearSalesSection
            products={siteContent.products}
            customCategories={siteContent.customCategories}
            brand={siteContent.brand}
            pageCopy={siteContent.pageCopy}
            memberPricing={siteContent.memberPricing}
            customer={customer}
            customerDiscountPercent={customerDiscountPercent}
            onOpenCustomerLogin={() => setCustomerModalOpen(true)}
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
            onEditSectionCopy={() => openStudioTab('page-copy', { copySubTab: 'gear' })}
            onManageCategories={() => openStudioTab('categories')}
          />
        );

      case 'training':
        return (
          <VolunteerTrainingSection
            lang={lang}
            pageCopy={siteContent.pageCopy}
            onOpenQuote={openQuote}
            isAdmin={isAdmin}
            adminEditMode={adminEditMode}
            onEditSectionCopy={() => openStudioTab('page-copy', { copySubTab: 'training' })}
          />
        );

      case 'diagnostic':
        return (
          <AudioHealthCheckTool
            lang={lang}
            pageCopy={siteContent.pageCopy}
            onOpenQuote={openQuote}
            isAdmin={isAdmin}
            adminEditMode={adminEditMode}
            onEditSectionCopy={() => openStudioTab('page-copy', { copySubTab: 'diagnostic' })}
          />
        );

      case 'testimonials':
        return (
          <TestimonialsSection
            testimonials={siteContent.testimonials}
            brand={siteContent.brand}
            pageCopy={siteContent.pageCopy}
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
            onEditSectionCopy={() =>
              openStudioTab('page-copy', { copySubTab: 'services-reviews' })
            }
          />
        );
    }
  }

  return (
    <div className="min-h-screen w-full overflow-x-clip flex flex-col bg-[#F8F8F6] text-[#141518]">
      <Navbar
        brand={siteContent.brand}
        pageCopy={siteContent.pageCopy}
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'en' ? 'es' : 'en'))}
        onOpenQuote={openQuote}
        onOpenPortal={() => openStudioTab('products')}
        isAdmin={isAdmin}
        adminEditMode={adminEditMode}
        onEditHeader={() => openStudioTab('page-copy', { copySubTab: 'brand' })}
        hiddenSections={siteContent.hiddenSections}
        cartCount={calculateCartSummary(cart).totalCount}
        onOpenCart={() => setCartOpen(true)}
        customer={customer}
        memberPricing={siteContent.memberPricing}
        customerDiscountPercent={customerDiscountPercent}
        onOpenCustomerLogin={() => setCustomerModalOpen(true)}
        videoMeeting={siteContent.videoMeeting}
        onOpenVideoMeet={() => setVideoMeetModalOpen(true)}
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
          onEditHero={() => openStudioTab('page-copy', { copySubTab: 'hero' })}
          customer={customer}
          customerDiscountPercent={customerDiscountPercent}
          onOpenCustomerLogin={() => setCustomerModalOpen(true)}
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
              else if (id === 'pricing') openStudioTab('page-copy', { copySubTab: 'pricing' });
              else if (id === 'training') openStudioTab('page-copy', { copySubTab: 'training' });
              else if (id === 'diagnostic') openStudioTab('page-copy', { copySubTab: 'diagnostic' });
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
        pageCopy={siteContent.pageCopy}
        lang={lang}
        onOpenQuote={openQuote}
        onOpenVideoMeet={() => setVideoMeetModalOpen(true)}
        onOpenPortal={() => openStudioTab('products')}
        isAdmin={isAdmin}
        adminEditMode={adminEditMode}
        onEditSectionCopy={() => openStudioTab('page-copy', { copySubTab: 'footer' })}
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
          saveError={saveError}
        />
      )}

      <CustomerLoginModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        lang={lang}
        brand={siteContent.brand}
        customer={customer}
        memberPricing={siteContent.memberPricing}
        customerDiscountPercent={customerDiscountPercent}
        onCustomerChanged={(nextCustomer) => {
          setCustomer(nextCustomer);
          if (nextCustomer && isAdmin) {
            setCustomers((prev) => [nextCustomer, ...prev.filter((c) => c.id !== nextCustomer.id)]);
          }
        }}
        onOpenQuote={openQuote}
      />

      <QuoteModal
        isOpen={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        brand={siteContent.brand}
        lang={lang}
        initialService={quoteInitialService}
        customer={customer}
        customerDiscountPercent={customerDiscountPercent}
        onQuoteSubmitted={(newQuote) => {
          setQuotes((prev) => [newQuote, ...prev]);
        }}
      />

      <VideoMeetingModal
        isOpen={videoMeetModalOpen}
        onClose={() => setVideoMeetModalOpen(false)}
        brand={siteContent.brand}
        videoMeeting={siteContent.videoMeeting}
        lang={lang}
        customer={customer}
        onMeetingRequested={(newQuote) => {
          setQuotes((prev) => [newQuote, ...prev]);
        }}
      />

      <QuoteCartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        brand={siteContent.brand}
        lang={lang}
        customer={customer}
        customerDiscountPercent={customerDiscountPercent}
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
        firestoreStatus={firestoreStatus}
        onGoogleLogin={handleGoogleLogin}
        onLogin={handleAdminLogin}
        onLogout={handleAdminLogout}
        adminEditMode={adminEditMode}
        onToggleEditMode={() => setAdminEditMode((prev) => !prev)}
        siteContent={siteContent}
        onChangeContent={handleContentUpdate}
        saveNotice={saveNotice}
        saveError={saveError}
        hasPendingCloudSync={hasPendingCloudSync}
        quotes={quotes}
        quotesLoading={quotesLoading}
        onCreateEstimate={handleCreateEstimate}
        onUpdateQuote={handleUpdateQuote}
        onDeleteQuote={handleDeleteQuote}
        adminPasscode={adminPasscode}
        vendorEntries={vendorEntries}
        vendorLoading={vendorLoading}
        onSaveVendorEntry={handleSaveVendorEntry}
        onSaveVendorEntriesBatch={handleSaveVendorBatch}
        onDeleteVendorEntry={handleDeleteVendorEntry}
        customerOrders={customerOrders}
        ordersLoading={ordersLoading}
        onSaveCustomerOrder={handleSaveCustomerOrder}
        onDeleteCustomerOrder={handleDeleteCustomerOrder}
        customers={customers}
        customersLoading={customersLoading}
        onSaveCustomer={handleSaveCustomerAdmin}
        onDeleteCustomer={handleDeleteCustomerAdmin}
        initialTab={portalInitialTab}
        initialCopySubTab={copySubTab}
        initialProductToEdit={productToEdit}
        initialServiceToEdit={serviceToEdit}
        initialTestimonialToEdit={testimonialToEdit}
      />
    </div>
  );
}
